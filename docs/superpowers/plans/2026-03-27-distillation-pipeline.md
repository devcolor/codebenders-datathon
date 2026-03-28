# Distillation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a config-driven pipeline that distills a teacher model's knowledge into per-school fine-tuned Qwen 3.5 models, replacing OpenAI API calls for course explanations and query summaries.

**Architecture:** A 5-stage Python pipeline (distill → prepare → finetune → eval → export) reads per-school YAML configs, generates ChatML training pairs via Claude Sonnet or local Qwen 3.5, fine-tunes via MLX QLoRA, evaluates against ship criteria, and exports to Ollama. The Next.js dashboard swaps OpenAI calls for local Ollama inference via a thin model-client adapter.

**Tech Stack:** Python 3.8+, PyYAML, Anthropic SDK, ollama (Python client), MLX/mlx-lm (Apple Silicon fine-tuning), pytest, Next.js/TypeScript (dashboard integration)

**Spec:** `docs/superpowers/specs/2026-03-27-distillation-pipeline-design.md`

**Reference implementation:** `~/Development/d4bl_ai_agent/scripts/training/` — the d4bl pipeline this adapts from.

---

## File Structure

### New Files

```
training/
  __init__.py                    # Package init
  config.py                      # Constants + YAML config loader
  prompts.py                     # Teacher prompt templates (explainer + summarizer)
  seed.py                        # Seed data generation (DB + template + synthetic)
  distill.py                     # Stage 1: Generate ChatML pairs via teacher model
  prepare.py                     # Stage 2: Filter, dedup, split
  finetune.py                    # Stage 3: MLX QLoRA fine-tuning
  eval.py                        # Stage 4: Metrics + ship criteria
  export.py                      # Stage 5: Ollama modelfile + registration

schools/
  bishop-state/
    config.yaml                  # Full institutional config
    seed_queries.yaml            # Example queries for training pair generation

tests/
  conftest.py                    # Pytest fixtures
  training/
    __init__.py
    test_config.py               # Config loader tests
    test_prompts.py              # Prompt template tests
    test_seed.py                 # Seed generation tests
    test_prepare.py              # Filter/dedup/split tests
    test_eval.py                 # Eval metrics + ship criteria tests

codebenders-dashboard/
  lib/
    model-client.ts              # New: Ollama/OpenAI adapter
```

### Modified Files

```
codebenders-dashboard/
  app/api/courses/explain-pairing/route.ts  # Swap OpenAI → model-client
  app/api/query-summary/route.ts            # Swap OpenAI → model-client

requirements.txt                             # Add training dependencies
.gitignore                                   # Add training_data/
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `training/__init__.py`
- Create: `tests/conftest.py`
- Create: `tests/training/__init__.py`
- Create: `pytest.ini`
- Modify: `requirements.txt`
- Modify: `.gitignore`

- [ ] **Step 1: Create training package directory**

```bash
mkdir -p training tests/training
```

- [ ] **Step 2: Create package init files**

Create `training/__init__.py`:
```python
"""Config-driven distillation pipeline for per-school fine-tuned models."""
```

Create `tests/__init__.py`:
```python
```

Create `tests/training/__init__.py`:
```python
```

- [ ] **Step 3: Create pytest.ini**

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

- [ ] **Step 4: Add training dependencies to requirements.txt**

Append to `requirements.txt`:
```
# Training pipeline
pyyaml>=6.0
anthropic>=0.40.0
ollama>=0.4.0
rouge-score>=0.1.2
mlx>=0.22.0
mlx-lm>=0.20.0
```

- [ ] **Step 5: Add training_data to .gitignore**

Append to `.gitignore`:
```
# Training pipeline artifacts
training_data/
```

- [ ] **Step 6: Create conftest.py with shared fixtures**

Create `tests/conftest.py`:
```python
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
```

- [ ] **Step 7: Verify pytest runs with no errors**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/ -v --co`
Expected: "no tests ran" (collected 0 items) with exit code 0

- [ ] **Step 8: Commit**

```bash
git add training/ tests/ pytest.ini requirements.txt .gitignore
git commit -m "chore: scaffold training pipeline package and test infrastructure"
```

---

## Task 2: Config Loader

**Files:**
- Create: `training/config.py`
- Create: `tests/training/test_config.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/training/test_config.py`:
```python
"""Tests for training.config — constants and school config loader."""

import pytest
import yaml
from pathlib import Path
from unittest.mock import patch

from training.config import (
    BASE_DIR,
    SCHOOLS_DIR,
    TRAIN_RATIO,
    VAL_RATIO,
    TEST_RATIO,
    load_school_config,
    get_school_dir,
    get_training_data_dir,
    write_jsonl,
)


class TestConstants:
    def test_split_ratios_sum_to_one(self):
        assert TRAIN_RATIO + VAL_RATIO + TEST_RATIO == pytest.approx(1.0)

    def test_base_dir_is_path(self):
        assert isinstance(BASE_DIR, Path)

    def test_schools_dir_is_path(self):
        assert isinstance(SCHOOLS_DIR, Path)


class TestLoadSchoolConfig:
    def test_loads_valid_config(self, tmp_path, sample_school_config):
        school_dir = tmp_path / "test-school"
        school_dir.mkdir()
        config_path = school_dir / "config.yaml"
        config_path.write_text(yaml.dump(sample_school_config))

        with patch("training.config.SCHOOLS_DIR", tmp_path):
            config = load_school_config("test-school")

        assert config["school"]["name"] == "Test Community College"
        assert config["school"]["code"] == "tcc"
        assert config["database"]["main_table"] == "student_level_with_predictions"

    def test_raises_on_missing_school(self, tmp_path):
        with patch("training.config.SCHOOLS_DIR", tmp_path):
            with pytest.raises(FileNotFoundError, match="School config not found"):
                load_school_config("nonexistent")

    def test_raises_on_missing_required_keys(self, tmp_path):
        school_dir = tmp_path / "bad-school"
        school_dir.mkdir()
        config_path = school_dir / "config.yaml"
        config_path.write_text(yaml.dump({"school": {"name": "Bad"}}))

        with patch("training.config.SCHOOLS_DIR", tmp_path):
            with pytest.raises(ValueError, match="Missing required"):
                load_school_config("bad-school")


class TestGetSchoolDir:
    def test_returns_path(self, tmp_path):
        with patch("training.config.SCHOOLS_DIR", tmp_path):
            result = get_school_dir("bishop-state")
        assert result == tmp_path / "bishop-state"


class TestGetTrainingDataDir:
    def test_returns_path_with_school(self):
        result = get_training_data_dir("bishop-state")
        assert "bishop-state" in str(result)
        assert result.name == "bishop-state"


class TestWriteJsonl:
    def test_writes_items(self, tmp_path):
        import json

        items = [{"a": 1}, {"b": 2}]
        outfile = tmp_path / "test.jsonl"
        count = write_jsonl(items, outfile)

        assert count == 2
        lines = outfile.read_text().strip().split("\n")
        assert json.loads(lines[0]) == {"a": 1}
        assert json.loads(lines[1]) == {"b": 2}

    def test_writes_with_transform(self, tmp_path):
        import json

        items = [1, 2, 3]
        outfile = tmp_path / "test.jsonl"
        count = write_jsonl(items, outfile, transform=lambda x: {"val": x * 2})

        assert count == 3
        lines = outfile.read_text().strip().split("\n")
        assert json.loads(lines[0]) == {"val": 2}

    def test_skips_none_from_transform(self, tmp_path):
        items = [1, 2, 3]
        outfile = tmp_path / "test.jsonl"
        count = write_jsonl(items, outfile, transform=lambda x: None if x == 2 else {"v": x})

        assert count == 2

    def test_creates_parent_dirs(self, tmp_path):
        outfile = tmp_path / "sub" / "dir" / "test.jsonl"
        count = write_jsonl([{"x": 1}], outfile)
        assert count == 1
        assert outfile.exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'training.config'`

- [ ] **Step 3: Write the implementation**

Create `training/config.py`:
```python
"""Shared constants and school config loader for the training pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Optional

import yaml

# ---------------------------------------------------------------------------
# Directory layout
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHOOLS_DIR = PROJECT_ROOT / "schools"
BASE_DIR = PROJECT_ROOT / "training_data"

# ---------------------------------------------------------------------------
# Dataset split ratios
# ---------------------------------------------------------------------------

TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

JACCARD_THRESHOLD = 1.0  # Exact duplicates only

# ---------------------------------------------------------------------------
# Required top-level keys in school config
# ---------------------------------------------------------------------------

_REQUIRED_KEYS = {"school", "database", "schema", "domain", "distillation", "training"}


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------


def load_school_config(school: str) -> dict[str, Any]:
    """Load and validate a school's config.yaml.

    Args:
        school: School directory name (e.g. "bishop-state").

    Returns:
        Parsed config dict.

    Raises:
        FileNotFoundError: If the school directory or config.yaml doesn't exist.
        ValueError: If required top-level keys are missing.
    """
    config_path = SCHOOLS_DIR / school / "config.yaml"
    if not config_path.exists():
        raise FileNotFoundError(
            f"School config not found: {config_path}"
        )

    with config_path.open("r", encoding="utf-8") as fh:
        config = yaml.safe_load(fh)

    missing = _REQUIRED_KEYS - set(config.keys())
    if missing:
        raise ValueError(
            f"Missing required top-level keys in {config_path}: {missing}"
        )

    return config


def get_school_dir(school: str) -> Path:
    """Return the path to a school's config directory."""
    return SCHOOLS_DIR / school


def get_training_data_dir(school: str) -> Path:
    """Return the path to a school's training data directory."""
    return BASE_DIR / school


# ---------------------------------------------------------------------------
# JSONL writer (adapted from d4bl)
# ---------------------------------------------------------------------------


def write_jsonl(
    items: list,
    outfile: Path,
    transform: Optional[Callable] = None,
) -> int:
    """Write items to a JSONL file.

    Args:
        items: List of JSON-serializable objects.
        outfile: Destination file path.
        transform: Optional per-item transformation; returning None skips.

    Returns:
        Number of lines written.
    """
    outfile = Path(outfile)
    outfile.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with outfile.open("w", encoding="utf-8") as fh:
        for item in items:
            if transform is not None:
                item = transform(item)
            if item is None:
                continue
            fh.write(json.dumps(item, ensure_ascii=False) + "\n")
            count += 1
    return count
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_config.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add training/config.py tests/training/test_config.py
git commit -m "feat(training): config loader with YAML validation and JSONL writer"
```

---

## Task 3: Bishop State School Config

**Files:**
- Create: `schools/bishop-state/config.yaml`
- Create: `schools/bishop-state/seed_queries.yaml`

- [ ] **Step 1: Create the school directory**

```bash
mkdir -p schools/bishop-state
```

- [ ] **Step 2: Write config.yaml**

Create `schools/bishop-state/config.yaml` with the full institutional config from the design spec. This is a data file — the schema was validated in Task 2's tests. Include all sections: school identity, location, enrollment, demographics, database schema (copying exact columns from `route.ts` SCHEMA_INFO), domain knowledge, workforce, peers, financial, completion, instruction, pipeline, technology, access, equity, interventions, student_life, health, patterns, trends, priorities, data_caveats, distillation, and training config.

