/**
 * Issue #109 — sensitive-population safeguards: canonical ML feature keys,
 * SQL surface detection for NLQ audit + warnings, and validation for admin API.
 */

export type SensitiveMlFeatureMeta = {
  /** Column name used in `complete_ml_pipeline.py` feature lists. */
  mlKey: string
  /** Human label for admin UI and transparency copy. */
  label: string
  /** Short rationale for IR/admin. */
  description: string
}

/** Features institutions may exclude from all Bishop ML models (demographic / aid). */
export const SENSITIVE_ML_FEATURE_CATALOG: SensitiveMlFeatureMeta[] = [
  {
    mlKey: "Student_Age",
    label: "Student age",
    description: "Age band or numeric age used in demographic risk signals.",
  },
  {
    mlKey: "Race",
    label: "Race",
    description: "Race category from PDP / institutional records.",
  },
  {
    mlKey: "Ethnicity",
    label: "Ethnicity",
    description: "Ethnicity / Hispanic origin indicators.",
  },
  {
    mlKey: "Gender",
    label: "Gender",
    description: "Gender or sex field as reported in source data.",
  },
  {
    mlKey: "First_Gen",
    label: "First-generation status",
    description: "First-generation college student indicator.",
  },
  {
    mlKey: "Pell_Status_First_Year",
    label: "Pell / aid status (year 1)",
    description: "Federal aid / Pell eligibility proxy — can correlate with socioeconomic status.",
  },
]

const CATALOG_KEYS = new Set(SENSITIVE_ML_FEATURE_CATALOG.map((f) => f.mlKey))

const ML_KEY_TO_LABEL: Record<string, string> = Object.fromEntries(
  SENSITIVE_ML_FEATURE_CATALOG.map((f) => [f.mlKey, f.label])
)

export function isAllowedSensitiveMlKey(key: string): boolean {
  return CATALOG_KEYS.has(key)
}

export function normalizeExcludedKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return []
  const out: string[] = []
  for (const k of keys) {
    if (typeof k !== "string" || !CATALOG_KEYS.has(k)) continue
    if (!out.includes(k)) out.push(k)
  }
  return out
}

/** Regex fragments: quoted identifiers and bare identifiers (word boundary). */
function sqlPatternsForMlKey(mlKey: string): RegExp[] {
  const q = mlKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return [new RegExp(`"${q}"`, "i"), new RegExp(`\\b${q}\\b`, "i")]
}

const DETECTOR_ENTRIES = SENSITIVE_ML_FEATURE_CATALOG.map((f) => ({
  mlKey: f.mlKey,
  patterns: sqlPatternsForMlKey(f.mlKey),
}))

/**
 * Detect references to sensitive columns in generated or hand-written SQL
 * (NLQ / execute-sql). Used for contextual warnings and audit (#109 / #67).
 */
export function findSensitiveMlKeysReferencedInSql(sql: string): string[] {
  if (!sql || !sql.trim()) return []
  const hit = new Set<string>()
  for (const { mlKey, patterns } of DETECTOR_ENTRIES) {
    if (patterns.some((p) => p.test(sql))) hit.add(mlKey)
  }
  return [...hit].sort()
}

export function buildLowSampleWarningMessage(threshold: number): string {
  return `Low sample size — interpret with care. This view has fewer than ${threshold} students and predictions may be unreliable.`
}

export function buildSensitivePopulationSqlWarningMessage(columns: string[]): string {
  const labels = columns.map((k) => ML_KEY_TO_LABEL[k] ?? k).join(", ")
  return `This query references sensitive demographic or aid-related fields (${labels}). Interpret results with institutional context; broad-brush AI summaries can misrepresent under-served groups.`
}

/** KPI banner when institution excludes ML inputs (#109). */
export function buildExcludedMlFeaturesKpiMessage(excludedKeys: string[]): string {
  return `Institutional ML privacy settings exclude these inputs from model training and batch inference: ${excludedKeys.join(", ")}. Re-run the ML pipeline after changing exclusions.`
}
