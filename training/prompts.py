"""Teacher prompt templates for the distillation pipeline.

Provides school-agnostic prompt builders that inject per-school context
from config.yaml to generate high-quality training pairs.
"""

from __future__ import annotations

import json
from typing import Any

EXPLAINER_SCHEMA = {
    "explanation": "2-3 sentence plain-language explanation of the course pairing pattern",
    "structural_factors": ["list of institutional or systemic factors driving this pattern"],
    "student_impact": "what this means for students taking these courses",
    "advisor_recommendation": "one actionable next step for advisors",
    "data_limitations": ["caveats about interpreting this data"],
    "related_intervention": "existing program that addresses this, or null",
}

SUMMARIZER_SCHEMA = {
    "summary": "2-3 sentence headline finding from the query results",
    "key_insights": ["list of notable patterns in the data"],
    "context": "how this connects to institutional priorities or known challenges",
    "action_items": ["what someone should do with this information"],
    "caveats": ["data limitations relevant to this specific query"],
}

NARRATOR_SCHEMA = {
    "narrative": "2-3 sentence explanation grounded in SHAP feature attribution",
    "key_drivers": ["ranked list of factors with direction and magnitude"],
    "recommended_actions": ["3-5 specific, actionable interventions"],
    "data_limitations": ["caveats about the prediction"],
}

EXPLAINER_STUDENT_SYSTEM = (
    "You are a student success analyst. Given course pairing data, generate a "
    "structured JSON explanation. Include: explanation, structural_factors, "
    "student_impact, advisor_recommendation, data_limitations, and "
    "related_intervention. Respond with ONLY valid JSON."
)

NARRATOR_STUDENT_SYSTEM = (
    "You are a student success analyst. Given a student profile with ML prediction "
    "attribution (SHAP values), generate a structured JSON explanation. Include: "
    "narrative, key_drivers, recommended_actions, and data_limitations. "
    "Ground your narrative in the SHAP values — cite specific features by name "
    "and magnitude. Respond with ONLY valid JSON."
)

SUMMARIZER_STUDENT_SYSTEM = (
    "You are a student success analyst. Given a query and its results, generate "
    "a structured JSON summary. Include: summary, key_insights, context, "
    "action_items, and caveats. Respond with ONLY valid JSON."
)


