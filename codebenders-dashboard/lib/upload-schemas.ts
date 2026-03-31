// ── Types ────────────────────────────────────────────────────────────────────

export interface SchemaColumn {
  name: string
  aliases: string[]
  type: "text" | "numeric" | "date" | "enum"
  required: boolean
  validValues?: string[]
  transform?: (value: string) => string
}

export interface UploadSchema {
  id: string
  label: string
  targetTable: string
  upsertKey: string[]
  columns: SchemaColumn[]
}

export interface DetectionResult {
  schema: UploadSchema | null
  confidence: number
  scores: Array<{ schemaId: string; label: string; score: number }>
}

export interface ColumnMapping {
  header: string
  mappedTo: string | null
  status: "matched" | "unmapped"
}

// ── Value Transforms ─────────────────────────────────────────────────────────

const ENROLLMENT_TYPE_MAP: Record<string, string> = {
  F: "First-Time",
  R: "Re-admit",
  T: "Transfer-In",
}

const RACE_MAP: Record<string, string> = {
  W: "White",
  B: "Black or African American",
  A: "Asian",
  AN: "American Indian or Alaska Native",
  IA: "American Indian or Alaska Native",
  HP: "Native Hawaiian or Other Pacific Islander",
  TM: "Two or More Races",
  UK: "Unknown",
}

const ETHNICITY_MAP: Record<string, string> = {
  H: "Hispanic",
  N: "Not Hispanic",
  UK: "Unknown",
}

const GENDER_MAP: Record<string, string> = {
  M: "Male",
  F: "Female",
  P: "Non-binary",
  X: "Other",
  UK: "Unknown",
}

function mapLookup(map: Record<string, string>) {
  return (value: string) => map[value.trim()] ?? value
}

// ── Schema Definitions ───────────────────────────────────────────────────────

