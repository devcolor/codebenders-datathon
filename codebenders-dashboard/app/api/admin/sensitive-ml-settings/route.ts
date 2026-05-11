import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"
import { SENSITIVE_ML_FEATURE_CATALOG, normalizeExcludedKeys } from "@/lib/sensitive-population"
import {
  DEFAULT_INSTITUTION,
  fetchSensitiveMlSettings,
  type InstitutionSensitiveMlSettings,
} from "@/lib/sensitive-ml-settings-db"

function settingsResponseBody(settings: InstitutionSensitiveMlSettings) {
  return {
    institutionCode: settings.institutionCode,
    excludedMlFeatureKeys: settings.excludedMlFeatureKeys,
    lowSampleThreshold: settings.lowSampleThreshold,
    updatedAt: settings.updatedAt,
    catalog: SENSITIVE_ML_FEATURE_CATALOG,
  }
}

function requireAdminIr(request: NextRequest): Role | null {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/admin/sensitive-ml-settings", role)) return null
  return role
}

export async function GET(request: NextRequest) {
  const role = requireAdminIr(request)
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const pool = getPool()
    const settings = await fetchSensitiveMlSettings(pool)
    return NextResponse.json(settingsResponseBody(settings))
  } catch (error) {
    console.error("sensitive-ml-settings GET:", error)
    return NextResponse.json(
      { error: "Failed to load settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — only institution admins may change ML privacy settings" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const excludedRaw = b.excludedMlFeatureKeys
  const thresholdRaw = b.lowSampleThreshold

  if (thresholdRaw !== undefined && (typeof thresholdRaw !== "number" || !Number.isFinite(thresholdRaw))) {
    return NextResponse.json({ error: "lowSampleThreshold must be a number" }, { status: 400 })
  }

  const excludedMlFeatureKeys = excludedRaw !== undefined ? normalizeExcludedKeys(excludedRaw) : undefined
  const lowSampleThreshold =
    thresholdRaw !== undefined ? Math.min(50000, Math.max(1, Math.round(thresholdRaw))) : undefined

  if (excludedMlFeatureKeys === undefined && lowSampleThreshold === undefined) {
    return NextResponse.json(
      { error: "Provide excludedMlFeatureKeys and/or lowSampleThreshold" },
      { status: 400 }
    )
  }

  const userEmail = request.headers.get("x-user-email") ?? ""

  try {
    const pool = getPool()
    const current = await fetchSensitiveMlSettings(pool)

    const nextExcluded = excludedMlFeatureKeys ?? current.excludedMlFeatureKeys
    const nextThreshold = lowSampleThreshold ?? current.lowSampleThreshold

    await pool.query(
      `UPDATE institution_sensitive_ml_settings
       SET excluded_ml_feature_keys = $2,
           low_sample_threshold = $3,
           updated_at = now(),
           updated_by_email = NULLIF($4, '')
       WHERE institution_code = $1`,
      [DEFAULT_INSTITUTION, nextExcluded, nextThreshold, userEmail || null]
    )

    const settings = await fetchSensitiveMlSettings(pool)
    return NextResponse.json(settingsResponseBody(settings))
  } catch (error) {
    console.error("sensitive-ml-settings PATCH:", error)
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