def build_system_prompt(config: dict[str, Any]) -> str:
    """Build the teacher system prompt with full institutional context."""
    school = config["school"]
    domain = config["domain"]

    sections = []

    name = school["name"]
    location = school.get("location", {})
    city = location.get("city", "")
    state = location.get("state", "")
    school_type = school.get("type", "institution")
    sections.append(
        f"You are a student success analyst at {name}, "
        f"a {school_type} in {city}, {state}."
    )

    designations = school.get("designation", [])
    if designations:
        sections.append(f"Institutional designations: {', '.join(designations)}.")

    enrollment = school.get("enrollment", {})
    if enrollment:
        parts = []
        if "total_headcount" in enrollment:
            parts.append(f"{enrollment['total_headcount']:,} students")
        if "percent_part_time" in enrollment:
            parts.append(f"{enrollment['percent_part_time']:.0%} part-time")
        if "percent_online" in enrollment:
            parts.append(f"{enrollment['percent_online']:.0%} online")
        if enrollment.get("open_admission"):
            parts.append("open admission")
        if parts:
            sections.append(f"Enrollment profile: {', '.join(parts)}.")

    demographics = school.get("demographics", {})
    if demographics:
        parts = []
        for key, label in [
            ("percent_pell_eligible", "Pell-eligible"),
            ("percent_first_gen", "first-generation"),
            ("percent_adult_learners", "adult learners (25+)"),
        ]:
            if key in demographics:
                parts.append(f"{demographics[key]:.0%} {label}")
        if parts:
            sections.append(f"Student demographics: {', '.join(parts)}.")

    programs = domain.get("programs", [])
    if programs:
        program_names = [p["name"] for p in programs[:5]]
        sections.append(f"Key programs: {', '.join(program_names)}.")

    challenges = school.get("challenges", [])
    if challenges:
        sections.append("Known challenges:\n" + "\n".join(f"- {c}" for c in challenges))

    strengths = school.get("strengths", [])
    if strengths:
        sections.append("Institutional strengths:\n" + "\n".join(f"- {s}" for s in strengths))

    equity = school.get("equity", {})
    known_gaps = equity.get("known_gaps", [])
    if known_gaps:
        gap_lines = []
        for gap in known_gaps:
            ga = gap.get("group_a", {})
            gb = gap.get("group_b", {})
            gap_lines.append(
                f"- {gap['metric']}: {ga.get('name', '?')} ({ga.get('value', '?')}) "
                f"vs {gb.get('name', '?')} ({gb.get('value', '?')})"
            )
        sections.append("Known equity gaps:\n" + "\n".join(gap_lines))

    interventions = school.get("interventions", {})
    active = interventions.get("active", [])
    if active:
        lines = []
        for i in active:
            line = f"- {i['name']} ({i['type']}): {i.get('effectiveness', 'effectiveness unknown')}"
            lines.append(line)
        sections.append("Active interventions:\n" + "\n".join(lines))

    priorities = school.get("priorities", {})
    top_goals = priorities.get("top_goals", [])
    if top_goals:
        sections.append("Strategic priorities:\n" + "\n".join(f"- {g}" for g in top_goals))

    caveats = school.get("data_caveats", [])
    if caveats:
        sections.append("Data caveats:\n" + "\n".join(f"- {c}" for c in caveats))

    completion = school.get("completion", {})
    if completion:
        parts = []
        if "ipeds_graduation_rate" in completion:
            parts.append(f"IPEDS grad rate: {completion['ipeds_graduation_rate']:.0%}")
        if "adjusted_completion_rate" in completion:
            parts.append(f"adjusted completion: {completion['adjusted_completion_rate']:.0%}")
        barriers = completion.get("top_completion_barriers", [])
        if barriers:
            parts.append(f"top barriers: {', '.join(b.replace('_', ' ') for b in barriers)}")
        if parts:
            sections.append(f"Completion context: {'; '.join(parts)}.")

    student_life = school.get("student_life", {})
    if student_life:
        parts = []
        if "percent_working_over_20hrs" in student_life:
            parts.append(f"{student_life['percent_working_over_20hrs']:.0%} working 20+ hrs/wk")
        if "food_insecurity_rate" in student_life:
            parts.append(f"{student_life['food_insecurity_rate']:.0%} food insecure")
        if "percent_single_parents" in student_life:
            parts.append(f"{student_life['percent_single_parents']:.0%} single parents")
        if parts:
            sections.append(f"Student life: {', '.join(parts)}.")

    patterns = school.get("patterns", {})
    attrition_points = patterns.get("high_attrition_points", [])
    if attrition_points:
        lines = []
        for point in attrition_points:
            when = f"week {point['week']}" if "week" in point else point.get("month", "?")
            lines.append(f"- {when}: {point['reason']}")
        sections.append("Known attrition patterns:\n" + "\n".join(lines))

    workforce = school.get("workforce", {})
    if workforce:
        employers = workforce.get("top_employers", [])
        fields = workforce.get("high_demand_fields", [])
        if employers or fields:
            parts = []
            if employers:
                parts.append(f"top employers: {', '.join(employers)}")
            if fields:
                parts.append(f"high-demand fields: {', '.join(fields)}")
            sections.append(f"Workforce context: {'; '.join(parts)}.")

    outcomes = school.get("outcomes", {})
    if outcomes:
        parts = []
        if "job_placement_rate_6mo" in outcomes:
            parts.append(f"6-month job placement: {outcomes['job_placement_rate_6mo']:.0%}")
        licensure = outcomes.get("licensure_pass_rates", {})
        if licensure:
            lic_parts = [f"{k}: {v:.0%}" for k, v in licensure.items()]
            parts.append(f"licensure pass rates: {', '.join(lic_parts)}")
        if parts:
            sections.append(f"Outcomes: {'; '.join(parts)}.")

    sections.append("Respond with ONLY valid JSON.")

    return "\n\n".join(sections)