```yaml
# Bishop State Community College — Training Pipeline Config
# See docs/superpowers/specs/2026-03-27-distillation-pipeline-design.md

school:
  name: "Bishop State Community College"
  code: "bscc"
  type: "community_college"
  designation: ["hbcu", "minority_serving"]
  accreditation: "SACSCOC"
  founded: 1927

  location:
    address: "351 North Broad Street"
    city: "Mobile"
    state: "Alabama"
    zip: "36603"
    county: "Mobile County"
    region: "Gulf Coast"
    setting: "urban"
    climate_zone: "subtropical"

  enrollment:
    total_headcount: 4200
    fte: 2800
    undergraduate_only: true
    residential: false
    percent_full_time: 0.42
    percent_part_time: 0.58
    percent_online: 0.35
    open_admission: true

  demographics:
    percent_black: 0.72
    percent_white: 0.18
    percent_hispanic: 0.05
    percent_other: 0.05
    percent_pell_eligible: 0.68
    percent_first_gen: 0.55
    percent_adult_learners: 0.40
    median_household_income_area: 42000

  workforce:
    top_employers: ["Austal USA", "Mobile Infirmary", "AM/NS Calvert"]
    high_demand_fields: ["healthcare", "advanced_manufacturing", "maritime"]
    workforce_board: "Mobile Works"

  academics:
    calendar: "semester"
    degree_types: ["associate", "certificate", "short_certificate"]
    total_programs: 45
    largest_programs: ["Nursing", "Welding", "Business Administration"]
    transfer_partners: ["University of South Alabama", "Alabama A&M"]
    dual_enrollment: true

  student_support:
    tutoring: true
    food_pantry: true
    childcare: false
    transportation_assistance: true
    mental_health_services: true
    early_alert_system: true

  challenges:
    - "High percentage of students working 20+ hours/week"
    - "Limited public transit access to satellite campuses"
    - "Hurricane season disrupts Fall semester attendance"
    - "Many students require developmental education in math"

  strengths:
    - "Strong employer partnerships in healthcare and maritime"
    - "Active student mentoring program"
    - "High nursing program pass rates on NCLEX"

  peers:
    ipeds_id: "101505"
    carnegie_class: "Associate's—High Transfer-High Traditional"
    peer_institutions: ["Lawson State CC", "Shelton State CC", "Trenholm State CC"]
    state_system: "Alabama Community College System"
    governing_board: "ACCS Board of Trustees"

  financial:
    in_district_tuition: 4800
    in_state_tuition: 4800
    avg_financial_aid_package: 5200
    percent_receiving_aid: 0.82
    percent_student_loans: 0.25
    cost_of_living_index: 87.3
    textbook_program: "inclusive_access"
    tuition_payment_plan: true
    emergency_aid_fund: true

  completion:
    ipeds_graduation_rate: 0.18
    adjusted_completion_rate: 0.42
    avg_time_to_credential: 3.2
    percent_transfer_out: 0.24
    percent_stop_out_return: 0.15
    top_completion_barriers:
      - "developmental_math_sequences"
      - "financial_emergencies"
      - "work_schedule_conflicts"

  instruction:
    student_faculty_ratio: 18
    percent_full_time_faculty: 0.45
    percent_adjunct: 0.55
    avg_class_size: 22
    developmental_ed_model: "corequisite"
    lms: "Canvas"

  pipeline:
    feeder_high_schools:
      - name: "Williamson High School"
        percent_of_enrollment: 0.12
        avg_readiness: "below_college_level"
      - name: "Murphy High School"
        percent_of_enrollment: 0.08
        avg_readiness: "mixed"
    percent_ged: 0.11
    percent_dual_enrollment_origin: 0.09
    percent_veterans: 0.07
    percent_career_changers: 0.14
    percent_displaced_workers: 0.05
    percent_international: 0.02
    primary_recruitment_radius_miles: 35

  technology:
    percent_students_with_reliable_wifi: 0.71
    percent_students_with_personal_laptop: 0.64
    campus_device_lending: true
    hotspot_lending: true
    digital_literacy_required: false
    broadband_desert_overlap: true

  access:
    campus_count: 4
    campuses:
      - name: "Main Campus"
        address: "351 N Broad St"
        public_transit_accessible: true
      - name: "Southwest Campus"
        address: "925 Dauphin Island Pkwy"
        public_transit_accessible: false
    percent_students_commute_30_plus_min: 0.35
    public_transit_quality: "limited"
    parking_adequate: true
    evening_weekend_classes: true

  equity:
    known_gaps:
      - metric: "gateway_math_pass_rate"
        group_a: { name: "Black male students", value: 0.41 }
        group_b: { name: "Overall", value: 0.58 }
        initiative: "Male Student Success mentoring program"
      - metric: "retention"
        group_a: { name: "Part-time students", value: 0.38 }
        group_b: { name: "Full-time students", value: 0.61 }
        initiative: "15-to-Finish advising campaign"
    dei_office: true
    title_ix_coordinator: true
    minority_male_initiative: "Brother 2 Brother"

  interventions:
    active:
      - name: "Starfish Early Alert"
        type: "early_warning"
        target: "all students"
        trigger: "missed 2+ classes or below C at midterm"
        effectiveness: "12% retention lift in pilot cohorts"
      - name: "Math Bootcamp"
        type: "academic_support"
        target: "students placing into developmental math"
        timing: "2 weeks before Fall semester"
        effectiveness: "participants 2x more likely to pass MAT 100"
      - name: "Emergency Micro-Grants"
        type: "financial"
        target: "students facing unexpected financial hardship"
        max_award: 500
        effectiveness: "78% of recipients re-enrolled next term"
    planned:
      - name: "Proactive advising for 25+ credit students"
        launch: "Fall 2026"

  student_life:
    percent_working_while_enrolled: 0.72
    percent_working_over_20hrs: 0.48
    percent_single_parents: 0.18
    percent_caregiver_responsibilities: 0.25
    childcare_waitlist: true
    student_orgs: 15
    athletics: false
    housing_insecurity_rate: 0.14
    food_insecurity_rate: 0.31

  health:
    mental_health_counselor_ratio: "1:1400"
    community_health_context:
      - "Mobile County has highest diabetes rate in Alabama"
      - "Limited mental health providers in service area"
    substance_abuse_programs: true
    crisis_intervention_protocol: true

  outcomes:
    job_placement_rate_6mo: 0.78
    median_salary_after_credential:
      associate: 34000
      certificate: 29000
    percent_employed_in_field: 0.65
    licensure_pass_rates:
      nursing_nclex: 0.89
      welding_aws: 0.92
      emt: 0.85
    transfer_success_rate: 0.71
    employer_satisfaction_rate: 0.88

  patterns:
    high_attrition_points:
      - week: 4
        reason: "Financial aid disbursement delays"
      - week: 8
        reason: "Midterm performance shock"
      - month: "October"
        reason: "Hurricane season peak"
    registration_peaks: ["April", "July", "November"]
    summer_melt_rate: 0.22

  trends:
    enrollment_direction: "declining"
    enrollment_5yr_change: -0.12
    completion_direction: "improving"
    notable_changes:
      - year: 2020
        event: "COVID shift to online — permanent hybrid expansion"
      - year: 2022
        event: "Switched to corequisite math model — dev-ed pass rates doubled"
      - year: 2023
        event: "Launched early alert system with ML predictions"

  priorities:
    strategic_plan_years: "2024-2029"
    top_goals:
      - "Increase fall-to-fall retention from 42% to 55%"
      - "Launch 3 new short-term workforce certificates"
      - "Close equity gap in gateway math by 50%"
    accreditation_qep_topic: "Guided Pathways implementation"
    grant_funded_initiatives:
      - name: "Title III Strengthening Institutions"
        focus: "Student support services and advising redesign"
        end_date: "2027-09-30"
      - name: "NSF ATE Grant"
        focus: "Advanced manufacturing curriculum"
        end_date: "2026-05-31"

  data_caveats:
    - "Pre-2020 cohorts lack online/hybrid delivery classification"
    - "Race/ethnicity is self-reported; 6% of records are 'Unknown'"
    - "GPA data for dual-enrollment students may reflect high school scale"
    - "Transfer-out data relies on National Student Clearinghouse match — ~85% match rate"
    - "Course enrollment records before 2019 do not include instructor_status"

database:
  main_table: "student_level_with_predictions"
  course_table: "course_enrollments"
  connection_env: "DATABASE_URL"

schema:
  student_columns:
    Cohort: "Cohort year (numeric: 2019, 2020, etc.)"
    Cohort_Term: "Term of cohort entry (Fall, Spring, Summer)"
    Student_GUID: "Unique student identifier"
    Institution_ID: "Institution identifier (102030 for Bishop State)"
    Gender: "Student gender"
    Race: "Student race/ethnicity"
    Student_Age: "Age of student (integer)"
    First_Gen: "First generation status"
    Enrollment_Type: "Type of enrollment"
    Enrollment_Intensity_First_Term: "Enrollment intensity (Full-Time, Part-Time)"
    Program_of_Study_Year_1: "Program of study in year 1 (CIP code)"
    Credential_Type_Sought_Year_1: "Credential type being pursued"
    Math_Placement: "Math placement level (C=college-level, R=remedial, N=none)"
    Retention: "Retention indicator (0 or 1)"
    Persistence: "Persistence indicator (0 or 1)"
    GPA_Group_Year_1: "GPA in year 1"
    GPA_Group_Term_1: "GPA in term 1"
    Number_of_Credits_Attempted_Year_1: "Credits attempted in year 1"
    Number_of_Credits_Earned_Year_1: "Credits earned in year 1"
    Number_of_Credits_Attempted_Year_2: "Credits attempted in year 2"
    Number_of_Credits_Earned_Year_2: "Credits earned in year 2"
    Time_to_Credential: "Time to any credential"
    retention_probability: "Predicted probability of retention (0-1)"
    retention_risk_category: "Risk category (Low/Moderate/High/Critical Risk)"
    at_risk_alert: "Early warning alert level (LOW/MODERATE/HIGH/URGENT)"
    course_completion_rate: "Course completion rate (0-1)"
    passing_rate: "Course passing rate (0-1)"
  course_columns:
    course_prefix: "Course dept code (MAT, ENG, NUR, CIS, etc.)"
    course_number: "Course number (100, 201, etc.)"
    course_name: "Full course name"
    grade: "Student grade (A, B, C, D, F, W, I, AU, P)"
    delivery_method: "Delivery (F=face-to-face, O=online, H=hybrid)"
    instructor_status: "Instructor type (FT=full-time, PT=part-time)"
    gateway_type: "Gateway (M=math, E=English, N=not a gateway)"
    credits_attempted: "Credits attempted (numeric)"
    credits_earned: "Credits earned (numeric)"
    cohort: "Cohort year as text"
    academic_year: "Academic year (e.g. 2021-22)"
    academic_term: "Term (FALL, SPRING, SUMMER)"
  ferpa_excluded:
    - "Student_GUID"
    - "student_guid"

domain:
  programs:
    - name: "Nursing (ADN)"
      cip: "51.3801"
      gateway_courses: ["BIO 201", "MAT 110"]
    - name: "Welding Technology"
      cip: "48.0508"
      gateway_courses: ["WDT 108", "WDT 109"]
    - name: "Business Administration"
      cip: "52.0201"
      gateway_courses: ["MAT 100", "BUS 241"]
    - name: "Computer Information Systems"
      cip: "11.0101"
      gateway_courses: ["CIS 146", "MAT 100"]
    - name: "Emergency Medical Technician"
      cip: "51.0904"
      gateway_courses: ["EMS 100", "BIO 201"]
  key_metrics:
    - "retention_rate"
    - "dfwi_rate"
    - "gateway_pass_rate"
    - "completion_rate"
    - "transfer_rate"
  terminology:
    credential: "associate degree or certificate"
    at_risk: "students flagged by early warning system"
    gateway_course: "first college-level course in math or English"
    dfwi: "grades of D, F, W, or I (unsuccessful completion)"

distillation:
  teacher_model: "claude-sonnet-4-20250514"
  teacher_backend: "anthropic"
  local_teacher_model: "qwen3.5:27b"
  local_teacher_backend: "ollama"
  pairs_per_task: 1500

training:
  default_model: "qwen3.5:9b"
  fallback_model: "qwen3.5:4b"
  method: "qlora"
  quantization: 4
  lora_rank: 16
  lora_alpha: 32
  epochs: 3
  learning_rate: 1.0e-4
  batch_size: 4
  warmup_steps: 100
  eval_every: 50
  early_stopping_patience: 3
```

