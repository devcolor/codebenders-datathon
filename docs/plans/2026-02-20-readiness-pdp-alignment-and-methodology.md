# Readiness Scoring: PDP Alignment, Methodology Docs & LLM Enrichment

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the readiness rule engine with PDP momentum metrics, document the methodology with proper research citations, add a frontend methodology page, and implement optional LLM-based recommendation enrichment using OpenAI.

**Architecture:** The rule engine (Option C) remains the authoritative scoring source — deterministic, FERPA-safe, fully traceable. LLM enrichment is an optional post-processing step that replaces only the `rationale` and `suggested_actions` text fields for medium/low readiness students, never the numeric score. A new `codebenders-dashboard/app/methodology/page.tsx` provides a human-readable explanation of the approach with research citations.

**Tech Stack:** Python 3.8+ (rule engine), OpenAI Python SDK (enrichment), Next.js 16 / React 19 / Tailwind CSS (methodology page), PostgreSQL (Supabase), shadcn/ui components.

---

## Context: Why These Changes

### PDP Alignment Gaps (from research audit)
The Postsecondary Data Partnership uses **momentum metrics** as leading indicators of student success. Two PDP metrics are absent from the current rule engine:

1. **12-credit Year 1 milestone** — completing ≥12 credits in the first year is the single strongest PDP leading indicator. We have `Number_of_Credits_Earned_Year_1` but don't score it.
2. **Math placement as a direct input** — our XGBoost model found `Math_Placement` has 35.1% feature importance (highest of all features), yet the rule engine only captures gateway completion (a downstream outcome), not placement itself. `Math_Placement` values in the data: `C` (college-level), `R` (remedial), `N` (none/unknown).

### LLM Feasibility Conclusion
Using an LLM to *score* readiness is not recommended — scores must be deterministic, auditable, and FERPA-safe. Using an LLM to *narrate* personalized intervention recommendations is **feasible and well-suited**: we send only the FERPA-safe profile (no GUID/PII) + the rule engine score to an LLM, receive enriched natural language, and store it in the existing `rationale` and `suggested_actions` fields. The numeric score never changes. This maps directly to how Civitas Learning and similar platforms use generative AI in higher ed. **LiteLLM** is used as the provider interface so the model (OpenAI, Ollama, Anthropic, Azure, etc.) is a runtime flag — no code changes needed to switch providers.

---

## Task 1: Create `docs/READINESS_METHODOLOGY.md`

**Files:**
- Create: `docs/READINESS_METHODOLOGY.md`

**Step 1: Create the file with the following content**

```markdown
# Student Readiness Assessment Methodology

**Version:** rules_v1
**Last Updated:** 2026-02-20
**Script:** `ai_model/generate_readiness_scores.py`
**Table:** `llm_recommendations`

---

## Overview

The Bishop State Student Readiness Assessment scores each student on a 0.0–1.0 scale using a weighted combination of three evidence-based sub-scores. The methodology is aligned with the **Postsecondary Data Partnership (PDP)** momentum metrics framework and validated by Community College Research Center (CCRC) research on multiple measures assessment.

Every score is fully traceable to its inputs via the `input_features` JSONB column. No personally identifiable information (PII) is stored in scoring inputs (FERPA §99.31).

---

## Research Foundation

### Postsecondary Data Partnership (PDP) — National Student Clearinghouse
The PDP defines **leading indicators** (early momentum metrics) and **lagging indicators** (outcomes) for community college student success. Our scoring directly incorporates the PDP's four core momentum metrics:

| PDP Metric | Our Feature | Sub-Score |
|---|---|---|
| Gateway math completion Year 1 | `CompletedGatewayMathYear1` | Academic (gateway component) |
| Gateway English completion Year 1 | `CompletedGatewayEnglishYear1` | Academic (gateway component) |
| Credit completion ratio | `course_completion_rate` | Academic |
| Credit accumulation (≥12 credits Year 1) | `Number_of_Credits_Earned_Year_1` | Academic (momentum component) |
| Enrollment intensity | `Enrollment_Intensity_First_Term` | Engagement |

> Source: [Postsecondary Data Partnership Metrics, National Student Clearinghouse](https://www.studentclearinghouse.org/academy/courses/postsecondary-data-partnership-an-introduction/lessons/the-postsecondary-data-partnership-metrics/)

### Multiple Measures Assessment — CCRC / CAPR
Research by the Community College Research Center (CCRC) and Center for the Analysis of Postsecondary Readiness (CAPR) demonstrates that combining multiple academic indicators — GPA, placement level, course completion, and gateway outcomes — produces more accurate and equitable student assessments than any single metric.

> Source: [Modernizing College Course Placement by Using Multiple Measures, CCRC](https://ccrc.tc.columbia.edu/publications/modernizing-college-course-placement-multiple-measures.html)
> Source: [Lessons From Two Experimental Studies of Multiple Measures Assessment, CCRC/CAPR](https://ccrc.tc.columbia.edu/publications/multiple-measures-assessment-lessons-capr.html)

### Transparency in Predictive Analytics
Bird, Castleman, Mabel & Song (2021) found that advisors distrusted and underused opaque machine learning predictions in higher education settings. Transparent, rule-based scoring with human-readable explanations improves adoption and intervention rates.

> Source: [Bringing Transparency to Predictive Analytics, Bird et al. (2021), AERA Open](https://journals.sagepub.com/doi/full/10.1177/23328584211037630)

### Math Placement as a Predictor
Our own XGBoost retention model found `Math_Placement` to be the single most important feature (35.1% of model importance). This aligns with extensive research on math placement as a gateway to college-level coursework and long-term credential completion.

---

## Scoring Formula

```
readiness_score = (academic_score × 0.40)
                + (engagement_score × 0.30)
                + (ml_score × 0.30)
