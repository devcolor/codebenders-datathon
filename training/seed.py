"""Seed data generation for the distillation pipeline."""

from __future__ import annotations

import random
from typing import Any

import yaml

from training.config import get_school_dir

_PREFIXES = ["MAT", "ENG", "BIO", "CIS", "WDT", "HIS", "PSY", "BUS", "NUR", "EMS"]
_NUMBERS = ["100", "101", "110", "201", "202", "210", "241", "246"]
_NAMES = {
    "MAT 100": "Intermediate Algebra",
    "MAT 110": "Finite Mathematics",
    "MAT 201": "Calculus I",
    "ENG 101": "English Composition I",
    "ENG 102": "English Composition II",
    "BIO 201": "Anatomy & Physiology I",
    "BIO 202": "Anatomy & Physiology II",
    "CIS 146": "Microcomputer Applications",
    "CIS 201": "Introduction to Programming",
    "WDT 108": "SMAW Fillet/OFC",
    "WDT 109": "SMAW Fillet/PAC/CAC",
    "HIS 201": "United States History I",
    "PSY 200": "General Psychology",
    "BUS 241": "Principles of Accounting I",
    "NUR 102": "Fundamentals of Nursing",
    "EMS 100": "EMT Basic",
}
_DELIVERY_METHODS = ["Face-to-Face", "Online", "Hybrid"]
_VIZ_TYPES = ["bar", "line", "pie", "kpi", "table"]

_QUERY_TEMPLATES = [
    ("retention rate by {dim} for {year} cohort", "bar"),
    ("overall {metric} trend from 2019 to 2023", "line"),
    ("{metric} for first-generation students", "kpi"),
    ("{metric} by enrollment intensity", "bar"),
    ("top 10 courses with highest DFW rates", "table"),
    ("{metric} by {dim}", "bar"),
    ("students with {alert} early warning alert", "kpi"),
    ("{metric} distribution by program", "bar"),
    ("{metric} gap between full-time and part-time students", "bar"),
    ("at-risk student count by {dim}", "pie"),
]

_DIMS = ["race", "gender", "cohort", "program", "enrollment intensity", "math placement"]
_METRICS = ["retention rate", "completion rate", "GPA", "DFW rate", "pass rate"]
_ALERTS = ["URGENT", "HIGH", "MODERATE"]
_YEARS = ["2019", "2020", "2021", "2022", "2023"]
_RACES = ["Black", "White", "Hispanic", "Asian", "Two or More", "Unknown"]


_ENROLLMENT_INTENSITIES = ["Full-Time", "Part-Time"]
_MATH_PLACEMENTS = ["C", "R", "N"]
_ALERT_LEVELS = ["LOW", "MODERATE", "HIGH", "URGENT"]
_READINESS_LEVELS = ["high", "medium", "low"]
_FEATURE_NAMES_RETENTION = [
    "GPA_Group_Year_1", "course_completion_rate", "CompletedGatewayMathYear1",
    "CompletedGatewayEnglishYear1", "Enrollment_Intensity_First_Term",
    "total_credits_attempted", "Math_Placement", "Pell_Status_First_Year",
    "Student_Age", "Number_of_Credits_Earned_Year_1",
]


def generate_synthetic_student_profiles(
    config: dict[str, Any],
    count: int,
) -> list[dict[str, Any]]:
    """Generate synthetic student profiles with SHAP data for narrator training."""
    if count == 0:
        return []
    results = []
    for _ in range(count):
        gpa = round(random.uniform(0.5, 4.0), 1)
        completion_rate = round(random.uniform(0.3, 1.0), 2)
        retention_prob = round(random.uniform(0.1, 0.9), 2)
        readiness_score = round(random.uniform(0.15, 0.85), 2)
        intensity = random.choice(_ENROLLMENT_INTENSITIES)
        math_placement = random.choice(_MATH_PLACEMENTS)
        gateway_math = random.choice([True, False])
        gateway_english = random.choice([True, False])
        credits_earned = random.randint(3, 36)
        alert = random.choice(_ALERT_LEVELS)

        if readiness_score >= 0.65:
            readiness_level = "high"
        elif readiness_score >= 0.40:
            readiness_level = "medium"
        else:
            readiness_level = "low"

        # Build risk factors based on profile
        risk_factors = []
        if gpa < 2.0:
            risk_factors.append(f"Low first-year GPA ({gpa} / 4.0)")
        if not gateway_math:
            risk_factors.append("Gateway math not completed in Year 1")
        if not gateway_english:
            risk_factors.append("Gateway English not completed in Year 1")
        if intensity == "Part-Time":
            risk_factors.append("Part-time enrollment reduces success probability")
        if credits_earned < 12:
            risk_factors.append(f"Below 12-credit Year 1 milestone ({credits_earned} credits earned)")
        if alert in ("URGENT", "HIGH"):
            risk_factors.append(f"Retention model flags as {alert.capitalize()} risk")

        # Generate synthetic SHAP values
        features = random.sample(_FEATURE_NAMES_RETENTION, min(8, len(_FEATURE_NAMES_RETENTION)))
        shap_values = [round(random.uniform(-0.25, 0.25), 4) for _ in features]
        feature_values = {
            "GPA_Group_Year_1": gpa,
            "course_completion_rate": completion_rate,
            "CompletedGatewayMathYear1": 1.0 if gateway_math else 0.0,
            "CompletedGatewayEnglishYear1": 1.0 if gateway_english else 0.0,
            "Enrollment_Intensity_First_Term": 1.0 if intensity == "Full-Time" else 0.0,
            "total_credits_attempted": float(credits_earned + random.randint(0, 6)),
            "Math_Placement": {"C": 2.0, "R": 1.0, "N": 0.0}[math_placement],
            "Pell_Status_First_Year": float(random.randint(0, 1)),
            "Student_Age": float(random.randint(18, 45)),
            "Number_of_Credits_Earned_Year_1": float(credits_earned),
        }

        top_positive = sorted(
            [{"feature": f, "shap_value": sv, "value": feature_values.get(f, 0.0)}
             for f, sv in zip(features, shap_values) if sv > 0],
            key=lambda x: x["shap_value"], reverse=True,
        )[:5]

        top_negative = sorted(
            [{"feature": f, "shap_value": sv, "value": feature_values.get(f, 0.0)}
             for f, sv in zip(features, shap_values) if sv < 0],
            key=lambda x: x["shap_value"],
        )[:5]

        results.append({
            "student_profile": {
                "enrollment_intensity": intensity,
                "gpa_year1": gpa,
                "math_placement": math_placement,
                "course_completion_rate": completion_rate,
                "gateway_math_completed": gateway_math,
                "gateway_english_completed": gateway_english,
                "credits_earned_y1": credits_earned,
                "at_risk_alert": alert,
                "retention_probability": retention_prob,
            },
            "readiness_score": readiness_score,
            "readiness_level": readiness_level,
            "risk_factors": risk_factors,
            "shap": {
                "retention": {
                    "base_value": round(random.uniform(0.4, 0.6), 4),
                    "top_positive": top_positive,
                    "top_negative": top_negative,
                },
            },
        })
    return results