export const SCHEMAS: UploadSchema[] = [
  {
    id: "pdp_cohort_ar",
    label: "PDP Cohort AR File",
    targetTable: "student_level_with_predictions",
    upsertKey: ["student_guid"],
    columns: [
      { name: "student_guid", aliases: ["student_guid", "student_id"], type: "text", required: true },
      { name: "institution_id", aliases: ["institution_id"], type: "text", required: false },
      { name: "cohort", aliases: ["cohort"], type: "text", required: true },
      { name: "cohort_term", aliases: ["cohort_term"], type: "enum", required: true, validValues: ["Fall", "Winter", "Spring", "Summer"] },
      { name: "student_age", aliases: ["student_age"], type: "text", required: false },
      { name: "enrollment_type", aliases: ["enrollment_type"], type: "text", required: true },
      { name: "enrollment_intensity_first_term", aliases: ["enrollment_intensity_first_term"], type: "text", required: false },
      { name: "race", aliases: ["race"], type: "text", required: false },
      { name: "ethnicity", aliases: ["ethnicity"], type: "text", required: false },
      { name: "gender", aliases: ["gender"], type: "text", required: false },
      { name: "first_gen", aliases: ["first_gen"], type: "text", required: false },
      { name: "pell_status_first_year", aliases: ["pell_status_first_year"], type: "text", required: false },
      { name: "math_placement", aliases: ["math_placement"], type: "text", required: false },
      { name: "english_placement", aliases: ["english_placement"], type: "text", required: false },
      { name: "reading_placement", aliases: ["reading_placement"], type: "text", required: false },
      { name: "gateway_math_status", aliases: ["gateway_math_status"], type: "text", required: false },
      { name: "gateway_english_status", aliases: ["gateway_english_status"], type: "text", required: false },
      { name: "credential_type_sought_year_1", aliases: ["credential_type_sought_year_1"], type: "text", required: false },
      { name: "gpa_group_term_1", aliases: ["gpa_group_term_1"], type: "text", required: false },
      { name: "gpa_group_year_1", aliases: ["gpa_group_year_1"], type: "text", required: false },
      { name: "number_of_credits_attempted_year_1", aliases: ["number_of_credits_attempted_year_1"], type: "numeric", required: false },
      { name: "number_of_credits_earned_year_1", aliases: ["number_of_credits_earned_year_1"], type: "numeric", required: false },
      { name: "number_of_credits_attempted_year_2", aliases: ["number_of_credits_attempted_year_2"], type: "numeric", required: false },
      { name: "number_of_credits_earned_year_2", aliases: ["number_of_credits_earned_year_2"], type: "numeric", required: false },
      { name: "retention", aliases: ["retention"], type: "numeric", required: false },
      { name: "persistence", aliases: ["persistence"], type: "numeric", required: false },
      { name: "time_to_credential", aliases: ["time_to_credential"], type: "text", required: false },
      { name: "years_to_bachelors_at_cohort_inst_", aliases: ["years_to_bachelors_at_cohort_inst_"], type: "text", required: false },
      { name: "years_to_associates_or_certificate_at_cohort_inst_", aliases: ["years_to_associates_or_certificate_at_cohort_inst_"], type: "text", required: false },
      { name: "school", aliases: ["school"], type: "text", required: false },
      { name: "dataset_type", aliases: ["dataset_type"], type: "text", required: false },
    ],
  },
  {
    id: "pdp_cohort_submission",
    label: "PDP Cohort Submission File",
    targetTable: "student_level_with_predictions",
    upsertKey: ["student_guid"],
    columns: [
      { name: "student_guid", aliases: ["student_id", "student id"], type: "text", required: true },
      { name: "cohort", aliases: ["cohort"], type: "text", required: true },
      { name: "cohort_term", aliases: ["cohort_term", "cohort term"], type: "text", required: true },
      { name: "first_name", aliases: ["first_name", "first name"], type: "text", required: false },
      { name: "last_name", aliases: ["last_name", "last name"], type: "text", required: false },
      { name: "date_of_birth", aliases: ["date_of_birth", "date of birth"], type: "date", required: false },
      { name: "enrollment_type", aliases: ["enrollment_type", "enrollment type"], type: "text", required: true, transform: mapLookup(ENROLLMENT_TYPE_MAP) },
      { name: "race", aliases: ["race"], type: "text", required: false, transform: mapLookup(RACE_MAP) },
      { name: "ethnicity", aliases: ["ethnicity"], type: "text", required: false, transform: mapLookup(ETHNICITY_MAP) },
      { name: "gender", aliases: ["gender"], type: "text", required: false, transform: mapLookup(GENDER_MAP) },
      { name: "math_placement", aliases: ["math_placement", "math placement"], type: "text", required: false },
      { name: "english_placement", aliases: ["english_placement", "english placement"], type: "text", required: false },
      { name: "gateway_math_status", aliases: ["gateway_math_status", "gateway math status"], type: "text", required: false },
      { name: "gateway_english_status", aliases: ["gateway_english_status", "gateway english status"], type: "text", required: false },
      { name: "first_gen", aliases: ["first_gen", "first gen"], type: "text", required: false },
      { name: "dual_and_summer_enrollment", aliases: ["dual_and_summer_enrollment", "dual and summer enrollment"], type: "text", required: false },
    ],
  },
  {
    id: "course_ar",
    label: "Course Enrollment AR File",
    targetTable: "course_enrollments",
    upsertKey: ["student_guid", "course_prefix", "course_number", "academic_term", "academic_year"],
    columns: [
      { name: "student_guid", aliases: ["student_guid", "student_id"], type: "text", required: true },
      { name: "cohort", aliases: ["cohort"], type: "text", required: false },
      { name: "cohort_term", aliases: ["cohort_term"], type: "text", required: false },
      { name: "academic_year", aliases: ["academic_year"], type: "text", required: true },
      { name: "academic_term", aliases: ["academic_term"], type: "text", required: true },
      { name: "course_prefix", aliases: ["course_prefix"], type: "text", required: true },
      { name: "course_number", aliases: ["course_number"], type: "text", required: true },
      { name: "section_id", aliases: ["section_id"], type: "text", required: false },
      { name: "course_name", aliases: ["course_name"], type: "text", required: false },
      { name: "course_cip", aliases: ["course_cip"], type: "text", required: false },
      { name: "course_type", aliases: ["course_type"], type: "text", required: false },
      { name: "math_or_english_gateway", aliases: ["math_or_english_gateway"], type: "text", required: false },
      { name: "grade", aliases: ["grade"], type: "text", required: true },
      { name: "number_of_credits_attempted", aliases: ["number_of_credits_attempted"], type: "numeric", required: false },
      { name: "number_of_credits_earned", aliases: ["number_of_credits_earned"], type: "numeric", required: false },
      { name: "delivery_method", aliases: ["delivery_method"], type: "text", required: false },
      { name: "course_begin_date", aliases: ["course_begin_date"], type: "date", required: false },
      { name: "course_end_date", aliases: ["course_end_date"], type: "date", required: false },
      { name: "student_age", aliases: ["student_age"], type: "text", required: false },
      { name: "race", aliases: ["race"], type: "text", required: false },
      { name: "ethnicity", aliases: ["ethnicity"], type: "text", required: false },
      { name: "gender", aliases: ["gender"], type: "text", required: false },
      { name: "institution_id", aliases: ["institution_id"], type: "text", required: false },
      { name: "school", aliases: ["school"], type: "text", required: false },
    ],
  },
  {
    id: "course_submission",
    label: "Course Enrollment Submission File",
    targetTable: "course_enrollments",
    upsertKey: ["student_guid", "course_prefix", "course_number", "academic_term", "academic_year"],
    columns: [
      { name: "student_guid", aliases: ["student_id", "student id"], type: "text", required: true },
      { name: "cohort", aliases: ["cohort"], type: "text", required: false },
      { name: "cohort_term", aliases: ["cohort_term", "cohort term"], type: "text", required: false },
      { name: "academic_year", aliases: ["academic_year", "academic year"], type: "text", required: true },
      { name: "academic_term", aliases: ["term", "academic_term", "academic term"], type: "text", required: true },
      { name: "course_prefix", aliases: ["course_prefix", "course prefix"], type: "text", required: true },
      { name: "course_number", aliases: ["course_number", "course number"], type: "text", required: true },
      { name: "section_id", aliases: ["section_id", "section id"], type: "text", required: false },
      { name: "course_name", aliases: ["course_name", "course name"], type: "text", required: false },
      { name: "course_cip", aliases: ["course_cip", "course cip"], type: "text", required: false },
      { name: "course_type", aliases: ["course_type", "course type"], type: "text", required: false },
      { name: "grade", aliases: ["grade"], type: "text", required: true },
      { name: "number_of_credits_attempted", aliases: ["number_of_credits_attempted", "number of credits attempted"], type: "numeric", required: false },
      { name: "number_of_credits_earned", aliases: ["number_of_credits_earned", "number of credits earned"], type: "numeric", required: false },
      { name: "first_name", aliases: ["first_name", "first name"], type: "text", required: false },
      { name: "last_name", aliases: ["last_name", "last name"], type: "text", required: false },
      { name: "date_of_birth", aliases: ["date_of_birth", "date of birth"], type: "date", required: false },
      { name: "semester_session_gpa", aliases: ["semester_session_gpa", "semester/session gpa"], type: "numeric", required: false },
      { name: "overall_gpa", aliases: ["overall_gpa", "overall gpa"], type: "numeric", required: false },
    ],
  },
  {
    id: "ml_predictions",
    label: "ML Predictions",
    targetTable: "student_level_with_predictions",
    upsertKey: ["student_guid"],
    columns: [
      { name: "student_guid", aliases: ["student_guid", "student_id"], type: "text", required: true },
      { name: "prediction_type", aliases: ["prediction_type"], type: "text", required: true },
      { name: "prediction_value", aliases: ["prediction_value"], type: "text", required: true },
      { name: "model_version", aliases: ["model_version"], type: "text", required: false },
      { name: "confidence_score", aliases: ["confidence_score", "confidence"], type: "numeric", required: false },
    ],
  },
]

