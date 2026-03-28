"""Shared pytest fixtures for the training pipeline."""

from pathlib import Path

import pytest
import yaml


FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_school_config():
    """Minimal valid school config for testing."""
    return {
        "school": {
            "name": "Test Community College",
            "code": "tcc",
            "type": "community_college",
            "designation": [],
            "location": {
                "city": "Test City",
                "state": "Alabama",
                "setting": "urban",
            },
            "enrollment": {
                "total_headcount": 1000,
                "percent_full_time": 0.50,
                "percent_part_time": 0.50,
            },
            "demographics": {
                "percent_pell_eligible": 0.60,
                "percent_first_gen": 0.45,
            },
        },
        "database": {
            "main_table": "student_level_with_predictions",
            "course_table": "course_enrollments",
            "connection_env": "DATABASE_URL",
        },
        "schema": {
            "student_columns": {
                "Cohort": "Cohort year",
                "Race": "Student race/ethnicity",
                "Retention": "Retention indicator (0 or 1)",
            },
            "course_columns": {
                "course_prefix": "Course dept code",
                "grade": "Student grade",
            },
        },
        "domain": {
            "programs": [
                {
                    "name": "Nursing",
                    "cip": "51.3801",
                    "gateway_courses": ["BIO 201"],
                }
            ],
            "key_metrics": ["retention_rate", "dfwi_rate"],
            "terminology": {
                "credential": "associate degree",
                "at_risk": "at-risk students",
            },
        },
        "distillation": {
            "teacher_model": "claude-sonnet-4-20250514",
            "teacher_backend": "anthropic",
            "local_teacher_model": "qwen3.5:27b",
            "local_teacher_backend": "ollama",
            "pairs_per_task": 10,
        },
        "training": {
            "default_model": "qwen3.5:9b",
            "fallback_model": "qwen3.5:4b",
            "method": "qlora",
            "quantization": 4,
            "lora_rank": 16,
            "lora_alpha": 32,
            "epochs": 3,
            "learning_rate": 1e-4,
            "batch_size": 4,
            "warmup_steps": 100,
            "eval_every": 50,
            "early_stopping_patience": 3,
        },
    }


@pytest.fixture
def sample_course_pairing_data():
    """Sample course pairing input for explainer adapter."""
    return {
        "course_a": {"prefix": "MAT", "number": "100", "name": "Intermediate Algebra"},
        "course_b": {"prefix": "BIO", "number": "201", "name": "Anatomy & Physiology I"},
        "stats": {
            "course_a_dfwi": 0.42,
            "course_b_dfwi": 0.31,
            "co_enrollment_count": 85,
            "co_enrollment_dfwi": 0.38,
            "delivery_breakdown": [
                {"method": "Face-to-Face", "count": 50, "dfwi_rate": 0.34},
                {"method": "Online", "count": 35, "dfwi_rate": 0.44},
            ],
        },
    }


@pytest.fixture
def sample_query_result_data():
    """Sample query result input for summarizer adapter."""
    return {
        "prompt": "retention rate by race for 2023 cohort",
        "data": [
            {"Race": "Black", "retention_rate": 0.41},
            {"Race": "White", "retention_rate": 0.52},
            {"Race": "Hispanic", "retention_rate": 0.47},
        ],
        "rowCount": 3,
        "vizType": "bar",
    }


@pytest.fixture
def sample_explainer_output():
    """Valid explainer adapter JSON output."""
    return {
        "explanation": "MAT 100 and BIO 201 show a high co-enrollment DFWI rate of 38%.",
        "structural_factors": [
            "Math placement gaps from feeder high schools",
            "Online sections show higher DFW rates",
        ],
        "student_impact": "Students taking both courses simultaneously face compounded difficulty.",
        "advisor_recommendation": "Consider staggering MAT 100 and BIO 201 across terms for at-risk students.",
        "data_limitations": ["Co-enrollment data limited to 2020+ cohorts"],
        "related_intervention": "Math Bootcamp",
    }


@pytest.fixture
def sample_summarizer_output():
    """Valid summarizer adapter JSON output."""
    return {
        "summary": "Retention rates vary significantly by race in the 2023 cohort.",
        "key_insights": [
            "Black students have the lowest retention rate at 41%",
            "11-point gap between Black and White student retention",
        ],
        "context": "This aligns with the institution's strategic goal to close equity gaps.",
        "action_items": [
            "Review early alert referrals for Black male students in Fall cohort",
        ],
        "caveats": ["Race is self-reported; 6% of records are Unknown"],
    }