def load_seed_queries(school: str) -> dict[str, list[dict]]:
    """Load seed queries from a school's seed_queries.yaml."""
    seed_path = get_school_dir(school) / "seed_queries.yaml"
    if not seed_path.exists():
        return {"explainer": [], "summarizer": []}
    with seed_path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    return {
        "explainer": data.get("explainer", []),
        "summarizer": data.get("summarizer", []),
    }


def _random_course() -> dict[str, str]:
    prefix = random.choice(_PREFIXES)
    number = random.choice(_NUMBERS)
    key = f"{prefix} {number}"
    name = _NAMES.get(key, f"{prefix} {number} Course")
    return {"prefix": prefix, "number": number, "name": name}


def _random_stats() -> dict[str, Any]:
    dfwi_a = round(random.uniform(0.15, 0.55), 2)
    dfwi_b = round(random.uniform(0.15, 0.55), 2)
    co_count = random.randint(20, 200)
    co_dfwi = round(random.uniform(min(dfwi_a, dfwi_b), max(dfwi_a, dfwi_b) + 0.1), 2)
    co_dfwi = min(co_dfwi, 0.75)

    delivery_breakdown = []
    remaining = co_count
    for method in _DELIVERY_METHODS:
        if method == _DELIVERY_METHODS[-1]:
            count = remaining
        else:
            count = random.randint(5, remaining - 5 * (len(_DELIVERY_METHODS) - len(delivery_breakdown) - 1))
            count = max(count, 1)
        remaining -= count
        delivery_breakdown.append({
            "method": method,
            "count": count,
            "dfwi_rate": round(random.uniform(0.15, 0.55), 2),
        })

    return {
        "course_a_dfwi": dfwi_a,
        "course_b_dfwi": dfwi_b,
        "co_enrollment_count": co_count,
        "co_enrollment_dfwi": co_dfwi,
        "delivery_breakdown": delivery_breakdown,
    }


def generate_synthetic_course_pairings(
    config: dict[str, Any],
    count: int,
) -> list[dict[str, Any]]:
    """Generate synthetic course pairing data for explainer training."""
    if count == 0:
        return []
    results = []
    for _ in range(count):
        course_a = _random_course()
        course_b = _random_course()
        while course_b["prefix"] == course_a["prefix"] and course_b["number"] == course_a["number"]:
            course_b = _random_course()
        results.append({"course_a": course_a, "course_b": course_b, "stats": _random_stats()})
    return results


def generate_synthetic_query_results(
    config: dict[str, Any],
    count: int,
) -> list[dict[str, Any]]:
    """Generate synthetic query results for summarizer training."""
    if count == 0:
        return []
    results = []
    for i in range(count):
        template, default_viz = _QUERY_TEMPLATES[i % len(_QUERY_TEMPLATES)]
        prompt = template.format(
            dim=random.choice(_DIMS),
            metric=random.choice(_METRICS),
            year=random.choice(_YEARS),
            alert=random.choice(_ALERTS),
        )
        num_rows = random.randint(2, 8)
        data = []
        for _ in range(num_rows):
            row = {
                "Race": random.choice(_RACES),
                "value": round(random.uniform(0.15, 0.85), 2),
                "count": random.randint(10, 500),
            }
            data.append(row)
        results.append({"prompt": prompt, "data": data, "rowCount": num_rows, "vizType": default_viz})
    return results


def format_as_chatml(system: str, user: str, assistant: str) -> dict:
    """Format a (system, user, assistant) triple as a ChatML messages dict."""
    return {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ]
    }