- [ ] **Step 3: Write seed_queries.yaml**

Create `schools/bishop-state/seed_queries.yaml`:
```yaml
# Example queries for training pair generation
# These seed the template-driven portion of distillation.

explainer:
  # Advisor-perspective queries
  - query: "MAT 100 and BIO 201 pairing for nursing students"
    style: "advisor"
  - query: "ENG 101 and HIS 201 co-enrollment outcomes"
    style: "advisor"
  - query: "High DFW in MAT 110 for part-time evening students"
    style: "advisor"
  - query: "CIS 146 and MAT 100 pairing for CIS majors"
    style: "advisor"
  - query: "WDT 108 and WDT 109 sequential outcomes"
    style: "advisor"

  # Administrator-perspective queries
  - query: "Online vs face-to-face outcomes in gateway math"
    style: "administrator"
  - query: "Adjunct vs full-time instructor DFW rates in BIO 201"
    style: "administrator"
  - query: "Summer vs Fall section outcomes for ENG 101"
    style: "administrator"
  - query: "Developmental math co-enrollment with science courses"
    style: "administrator"
  - query: "Dual-enrollment student performance in college-level courses"
    style: "administrator"

  # Faculty-perspective queries
  - query: "EMS 100 and BIO 201 prerequisite outcomes"
    style: "faculty"
  - query: "MAT 100 withdrawal patterns by week of semester"
    style: "faculty"
  - query: "Hybrid delivery outcomes in nursing prerequisite courses"
    style: "faculty"

summarizer:
  # Retention and completion
  - query: "retention rate by race for 2023 cohort"
    style: "faculty"
  - query: "overall retention trend from 2019 to 2023"
    style: "administrator"
  - query: "retention rate for first-generation students"
    style: "advisor"
  - query: "completion rate by enrollment intensity"
    style: "administrator"

  # Course performance
  - query: "gateway course pass rates by delivery method"
    style: "administrator"
  - query: "top 10 courses with highest DFW rates"
    style: "faculty"
  - query: "DFW rates by instructor status in math courses"
    style: "administrator"
  - query: "course completion rates for online vs face-to-face"
    style: "faculty"

  # Demographics and equity
  - query: "enrollment by race and gender"
    style: "administrator"
  - query: "GPA distribution for Pell-eligible students"
    style: "advisor"
  - query: "retention gap between full-time and part-time students"
    style: "administrator"
  - query: "at-risk student count by program"
    style: "advisor"

  # Risk and intervention
  - query: "students with URGENT early warning alert by cohort"
    style: "advisor"
  - query: "average retention probability by math placement"
    style: "faculty"
  - query: "critical risk students in nursing program"
    style: "advisor"
```

- [ ] **Step 4: Verify config loads correctly**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -c "from training.config import load_school_config; c = load_school_config('bishop-state'); print(f'Loaded: {c[\"school\"][\"name\"]}')"`
Expected: `Loaded: Bishop State Community College`

- [ ] **Step 5: Commit**

```bash
git add schools/
git commit -m "feat(training): add Bishop State school config and seed queries"
```

---

## Task 4: Teacher Prompt Templates

**Files:**
- Create: `training/prompts.py`
- Create: `tests/training/test_prompts.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/training/test_prompts.py`:
```python
"""Tests for training.prompts — teacher prompt templates."""

import json
import pytest

from training.prompts import (
    build_system_prompt,
    build_explainer_prompt,
    build_summarizer_prompt,
    EXPLAINER_STUDENT_SYSTEM,
    SUMMARIZER_STUDENT_SYSTEM,
    EXPLAINER_SCHEMA,
    SUMMARIZER_SCHEMA,
)