```

### Readiness Levels
| Score | Level |
|---|---|
| ≥ 0.65 | high |
| ≥ 0.40 | medium |
| < 0.40 | low |

---

## Sub-Scores

### Academic Score (weight: 0.40)
Average of five equally-weighted components:

| Component | Source Field | Calculation |
|---|---|---|
| GPA | `GPA_Group_Year_1` | `min(gpa / 4.0, 1.0)` — null → 0.5 |
| Course completion | `course_completion_rate` | direct — null → 0.5 |
| Passing rate | `passing_rate` | direct — null → 0.5 |
| Gateway completion | `CompletedGatewayMathYear1`, `CompletedGatewayEnglishYear1` | 0.5 + 0.25 per gateway completed |
| Credit momentum | `Number_of_Credits_Earned_Year_1` | ≥12 → 1.0, ≥6 → 0.6, <6 → 0.3, null → 0.5 |

The credit momentum component directly implements the PDP's 12-credit Year 1 milestone.

### Engagement Score (weight: 0.30)
Average of three components:

| Component | Source Field | Calculation |
|---|---|---|
| Enrollment intensity | `Enrollment_Intensity_First_Term` | FT → 1.0, PT/LE → 0.5, unknown → 0.3 |
| Courses enrolled | `total_courses_enrolled` | `min(courses / 10.0, 1.0)` — null → 0.5 |
| Math placement | `Math_Placement` | C → 1.0, N → 0.5, R → 0.2 |

Math placement is included here because it reflects incoming academic preparation (an engagement/readiness predictor), not a gateway outcome. It mirrors the research finding that pre-enrollment placement level is among the strongest early indicators.

### ML Score (weight: 0.30)
Inverts ML-predicted risk into a readiness signal:

| Component | Source Field | Calculation |
|---|---|---|
| Retention probability | `retention_probability` | direct (higher = more ready) — null → 0.5 |
| At-risk alert | `at_risk_alert` | URGENT→0.1, HIGH→0.3, MODERATE→0.6, LOW→0.9 — unknown → 0.5 |

---

## FERPA Compliance

The `input_features` JSONB column stores a stripped profile containing no PII:
- **Excluded:** `Student_GUID`, zip code, name, date of birth, address
- **Included:** Aggregate behavioral metrics (GPA group, completion rate, placement level, enrollment type)

This satisfies FERPA §99.31(a)(1) for legitimate educational interest use. No student-level data is transmitted to external services in the rule engine path.

---

## LLM Recommendation Enrichment (Optional)

The numeric readiness score is always computed by the rule engine. Optionally, personalized narrative recommendations can be generated using OpenAI's API:

```
Rule engine score (deterministic) → FERPA-safe profile + score → OpenAI API
                                                                 → enriched rationale
                                                                 → enriched suggested_actions