// ── Schema Map (safe lookup, avoids non-null assertions) ─────────────────────

const schemaMap: Map<string, UploadSchema> = new Map(
  SCHEMAS.map((s) => [s.id, s])
)

// ── Header Normalization ─────────────────────────────────────────────────────

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[/]/g, "_")
    .replace(/[\s\-]+/g, "_")
}

// ── Schema Detection ─────────────────────────────────────────────────────────

export function detectSchema(headers: string[]): DetectionResult {
  const normalized = headers.map(normalizeHeader)

  const scores = SCHEMAS.map((schema) => {
    const schemaNames = new Set(
      schema.columns.flatMap((col) => [col.name, ...col.aliases.map(normalizeHeader)])
    )
    const matched = normalized.filter((h) => schemaNames.has(h)).length
    // Score by recall: what fraction of uploaded headers were recognized.
    // Ties broken by preferring the larger (more specific) schema.
    const score = normalized.length > 0 ? matched / normalized.length : 0
    return { schemaId: schema.id, label: schema.label, score, columnCount: schema.columns.length }
  })

  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Tie-break: prefer schema with more columns (more specific)
    return b.columnCount - a.columnCount
  })

  const best = scores[0]

  // Strip internal columnCount before returning
  const publicScores = scores.map(({ schemaId, label, score }) => ({ schemaId, label, score }))

  if (best.score >= 0.6) {
    // Required-column gate: all required columns must be present to confirm
    // high confidence. Without this, a 3-column subset could score 1.0 recall
    // against a 24-column schema and be incorrectly auto-accepted.
    const bestSchema = schemaMap.get(best.schemaId) ?? null
    const requiredCols = (bestSchema?.columns ?? []).filter((col) => col.required)
    const allRequiredPresent =
      requiredCols.length === 0 ||
      requiredCols.every((col) => {
        const candidates = [col.name, ...col.aliases.map(normalizeHeader)]
        return candidates.some((c) => normalized.includes(c))
      })

    if (allRequiredPresent) {
      return { schema: bestSchema, confidence: best.score, scores: publicScores }
    }
    // Cap to tentative band when required columns are missing
    return { schema: bestSchema, confidence: Math.min(best.score, 0.59), scores: publicScores }
  }

  if (best.score >= 0.3) {
    return { schema: schemaMap.get(best.schemaId) ?? null, confidence: best.score, scores: publicScores }
  }

  return { schema: null, confidence: best.score, scores: publicScores }
}

// ── Column Mapping ───────────────────────────────────────────────────────────

export function mapColumns(headers: string[], schema: UploadSchema): ColumnMapping[] {
  return headers.map((header) => {
    const norm = normalizeHeader(header)
    const col = schema.columns.find(
      (c) => c.name === norm || c.aliases.some((a) => normalizeHeader(a) === norm)
    )
    return col
      ? { header, mappedTo: col.name, status: "matched" as const }
      : { header, mappedTo: null, status: "unmapped" as const }
  })
}