class TestBuildSystemPrompt:
    def test_includes_school_name(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert "Test Community College" in result

    def test_includes_location(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert "Test City" in result
        assert "Alabama" in result

    def test_includes_demographics(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert "Pell" in result or "pell" in result

    def test_returns_string(self, sample_school_config):
        result = build_system_prompt(sample_school_config)
        assert isinstance(result, str)
        assert len(result) > 100


class TestBuildExplainerPrompt:
    def test_includes_course_data(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert "MAT" in result
        assert "BIO" in result

    def test_includes_stats(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert "0.42" in result or "42" in result

    def test_includes_output_schema(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert "explanation" in result
        assert "structural_factors" in result
        assert "advisor_recommendation" in result

    def test_returns_string(self, sample_school_config, sample_course_pairing_data):
        result = build_explainer_prompt(sample_school_config, sample_course_pairing_data)
        assert isinstance(result, str)


class TestBuildSummarizerPrompt:
    def test_includes_query(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert "retention rate by race" in result

    def test_includes_data(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert "Black" in result
        assert "0.41" in result or "41" in result

    def test_includes_output_schema(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert "summary" in result
        assert "key_insights" in result
        assert "action_items" in result

    def test_returns_string(self, sample_school_config, sample_query_result_data):
        result = build_summarizer_prompt(sample_school_config, sample_query_result_data)
        assert isinstance(result, str)


class TestStudentPrompts:
    def test_explainer_student_system_is_concise(self):
        assert len(EXPLAINER_STUDENT_SYSTEM) < 500
        assert "JSON" in EXPLAINER_STUDENT_SYSTEM

    def test_summarizer_student_system_is_concise(self):
        assert len(SUMMARIZER_STUDENT_SYSTEM) < 500
        assert "JSON" in SUMMARIZER_STUDENT_SYSTEM


class TestOutputSchemas:
    def test_explainer_schema_has_required_keys(self):
        required = {"explanation", "structural_factors", "student_impact",
                     "advisor_recommendation", "data_limitations", "related_intervention"}
        assert required == set(EXPLAINER_SCHEMA.keys())

    def test_summarizer_schema_has_required_keys(self):
        required = {"summary", "key_insights", "context", "action_items", "caveats"}
        assert required == set(SUMMARIZER_SCHEMA.keys())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_prompts.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'training.prompts'`

- [ ] **Step 3: Write the implementation**

Create `training/prompts.py`:
```python
"""Teacher prompt templates for the distillation pipeline.

Provides school-agnostic prompt builders that inject per-school context
from config.yaml to generate high-quality training pairs.
"""

from __future__ import annotations

import json
from typing import Any

# ---------------------------------------------------------------------------
# Output schemas — define what the fine-tuned model produces
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Student system prompts (what the fine-tuned model sees at inference)
# ---------------------------------------------------------------------------

EXPLAINER_STUDENT_SYSTEM = (
    "You are a student success analyst. Given course pairing data, generate a "
    "structured JSON explanation. Include: explanation, structural_factors, "
    "student_impact, advisor_recommendation, data_limitations, and "
    "related_intervention. Respond with ONLY valid JSON."
)

SUMMARIZER_STUDENT_SYSTEM = (
    "You are a student success analyst. Given a query and its results, generate "
    "a structured JSON summary. Include: summary, key_insights, context, "
    "action_items, and caveats. Respond with ONLY valid JSON."
)

# ---------------------------------------------------------------------------
# Context builder — extracts relevant sections from school config
# ---------------------------------------------------------------------------


def build_system_prompt(config: dict[str, Any]) -> str:
    """Build the teacher system prompt with full institutional context.

    Injects school identity, demographics, challenges, interventions,
    equity gaps, and priorities from the school config.

    Args:
        config: Parsed school config dict.

    Returns:
        System prompt string for the teacher model.
    """
    school = config["school"]
    domain = config["domain"]

    sections = []

    # Identity
    name = school["name"]
    location = school.get("location", {})
    city = location.get("city", "")
    state = location.get("state", "")
    school_type = school.get("type", "institution")
    sections.append(
        f"You are a student success analyst at {name}, "
        f"a {school_type} in {city}, {state}."
    )

    # Designation
    designations = school.get("designation", [])
    if designations:
        sections.append(f"Institutional designations: {', '.join(designations)}.")

    # Enrollment
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

    # Demographics
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

    # Programs
    programs = domain.get("programs", [])
    if programs:
        program_names = [p["name"] for p in programs[:5]]
        sections.append(f"Key programs: {', '.join(program_names)}.")

    # Challenges
    challenges = school.get("challenges", [])
    if challenges:
        sections.append("Known challenges:\n" + "\n".join(f"- {c}" for c in challenges))

    # Strengths
    strengths = school.get("strengths", [])
    if strengths:
        sections.append("Institutional strengths:\n" + "\n".join(f"- {s}" for s in strengths))

    # Equity gaps
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

    # Interventions
    interventions = school.get("interventions", {})
    active = interventions.get("active", [])
    if active:
        lines = []
        for i in active:
            line = f"- {i['name']} ({i['type']}): {i.get('effectiveness', 'effectiveness unknown')}"
            lines.append(line)
        sections.append("Active interventions:\n" + "\n".join(lines))

    # Priorities
    priorities = school.get("priorities", {})
    top_goals = priorities.get("top_goals", [])
    if top_goals:
        sections.append("Strategic priorities:\n" + "\n".join(f"- {g}" for g in top_goals))

    # Data caveats
    caveats = school.get("data_caveats", [])
    if caveats:
        sections.append("Data caveats:\n" + "\n".join(f"- {c}" for c in caveats))

    # Completion context
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

    # Student life
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

    # Patterns
    patterns = school.get("patterns", {})
    attrition_points = patterns.get("high_attrition_points", [])
    if attrition_points:
        lines = []
        for point in attrition_points:
            when = f"week {point['week']}" if "week" in point else point.get("month", "?")
            lines.append(f"- {when}: {point['reason']}")
        sections.append("Known attrition patterns:\n" + "\n".join(lines))

    # Workforce
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

    # Outcomes
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


# ---------------------------------------------------------------------------
# Explainer prompt
# ---------------------------------------------------------------------------


def build_explainer_prompt(
    config: dict[str, Any],
    course_data: dict[str, Any],
) -> str:
    """Build the teacher prompt for generating a course pairing explanation.

    Args:
        config: Parsed school config dict.
        course_data: Course pairing data dict with keys: course_a, course_b, stats.

    Returns:
        User prompt string for the teacher model.
    """
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


# ---------------------------------------------------------------------------
# Summarizer prompt
# ---------------------------------------------------------------------------


def build_summarizer_prompt(
    config: dict[str, Any],
    query_data: dict[str, Any],
) -> str:
    """Build the teacher prompt for generating a query result summary.

    Args:
        config: Parsed school config dict.
        query_data: Dict with keys: prompt, data, rowCount, vizType.

    Returns:
        User prompt string for the teacher model.
    """
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_prompts.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add training/prompts.py tests/training/test_prompts.py
git commit -m "feat(training): teacher prompt templates for explainer and summarizer"
```

---

## Task 5: Seed Data Generation

**Files:**
- Create: `training/seed.py`
- Create: `tests/training/test_seed.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/training/test_seed.py`:
```python
"""Tests for training.seed — seed data generation."""

import pytest
import yaml
from pathlib import Path
from unittest.mock import patch

from training.seed import (
    load_seed_queries,
    generate_synthetic_course_pairings,
    generate_synthetic_query_results,
    format_as_chatml,
)


class TestLoadSeedQueries:
    def test_loads_valid_yaml(self, tmp_path):
        seed_file = tmp_path / "seed_queries.yaml"
        seed_file.write_text(yaml.dump({
            "explainer": [
                {"query": "MAT 100 and BIO 201", "style": "advisor"},
            ],
            "summarizer": [
                {"query": "retention by race", "style": "faculty"},
            ],
        }))

        with patch("training.seed.get_school_dir", return_value=tmp_path):
            result = load_seed_queries("test-school")

        assert len(result["explainer"]) == 1
        assert len(result["summarizer"]) == 1
        assert result["explainer"][0]["query"] == "MAT 100 and BIO 201"

    def test_returns_empty_on_missing_file(self, tmp_path):
        with patch("training.seed.get_school_dir", return_value=tmp_path):
            result = load_seed_queries("test-school")
        assert result == {"explainer": [], "summarizer": []}


class TestGenerateSyntheticCoursePairings:
    def test_generates_requested_count(self, sample_school_config):
        results = generate_synthetic_course_pairings(sample_school_config, count=5)
        assert len(results) == 5

    def test_each_has_required_keys(self, sample_school_config):
        results = generate_synthetic_course_pairings(sample_school_config, count=3)
        for r in results:
            assert "course_a" in r
            assert "course_b" in r
            assert "stats" in r
            assert "prefix" in r["course_a"]
            assert "number" in r["course_a"]

    def test_returns_empty_for_zero(self, sample_school_config):
        results = generate_synthetic_course_pairings(sample_school_config, count=0)
        assert results == []


class TestGenerateSyntheticQueryResults:
    def test_generates_requested_count(self, sample_school_config):
        results = generate_synthetic_query_results(sample_school_config, count=5)
        assert len(results) == 5

    def test_each_has_required_keys(self, sample_school_config):
        results = generate_synthetic_query_results(sample_school_config, count=3)
        for r in results:
            assert "prompt" in r
            assert "data" in r
            assert "rowCount" in r
            assert "vizType" in r

    def test_returns_empty_for_zero(self, sample_school_config):
        results = generate_synthetic_query_results(sample_school_config, count=0)
        assert results == []


class TestFormatAsChatML:
    def test_format_structure(self):
        result = format_as_chatml("system", "user", "assistant")
        assert "messages" in result
        assert len(result["messages"]) == 3
        assert result["messages"][0] == {"role": "system", "content": "system"}
        assert result["messages"][1] == {"role": "user", "content": "user"}
        assert result["messages"][2] == {"role": "assistant", "content": "assistant"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_seed.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'training.seed'`

- [ ] **Step 3: Write the implementation**

Create `training/seed.py`:
```python
"""Seed data generation for the distillation pipeline.

Generates synthetic course pairing data and query results to serve as
inputs for the teacher model during distillation. Also loads template
seed queries from the school's seed_queries.yaml.
"""

from __future__ import annotations

import random
from typing import Any

import yaml

from training.config import get_school_dir

# ---------------------------------------------------------------------------
# Common course data for synthetic generation
# ---------------------------------------------------------------------------

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
_GRADES = ["A", "B", "C", "D", "F", "W", "I"]
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


# ---------------------------------------------------------------------------
# Seed query loader
# ---------------------------------------------------------------------------


def load_seed_queries(school: str) -> dict[str, list[dict]]:
    """Load seed queries from a school's seed_queries.yaml.

    Args:
        school: School directory name.

    Returns:
        Dict with "explainer" and "summarizer" lists of query dicts.
    """
    seed_path = get_school_dir(school) / "seed_queries.yaml"
    if not seed_path.exists():
        return {"explainer": [], "summarizer": []}

    with seed_path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}

    return {
        "explainer": data.get("explainer", []),
        "summarizer": data.get("summarizer", []),
    }


# ---------------------------------------------------------------------------
# Synthetic course pairing generation
# ---------------------------------------------------------------------------


def _random_course() -> dict[str, str]:
    """Generate a random course identifier."""
    prefix = random.choice(_PREFIXES)
    number = random.choice(_NUMBERS)
    key = f"{prefix} {number}"
    name = _NAMES.get(key, f"{prefix} {number} Course")
    return {"prefix": prefix, "number": number, "name": name}


def _random_stats() -> dict[str, Any]:
    """Generate random course pairing statistics."""
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
    """Generate synthetic course pairing data for explainer training.

    Args:
        config: Parsed school config dict (used for program-aware generation).
        count: Number of pairings to generate.

    Returns:
        List of course pairing data dicts.
    """
    if count == 0:
        return []

    results = []
    for _ in range(count):
        course_a = _random_course()
        course_b = _random_course()
        while course_b["prefix"] == course_a["prefix"] and course_b["number"] == course_a["number"]:
            course_b = _random_course()
        results.append({
            "course_a": course_a,
            "course_b": course_b,
            "stats": _random_stats(),
        })
    return results


# ---------------------------------------------------------------------------
# Synthetic query result generation
# ---------------------------------------------------------------------------


def generate_synthetic_query_results(
    config: dict[str, Any],
    count: int,
) -> list[dict[str, Any]]:
    """Generate synthetic query results for summarizer training.

    Args:
        config: Parsed school config dict.
        count: Number of query results to generate.

    Returns:
        List of query result dicts with prompt, data, rowCount, vizType.
    """
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

        # Generate plausible result rows
        num_rows = random.randint(2, 8)
        data = []
        for _ in range(num_rows):
            row = {
                "Race": random.choice(_RACES),
                "value": round(random.uniform(0.15, 0.85), 2),
                "count": random.randint(10, 500),
            }
            data.append(row)

        results.append({
            "prompt": prompt,
            "data": data,
            "rowCount": num_rows,
            "vizType": default_viz,
        })

    return results


# ---------------------------------------------------------------------------
# ChatML formatter
# ---------------------------------------------------------------------------


def format_as_chatml(system: str, user: str, assistant: str) -> dict:
    """Format a (system, user, assistant) triple as a ChatML messages dict.

    Args:
        system: The system prompt text.
        user: The user message text.
        assistant: The assistant response text.

    Returns:
        A dict with a "messages" key containing a list of 3 role/content dicts.
    """
    return {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant},
        ]
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_seed.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add training/seed.py tests/training/test_seed.py
git commit -m "feat(training): seed data generation for explainer and summarizer"
```

---

## Task 6: Distillation Pipeline

**Files:**
- Create: `training/distill.py`
- Create: `tests/training/test_distill.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/training/test_distill.py`:
```python
"""Tests for training.distill — teacher model distillation."""

import json
import pytest
from unittest.mock import patch, MagicMock

from training.distill import (
    validate_json,
    call_teacher,
    generate_explainer_pairs,
    generate_summarizer_pairs,
)


class TestValidateJson:
    def test_valid_json(self):
        result = validate_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_strips_markdown_fences(self):
        result = validate_json('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_returns_none_for_invalid(self):
        assert validate_json("not json") is None

    def test_returns_none_for_empty(self):
        assert validate_json("") is None
        assert validate_json(None) is None

    def test_returns_none_for_non_dict(self):
        assert validate_json("[1, 2, 3]") is None


class TestCallTeacher:
    def test_calls_anthropic_backend(self):
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_message.content = [MagicMock(text='{"result": "ok"}')]
        mock_message.usage.input_tokens = 100
        mock_message.usage.output_tokens = 50
        mock_client.messages.create.return_value = mock_message

        with patch("training.distill._get_anthropic_client", return_value=mock_client):
            result = call_teacher(
                system="system prompt",
                user="user prompt",
                backend="anthropic",
                model="claude-sonnet-4-20250514",
            )

        assert result == '{"result": "ok"}'
        mock_client.messages.create.assert_called_once()

    def test_calls_ollama_backend(self):
        mock_response = {"message": {"content": '{"result": "ok"}'}}

        with patch("training.distill.ollama") as mock_ollama:
            mock_ollama.chat.return_value = mock_response
            result = call_teacher(
                system="system prompt",
                user="user prompt",
                backend="ollama",
                model="qwen3.5:27b",
            )

        assert result == '{"result": "ok"}'
        mock_ollama.chat.assert_called_once()


class TestGenerateExplainerPairs:
    def test_generates_pairs_from_seed_data(self, sample_school_config, sample_course_pairing_data):
        mock_response = json.dumps({
            "explanation": "Test explanation",
            "structural_factors": ["factor1"],
            "student_impact": "impact",
            "advisor_recommendation": "recommendation",
            "data_limitations": ["caveat"],
            "related_intervention": None,
        })

        with patch("training.distill.call_teacher", return_value=mock_response):
            pairs = generate_explainer_pairs(
                config=sample_school_config,
                seed_data=[sample_course_pairing_data],
                count=2,
            )

        assert len(pairs) == 2
        assert "messages" in pairs[0]
        assert len(pairs[0]["messages"]) == 3

    def test_skips_invalid_responses(self, sample_school_config, sample_course_pairing_data):
        with patch("training.distill.call_teacher", return_value="not json"):
            pairs = generate_explainer_pairs(
                config=sample_school_config,
                seed_data=[sample_course_pairing_data],
                count=3,
            )

        assert len(pairs) == 0


class TestGenerateSummarizerPairs:
    def test_generates_pairs_from_seed_data(self, sample_school_config, sample_query_result_data):
        mock_response = json.dumps({
            "summary": "Test summary",
            "key_insights": ["insight1"],
            "context": "context",
            "action_items": ["action"],
            "caveats": ["caveat"],
        })

        with patch("training.distill.call_teacher", return_value=mock_response):
            pairs = generate_summarizer_pairs(
                config=sample_school_config,
                seed_data=[sample_query_result_data],
                count=2,
            )

        assert len(pairs) == 2
        assert "messages" in pairs[0]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_distill.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'training.distill'`

- [ ] **Step 3: Write the implementation**

Create `training/distill.py`:
```python
"""Distillation pipeline — generate ChatML training pairs via a teacher model.

Supports two backends:
  - anthropic: Claude Sonnet via Anthropic API (production quality)
  - ollama: Local model via Ollama (free iteration)

Usage:
    python -m training.distill --school bishop-state [--local]
"""

from __future__ import annotations

import argparse
import functools
import json
import os
import time
from pathlib import Path
from typing import Any

from training.config import get_training_data_dir, load_school_config, write_jsonl
from training.prompts import (
    EXPLAINER_STUDENT_SYSTEM,
    SUMMARIZER_STUDENT_SYSTEM,
    build_explainer_prompt,
    build_summarizer_prompt,
    build_system_prompt,
)
from training.seed import (
    format_as_chatml,
    generate_synthetic_course_pairings,
    generate_synthetic_query_results,
    load_seed_queries,
)

# ---------------------------------------------------------------------------
# Cost tracking
# ---------------------------------------------------------------------------

_COST_PER_M_INPUT = 3.00
_COST_PER_M_OUTPUT = 15.00
_total_input_tokens = 0
_total_output_tokens = 0
_total_calls = 0


def _track_cost(input_tokens: int, output_tokens: int) -> None:
    global _total_input_tokens, _total_output_tokens, _total_calls
    _total_input_tokens += input_tokens
    _total_output_tokens += output_tokens
    _total_calls += 1


def _cost_so_far() -> float:
    return (
        _total_input_tokens / 1_000_000 * _COST_PER_M_INPUT
        + _total_output_tokens / 1_000_000 * _COST_PER_M_OUTPUT
    )


def _print_cost_summary() -> None:
    cost = _cost_so_far()
    print(
        f"[cost] {_total_calls} API calls | "
        f"{_total_input_tokens:,} in + {_total_output_tokens:,} out tokens | "
        f"${cost:.2f} spent so far",
        flush=True,
    )


# ---------------------------------------------------------------------------
# JSON validation
# ---------------------------------------------------------------------------


def validate_json(text: str | None) -> dict | None:
    """Strip markdown fences and parse as JSON dict.

    Returns None if text is empty, not valid JSON, or not a dict.
    """
    if not text or not isinstance(text, str) or not text.strip():
        return None

    stripped = text.strip()

    if stripped.startswith("```"):
        lines = stripped.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    try:
        obj = json.loads(stripped)
    except (json.JSONDecodeError, ValueError):
        return None

    if not isinstance(obj, dict):
        return None

    return obj


# ---------------------------------------------------------------------------
# Teacher model caller
# ---------------------------------------------------------------------------


@functools.lru_cache(maxsize=1)
def _get_anthropic_client():
    """Return a cached Anthropic client instance."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY environment variable is required for Claude distillation."
        )
    return anthropic.Anthropic(api_key=api_key)


try:
    import ollama
except ImportError:
    ollama = None  # type: ignore[assignment]


def call_teacher(
    system: str,
    user: str,
    backend: str,
    model: str,
) -> str:
    """Call the teacher model and return the response text.

    Args:
        system: System prompt.
        user: User message.
        backend: "anthropic" or "ollama".
        model: Model identifier.

    Returns:
        The assistant response as a string.
    """
    preview = user[:120].replace("\n", " ")
    print(f"[api] Calling {model} ({backend}) | {preview}...", flush=True)

    if backend == "anthropic":
        client = _get_anthropic_client()
        message = client.messages.create(
            model=model,
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        usage = message.usage
        _track_cost(usage.input_tokens, usage.output_tokens)
        print(f"[api] done {usage.input_tokens}in/{usage.output_tokens}out tokens", flush=True)
        if _total_calls % 10 == 0:
            _print_cost_summary()
        return message.content[0].text

    elif backend == "ollama":
        if ollama is None:
            raise ImportError("ollama package is required for local teacher. Install with: pip install ollama")
        response = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response["message"]["content"]

    else:
        raise ValueError(f"Unknown backend: {backend!r}. Must be 'anthropic' or 'ollama'.")


# ---------------------------------------------------------------------------
# Pair generators
# ---------------------------------------------------------------------------


def generate_explainer_pairs(
    config: dict[str, Any],
    seed_data: list[dict[str, Any]],
    count: int,
    outfile: Path | None = None,
) -> list[dict]:
    """Generate explainer training pairs via teacher model distillation.

    Args:
        config: Parsed school config dict.
        seed_data: List of course pairing data dicts.
        count: Number of pairs to generate.
        outfile: If provided, pairs are written incrementally.

    Returns:
        List of ChatML pair dicts.
    """
    distill_config = config.get("distillation", {})
    backend = distill_config.get("teacher_backend", "anthropic")
    model = distill_config.get("teacher_model", "claude-sonnet-4-20250514")

    system_prompt = build_system_prompt(config)
    pairs: list[dict] = []

    fh = None
    if outfile is not None:
        outfile.parent.mkdir(parents=True, exist_ok=True)
        fh = outfile.open("w", encoding="utf-8")

    try:
        for idx in range(count):
            if idx > 0 and idx % 25 == 0:
                time.sleep(1)

            course_data = seed_data[idx % len(seed_data)]
            teacher_prompt = build_explainer_prompt(config, course_data)

            try:
                response_text = call_teacher(system_prompt, teacher_prompt, backend, model)
            except Exception as exc:
                print(f"[warn] Teacher call failed for explainer pair {idx}: {exc}", flush=True)
                continue

            validated = validate_json(response_text)
            if validated is None:
                print(f"[warn] Invalid JSON for explainer pair {idx}, skipping.", flush=True)
                continue

            student_user = json.dumps(course_data, ensure_ascii=False, default=str)
            pair = format_as_chatml(
                system=EXPLAINER_STUDENT_SYSTEM,
                user=student_user,
                assistant=json.dumps(validated, ensure_ascii=False),
            )
            pairs.append(pair)
            if fh is not None:
                fh.write(json.dumps(pair, ensure_ascii=False) + "\n")
                fh.flush()
            print(f"[explainer] {len(pairs)}/{count} pairs generated", flush=True)
    finally:
        if fh is not None:
            fh.close()
            print(f"[explainer] Saved {len(pairs)} pairs to {outfile}", flush=True)

    return pairs


def generate_summarizer_pairs(
    config: dict[str, Any],
    seed_data: list[dict[str, Any]],
    count: int,
    outfile: Path | None = None,
) -> list[dict]:
    """Generate summarizer training pairs via teacher model distillation.

    Args:
        config: Parsed school config dict.
        seed_data: List of query result data dicts.
        count: Number of pairs to generate.
        outfile: If provided, pairs are written incrementally.

    Returns:
        List of ChatML pair dicts.
    """
    distill_config = config.get("distillation", {})
    backend = distill_config.get("teacher_backend", "anthropic")
    model = distill_config.get("teacher_model", "claude-sonnet-4-20250514")

    system_prompt = build_system_prompt(config)
    pairs: list[dict] = []

    fh = None
    if outfile is not None:
        outfile.parent.mkdir(parents=True, exist_ok=True)
        fh = outfile.open("w", encoding="utf-8")

    try:
        for idx in range(count):
            if idx > 0 and idx % 25 == 0:
                time.sleep(1)

            query_data = seed_data[idx % len(seed_data)]
            teacher_prompt = build_summarizer_prompt(config, query_data)

            try:
                response_text = call_teacher(system_prompt, teacher_prompt, backend, model)
            except Exception as exc:
                print(f"[warn] Teacher call failed for summarizer pair {idx}: {exc}", flush=True)
                continue

            validated = validate_json(response_text)
            if validated is None:
                print(f"[warn] Invalid JSON for summarizer pair {idx}, skipping.", flush=True)
                continue

            student_user = json.dumps(
                {"prompt": query_data["prompt"], "data": query_data["data"][:50]},
                ensure_ascii=False,
                default=str,
            )
            pair = format_as_chatml(
                system=SUMMARIZER_STUDENT_SYSTEM,
                user=student_user,
                assistant=json.dumps(validated, ensure_ascii=False),
            )
            pairs.append(pair)
            if fh is not None:
                fh.write(json.dumps(pair, ensure_ascii=False) + "\n")
                fh.flush()
            print(f"[summarizer] {len(pairs)}/{count} pairs generated", flush=True)
    finally:
        if fh is not None:
            fh.close()
            print(f"[summarizer] Saved {len(pairs)} pairs to {outfile}", flush=True)

    return pairs


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main(school: str, local: bool = False) -> None:
    """Run distillation for a school.

    Args:
        school: School directory name.
        local: If True, use local Ollama teacher instead of Claude.
    """
    config = load_school_config(school)

    if local:
        config["distillation"]["teacher_backend"] = config["distillation"].get(
            "local_teacher_backend", "ollama"
        )
        config["distillation"]["teacher_model"] = config["distillation"].get(
            "local_teacher_model", "qwen3.5:27b"
        )
        print(f"[distill] Using local teacher: {config['distillation']['teacher_model']}")
    else:
        print(f"[distill] Using API teacher: {config['distillation']['teacher_model']}")

    pairs_per_task = config["distillation"].get("pairs_per_task", 1500)
    data_dir = get_training_data_dir(school)
    pairs_dir = data_dir / "pairs"

    # Load seed queries
    seed_queries = load_seed_queries(school)

    # Generate synthetic seed data
    synthetic_pairings = generate_synthetic_course_pairings(config, count=pairs_per_task)
    synthetic_results = generate_synthetic_query_results(config, count=pairs_per_task)

    # Explainer
    print(f"\n{'='*60}")
    print(f"EXPLAINER — generating {pairs_per_task} pairs")
    print(f"{'='*60}")
    explainer_pairs = generate_explainer_pairs(
        config=config,
        seed_data=synthetic_pairings,
        count=pairs_per_task,
        outfile=pairs_dir / "explainer.jsonl",
    )

    # Summarizer
    print(f"\n{'='*60}")
    print(f"SUMMARIZER — generating {pairs_per_task} pairs")
    print(f"{'='*60}")
    summarizer_pairs = generate_summarizer_pairs(
        config=config,
        seed_data=synthetic_results,
        count=pairs_per_task,
        outfile=pairs_dir / "summarizer.jsonl",
    )

    print(f"\n{'='*60}")
    print("DISTILLATION COMPLETE")
    print(f"{'='*60}")
    print(f"  Explainer: {len(explainer_pairs)} pairs")
    print(f"  Summarizer: {len(summarizer_pairs)} pairs")
    _print_cost_summary()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate training pairs via teacher model distillation."
    )
    parser.add_argument("--school", required=True, help="School directory name")
    parser.add_argument("--local", action="store_true", help="Use local Ollama teacher")
    args = parser.parse_args()
    main(args.school, local=args.local)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_distill.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add training/distill.py tests/training/test_distill.py
git commit -m "feat(training): distillation pipeline with dual teacher backend support"
```

---

## Task 7: Dataset Preparation

**Files:**
- Create: `training/prepare.py`
- Create: `tests/training/test_prepare.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/training/test_prepare.py`:
```python
"""Tests for training.prepare — filter, deduplicate, and split."""

import json
import pytest

from training.prepare import (
    filter_invalid_json,
    deduplicate_by_jaccard,
    jaccard_similarity,
    split_dataset,
)


class TestFilterInvalidJson:
    def test_keeps_valid_pairs(self):
        pairs = [
            {"messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": "question"},
                {"role": "assistant", "content": '{"key": "value"}'},
            ]}
        ]
        result = filter_invalid_json(pairs)
        assert len(result) == 1

    def test_removes_invalid_json_assistant(self):
        pairs = [
            {"messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": "question"},
                {"role": "assistant", "content": "not json"},
            ]}
        ]
        result = filter_invalid_json(pairs)
        assert len(result) == 0

    def test_removes_missing_messages(self):
        assert filter_invalid_json([{"no_messages": True}]) == []

    def test_removes_empty_user(self):
        pairs = [
            {"messages": [
                {"role": "system", "content": "sys"},
                {"role": "user", "content": ""},
                {"role": "assistant", "content": '{"key": "value"}'},
            ]}
        ]
        result = filter_invalid_json(pairs)
        assert len(result) == 0


class TestJaccardSimilarity:
    def test_identical_strings(self):
        assert jaccard_similarity("hello world", "hello world") == 1.0

    def test_completely_different(self):
        assert jaccard_similarity("hello", "world") == 0.0

    def test_partial_overlap(self):
        result = jaccard_similarity("hello world foo", "hello world bar")
        assert 0.0 < result < 1.0

    def test_empty_string(self):
        assert jaccard_similarity("", "hello") == 0.0


class TestDeduplicateByJaccard:
    def test_removes_exact_duplicates(self):
        pairs = [
            {"messages": [{"role": "user", "content": "same question"}]},
            {"messages": [{"role": "user", "content": "same question"}]},
            {"messages": [{"role": "user", "content": "different question"}]},
        ]
        result = deduplicate_by_jaccard(pairs, threshold=1.0)
        assert len(result) == 2

    def test_empty_input(self):
        assert deduplicate_by_jaccard([], threshold=1.0) == []

    def test_preserves_order(self):
        pairs = [
            {"messages": [{"role": "user", "content": "first"}]},
            {"messages": [{"role": "user", "content": "second"}]},
        ]
        result = deduplicate_by_jaccard(pairs, threshold=1.0)
        assert result[0]["messages"][0]["content"] == "first"


class TestSplitDataset:
    def test_split_ratios(self):
        pairs = [{"id": i} for i in range(100)]
        splits = split_dataset(pairs, train_ratio=0.8, val_ratio=0.1)
        assert len(splits["train"]) == 80
        assert len(splits["val"]) == 10
        assert len(splits["test"]) == 10

    def test_deterministic(self):
        pairs = [{"id": i} for i in range(50)]
        split1 = split_dataset(pairs, seed=42)
        split2 = split_dataset(pairs, seed=42)
        assert split1["train"] == split2["train"]

    def test_empty_input(self):
        splits = split_dataset([])
        assert splits == {"train": [], "val": [], "test": []}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_prepare.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'training.prepare'`

- [ ] **Step 3: Write the implementation**

Create `training/prepare.py`:
```python
"""Dataset preparation — filter, deduplicate, and split training pairs.

Adapted from d4bl pipeline. Loads raw JSONL from distillation, applies
quality filtering, removes near-duplicates, and writes 80/10/10 splits.

Usage:
    python -m training.prepare --school bishop-state
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

from training.config import (
    JACCARD_THRESHOLD,
    TRAIN_RATIO,
    VAL_RATIO,
    get_training_data_dir,
    write_jsonl,
)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def jaccard_similarity(a: str, b: str) -> float:
    """Compute word-level Jaccard similarity between two strings."""
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def _get_user_text(pair: dict[str, Any]) -> str:
    """Extract user message content from a ChatML pair."""
    for msg in pair.get("messages", []):
        if msg.get("role") == "user":
            return msg.get("content", "")
    return ""


# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------


def filter_invalid_json(pairs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only pairs with valid structure and JSON-parseable assistant content."""
    valid = []
    for pair in pairs:
        messages = pair.get("messages")
        if not isinstance(messages, list) or not messages:
            continue
        if any(not isinstance(msg, dict) for msg in messages):
            continue
        has_user = any(
            msg.get("role") == "user" and msg.get("content")
            for msg in messages
        )
        if not has_user:
            continue
        assistant_content = None
        for msg in messages:
            if msg.get("role") == "assistant":
                assistant_content = msg.get("content")
                break
        if not isinstance(assistant_content, str) or not assistant_content:
            continue
        try:
            json.loads(assistant_content)
        except (json.JSONDecodeError, ValueError):
            continue
        valid.append(pair)
    return valid


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------


def deduplicate_by_jaccard(
    pairs: list[dict[str, Any]],
    threshold: float = JACCARD_THRESHOLD,
) -> list[dict[str, Any]]:
    """Remove near-duplicate pairs based on user-message Jaccard similarity."""
    if not pairs:
        return pairs

    kept: list[dict[str, Any]] = [pairs[0]]
    kept_word_sets: list[set] = [set(_get_user_text(pairs[0]).lower().split())]

    for pair in pairs[1:]:
        candidate_words = set(_get_user_text(pair).lower().split())
        is_duplicate = any(
            _jaccard_sets(candidate_words, kw) >= threshold
            for kw in kept_word_sets
        )
        if not is_duplicate:
            kept.append(pair)
            kept_word_sets.append(candidate_words)

    return kept


def _jaccard_sets(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


# ---------------------------------------------------------------------------
# Splitting
# ---------------------------------------------------------------------------


def split_dataset(
    pairs: list[dict[str, Any]],
    train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO,
    seed: int = 42,
) -> dict[str, list[dict[str, Any]]]:
    """Shuffle and split pairs into train/val/test with a deterministic seed."""
    if not pairs:
        return {"train": [], "val": [], "test": []}

    shuffled = list(pairs)
    rng = random.Random(seed)
    rng.shuffle(shuffled)

    n = len(shuffled)
    train_end = round(n * train_ratio)
    val_end = train_end + round(n * val_ratio)

    return {
        "train": shuffled[:train_end],
        "val": shuffled[train_end:val_end],
        "test": shuffled[val_end:],
    }


# ---------------------------------------------------------------------------
# I/O
# ---------------------------------------------------------------------------


def _load_pairs(path: Path) -> list[dict[str, Any]]:
    """Load newline-delimited JSON from path."""
    pairs = []
    with path.open() as fh:
        for line in fh:
            line = line.strip()
            if line:
                pairs.append(json.loads(line))
    return pairs


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def process_task(school: str, task: str) -> dict[str, int]:
    """Load, filter, deduplicate, and split training data for a task.

    Args:
        school: School directory name.
        task: Task name ("explainer" or "summarizer").

    Returns:
        Dict mapping split name to number of examples written.
    """
    data_dir = get_training_data_dir(school)
    input_path = data_dir / "pairs" / f"{task}.jsonl"
    if not input_path.exists():
        raise FileNotFoundError(f"Pairs file not found: {input_path}")

    pairs = _load_pairs(input_path)
    print(f"[{task}] Loaded {len(pairs)} pairs from {input_path}")

    pairs = filter_invalid_json(pairs)
    print(f"[{task}] After JSON filter: {len(pairs)} pairs")

    pairs = deduplicate_by_jaccard(pairs, threshold=JACCARD_THRESHOLD)
    print(f"[{task}] After deduplication: {len(pairs)} pairs")

    splits = split_dataset(pairs)

    final_dir = data_dir / "final" / task
    counts: dict[str, int] = {}
    for split_name, split_pairs in splits.items():
        out_path = final_dir / f"{split_name}.jsonl"
        n = write_jsonl(split_pairs, out_path)
        counts[split_name] = n
        print(f"[{task}] Wrote {n} examples to {out_path}")

    return counts


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(school: str) -> None:
    """Run preparation for all tasks."""
    for task in ("explainer", "summarizer"):
        try:
            process_task(school, task)
        except FileNotFoundError as e:
            print(f"[warn] {e} — skipping")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Filter, deduplicate, and split training pairs.")
    parser.add_argument("--school", required=True, help="School directory name")
    args = parser.parse_args()
    main(args.school)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_prepare.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add training/prepare.py tests/training/test_prepare.py
git commit -m "feat(training): dataset preparation — filter, dedup, and split"
```

---

## Task 8: Eval Harness and Ship Criteria

**Files:**
- Create: `training/eval.py`
- Create: `tests/training/test_eval.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/training/test_eval.py`:
```python
"""Tests for training.eval — metrics and ship criteria."""

import json
import pytest

from training.eval import (
    SHIP_CRITERIA,
    check_json_validity,
    check_schema_adherence,
    check_caveat_inclusion,
    check_ship_criteria,
    ShipDecision,
)


class TestCheckJsonValidity:
    def test_all_valid(self):
        outputs = ['{"key": "value"}', '{"a": 1}']
        assert check_json_validity(outputs) == 1.0

    def test_some_invalid(self):
        outputs = ['{"key": "value"}', "not json", '{"a": 1}']
        assert check_json_validity(outputs) == pytest.approx(2 / 3)

    def test_empty(self):
        assert check_json_validity([]) == 0.0


class TestCheckSchemaAdherence:
    def test_explainer_all_valid(self, sample_explainer_output):
        outputs = [json.dumps(sample_explainer_output)]
        assert check_schema_adherence(outputs, "explainer") == 1.0

    def test_explainer_missing_key(self):
        incomplete = json.dumps({"explanation": "test"})
        assert check_schema_adherence([incomplete], "explainer") < 1.0

    def test_summarizer_all_valid(self, sample_summarizer_output):
        outputs = [json.dumps(sample_summarizer_output)]
        assert check_schema_adherence(outputs, "summarizer") == 1.0


class TestCheckCaveatInclusion:
    def test_all_have_caveats(self, sample_explainer_output):
        outputs = [json.dumps(sample_explainer_output)]
        assert check_caveat_inclusion(outputs, "explainer") == 1.0

    def test_missing_caveats(self):
        no_caveats = json.dumps({
            "explanation": "test",
            "structural_factors": [],
            "student_impact": "impact",
            "advisor_recommendation": "rec",
            "data_limitations": [],
            "related_intervention": None,
        })
        assert check_caveat_inclusion([no_caveats], "explainer") == 0.0


class TestShipCriteria:
    def test_passes_with_good_metrics(self):
        metrics = {
            "json_validity": 0.98,
            "schema_adherence": 0.95,
            "caveat_inclusion": 0.92,
            "factual_grounding": 0.90,
        }
        decision = check_ship_criteria(metrics, "explainer")
        assert decision.decision == "ship"
        assert len(decision.blocking_failures) == 0

    def test_fails_with_low_json_validity(self):
        metrics = {
            "json_validity": 0.80,
            "schema_adherence": 0.95,
            "caveat_inclusion": 0.92,
            "factual_grounding": 0.90,
        }
        decision = check_ship_criteria(metrics, "explainer")
        assert decision.decision == "no_ship"
        assert len(decision.blocking_failures) > 0

    def test_ship_with_gaps(self):
        metrics = {
            "json_validity": 0.98,
            "schema_adherence": 0.95,
            "caveat_inclusion": 0.85,
            "factual_grounding": 0.90,
            "explanation_quality": 0.30,  # Below non-blocking threshold
        }
        decision = check_ship_criteria(metrics, "explainer")
        assert decision.decision in ("ship", "ship_with_gaps")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_eval.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'training.eval'`

- [ ] **Step 3: Write the implementation**

Create `training/eval.py`:
```python
"""Evaluation harness and ship criteria for fine-tuned models.

Runs a fine-tuned model against held-out test data and checks
whether it meets the minimum quality thresholds for deployment.

Usage:
    python -m training.eval --school bishop-state
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from training.config import get_training_data_dir, load_school_config

# ---------------------------------------------------------------------------
# Ship criteria thresholds
# ---------------------------------------------------------------------------

SHIP_CRITERIA: dict[str, dict[str, dict]] = {
    "explainer": {
        "json_validity": {"min": 0.95, "blocking": True},
        "schema_adherence": {"min": 0.90, "blocking": True},
        "caveat_inclusion": {"min": 0.90, "blocking": True},
        "factual_grounding": {"min": 0.85, "blocking": True},
        "explanation_quality": {"min": 0.35, "blocking": False},
        "actionability": {"min": 0.80, "blocking": False},
    },
    "summarizer": {
        "json_validity": {"min": 0.95, "blocking": True},
        "schema_adherence": {"min": 0.90, "blocking": True},
        "caveat_inclusion": {"min": 0.90, "blocking": True},
        "factual_grounding": {"min": 0.85, "blocking": True},
        "explanation_quality": {"min": 0.35, "blocking": False},
        "actionability": {"min": 0.80, "blocking": False},
    },
}

_EXPLAINER_REQUIRED_KEYS = {
    "explanation", "structural_factors", "student_impact",
    "advisor_recommendation", "data_limitations", "related_intervention",
}
_SUMMARIZER_REQUIRED_KEYS = {
    "summary", "key_insights", "context", "action_items", "caveats",
}
_CAVEAT_KEY = {
    "explainer": "data_limitations",
    "summarizer": "caveats",
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CriterionFailure:
    metric: str
    threshold: float
    actual: float | None
    blocking: bool


@dataclass
class ShipDecision:
    decision: str  # "ship", "no_ship", "ship_with_gaps"
    blocking_failures: list[CriterionFailure] = field(default_factory=list)
    nonblocking_failures: list[CriterionFailure] = field(default_factory=list)
    metrics_checked: int = 0


# ---------------------------------------------------------------------------
# Metric computation
# ---------------------------------------------------------------------------


def check_json_validity(outputs: list[str]) -> float:
    """Compute the fraction of outputs that parse as valid JSON dicts."""
    if not outputs:
        return 0.0
    valid = 0
    for out in outputs:
        try:
            obj = json.loads(out)
            if isinstance(obj, dict):
                valid += 1
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return valid / len(outputs)


def check_schema_adherence(outputs: list[str], task: str) -> float:
    """Compute the fraction of outputs with all required keys present."""
    if not outputs:
        return 0.0

    required = _EXPLAINER_REQUIRED_KEYS if task == "explainer" else _SUMMARIZER_REQUIRED_KEYS
    adherent = 0
    for out in outputs:
        try:
            obj = json.loads(out)
            if isinstance(obj, dict) and required.issubset(obj.keys()):
                adherent += 1
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return adherent / len(outputs)


def check_caveat_inclusion(outputs: list[str], task: str) -> float:
    """Compute the fraction of outputs with non-empty caveat/limitation fields."""
    if not outputs:
        return 0.0

    caveat_key = _CAVEAT_KEY.get(task, "caveats")
    with_caveats = 0
    for out in outputs:
        try:
            obj = json.loads(out)
            if isinstance(obj, dict):
                caveats = obj.get(caveat_key, [])
                if isinstance(caveats, list) and len(caveats) > 0:
                    with_caveats += 1
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return with_caveats / len(outputs)


def check_factual_grounding(outputs: list[str], inputs: list[str]) -> float:
    """Check that outputs reference values present in their corresponding inputs.

    Simple heuristic: extracts numeric values from the input and checks
    that at least one appears in the output.
    """
    if not outputs or not inputs:
        return 0.0

    import re

    grounded = 0
    for out, inp in zip(outputs, inputs):
        numbers_in_input = set(re.findall(r"\d+\.?\d*", inp))
        if not numbers_in_input:
            grounded += 1  # No numbers to check against
            continue
        # Check if at least one input number appears in the output
        if any(n in out for n in numbers_in_input):
            grounded += 1

    return grounded / len(outputs)


# ---------------------------------------------------------------------------
# Ship criteria checker
# ---------------------------------------------------------------------------


def check_ship_criteria(
    metrics: dict[str, float],
    task: str,
) -> ShipDecision:
    """Compare metrics against ship thresholds.

    Args:
        metrics: Dict of metric_name → value.
        task: "explainer" or "summarizer".

    Returns:
        ShipDecision with pass/fail details.
    """
    criteria = SHIP_CRITERIA.get(task, {})
    blocking_failures = []
    nonblocking_failures = []
    checked = 0

    for metric_name, spec in criteria.items():
        actual = metrics.get(metric_name)
        if actual is None:
            continue
        checked += 1

        threshold = spec.get("min", spec.get("max"))
        blocking = spec.get("blocking", True)

        failed = False
        if "min" in spec and actual < spec["min"]:
            failed = True
        if "max" in spec and actual > spec["max"]:
            failed = True

        if failed:
            failure = CriterionFailure(
                metric=metric_name,
                threshold=threshold,
                actual=actual,
                blocking=blocking,
            )
            if blocking:
                blocking_failures.append(failure)
            else:
                nonblocking_failures.append(failure)

    if blocking_failures:
        decision = "no_ship"
    elif nonblocking_failures:
        decision = "ship_with_gaps"
    else:
        decision = "ship"

    return ShipDecision(
        decision=decision,
        blocking_failures=blocking_failures,
        nonblocking_failures=nonblocking_failures,
        metrics_checked=checked,
    )


# ---------------------------------------------------------------------------
# Test set loader
# ---------------------------------------------------------------------------


def load_test_set(path: Path) -> list[dict]:
    """Load a ChatML JSONL test set and extract input/expected pairs."""
    results = []
    with path.open() as fh:
        for line in fh:
            if not line.strip():
                continue
            example = json.loads(line)
            messages = example["messages"]
            user_msg = messages[1]["content"]
            assistant_msg = messages[2]["content"]
            results.append({
                "input": user_msg,
                "expected_raw": assistant_msg,
            })
    return results


# ---------------------------------------------------------------------------
# Eval runner
# ---------------------------------------------------------------------------


def run_eval(school: str, task: str) -> ShipDecision:
    """Run evaluation for a school's fine-tuned model on one task.

    Loads the test set, runs inference via Ollama, computes metrics,
    and checks ship criteria.

    Args:
        school: School directory name.
        task: "explainer" or "summarizer".

    Returns:
        ShipDecision.
    """
    data_dir = get_training_data_dir(school)
    test_path = data_dir / "final" / task / "test.jsonl"

    if not test_path.exists():
        raise FileNotFoundError(f"Test set not found: {test_path}")

    test_set = load_test_set(test_path)
    print(f"[{task}] Loaded {len(test_set)} test examples from {test_path}")

    config = load_school_config(school)
    model_name = f"{school}-{task}:{config['training']['default_model'].split(':')[1]}"

    # Run inference
    try:
        import ollama as ollama_client
    except ImportError:
        raise ImportError("ollama package required for evaluation. Install with: pip install ollama")

    outputs = []
    inputs = []
    for i, example in enumerate(test_set):
        try:
            response = ollama_client.chat(
                model=model_name,
                messages=[
                    {"role": "user", "content": example["input"]},
                ],
            )
            outputs.append(response["message"]["content"])
            inputs.append(example["input"])
        except Exception as exc:
            print(f"[warn] Inference failed for example {i}: {exc}")
            outputs.append("")
            inputs.append(example["input"])

        if (i + 1) % 10 == 0:
            print(f"[{task}] Evaluated {i + 1}/{len(test_set)} examples", flush=True)

    # Compute metrics
    metrics = {
        "json_validity": check_json_validity(outputs),
        "schema_adherence": check_schema_adherence(outputs, task),
        "caveat_inclusion": check_caveat_inclusion(outputs, task),
        "factual_grounding": check_factual_grounding(outputs, inputs),
    }

    # Print results
    print(f"\n[{task}] Metrics:")
    for name, value in metrics.items():
        threshold_info = SHIP_CRITERIA.get(task, {}).get(name, {})
        threshold = threshold_info.get("min", threshold_info.get("max", "?"))
        status = "PASS" if value >= threshold if isinstance(threshold, (int, float)) else True else "FAIL"
        print(f"  {name}: {value:.1%} (threshold: {threshold}) {status}")

    decision = check_ship_criteria(metrics, task)
    print(f"\n[{task}] DECISION: {decision.decision.upper()}")
    if decision.blocking_failures:
        for f in decision.blocking_failures:
            print(f"  BLOCKING: {f.metric} = {f.actual:.1%} (need {f.threshold})")
    if decision.nonblocking_failures:
        for f in decision.nonblocking_failures:
            print(f"  WARNING: {f.metric} = {f.actual:.1%} (need {f.threshold})")

    return decision


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(school: str) -> None:
    """Run evaluation for all tasks."""
    results = {}
    for task in ("explainer", "summarizer"):
        try:
            results[task] = run_eval(school, task)
        except FileNotFoundError as e:
            print(f"[warn] {e} — skipping")

    print(f"\n{'='*60}")
    print("EVALUATION SUMMARY")
    print(f"{'='*60}")
    all_ship = True
    for task, decision in results.items():
        status = decision.decision.upper()
        print(f"  {task}: {status}")
        if decision.decision == "no_ship":
            all_ship = False

    if all_ship:
        print("\nAll adapters PASS — ready to export.")
    else:
        print("\nSome adapters FAILED — fix issues before exporting.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned models against ship criteria.")
    parser.add_argument("--school", required=True, help="School directory name")
    args = parser.parse_args()
    main(args.school)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/training/test_eval.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add training/eval.py tests/training/test_eval.py
git commit -m "feat(training): eval harness with ship criteria for model quality gates"
```

---

## Task 9: MLX Fine-Tuning Wrapper

**Files:**
- Create: `training/finetune.py`

This task wraps MLX's `mlx_lm` fine-tuning CLI. No unit tests for the actual training (it requires GPU time), but we test the config generation.

- [ ] **Step 1: Write the implementation**

Create `training/finetune.py`:
```python
"""Fine-tuning wrapper for MLX QLoRA on Apple Silicon.

Wraps mlx_lm's LoRA fine-tuning with school-specific config.

Usage:
    python -m training.finetune --school bishop-state --model 9b
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from training.config import get_training_data_dir, load_school_config

# ---------------------------------------------------------------------------
# Model name mapping
# ---------------------------------------------------------------------------

_MODEL_MAP = {
    "4b": "Qwen/Qwen3.5-4B",
    "9b": "Qwen/Qwen3.5-9B",
    "27b": "Qwen/Qwen3.5-27B",
}


def _resolve_model(model_shorthand: str) -> str:
    """Resolve a shorthand like '9b' to a HuggingFace model path."""
    if model_shorthand in _MODEL_MAP:
        return _MODEL_MAP[model_shorthand]
    return model_shorthand


# ---------------------------------------------------------------------------
# Config generation
# ---------------------------------------------------------------------------


def build_lora_config(config: dict, task: str, data_dir: Path) -> dict:
    """Build the MLX LoRA fine-tuning config dict.

    Args:
        config: Parsed school config.
        task: "explainer" or "summarizer".
        data_dir: Path to the school's training_data directory.

    Returns:
        Dict suitable for writing as JSON config for mlx_lm.lora.
    """
    training = config.get("training", {})
    final_dir = data_dir / "final" / task

    return {
        "train": str(final_dir / "train.jsonl"),
        "valid": str(final_dir / "val.jsonl"),
        "test": str(final_dir / "test.jsonl"),
        "lora_layers": training.get("lora_rank", 16),
        "lora_parameters": {
            "rank": training.get("lora_rank", 16),
            "alpha": training.get("lora_alpha", 32),
            "dropout": 0.05,
            "scale": training.get("lora_alpha", 32) / training.get("lora_rank", 16),
        },
        "learning_rate": training.get("learning_rate", 1e-4),
        "batch_size": training.get("batch_size", 4),
        "iters": training.get("epochs", 3) * 1000,  # Approximate
        "val_batches": 25,
        "steps_per_eval": training.get("eval_every", 50),
        "save_every": 100,
        "max_seq_length": 2048,
        "grad_checkpoint": True,
    }


# ---------------------------------------------------------------------------
# Fine-tuning runner
# ---------------------------------------------------------------------------


def run_finetune(school: str, model: str = "9b", task: str | None = None) -> None:
    """Run MLX LoRA fine-tuning for a school's adapter(s).

    Args:
        school: School directory name.
        model: Model shorthand ("4b", "9b") or full HF path.
        task: Specific task, or None to train both adapters.
    """
    config = load_school_config(school)
    data_dir = get_training_data_dir(school)
    hf_model = _resolve_model(model)

    tasks = [task] if task else ["explainer", "summarizer"]

    for t in tasks:
        print(f"\n{'='*60}")
        print(f"FINE-TUNING: {t} adapter on {hf_model}")
        print(f"{'='*60}")

        adapter_dir = data_dir / "models" / f"qwen3.5-{model}" / t
        adapter_dir.mkdir(parents=True, exist_ok=True)

        lora_config = build_lora_config(config, t, data_dir)
        config_path = adapter_dir / "lora_config.json"
        config_path.write_text(json.dumps(lora_config, indent=2))

        cmd = [
            sys.executable, "-m", "mlx_lm.lora",
            "--model", hf_model,
            "--adapter-path", str(adapter_dir),
            "--data", str(data_dir / "final" / t),
            "--train",
            "--batch-size", str(lora_config["batch_size"]),
            "--lora-layers", str(lora_config["lora_layers"]),
            "--iters", str(lora_config["iters"]),
            "--val-batches", str(lora_config["val_batches"]),
            "--steps-per-eval", str(lora_config["steps_per_eval"]),
            "--save-every", str(lora_config["save_every"]),
            "--learning-rate", str(lora_config["learning_rate"]),
            "--max-seq-length", str(lora_config["max_seq_length"]),
            "--grad-checkpoint",
        ]

        print(f"[finetune] Running: {' '.join(cmd[:6])}...")
        result = subprocess.run(cmd, cwd=str(data_dir))

        if result.returncode != 0:
            print(f"[finetune] FAILED for {t} — exit code {result.returncode}")
        else:
            print(f"[finetune] SUCCESS — adapter saved to {adapter_dir}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune a model for a school via MLX QLoRA.")
    parser.add_argument("--school", required=True, help="School directory name")
    parser.add_argument("--model", default="9b", help="Model size: 4b, 9b, or HF path")
    parser.add_argument("--task", choices=["explainer", "summarizer"], help="Train one adapter only")
    args = parser.parse_args()
    run_finetune(args.school, model=args.model, task=args.task)
```

- [ ] **Step 2: Commit**

```bash
git add training/finetune.py
git commit -m "feat(training): MLX QLoRA fine-tuning wrapper"
```

---

## Task 10: Ollama Export

**Files:**
- Create: `training/export.py`

- [ ] **Step 1: Write the implementation**

Create `training/export.py`:
```python
"""Export fine-tuned adapters to Ollama for serving.

Creates an Ollama Modelfile and registers the model.

Usage:
    python -m training.export --school bishop-state
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from training.config import get_training_data_dir, load_school_config

# ---------------------------------------------------------------------------
# Modelfile generation
# ---------------------------------------------------------------------------

_MODELFILE_TEMPLATE = """FROM {base_model}
ADAPTER {adapter_path}

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096

SYSTEM {system_prompt}
"""


def generate_modelfile(
    base_model: str,
    adapter_path: Path,
    system_prompt: str,
) -> str:
    """Generate an Ollama Modelfile string.

    Args:
        base_model: Base model name (e.g. "qwen3.5:9b").
        adapter_path: Path to the LoRA adapter directory.
        system_prompt: System prompt to bake into the model.

    Returns:
        Modelfile content string.
    """
    return _MODELFILE_TEMPLATE.format(
        base_model=base_model,
        adapter_path=str(adapter_path),
        system_prompt=json.dumps(system_prompt),
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

import json

from training.prompts import EXPLAINER_STUDENT_SYSTEM, SUMMARIZER_STUDENT_SYSTEM

_SYSTEM_PROMPTS = {
    "explainer": EXPLAINER_STUDENT_SYSTEM,
    "summarizer": SUMMARIZER_STUDENT_SYSTEM,
}


def export_model(school: str, task: str, model: str = "9b") -> bool:
    """Export a fine-tuned adapter to Ollama.

    Args:
        school: School directory name.
        task: "explainer" or "summarizer".
        model: Model size shorthand.

    Returns:
        True if registration succeeded.
    """
    data_dir = get_training_data_dir(school)
    adapter_dir = data_dir / "models" / f"qwen3.5-{model}" / task

    if not adapter_dir.exists():
        print(f"[export] Adapter not found: {adapter_dir}")
        return False

    base_model = f"qwen3.5:{model}"
    ollama_name = f"{school}-{task}:{model}"
    system_prompt = _SYSTEM_PROMPTS.get(task, "")

    modelfile_content = generate_modelfile(base_model, adapter_dir, system_prompt)
    modelfile_path = adapter_dir / "Modelfile"
    modelfile_path.write_text(modelfile_content)
    print(f"[export] Wrote Modelfile to {modelfile_path}")

    # Register with Ollama
    cmd = ["ollama", "create", ollama_name, "-f", str(modelfile_path)]
    print(f"[export] Registering: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            print(f"[export] Registered: {ollama_name}")
            return True
        else:
            print(f"[export] FAILED: {result.stderr}")
            return False
    except FileNotFoundError:
        print("[export] Ollama CLI not found. Install from https://ollama.com")
        return False
    except subprocess.TimeoutExpired:
        print("[export] Ollama create timed out after 5 minutes")
        return False


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(school: str) -> None:
    """Export all adapters for a school."""
    config = load_school_config(school)
    model = config["training"]["default_model"].split(":")[1]

    results = {}
    for task in ("explainer", "summarizer"):
        results[task] = export_model(school, task, model=model)

    print(f"\n{'='*60}")
    print("EXPORT SUMMARY")
    print(f"{'='*60}")
    for task, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {school}-{task}:{model} — {status}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export fine-tuned models to Ollama.")
    parser.add_argument("--school", required=True, help="School directory name")
    args = parser.parse_args()
    main(args.school)
```

- [ ] **Step 2: Commit**

```bash
git add training/export.py
git commit -m "feat(training): Ollama model export and registration"
```

---

## Task 11: Dashboard Model Client

**Files:**
- Create: `codebenders-dashboard/lib/model-client.ts`

- [ ] **Step 1: Write the implementation**

Create `codebenders-dashboard/lib/model-client.ts`:
```typescript
/**
 * Model client adapter — routes inference to Ollama (fine-tuned) or
 * OpenAI (fallback) based on MODEL_BACKEND env var.
 */

import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const MODEL_BACKEND = process.env.MODEL_BACKEND || "openai"
const SCHOOL_CODE = process.env.SCHOOL_CODE || "bishop-state"
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

interface ModelResponse {
  text: string
}

async function callOllama(model: string, prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 1024,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.response
}

async function callOpenAI(prompt: string, maxTokens: number): Promise<string> {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxTokens,
  })
  return result.text
}

/**
 * Generate a course pairing explanation.
 *
 * Routes to the school's fine-tuned explainer model via Ollama,
 * or falls back to OpenAI GPT-4o-mini.
 */
export async function generateExplanation(
  prompt: string,
  maxTokens: number = 320,
): Promise<string> {
  if (MODEL_BACKEND === "ollama") {
    const modelSize = process.env.MODEL_SIZE || "9b"
    const model = `${SCHOOL_CODE}-explainer:${modelSize}`
    return callOllama(model, prompt)
  }
  return callOpenAI(prompt, maxTokens)
}

/**
 * Generate a query result summary.
 *
 * Routes to the school's fine-tuned summarizer model via Ollama,
 * or falls back to OpenAI GPT-4o-mini.
 */
export async function generateSummary(
  prompt: string,
  maxTokens: number = 200,
): Promise<string> {
  if (MODEL_BACKEND === "ollama") {
    const modelSize = process.env.MODEL_SIZE || "9b"
    const model = `${SCHOOL_CODE}-summarizer:${modelSize}`
    return callOllama(model, prompt)
  }
  return callOpenAI(prompt, maxTokens)
}
```

- [ ] **Step 2: Commit**

```bash
git add codebenders-dashboard/lib/model-client.ts
git commit -m "feat(dashboard): model client adapter for Ollama/OpenAI routing"
```

---

## Task 12: Integrate Model Client into API Routes

**Files:**
- Modify: `codebenders-dashboard/app/api/courses/explain-pairing/route.ts`
- Modify: `codebenders-dashboard/app/api/query-summary/route.ts`

- [ ] **Step 1: Update explain-pairing route**

In `codebenders-dashboard/app/api/courses/explain-pairing/route.ts`, replace the inline OpenAI call with the model client.

Find the import section and add:
```typescript
import { generateExplanation } from "@/lib/model-client"
```

Find the `generateText` call block (approximately lines 192-196) and replace:
```typescript
// Before:
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: llmPrompt,
  maxTokens: 320,
})

// After:
const text = await generateExplanation(llmPrompt, 320)
```

Remove the now-unused inline OpenAI client imports if they become unreferenced after this change.

- [ ] **Step 2: Update query-summary route**

In `codebenders-dashboard/app/api/query-summary/route.ts`, replace the inline OpenAI call with the model client.

Add import:
```typescript
import { generateSummary } from "@/lib/model-client"
```

Find the `generateText` call (approximately lines 50-54) and replace:
```typescript
// Before:
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: llmPrompt,
  maxTokens: 200,
})

// After:
const text = await generateSummary(llmPrompt, 200)
```

Remove unused inline OpenAI client imports.

- [ ] **Step 3: Verify dashboard builds**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add codebenders-dashboard/app/api/courses/explain-pairing/route.ts \
       codebenders-dashboard/app/api/query-summary/route.ts
git commit -m "feat(dashboard): route explain-pairing and query-summary through model client"
```

---

## Task 13: Run All Tests and Final Verification

- [ ] **Step 1: Run full Python test suite**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Verify dashboard builds**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Verify pipeline CLI entry points**

Run:
```bash
cd /Users/william-meroxa/Development/codebenders-datathon
venv/bin/python -m training.distill --help
venv/bin/python -m training.prepare --help
venv/bin/python -m training.finetune --help
venv/bin/python -m training.eval --help
venv/bin/python -m training.export --help
```
Expected: Each prints usage without errors

- [ ] **Step 4: Verify config loads end-to-end**

Run: `cd /Users/william-meroxa/Development/codebenders-datathon && venv/bin/python -c "from training.config import load_school_config; c = load_school_config('bishop-state'); print(f'School: {c[\"school\"][\"name\"]}'); print(f'Programs: {len(c[\"domain\"][\"programs\"])}'); print(f'Student columns: {len(c[\"schema\"][\"student_columns\"])}'); print(f'Course columns: {len(c[\"schema\"][\"course_columns\"])}')"`
Expected: Prints school name, program count, and column counts without errors