def build_narrator_prompt(
    config: dict[str, Any],
    student_data: dict[str, Any],
) -> str:
    """Build the teacher prompt for generating a SHAP-grounded student narrative."""
    schema_str = json.dumps(NARRATOR_SCHEMA, indent=2)
    profile = student_data.get("student_profile", {})
    shap_data = student_data.get("shap", {})
    risk_factors = student_data.get("risk_factors", [])
    readiness_score = student_data.get("readiness_score", "N/A")
    readiness_level = student_data.get("readiness_level", "unknown")

    # Format SHAP attribution section
    shap_lines = []
    for model_name, attrs in shap_data.items():
        shap_lines.append(f"\n  {model_name} model (base prediction: {attrs.get('base_value', 'N/A')}):")
        for f in attrs.get("top_positive", []):
            shap_lines.append(f"    + {f['feature']} = {f['value']} (pushes prediction UP by {f['shap_value']})")
        for f in attrs.get("top_negative", []):
            shap_lines.append(f"    - {f['feature']} = {f['value']} (pushes prediction DOWN by {abs(f['shap_value'])})")

    profile_str = json.dumps(profile, indent=2, default=str)
    risk_str = "\n".join(f"- {r}" for r in risk_factors) if risk_factors else "None identified"

    interventions = config.get("school", {}).get("interventions", {}).get("active", [])
    intervention_lines = []
    for i in interventions:
        intervention_lines.append(f"- {i['name']} ({i['type']}): {i.get('effectiveness', 'unknown')}")
    interventions_str = "\n".join(intervention_lines) if intervention_lines else "None listed"

    return f"""A student at this institution has a readiness score of {readiness_score} ({readiness_level}).
Analyze their ML prediction factors and write an advisor-facing explanation.

STUDENT PROFILE:
{profile_str}

RISK FACTORS (rule-engine identified):
{risk_str}

ML MODEL FEATURE ATTRIBUTION (SHAP values — what drives each prediction):
{''.join(shap_lines) if shap_lines else 'No SHAP data available'}

AVAILABLE INTERVENTIONS:
{interventions_str}

Generate a JSON response with this exact schema:
{schema_str}

Guidelines:
- Ground the narrative in SHAP values. Cite at least 2 of the top contributing features by name and magnitude.
- Explain in plain language what each factor means for this student's likelihood of success.
- Make recommended actions specific to this institution — reference active interventions by name when relevant.
- Include at least one data limitation or caveat about the prediction.
- Do NOT speculate beyond what the SHAP values and profile data show."""


def build_explainer_prompt(
    config: dict[str, Any],
    course_data: dict[str, Any],
) -> str:
    """Build the teacher prompt for generating a course pairing explanation."""
    schema_str = json.dumps(EXPLAINER_SCHEMA, indent=2)
    data_str = json.dumps(course_data, indent=2, default=str)

    terminology = config.get("domain", {}).get("terminology", {})
    term_lines = "\n".join(f"- {k}: {v}" for k, v in terminology.items()) if terminology else ""

    return f"""Analyze the following course pairing data and explain the pattern.

COURSE PAIRING DATA:
{data_str}

{f"TERMINOLOGY:{chr(10)}{term_lines}{chr(10)}" if term_lines else ""}
Generate a JSON response with this exact schema:
{schema_str}

Guidelines:
- Explain the pattern in plain language accessible to advisors and faculty.
- Connect structural factors to the institution's known challenges and context.
- Make the advisor recommendation specific and actionable.
- Reference existing interventions if relevant.
- Note any data limitations that affect interpretation.
- Do NOT speculate beyond what the data shows."""


def build_summarizer_prompt(
    config: dict[str, Any],
    query_data: dict[str, Any],
) -> str:
    """Build the teacher prompt for generating a query result summary."""
    schema_str = json.dumps(SUMMARIZER_SCHEMA, indent=2)
    data_str = json.dumps(query_data["data"][:50], indent=2, default=str)
    user_query = query_data["prompt"]
    row_count = query_data.get("rowCount", len(query_data["data"]))
    viz_type = query_data.get("vizType", "table")

    return f"""Summarize the following query results for a non-technical audience
(advisors, administrators, faculty).

USER QUERY: {user_query}
VISUALIZATION TYPE: {viz_type}
TOTAL ROWS: {row_count}

RESULTS:
{data_str}

Generate a JSON response with this exact schema:
{schema_str}

Guidelines:
- Lead with the most important finding.
- Connect insights to institutional context and priorities.
- Make action items specific to the roles that would see this data.
- Note data limitations relevant to this specific query.
- Do NOT hallucinate data points not present in the results."""
