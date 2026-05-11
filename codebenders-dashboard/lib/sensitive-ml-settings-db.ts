import type { Pool } from "pg"

export type InstitutionSensitiveMlSettings = {
  institutionCode: string
  excludedMlFeatureKeys: string[]
  lowSampleThreshold: number
  updatedAt: string | null
}

export const DEFAULT_INSTITUTION = "bscc"

function pgErrorCode(err: unknown): string {
  return err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : ""
}

const FALLBACK: InstitutionSensitiveMlSettings = {
  institutionCode: DEFAULT_INSTITUTION,
  excludedMlFeatureKeys: [],
  lowSampleThreshold: 30,
  updatedAt: null,
}

function rowToSettings(row: Record<string, unknown>): InstitutionSensitiveMlSettings {
  return {
    institutionCode: String(row.institution_code ?? DEFAULT_INSTITUTION),
    excludedMlFeatureKeys: Array.isArray(row.excluded_ml_feature_keys)
      ? (row.excluded_ml_feature_keys as string[])
      : [],
    lowSampleThreshold: Math.max(1, Number(row.low_sample_threshold ?? 30)),
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : null,
  }
}

/**
 * Loads institution ML privacy settings. Uses fallback if the table is missing (local dev).
 */
export async function fetchSensitiveMlSettings(pool: Pool): Promise<InstitutionSensitiveMlSettings> {
  try {
    const res = await pool.query(
      `SELECT institution_code, excluded_ml_feature_keys, low_sample_threshold, updated_at
       FROM institution_sensitive_ml_settings
       WHERE institution_code = $1
       LIMIT 1`,
      [DEFAULT_INSTITUTION]
    )
    const row = res.rows[0]
    if (!row) return FALLBACK
    return rowToSettings(row as Record<string, unknown>)
  } catch (err: unknown) {
    if (pgErrorCode(err) === "42P01") {
      console.warn("institution_sensitive_ml_settings missing — using defaults (#109)")
      return FALLBACK
    }
    throw err
  }
}
