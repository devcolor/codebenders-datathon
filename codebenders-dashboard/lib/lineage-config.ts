import { SCHEMAS, type UploadSchema } from "@/lib/upload-schemas"

/** Upload schema IDs that write to `student_level_with_predictions` (for latest-ingest lookup). */
export const LINEAGE_STUDENT_LEVEL_SCHEMA_IDS: string[] = Array.from(
  new Set(
    SCHEMAS.filter((s: UploadSchema) => s.targetTable === "student_level_with_predictions").map(
      (s) => s.id
    )
  )
)

export const LINEAGE_METRICS = [
  "overall_retention",
  "avg_predicted_retention",
  "high_critical_risk_count",
  "avg_course_completion",
  "risk_alert_segment",
  "retention_risk_segment",
  "roster_cell",
] as const

export type LineageMetricId = (typeof LINEAGE_METRICS)[number]

export function isLineageMetricId(s: string): s is LineageMetricId {
  return (LINEAGE_METRICS as readonly string[]).includes(s)
}

export type LineageTransformStep = {
  order: number
  title: string
  detail: string
}

export function lineageStepsForMetric(metric: LineageMetricId): LineageTransformStep[] {
  const base: LineageTransformStep[] = [
    {
      order: 1,
      title: "Institutional ingest",
      detail:
        "Rows are loaded into `student_level_with_predictions` via the admin upload wizard (PDP / AR / submission layouts). Each commit records an `upload_history` event with validation summary.",
    },
    {
      order: 2,
      title: "Analysis-ready view",
      detail:
        "The dashboard reads the `student_level_with_predictions` view (one row per student). Dashboard filters (cohort, enrollment intensity, predicted credential) scope the same row set used for KPIs and charts.",
    },
  ]

  switch (metric) {
    case "overall_retention":
      return [
        ...base,
        {
          order: 3,
          title: "Aggregate: historical retention",
          detail:
            "KPI = AVG(`Retention`) × 100 over filtered students. `Retention` is the cohort year-to-year retention indicator from PDP-style source data (0 = not retained, 1 = retained).",
        },
      ]
    case "avg_predicted_retention":
      return [
        ...base,
        {
          order: 3,
          title: "Model: retention probability",
          detail:
            "KPI = AVG(`retention_probability`) × 100. Probabilities come from the deployed XGBoost retention classifier (features include demographics, placement, GPA, and course performance). Values are refreshed when prediction scores are merged into the student-level table (upload or ML pipeline).",
        },
      ]
    case "high_critical_risk_count":
      return [
        ...base,
        {
          order: 3,
          title: "Composite: alert bucketing",
          detail:
            "Count of students where `at_risk_alert` is HIGH or URGENT. Alerts combine inverted retention probability with GPA, course completion, and credit-progress thresholds (see methodology).",
        },
      ]
    case "avg_course_completion":
      return [
        ...base,
        {
          order: 3,
          title: "Aggregate: course completion rate",
          detail:
            "KPI = AVG(`course_completion_rate`) × 100 over filtered students (credits earned ÷ attempted in the modeled window).",
        },
      ]
    case "risk_alert_segment":
      return [
        ...base,
        {
          order: 3,
          title: "Slice: risk alert level",
          detail:
            "Chart segment counts students with a given `at_risk_alert` value (URGENT, HIGH, MODERATE, LOW) within the filtered cohort.",
        },
      ]
    case "retention_risk_segment":
      return [
        ...base,
        {
          order: 3,
          title: "Slice: retention probability band",
          detail:
            "Chart segment buckets students by `retention_risk_category` derived from `retention_probability` cut points (Critical / High / Moderate / Low risk).",
        },
      ]
    case "roster_cell":
      return [
        ...base,
        {
          order: 3,
          title: "Roster column",
          detail:
            "Value shown is taken from the same `student_level_with_predictions` row (and readiness join where applicable) as the student roster API.",
        },
      ]
  }
}

export const ROSTER_LINEAGE_FIELD_KEYS = [
  "retention_pct",
  "readiness_pct",
  "gateway_math_pct",
  "gateway_english_pct",
  "gpa_risk_pct",
  "time_to_credential",
  "credential_type",
  "at_risk_alert",
  "cohort",
  "enrollment_intensity",
] as const

export type RosterLineageField = (typeof ROSTER_LINEAGE_FIELD_KEYS)[number]

export function isRosterLineageField(s: string): s is RosterLineageField {
  return (ROSTER_LINEAGE_FIELD_KEYS as readonly string[]).includes(s)
}

export function rosterFieldLineageLabel(field: RosterLineageField): { label: string; detail: string } {
  const map = {
    retention_pct: {
      label: "Predicted retention %",
      detail: "`retention_probability` on `student_level_with_predictions`, scaled ×100 and rounded (XGBoost retention model).",
    },
    readiness_pct: {
      label: "Readiness %",
      detail: "`readiness_score` from `llm_recommendations`, joined by `Student_GUID`, scaled ×100 and rounded.",
    },
    gateway_math_pct: {
      label: "Gateway math %",
      detail: "`gateway_math_probability` on `student_level_with_predictions` (ML model output).",
    },
    gateway_english_pct: {
      label: "Gateway English %",
      detail: "`gateway_english_probability` on `student_level_with_predictions` (ML model output).",
    },
    gpa_risk_pct: {
      label: "Low-GPA risk %",
      detail: "`low_gpa_probability` on `student_level_with_predictions` (ML model output).",
    },
    time_to_credential: {
      label: "Time to credential",
      detail: "`predicted_time_to_credential` regression output on `student_level_with_predictions`.",
    },
    credential_type: {
      label: "Credential type",
      detail: "`predicted_credential_label` on `student_level_with_predictions` (predicted credential category).",
    },
    at_risk_alert: {
      label: "At-risk alert",
      detail: "`at_risk_alert` composite bucket (URGENT / HIGH / MODERATE / LOW) on `student_level_with_predictions`.",
    },
    cohort: {
      label: "Cohort",
      detail: "`Cohort` dimension on `student_level_with_predictions` (PDP cohort label).",
    },
    enrollment_intensity: {
      label: "Enrollment intensity",
      detail: "`Enrollment_Intensity_First_Term` on `student_level_with_predictions`.",
    },
  } satisfies Record<RosterLineageField, { label: string; detail: string }>
  return map[field]
}
