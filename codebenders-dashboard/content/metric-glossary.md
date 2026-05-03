# Metric glossary

Single source of truth for dashboard KPI definitions. Each section is keyed by its URL anchor (e.g. `/glossary#overall-retention-rate`). Cross-walks are indicative — institutions should confirm against their PDP documentation, IPEDS submission manuals, and state reporting rules.

---

## overall-retention-rate

**Plain English:** Share of students in the selected cohort who are still enrolled (or completed) one year later — a common “year-to-year” retention view for the students you are filtering.

**PDP / analysis-ready:** Uses the cohort retention indicator on `student_level_with_predictions` (historical `Retention` field: 0 = not retained to the next year, 1 = retained) after filters (cohort, enrollment intensity, credential goal) are applied.

**IPEDS:** Closest published analog is *Fall cohort retention* for first-time full-time students; PDP cohorts may include part-time or mixed populations, so percentages will not match IPEDS one-to-one without aligning cohort definitions.

**State compliance:** Many state accountability dashboards publish “first-year retention” or “persistence”; map this metric to the state field that uses the same cohort and time window.

---

## avg-predicted-retention

**Plain English:** Average of the model’s estimated probability (0–100%) that each student in the filtered set will retain — not the same as historical retention above.

**PDP / analysis-ready:** Mean of `retention_probability` from the deployed XGBoost retention model on `student_level_with_predictions`.

**IPEDS:** No direct IPEDS submission — this is an institutional analytics prediction, not an audited outcome count.

**State compliance:** Treat as early-warning / planning metric unless your state explicitly allows predictive indicators in reporting.

---

## students-at-high-critical-risk

**Plain English:** Count of students whose composite risk score places them in the **HIGH** or **URGENT** alert bands used for intervention triage.

**PDP / analysis-ready:** Derived from `at_risk_alert` and related thresholds on `student_level_with_predictions` (see dashboard methodology for the composite formula).

**IPEDS:** Not an IPEDS field; comparable to internal early-alert counts only.

**State compliance:** Use for operations; confirm before exporting small subgroup counts externally (FERPA / small-N policies).

---

## avg-course-completion

**Plain English:** Credits successfully completed divided by credits attempted, expressed as a percentage, aggregated across students in the filter.

**PDP / analysis-ready:** Computed from course completion fields on `student_level_with_predictions` (credits attempted vs. earned in the modeled year window).

**IPEDS:** Conceptually related to success rates and progression, but IPEDS collects many distinct measures (e.g., completions by award) — do not assume identity without a written cross-walk.

**State compliance:** Often parallels “success rate” or “credit completion ratio” in performance funding models; verify denominator rules match your state formula.