```

**What changes:** Only the `rationale` and `suggested_actions` text fields.
**What never changes:** `readiness_score`, `readiness_level`, `source`, `model_version`, `input_features`.

Run with enrichment:
```bash
venv/bin/python ai_model/generate_readiness_scores.py --enrich-with-llm
```

The enrichment targets only medium and low readiness students (those most likely to benefit from a personalized intervention narrative). High readiness students retain rule-generated text.

---

## Limitations

1. **No behavioral engagement data.** CCSSE/SENSE research identifies help-seeking behavior, faculty interaction, and first-week engagement as strong predictors — none of which are captured in administrative records.
2. **Weights are not empirically learned.** The 0.40/0.30/0.30 sub-score weights and component weights within each sub-score reflect the PDP's emphasis on academic indicators but have not been validated against Bishop State outcome data. An ML-trained readiness model (Option B) could learn optimal weights from historical data.
3. **Static thresholds.** The high/medium/low thresholds (0.65, 0.40) are heuristic. Institutions implementing PDP dashboards typically calibrate thresholds to their own cohort distributions.

---

## Upgrade Path

| Option | Description | Schema changes |
|---|---|---|
| Option C (current) | Rule engine, deterministic | — |
| Option C+ | Rule engine + OpenAI narrative enrichment | None |
| Option A | Ollama local LLM scoring (replaces score) | None — same table, `source='ollama'` |
| Option B | ML-trained readiness model (learned weights) | None — same table, `source='ml_model'` |
```

**Step 2: Verify file was created**

```bash
ls -la docs/READINESS_METHODOLOGY.md
```

Expected: file exists, non-zero size.

**Step 3: Commit**

```bash
git add docs/READINESS_METHODOLOGY.md
git commit -m "docs: add readiness methodology with PDP citations and LLM feasibility"
```

---

## Task 2: Update `ML_MODELS_GUIDE.md` to reference readiness methodology

**Files:**
- Modify: `ML_MODELS_GUIDE.md`

**Step 1: Add a Readiness Scoring section to the Summary Table**

Find the Summary Table (around line 22) and add a row:

```markdown
| **9. Readiness Score** | How prepared is this student for success? | Rule-based | Advisor prioritization & intervention planning |
```

**Step 2: Add a new section after the 8-model descriptions**

At the end of the models section, add:

```markdown
---

## 📐 Model 9: Student Readiness Score (Rule-Based)

**Type:** Weighted rule engine (not ML)
**Output:** `readiness_score` (0.0–1.0), `readiness_level` (high/medium/low)
**Table:** `llm_recommendations`
**Script:** `ai_model/generate_readiness_scores.py`

Unlike the 8 ML models above, the readiness score is a **deterministic rule-based system** aligned with Postsecondary Data Partnership (PDP) momentum metrics. It combines:

- **Academic sub-score (40%):** GPA, course completion rate, passing rate, gateway course completion, and Year 1 credit momentum (≥12 credits)
- **Engagement sub-score (30%):** Enrollment intensity, total courses enrolled, math placement level
- **ML risk sub-score (30%):** Retention probability and at-risk alert from Models 1 & 2 (inverted — higher retention probability = higher readiness)

See [`docs/READINESS_METHODOLOGY.md`](docs/READINESS_METHODOLOGY.md) for full formula, research citations, and upgrade path.

To regenerate scores:
```bash
venv/bin/python ai_model/generate_readiness_scores.py
```
```

**Step 3: Commit**

```bash
git add ML_MODELS_GUIDE.md
git commit -m "docs: add readiness score section to ML models guide"
```

---

## Task 3: Update rule engine with PDP-aligned improvements

**Files:**
- Modify: `ai_model/generate_readiness_scores.py`

This task makes three targeted changes to `compute_readiness()`, `build_safe_profile()`, and `build_risk_factors()`:

### Change 1: Add `credit_momentum_component` to academic sub-score

In `compute_readiness()`, find the academic sub-score section and replace:

**Before:**
```python
    gateway_component = 0.5 + (0.25 if math_done else 0.0) + (0.25 if english_done else 0.0)

    academic_score = np.mean([gpa_component, completion_component, passing_component, gateway_component])
```

**After:**
```python
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
```

### Change 2: Add `math_placement_component` to engagement sub-score

In `compute_readiness()`, find the engagement sub-score section and replace:

**Before:**
```python
    total_courses = _safe_float(row.get("total_courses_enrolled"))
    courses_score = min(total_courses / 10.0, 1.0) if total_courses is not None else 0.5

    engagement_score = np.mean([intensity_score, courses_score])
```

