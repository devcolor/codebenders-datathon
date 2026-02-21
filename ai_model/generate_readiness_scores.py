"""
Readiness Score Rule Engine (Option C)
=======================================
Generates student readiness assessments using a deterministic rule-based
scoring system. Scores are fully traceable to their inputs and rules.

FERPA compliance: PII (Student_GUID, zip code) is stripped from input_features
before storage. The Student_GUID is kept only as a foreign key identifier.

Upgrade path: Option A (Ollama LLM) can write to the same table using
source='ollama' and model_version='llama3.2:3b'. No schema or frontend changes
needed. The UPSERT uses ON CONFLICT ("Student_GUID") — each run overwrites the
previous score for that student (latest always wins per student).

Usage:
    venv/bin/python ai_model/generate_readiness_scores.py
"""

import json
import sys
import os
import time
import uuid
import argparse
from datetime import datetime, timezone

import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor

# Ensure project root is on sys.path so `operations` package resolves
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from operations.db_config import DB_CONFIG

# ============================================================================
# Constants
# ============================================================================

SOURCE = "rule_engine"
MODEL_VERSION = "rules_v1"
MODEL_NAME = "Bishop State Rule Engine v1"
TRIGGERED_BY = "manual"

# Readiness level thresholds
THRESHOLD_HIGH = 0.65
THRESHOLD_MEDIUM = 0.40

# Sub-score weights (must sum to 1.0)
WEIGHT_ACADEMIC = 0.40
WEIGHT_ENGAGEMENT = 0.30
WEIGHT_ML = 0.30

# Alert level → readiness component mapping (inverted risk = readiness)
ALERT_MAP = {
    "URGENT": 0.1,
    "HIGH": 0.3,
    "MODERATE": 0.6,
    "LOW": 0.9,
}


# ============================================================================
# Database helpers
# ============================================================================

def get_connection():
    """Create a psycopg2 connection using project DB_CONFIG."""
    conn = psycopg2.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        dbname=DB_CONFIG["database"],
        port=DB_CONFIG["port"],
        cursor_factory=RealDictCursor,
    )
    return conn


def create_run_record(conn) -> str:
    """Insert a new run record and return its UUID."""
    run_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS readiness_generation_runs (
                run_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at    TIMESTAMPTZ,
                source          TEXT NOT NULL,
                model_version   TEXT NOT NULL,
                students_input  INTEGER,
                students_scored INTEGER,
                errors          INTEGER DEFAULT 0,
                error_sample    JSONB,
                triggered_by    TEXT DEFAULT 'manual'
            )
            """
        )
        cur.execute(
            """
            INSERT INTO readiness_generation_runs
                (run_id, started_at, source, model_version, triggered_by)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (run_id, datetime.now(timezone.utc), SOURCE, MODEL_VERSION, TRIGGERED_BY),
        )
    conn.commit()
    return run_id


