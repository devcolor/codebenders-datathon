import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cohort         = searchParams.get("cohort")         || ""
    const enrollmentType = searchParams.get("enrollmentType") || ""
    const credentialType = searchParams.get("credentialType") || ""

    const pool = getPool()

    const conditions: string[] = []
    const params: unknown[]    = []

    if (cohort) {
      params.push(cohort)
      conditions.push(`"Cohort" = $${params.length}`)
    }
    if (enrollmentType) {
      params.push(enrollmentType)
      conditions.push(`"Enrollment_Intensity_First_Term" = $${params.length}`)
    }
    if (credentialType) {
      params.push(credentialType)
      conditions.push(`predicted_credential_label = $${params.length}`)
    }

    const baseWhere = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Use a CTE so the percentage denominator is relative to the filtered set
    const sql = `
      WITH filtered AS (
        SELECT at_risk_alert
        FROM student_level_with_predictions
        ${baseWhere}
      ),
      total AS (SELECT COUNT(*) AS n FROM filtered)
      SELECT
        at_risk_alert                                                        AS category,
        COUNT(*)                                                             AS count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT n FROM total), 0), 1)      AS percentage
      FROM filtered
      WHERE at_risk_alert IS NOT NULL
      GROUP BY at_risk_alert
      ORDER BY
        CASE at_risk_alert
          WHEN 'URGENT'   THEN 1
          WHEN 'HIGH'     THEN 2
          WHEN 'MODERATE' THEN 3
          WHEN 'LOW'      THEN 4
          ELSE 5
        END
    `

    const result = await pool.query(sql, params)

    return NextResponse.json({
      data: result.rows,
    })
  } catch (error) {
    console.error("Risk alerts fetch error:", error)
    return NextResponse.json(
      {
        error:   "Failed to fetch risk alerts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