**After:**
```python
    total_courses = _safe_float(row.get("total_courses_enrolled"))
    courses_score = min(total_courses / 10.0, 1.0) if total_courses is not None else 0.5

    math_placement = str(row.get("Math_Placement", "")).strip().upper()
    math_placement_score = {"C": 1.0, "R": 0.2, "N": 0.5}.get(math_placement, 0.5)

    engagement_score = np.mean([intensity_score, courses_score, math_placement_score])
```

### Change 3: Add credit momentum to safe profile

In `build_safe_profile()`, add to the returned dict:
```python
        "credits_earned_y1": safe_float(row.get("Number_of_Credits_Earned_Year_1")),
```
(This line already exists in the current safe_profile — verify it's there, no change needed.)

### Change 4: Add credit momentum risk factor

In `build_risk_factors()`, add after the gateway English check:
```python
    credits_y1 = _safe_float(row.get("Number_of_Credits_Earned_Year_1"))
    if credits_y1 is not None and credits_y1 < 12:
        factors.append(f"Below 12-credit Year 1 milestone ({int(credits_y1)} credits earned)")
```

### Change 5: Add suggested action for credit momentum

In `build_suggested_actions()`, add to the factor_text checks:
```python
    if "12-credit year 1 milestone" in factor_text:
        actions.append("Increase credit load to reach 12-credit first-year milestone")
```

**Step 1: Apply all five changes above to `ai_model/generate_readiness_scores.py`**

**Step 2: Re-run the script and verify output**

```bash
venv/bin/python ai_model/generate_readiness_scores.py
```

Expected output:
```
✓ Scored 4,000 students (0 errors)
```

**Step 3: Spot-check that credit momentum appears in risk factors**

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54332 -U postgres -d postgres \
  -c "SELECT risk_factors FROM llm_recommendations WHERE risk_factors LIKE '%12-credit%' LIMIT 3;"
```

Expected: rows returned with credit milestone text.

**Step 4: Verify score distribution shifted slightly (PDP metrics added weight)**

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54332 -U postgres -d postgres \
  -c "SELECT readiness_level, COUNT(*), ROUND(AVG(readiness_score)::numeric,4) FROM llm_recommendations GROUP BY readiness_level;"
```

**Step 5: Commit**

```bash
git add ai_model/generate_readiness_scores.py
git commit -m "feat: add PDP credit momentum and math placement to readiness rule engine"
```

---

## Task 4: Implement optional LLM recommendation enrichment (via LiteLLM)

**Files:**
- Modify: `ai_model/generate_readiness_scores.py`
- Modify: `requirements.txt`

LiteLLM provides a single unified interface to 100+ LLM providers. Swapping providers is a runtime flag — no code changes needed. The enrichment is additive: it only replaces narrative text (`rationale`, `suggested_actions`) for medium/low readiness students. The numeric score is never changed.

Supported providers (examples):
| `--llm-model` value | Provider | Credentials needed |
|---|---|---|
| `gpt-4o-mini` | OpenAI | `OPENAI_API_KEY` |
| `ollama/llama3.2:3b` | Local Ollama | None (free) |
| `claude-haiku-4-5-20251001` | Anthropic | `ANTHROPIC_API_KEY` |
| `azure/gpt-4o` | Azure OpenAI | `AZURE_API_KEY` + `AZURE_API_BASE` |

### Step 1: Add `litellm` to `requirements.txt`

Open `requirements.txt` and add:
```
litellm>=1.40.0
```

Then install it:
```bash
venv/bin/pip install litellm>=1.40.0
```

Expected: installs without error.

### Step 2: Add argparse and litellm imports at the top of the script

After the existing imports, add:
```python
import argparse
import litellm
from litellm import completion as llm_completion

litellm.telemetry = False  # opt out of LiteLLM usage telemetry
```

### Step 3: Add the `enrich_with_llm()` function

Add this function before `main()`:

```python
def enrich_with_llm(record: dict, model: str) -> dict:
    """
    Replace rationale and suggested_actions with LLM-generated content.
    Only called for medium/low readiness students.
    Input is the FERPA-safe profile — no PII sent to any external service.
    Returns the record with enriched text fields (score unchanged).

    Provider is determined by the model string:
      "gpt-4o-mini"              → OpenAI (requires OPENAI_API_KEY)
      "ollama/llama3.2:3b"       → local Ollama (no key needed)
      "claude-haiku-4-5-20251001" → Anthropic (requires ANTHROPIC_API_KEY)
    """
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
            record["suggested_actions"] = actions_line.replace("ACTIONS:", "").strip()

    except Exception as e:
        print(f"  ⚠ LLM enrichment failed for {record['Student_GUID']}: {e}")
        # Falls back silently to rule-generated text

    return record
```

### Step 4: Update `main()` to accept `--enrich-with-llm` and `--llm-model` flags

Replace the `def main():` line and opening with:

```python
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
```

### Step 5: Add enrichment call in the scoring loop

In `main()`, after `record["run_id"] = run_id` and before `records.append(record)`, add:

```python
            if args.enrich_with_llm and record["readiness_level"] in ("medium", "low"):
                record = enrich_with_llm(record, args.llm_model)
```

### Step 6: Verify script runs normally without the flag

```bash
venv/bin/python ai_model/generate_readiness_scores.py
```

Expected: runs normally, identical behavior to before.

### Step 7: (Optional) Test enrichment with a local Ollama model (no API key needed)

If Ollama is running locally with llama3.2:3b pulled:
```bash
venv/bin/python ai_model/generate_readiness_scores.py \
  --enrich-with-llm --llm-model ollama/llama3.2:3b
```

Or with OpenAI:
```bash
OPENAI_API_KEY=<your-key> venv/bin/python ai_model/generate_readiness_scores.py \
  --enrich-with-llm --llm-model gpt-4o-mini
```

Expected: medium/low students have longer, more personalized rationale text in the DB.

### Step 8: Commit

```bash
git add ai_model/generate_readiness_scores.py requirements.txt
git commit -m "feat: add optional LiteLLM narrative enrichment for medium/low readiness students"
```

---

## Task 5: Create `codebenders-dashboard/app/methodology/page.tsx`

**Files:**
- Create: `codebenders-dashboard/app/methodology/page.tsx`

This is a static page (no data fetching needed). It uses only shadcn/ui Card, Badge, and standard Tailwind layout — no new dependencies.

**Step 1: Create the file**

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, BookOpen, Database, FlaskConical, ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Readiness Methodology — Bishop State Student Success Dashboard",
}

