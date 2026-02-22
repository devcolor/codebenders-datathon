import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page     = Math.max(1, Number(searchParams.get("page")     || 1))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 50)))
  const offset   = (page - 1) * pageSize

  const search        = searchParams.get("search")        || ""
  const alertLevels   = searchParams.get("alertLevel")    || ""   // comma-separated
  const readinessTier = searchParams.get("readinessTier") || ""
  const credentialType = searchParams.get("credentialType") || ""
  const sortBy  = searchParams.get("sortBy")  || "at_risk_alert"
  const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC"

  // Whitelist sortable columns to prevent injection
  const SORT_COLS: Record<string, string> = {
    at_risk_alert:                 "s.at_risk_alert",
    retention_probability:         "s.retention_probability",
    readiness_score:               "r.readiness_score",
    gateway_math_probability:      "s.gateway_math_probability",
    gateway_english_probability:   "s.gateway_english_probability",
    low_gpa_probability:           "s.low_gpa_probability",
    predicted_time_to_credential:  "s.predicted_time_to_credential",
    "Cohort":                      `s."Cohort"`,
  }
  const orderExpr = SORT_COLS[sortBy] ?? "s.at_risk_alert"

  // Risk order for default sort (URGENT first)
  const riskOrder = sortBy === "at_risk_alert"
    ? `CASE s.at_risk_alert WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MODERATE' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END`
    : null

  const conditions: string[] = []
  const params: unknown[]    = []

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`s."Student_GUID" ILIKE $${params.length}`)
  }

  if (alertLevels) {
    const levels = alertLevels.split(",").filter(Boolean)
    if (levels.length > 0) {
      const placeholders = levels.map((_, i) => `$${params.length + i + 1}`).join(", ")
      params.push(...levels)
      conditions.push(`s.at_risk_alert IN (${placeholders})`)
    }
  }

  if (readinessTier) {
    params.push(readinessTier)
    conditions.push(`r.readiness_level = $${params.length}`)
  }

  if (credentialType) {
    params.push(credentialType)
    conditions.push(`s.predicted_credential_label = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const orderClause = riskOrder
    ? `ORDER BY ${riskOrder} ${sortDir}, s.retention_probability DESC`
    : `ORDER BY ${orderExpr} ${sortDir}`

  const dataSql = `
    SELECT
      s."Student_GUID"                                            AS student_guid,
      s."Cohort"                                                  AS cohort,
      s."Enrollment_Intensity_First_Term"                        AS enrollment_intensity,
      s.at_risk_alert,
      ROUND((s.retention_probability * 100)::numeric, 1)        AS retention_pct,
      ROUND((r.readiness_score * 100)::numeric, 1)              AS readiness_pct,
      r.readiness_level,
      ROUND((s.gateway_math_probability * 100)::numeric, 1)     AS gateway_math_pct,
      ROUND((s.gateway_english_probability * 100)::numeric, 1)  AS gateway_english_pct,
      ROUND((s.low_gpa_probability * 100)::numeric, 1)          AS gpa_risk_pct,
      ROUND(s.predicted_time_to_credential::numeric, 1)         AS time_to_credential,
      s.predicted_credential_label                               AS credential_type
    FROM student_level_with_predictions s
    LEFT JOIN llm_recommendations r ON r."Student_GUID" = s."Student_GUID"
    ${where}
    ${orderClause}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `

  const countSql = `
    SELECT COUNT(*) AS total
    FROM student_level_with_predictions s
    LEFT JOIN llm_recommendations r ON r."Student_GUID" = s."Student_GUID"
    ${where}
  `

  try {
    const pool = getPool()
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataSql, [...params, pageSize, offset]),
      pool.query(countSql, params),
    ])

    const total = Number(countResult.rows[0]?.total ?? 0)

    return NextResponse.json({
      students: dataResult.rows,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("Students fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch students", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
