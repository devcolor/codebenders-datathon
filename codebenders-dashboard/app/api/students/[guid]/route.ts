import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"

function safeParse<T>(raw: unknown, fallback: T): T {
  if (!raw) return fallback
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as T)
  } catch {
    return fallback
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/students", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { guid } = await params

  if (!guid) {
    return NextResponse.json({ error: "Missing student GUID" }, { status: 400 })
  }

  const sql = `
    SELECT
      s."Student_GUID"                                           AS student_guid,
      s."Cohort"                                                 AS cohort,
      s."Enrollment_Intensity_First_Term"                        AS enrollment_intensity,
      s.at_risk_alert,
      ROUND((s.retention_probability * 100)::numeric, 1)        AS retention_pct,
      ROUND((s.gateway_math_probability * 100)::numeric, 1)     AS gateway_math_pct,
      ROUND((s.gateway_english_probability * 100)::numeric, 1)  AS gateway_english_pct,
      ROUND((s.low_gpa_probability * 100)::numeric, 1)          AS gpa_risk_pct,
      ROUND(s.predicted_time_to_credential::numeric, 1)         AS time_to_credential,
      s.predicted_credential_label                              AS credential_type,
      s.shap_explanations,
      ROUND((r.readiness_score * 100)::numeric, 1)             AS readiness_pct,
      r.readiness_level,
      r.rationale,
      r.risk_factors,
      r.suggested_actions,
      r.generated_at,
      r.model_name
    FROM student_level_with_predictions s
    LEFT JOIN llm_recommendations r ON r."Student_GUID" = s."Student_GUID"
    WHERE s."Student_GUID" = $1
    LIMIT 1
  `

  try {
    const pool   = getPool()
    const result = await pool.query(sql, [guid])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const row = result.rows[0]
    return NextResponse.json({
      ...row,
      risk_factors:      safeParse(row.risk_factors, []),
      suggested_actions: safeParse(row.suggested_actions, []),
      shap_explanations: safeParse(row.shap_explanations, null),
    })
  } catch (error) {
    console.error("Student detail fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch student", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