const CITATIONS = [
  {
    id: 1,
    authors: "National Student Clearinghouse",
    title: "Postsecondary Data Partnership Metrics",
    url: "https://www.studentclearinghouse.org/academy/courses/postsecondary-data-partnership-an-introduction/lessons/the-postsecondary-data-partnership-metrics/",
    year: "2024",
  },
  {
    id: 2,
    authors: "Community College Research Center (CCRC)",
    title: "Modernizing College Course Placement by Using Multiple Measures",
    url: "https://ccrc.tc.columbia.edu/publications/modernizing-college-course-placement-multiple-measures.html",
    year: "2023",
  },
  {
    id: 3,
    authors: "CCRC / Center for the Analysis of Postsecondary Readiness (CAPR)",
    title: "Lessons From Two Experimental Studies of Multiple Measures Assessment",
    url: "https://ccrc.tc.columbia.edu/publications/multiple-measures-assessment-lessons-capr.html",
    year: "2022",
  },
  {
    id: 4,
    authors: "Bird, Castleman, Mabel & Song",
    title: "Bringing Transparency to Predictive Analytics: A Systematic Comparison of Predictive Modeling Methods in Higher Education",
    url: "https://journals.sagepub.com/doi/full/10.1177/23328584211037630",
    year: "2021",
  },
  {
    id: 5,
    authors: "Achieving the Dream",
    title: "Postsecondary Data Partnership (PDP)",
    url: "https://achievingthedream.org/innovation/postsecondary-data-partnership-pdp/",
    year: "2024",
  },
]

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Readiness Assessment Methodology
          </h1>
          <p className="text-muted-foreground mt-2">
            How student readiness scores are calculated, the research behind the approach, and its alignment with the Postsecondary Data Partnership (PDP) framework.
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline">Version: rules_v1</Badge>
            <Badge variant="outline">Script: generate_readiness_scores.py</Badge>
            <Badge variant="outline">Table: llm_recommendations</Badge>
          </div>
        </div>

        {/* Research Foundation */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Research Foundation</h2>
          </div>
          <p className="text-muted-foreground">
            The scoring methodology is grounded in three bodies of research from leading higher education institutions:
          </p>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Postsecondary Data Partnership (PDP)</CardTitle>
                <CardDescription>National Student Clearinghouse [1][5]</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                The PDP defines <strong>leading indicators</strong> (early momentum metrics) and <strong>lagging indicators</strong> (outcomes) for community college student success.
                Our academic sub-score directly incorporates the PDP's four core momentum metrics: gateway math and English completion, credit completion ratio, and the 12-credit Year 1 milestone.
                The PDP framework itself uses explicit metric thresholds — validating a rule-based approach over black-box ML for institutional reporting contexts.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Multiple Measures Assessment</CardTitle>
                <CardDescription>Community College Research Center (CCRC) / CAPR [2][3]</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                CCRC and CAPR experimental studies found that combining multiple academic indicators — GPA, placement level, course completion, and gateway outcomes —
                significantly outperforms single-measure assessment. Students placed via multiple measures pass gateway courses at equal or higher rates,
                and the effects persist for 3+ semesters. Our scoring is explicitly a multiple-measures system.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transparency in Predictive Analytics</CardTitle>
                <CardDescription>Bird, Castleman, Mabel & Song (2021) [4]</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This study found that advisors distrusted and underused opaque machine learning predictions in higher education settings.
                Transparent, rule-based scoring with human-readable explanations improves advisor adoption and student intervention rates.
                Every readiness score in this system is fully traceable to its inputs via the <code className="text-xs bg-muted px-1 rounded">input_features</code> column.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scoring Formula */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Scoring Formula</h2>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="font-mono text-sm bg-muted p-4 rounded-lg">
                readiness_score = (academic_score × <strong>0.40</strong>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (engagement_score × <strong>0.30</strong>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (ml_score × <strong>0.30</strong>)
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-semibold text-green-700">≥ 0.65</div>
                  <div className="text-green-600">High Readiness</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="font-semibold text-yellow-700">0.40 – 0.64</div>
                  <div className="text-yellow-600">Medium Readiness</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-semibold text-red-700">{'<'} 0.40</div>
                  <div className="text-red-600">Low Readiness</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-scores */}
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Academic Sub-Score</CardTitle>
                  <Badge>Weight: 40%</Badge>
                </div>
                <CardDescription>Average of 5 equally-weighted components (PDP-aligned)</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-1">Component</th><th className="text-left py-1">Source Field</th><th className="text-left py-1">Calculation</th></tr></thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5">GPA</td><td className="py-1.5 font-mono text-xs">GPA_Group_Year_1</td><td className="py-1.5">min(gpa / 4.0, 1.0)</td></tr>
                    <tr className="border-b"><td className="py-1.5">Course completion</td><td className="py-1.5 font-mono text-xs">course_completion_rate</td><td className="py-1.5">direct (0.0–1.0)</td></tr>
                    <tr className="border-b"><td className="py-1.5">Passing rate</td><td className="py-1.5 font-mono text-xs">passing_rate</td><td className="py-1.5">direct (0.0–1.0)</td></tr>
                    <tr className="border-b"><td className="py-1.5">Gateway completion</td><td className="py-1.5 font-mono text-xs">CompletedGateway*Year1</td><td className="py-1.5">0.5 + 0.25 per gateway</td></tr>
                    <tr><td className="py-1.5 font-medium text-foreground">Credit momentum <Badge variant="outline" className="ml-1 text-xs">PDP</Badge></td><td className="py-1.5 font-mono text-xs">Credits_Earned_Year_1</td><td className="py-1.5">≥12→1.0, ≥6→0.6, {'<'}6→0.3</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Engagement Sub-Score</CardTitle>
                  <Badge>Weight: 30%</Badge>
                </div>
                <CardDescription>Average of 3 equally-weighted components</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-1">Component</th><th className="text-left py-1">Source Field</th><th className="text-left py-1">Calculation</th></tr></thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5">Enrollment intensity</td><td className="py-1.5 font-mono text-xs">Enrollment_Intensity_First_Term</td><td className="py-1.5">FT→1.0, PT→0.5, unknown→0.3</td></tr>
                    <tr className="border-b"><td className="py-1.5">Courses enrolled</td><td className="py-1.5 font-mono text-xs">total_courses_enrolled</td><td className="py-1.5">min(courses / 10, 1.0)</td></tr>
                    <tr><td className="py-1.5 font-medium text-foreground">Math placement</td><td className="py-1.5 font-mono text-xs">Math_Placement</td><td className="py-1.5">C→1.0, N→0.5, R→0.2</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">ML Risk Sub-Score</CardTitle>
                  <Badge>Weight: 30%</Badge>
                </div>
                <CardDescription>Inverted ML risk signal — higher retention probability = higher readiness</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-1">Component</th><th className="text-left py-1">Source Field</th><th className="text-left py-1">Calculation</th></tr></thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-1.5">Retention probability</td><td className="py-1.5 font-mono text-xs">retention_probability</td><td className="py-1.5">direct (Model 1 output)</td></tr>
                    <tr><td className="py-1.5">At-risk alert</td><td className="py-1.5 font-mono text-xs">at_risk_alert</td><td className="py-1.5">URGENT→0.1, HIGH→0.3, MODERATE→0.6, LOW→0.9</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FERPA */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">FERPA Compliance</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
              <p>
                The <code className="text-xs bg-muted px-1 rounded">input_features</code> column stores a stripped profile with <strong>no PII</strong>: Student_GUID and zip code are excluded before storage.
                Only aggregate behavioral metrics (GPA group, completion rate, placement level, enrollment type) are retained.
              </p>
              <p>
                When LLM narrative enrichment is enabled, only the FERPA-safe profile is transmitted to the OpenAI API — never the Student_GUID, name, date of birth, or address.
                This satisfies FERPA §99.31(a)(1) for legitimate educational interest use.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Data Source */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Data Source</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-sm space-y-1">
              <p><strong>Input table:</strong> <code className="text-xs bg-muted px-1 rounded">student_level_with_predictions</code> (~4,000 students)</p>
              <p><strong>Output table:</strong> <code className="text-xs bg-muted px-1 rounded">llm_recommendations</code></p>
              <p><strong>Scoring script:</strong> <code className="text-xs bg-muted px-1 rounded">ai_model/generate_readiness_scores.py</code></p>
              <p><strong>Re-run command:</strong> <code className="text-xs bg-muted px-1 rounded">venv/bin/python ai_model/generate_readiness_scores.py</code></p>
              <p className="text-muted-foreground mt-2">Re-running the script upserts scores — no duplicates are created. Each run is logged in <code className="text-xs bg-muted px-1 rounded">readiness_generation_runs</code>.</p>
            </CardContent>
          </Card>
        </section>

        {/* Citations */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">References</h2>
          <ol className="space-y-2">
            {CITATIONS.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium">[{c.id}]</span>{" "}
                {c.authors} ({c.year}).{" "}
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
```

**Step 2: Verify the file was created**

```bash
ls codebenders-dashboard/app/methodology/page.tsx
```

**Step 3: Commit**

```bash
git add codebenders-dashboard/app/methodology/page.tsx
git commit -m "feat: add methodology page with PDP citations and scoring breakdown"
```

---

## Task 6: Add Methodology nav link to the dashboard header

**Files:**
- Modify: `codebenders-dashboard/app/page.tsx:146-151`

**Step 1: Add import for the icon** (at the top, `BookOpen` is already imported on line 10 — no change needed)

**Step 2: Add Methodology link alongside SQL Query Interface button**

Find the existing SQL Query link block:
```tsx
            <Link href="/query">
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                SQL Query Interface
              </Button>
            </Link>
```

Replace with:
```tsx
            <Link href="/methodology">
              <Button variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Methodology
              </Button>
            </Link>
            <Link href="/query">
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                SQL Query Interface
              </Button>
            </Link>
```

**Step 3: Verify the dashboard still loads (dev server should be running)**

```bash
curl -s http://localhost:3001 | grep -o "Methodology" | head -1
```

Expected: `Methodology`

**Step 4: Commit**

```bash
git add codebenders-dashboard/app/page.tsx
git commit -m "feat: add Methodology nav link to dashboard header"
```

---

## Verification Checklist

After all tasks complete:

- [ ] `docs/READINESS_METHODOLOGY.md` exists with citations and formula
- [ ] `ML_MODELS_GUIDE.md` references readiness as Model 9
- [ ] `generate_readiness_scores.py` scores 4,000 students with 0 errors after PDP changes
- [ ] Credit momentum risk factor appears in DB for students with <12 credits earned
- [ ] `--enrich-with-llm` and `--llm-model` flags accepted without error (no API key needed to run normally)
- [ ] `litellm` added to `requirements.txt` and installed in venv
- [ ] `/methodology` page loads and renders all sections
- [ ] Dashboard header shows "Methodology" button linking to `/methodology`
