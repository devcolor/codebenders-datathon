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
The PDP defines **leading indicators** (early momentum metrics) and **lagging indicators** (outcomes) for community college student success. Our scoring directly incorporates the PDP's five key metrics aligned with the PDP framework:

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

The numeric readiness score is always computed by the rule engine. Optionally, personalized narrative recommendations can be generated using any LLM provider via LiteLLM:

```
Rule engine score (deterministic) → FERPA-safe profile + score → LLM (via LiteLLM)
                                                                 → enriched rationale
                                                                 → enriched suggested_actions
```

**What changes:** Only the `rationale` and `suggested_actions` text fields.
**What never changes:** `readiness_score`, `readiness_level`, `source`, `model_version`, `input_features`.

Run with enrichment:
```bash
# OpenAI
OPENAI_API_KEY=sk-... venv/bin/python ai_model/generate_readiness_scores.py \
  --enrich-with-llm --llm-model gpt-4o-mini

# Local Ollama (no API key needed)
venv/bin/python ai_model/generate_readiness_scores.py \
  --enrich-with-llm --llm-model ollama/llama3.2:3b

# Anthropic
ANTHROPIC_API_KEY=... venv/bin/python ai_model/generate_readiness_scores.py \
  --enrich-with-llm --llm-model claude-haiku-4-5-20251001
```

The enrichment targets only medium and low readiness students (those most likely to benefit from a personalized intervention narrative). High readiness students retain rule-generated text.

---

## Limitations

1. **No behavioral engagement data.** Research using CCSSE/SENSE instruments identifies help-seeking behavior, faculty interaction, and first-week engagement as strong predictors — none of which are captured in administrative records.
2. **Weights are not empirically learned.** The 0.40/0.30/0.30 sub-score weights and component weights within each sub-score reflect the PDP's emphasis on academic indicators but have not been validated against Bishop State outcome data. An ML-trained readiness model (Option B) could learn optimal weights from historical data.
3. **Static thresholds.** The high/medium/low thresholds (0.65, 0.40) are heuristic. Institutions implementing PDP dashboards typically calibrate thresholds to their own cohort distributions.

---

## Upgrade Path

| Option | Description | Schema changes |
|---|---|---|
| Option C (current) | Rule engine, deterministic | — |
| Option C+ | Rule engine + LiteLLM narrative enrichment | None |
| Option A | Ollama local LLM scoring (replaces score) | None — same table, `source='ollama'` |
| Option B | ML-trained readiness model (learned weights) | None — same table, `source='ml_model'` |