def complete_run_record(conn, run_id: str, stats: dict):
    """Update the run record with completion stats."""
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE readiness_generation_runs
            SET
                completed_at    = %s,
                students_input  = %s,
                students_scored = %s,
                errors          = %s,
                error_sample    = %s
            WHERE run_id = %s
            """,
            (
                datetime.now(timezone.utc),
                stats["students_input"],
                stats["students_scored"],
                stats["errors"],
                json.dumps(stats.get("error_sample", [])) if stats.get("error_sample") else None,
                run_id,
            ),
        )
    conn.commit()


def save_scores(records: list, run_id: str, conn):
    """Bulk upsert scored records into llm_recommendations."""
    if not records:
        return

    upsert_sql = """
        INSERT INTO llm_recommendations (
            "Student_GUID", "Institution_ID", "Cohort", "Cohort_Term",
            readiness_score, readiness_level,
            rationale, risk_factors, suggested_actions,
            model_name, generated_at,
            source, model_version, input_features, generation_ms, run_id
        ) VALUES (
            %(Student_GUID)s, %(Institution_ID)s, %(Cohort)s, %(Cohort_Term)s,
            %(readiness_score)s, %(readiness_level)s,
            %(rationale)s, %(risk_factors)s, %(suggested_actions)s,
            %(model_name)s, %(generated_at)s,
            %(source)s, %(model_version)s, %(input_features)s, %(generation_ms)s, %(run_id)s
        )
        ON CONFLICT ("Student_GUID") DO UPDATE SET
            "Institution_ID"  = EXCLUDED."Institution_ID",
            "Cohort"          = EXCLUDED."Cohort",
            "Cohort_Term"     = EXCLUDED."Cohort_Term",
            readiness_score   = EXCLUDED.readiness_score,
            readiness_level   = EXCLUDED.readiness_level,
            rationale         = EXCLUDED.rationale,
            risk_factors      = EXCLUDED.risk_factors,
            suggested_actions = EXCLUDED.suggested_actions,
            model_name        = EXCLUDED.model_name,
            generated_at      = EXCLUDED.generated_at,
            source            = EXCLUDED.source,
            model_version     = EXCLUDED.model_version,
            input_features    = EXCLUDED.input_features,
            generation_ms     = EXCLUDED.generation_ms,
            run_id            = EXCLUDED.run_id
    """

    with conn.cursor() as cur:
        for record in records:
            cur.execute(upsert_sql, record)
    conn.commit()


# ============================================================================
# Safe profile (FERPA) — strips PII before storage
# ============================================================================

def build_safe_profile(row) -> dict:
    """
    Extract non-PII features for input_features storage.
    Student_GUID and zip code are intentionally excluded.
    """
    def safe_float(val, default=None):
        try:
            f = float(val)
            return None if np.isnan(f) else f
        except (TypeError, ValueError):
            return default

    return {
        "enrollment_type": row.get("Enrollment_Type"),
        "enrollment_intensity": row.get("Enrollment_Intensity_First_Term"),
        "pell_status": row.get("Pell_Status_First_Year"),
        "math_placement": row.get("Math_Placement"),
        "english_placement": row.get("English_Placement"),
        "gpa_year1": safe_float(row.get("GPA_Group_Year_1")),
        "credits_attempted_y1": safe_float(row.get("Number_of_Credits_Attempted_Year_1")),
        "credits_earned_y1": safe_float(row.get("Number_of_Credits_Earned_Year_1")),
        "course_completion_rate": safe_float(row.get("course_completion_rate")),
        "passing_rate": safe_float(row.get("passing_rate")),
        "average_grade": safe_float(row.get("average_grade")),
        "failing_grades_count": safe_float(row.get("failing_grades_count")),
        "gateway_math_completed": row.get("CompletedGatewayMathYear1"),
        "gateway_english_completed": row.get("CompletedGatewayEnglishYear1"),
        "total_courses_enrolled": safe_float(row.get("total_courses_enrolled")),
        "retention_probability": safe_float(row.get("retention_probability")),
        "at_risk_alert": row.get("at_risk_alert"),
        "retention_risk_category": row.get("retention_risk_category"),
    }


# ============================================================================
# Scoring logic
# ============================================================================

def _safe_float(val, default=None):
    """Convert value to float, returning default if null/NaN."""
    try:
        f = float(val)
        return default if np.isnan(f) else f
    except (TypeError, ValueError):
        return default


def compute_readiness(row) -> tuple:
    """
    Compute (readiness_score, readiness_level) from a student row.

    Sub-scores:
        academic_score   (weight 0.40): GPA, completion rate, passing rate, gateway
        engagement_score (weight 0.30): enrollment intensity, total courses
        ml_score         (weight 0.30): retention probability, at-risk alert (inverted)
    """
    # --- Academic sub-score ---
    gpa = _safe_float(row.get("GPA_Group_Year_1"))
    gpa_component = min(gpa / 4.0, 1.0) if gpa is not None else 0.5

    completion_rate = _safe_float(row.get("course_completion_rate"))
    completion_component = completion_rate if completion_rate is not None else 0.5

    passing_rate = _safe_float(row.get("passing_rate"))
    passing_component = passing_rate if passing_rate is not None else 0.5

    math_done = str(row.get("CompletedGatewayMathYear1", "")).strip().upper() in ("1", "Y", "YES", "TRUE", "C")
    english_done = str(row.get("CompletedGatewayEnglishYear1", "")).strip().upper() in ("1", "Y", "YES", "TRUE", "C")
    gateway_component = 0.5 + (0.25 if math_done else 0.0) + (0.25 if english_done else 0.0)

    credits_y1 = _safe_float(row.get("Number_of_Credits_Earned_Year_1"))
    if credits_y1 is None:
        credit_momentum_component = 0.5
    elif credits_y1 >= 12:
        credit_momentum_component = 1.0   # PDP 12-credit momentum milestone
    elif credits_y1 >= 6:
        credit_momentum_component = 0.6
    else:
        credit_momentum_component = 0.3

    academic_score = np.mean([gpa_component, completion_component, passing_component,
                              gateway_component, credit_momentum_component])

    # --- Engagement sub-score ---
    intensity = str(row.get("Enrollment_Intensity_First_Term", "")).strip().upper()
    if intensity in ("FT", "FULL-TIME", "FULL TIME", "FULL_TIME"):
        intensity_score = 1.0
    elif intensity in ("PT", "PART-TIME", "PART TIME", "PART_TIME", "LE", "LESS THAN HALF TIME"):
        intensity_score = 0.5
    else:
        intensity_score = 0.3

    total_courses = _safe_float(row.get("total_courses_enrolled"))
    courses_score = min(total_courses / 10.0, 1.0) if total_courses is not None else 0.5

    math_placement = str(row.get("Math_Placement", "")).strip().upper()
    math_placement_score = {"C": 1.0, "R": 0.2, "N": 0.5}.get(math_placement, 0.5)

    engagement_score = np.mean([intensity_score, courses_score, math_placement_score])

    # --- ML sub-score (inverted risk = readiness) ---
    retention_prob = _safe_float(row.get("retention_probability"))
    retention_component = retention_prob if retention_prob is not None else 0.5

    alert = str(row.get("at_risk_alert", "")).strip().upper()
    alert_component = ALERT_MAP.get(alert, 0.5)

    ml_score = np.mean([retention_component, alert_component])

    # --- Composite ---
    readiness_score = (
        academic_score * WEIGHT_ACADEMIC
        + engagement_score * WEIGHT_ENGAGEMENT
        + ml_score * WEIGHT_ML
    )
    readiness_score = float(np.clip(readiness_score, 0.0, 1.0))

    if readiness_score >= THRESHOLD_HIGH:
        readiness_level = "high"
    elif readiness_score >= THRESHOLD_MEDIUM:
        readiness_level = "medium"
    else:
        readiness_level = "low"

    return readiness_score, readiness_level


def build_risk_factors(row) -> list:
    """Return list of human-readable risk factor strings."""
    factors = []

    gpa = _safe_float(row.get("GPA_Group_Year_1"))
    if gpa is not None and gpa < 2.0:
        factors.append(f"Low first-year GPA ({gpa:.1f} / 4.0)")

    failing = _safe_float(row.get("failing_grades_count"), 0)
    total = _safe_float(row.get("total_courses_enrolled"), 0)
    if total and total > 0 and failing / total > 0.2:
        pct = (failing / total) * 100
        factors.append(f"High course failure rate ({pct:.0f}% of courses failed)")

    intensity = str(row.get("Enrollment_Intensity_First_Term", "")).strip().upper()
    if intensity in ("PT", "PART-TIME", "PART TIME", "PART_TIME", "LE", "LESS THAN HALF TIME"):
        factors.append("Part-time enrollment reduces success probability")

    math_done = str(row.get("CompletedGatewayMathYear1", "")).strip().upper() in ("1", "Y", "YES", "TRUE", "C")
    if not math_done:
        factors.append("Gateway math not completed in Year 1")

    english_done = str(row.get("CompletedGatewayEnglishYear1", "")).strip().upper() in ("1", "Y", "YES", "TRUE", "C")
    if not english_done:
        factors.append("Gateway English not completed in Year 1")

    credits_y1 = _safe_float(row.get("Number_of_Credits_Earned_Year_1"))
    if credits_y1 is not None and credits_y1 < 12:
        factors.append(f"Below 12-credit Year 1 milestone ({int(credits_y1)} credits earned)")

    alert = str(row.get("at_risk_alert", "")).strip().upper()
    if alert in ("URGENT", "HIGH"):
        display_alert = alert.capitalize()
        factors.append(f"Retention model flags as {display_alert} risk")

    completion = _safe_float(row.get("course_completion_rate"))
    if completion is not None and completion < 0.75:
        factors.append(f"Below average course completion rate ({completion * 100:.0f}%)")

    return factors


def build_suggested_actions(risk_factors: list) -> list:
    """Return suggested actions keyed to which risk factors fired."""
    actions = []
    factor_text = " ".join(risk_factors).lower()

    if "low first-year gpa" in factor_text:
        actions.append("Connect with academic advisor for tutoring resources")

    if "course failure rate" in factor_text:
        actions.append("Review course load and consider academic support services")

    if "part-time enrollment" in factor_text:
        actions.append("Explore full-time enrollment options and financial aid")

    if "gateway math not completed" in factor_text:
        actions.append("Prioritize gateway math enrollment next term")

    if "gateway english not completed" in factor_text:
        actions.append("Prioritize gateway English enrollment next term")

    if "urgent risk" in factor_text or "high risk" in factor_text:
        actions.append("Immediate outreach recommended — high dropout risk")

    if "below average course completion" in factor_text:
        actions.append("Review course withdrawal patterns with advisor")

    if "12-credit year 1 milestone" in factor_text:
        actions.append("Increase credit load to reach 12-credit first-year milestone")

    return actions


def build_rationale(row, score: float, level: str) -> str:
    """Return a single-sentence rationale string."""
    gpa = _safe_float(row.get("GPA_Group_Year_1"))
    gpa_str = f"{gpa:.1f}" if gpa is not None else "N/A"

    completion = _safe_float(row.get("course_completion_rate"))
    completion_pct = f"{completion * 100:.0f}" if completion is not None else "N/A"

    intensity = str(row.get("Enrollment_Intensity_First_Term", "unknown")).strip()

    total = _safe_float(row.get("total_courses_enrolled"))
    n_courses = f"{int(total)}" if total is not None else "N/A"

    alert = str(row.get("at_risk_alert", "unknown")).strip()

    retention_prob = _safe_float(row.get("retention_probability"))
    retention_pct = f"{retention_prob * 100:.0f}" if retention_prob is not None else "N/A"

    return (
        f"Readiness score of {score:.2f} ({level}) based on: academic performance "
        f"(GPA {gpa_str}/4.0, {completion_pct}% course completion), engagement "
        f"({intensity} enrollment, {n_courses} courses), and ML risk assessment "
        f"({alert} alert, {retention_pct}% predicted retention)."
    )


def score_student(row) -> dict:
    """
    Pure scoring function for a single student row.
    Returns a dict ready for DB insertion (all non-DB columns resolved).
    Timing is measured outside this function for flexibility.
    """
    score, level = compute_readiness(row)
    risk_factors = build_risk_factors(row)
    suggested_actions = build_suggested_actions(risk_factors)
    rationale = build_rationale(row, score, level)
    safe_profile = build_safe_profile(row)

    return {
        "Student_GUID": row.get("Student_GUID"),
        "Institution_ID": str(row.get("Institution_ID", "") or ""),
        "Cohort": str(row.get("Cohort", "") or ""),
        "Cohort_Term": str(row.get("Cohort_Term", "") or ""),
        "readiness_score": round(score, 4),
        "readiness_level": level,
        "rationale": rationale,
        "risk_factors": json.dumps(risk_factors),
        "suggested_actions": json.dumps(suggested_actions),
        "model_name": MODEL_NAME,
        "generated_at": datetime.now(timezone.utc),
        "source": SOURCE,
        "model_version": MODEL_VERSION,
        "input_features": json.dumps(safe_profile),
        "generation_ms": None,  # filled in main()
        "run_id": None,          # filled in main()
    }


# ============================================================================
# LLM Enrichment (optional)
# ============================================================================

def enrich_with_llm(record: dict, model: str) -> dict:
    """
    Replace rationale and suggested_actions with LLM-generated content.
    Only called for medium/low readiness students.
    Input is the FERPA-safe profile — no PII sent to any external service.
    Returns the record with enriched text fields (score unchanged).

    Provider is determined by the model string:
      "gpt-4o-mini"               -> OpenAI (requires OPENAI_API_KEY)
      "ollama/llama3.2:3b"        -> local Ollama (no key needed)
      "claude-haiku-4-5-20251001" -> Anthropic (requires ANTHROPIC_API_KEY)

    litellm is imported lazily so the default (no-flag) run has no extra
    dependencies and installs faster in minimal environments.
    """
    import litellm as _litellm  # lazy import — only needed with --enrich-with-llm
    from litellm import completion as llm_completion
    _litellm.telemetry = False  # opt out of LiteLLM usage telemetry

    profile = json.loads(record["input_features"]) if isinstance(record["input_features"], str) else record["input_features"]
    risk_factors = json.loads(record["risk_factors"]) if isinstance(record["risk_factors"], str) else []

    prompt = f"""You are an academic advisor assistant at Bishop State Community College.
A student has a readiness score of {record['readiness_score']:.2f} ({record['readiness_level']} readiness).

Student profile (no PII):
- Enrollment: {profile.get('enrollment_type')} / {profile.get('enrollment_intensity')}
- First-year GPA: {profile.get('gpa_year1')}
- Course completion rate: {profile.get('course_completion_rate')}
- Gateway math completed: {profile.get('gateway_math_completed')}
- Gateway English completed: {profile.get('gateway_english_completed')}
- Credits earned Year 1: {profile.get('credits_earned_y1')}
- Math placement: {profile.get('math_placement')}
- At-risk alert: {profile.get('at_risk_alert')}
- Retention probability: {profile.get('retention_probability')}

Identified risk factors:
{chr(10).join(f'- {f}' for f in risk_factors)}

Write two things:
1. RATIONALE: A 2-sentence explanation of this student's readiness score for an advisor.
2. ACTIONS: A JSON array of 3-5 specific, actionable intervention recommendations (strings only).

Format your response exactly as:
RATIONALE: <text>
ACTIONS: <json array>"""

    try:
        response = llm_completion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.3,
        )
        text = response.choices[0].message.content.strip()

        rationale_line = next((l for l in text.split("\n") if l.startswith("RATIONALE:")), None)
        actions_line = next((l for l in text.split("\n") if l.startswith("ACTIONS:")), None)

        if rationale_line:
            record["rationale"] = rationale_line.replace("RATIONALE:", "").strip()
        if actions_line:
            raw_actions = actions_line.replace("ACTIONS:", "").strip()
            try:
                json.loads(raw_actions)  # validate parseable JSON before storing
                record["suggested_actions"] = raw_actions
            except json.JSONDecodeError:
                pass  # keep rule-generated suggested_actions on malformed LLM output

    except Exception as e:
        print(f"  ⚠ LLM enrichment failed for {record['Student_GUID']}: {e}")
        # Falls back silently to rule-generated text

    return record


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Generate student readiness scores")
    parser.add_argument(
        "--enrich-with-llm",
        action="store_true",
        help="Enrich rationale and suggested_actions for medium/low students via LiteLLM",
    )
    parser.add_argument(
        "--llm-model",
        default="gpt-4o-mini",
        help=(
            "LiteLLM model string (default: gpt-4o-mini). Examples: "
            "'ollama/llama3.2:3b', 'claude-haiku-4-5-20251001'. "
            "Credentials resolved automatically from environment variables."
        ),
    )
    args = parser.parse_args()

    if args.enrich_with_llm:
        print(f"✓ LLM enrichment enabled — model: {args.llm_model}")
        print("  (medium/low readiness students only; score is never changed)")

    print("=" * 70)
    print("READINESS SCORE RULE ENGINE")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    conn = get_connection()
    print("✓ Connected to database")

    # 1. Create run record
    run_id = create_run_record(conn)
    print(f"✓ Run record created: {run_id}")

    # 2. Load student predictions
    print("\nLoading student_level_with_predictions...")
    with conn.cursor() as cur:
        cur.execute('SELECT * FROM student_level_with_predictions')
        rows = cur.fetchall()
    df = pd.DataFrame([dict(r) for r in rows])
    print(f"✓ Loaded {len(df):,} students")

    if df.empty:
        print("✗ No student data found. Aborting.")
        conn.close()
        return

    # 3. Score each student
    print("\nScoring students...")
    records = []
    errors = 0
    error_sample = []

    for _, row in df.iterrows():
        t0 = time.monotonic()
        try:
            record = score_student(row)
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            record["generation_ms"] = elapsed_ms
            record["run_id"] = run_id
            if args.enrich_with_llm and record["readiness_level"] in ("medium", "low"):
                record = enrich_with_llm(record, args.llm_model)
            records.append(record)
        except Exception as e:
            errors += 1
            if len(error_sample) < 5:
                error_sample.append({
                    "Student_GUID": str(row.get("Student_GUID", "unknown")),
                    "error": str(e),
                })

    print(f"✓ Scored {len(records):,} students ({errors} errors)")

    # 4. Bulk upsert
    print(f"\nUpserting {len(records):,} records into llm_recommendations...")
    save_scores(records, run_id, conn)
    print("✓ Upsert complete")

    # 5. Complete run record
    stats = {
        "students_input": len(df),
        "students_scored": len(records),
        "errors": errors,
        "error_sample": error_sample if error_sample else None,
    }
    complete_run_record(conn, run_id, stats)
    print("✓ Run record completed")

    # 6. Summary
    if records:
        scores = [r["readiness_score"] for r in records]
        levels = [r["readiness_level"] for r in records]
        high = levels.count("high")
        med = levels.count("medium")
        low = levels.count("low")

        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"  Students scored:  {len(records):,}")
        print(f"  High readiness:   {high:,}  ({high/len(records)*100:.1f}%)")
        print(f"  Medium readiness: {med:,}  ({med/len(records)*100:.1f}%)")
        print(f"  Low readiness:    {low:,}  ({low/len(records)*100:.1f}%)")
        print(f"  Avg score:        {np.mean(scores):.4f}")
        print(f"  Min score:        {np.min(scores):.4f}")
        print(f"  Max score:        {np.max(scores):.4f}")
        print(f"  Errors:           {errors}")
        print(f"  Run ID:           {run_id}")
        print("=" * 70)

    conn.close()
    print("\n✓ Done.")


if __name__ == "__main__":
    main()
