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
        SELECT retention_risk_category
        FROM student_level_with_predictions
        ${baseWhere}
      ),
      total AS (SELECT COUNT(*) AS n FROM filtered)
      SELECT
        retention_risk_category                                              AS category,
        COUNT(*)                                                             AS count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT n FROM total), 0), 1)      AS percentage
      FROM filtered
      WHERE retention_risk_category IS NOT NULL
      GROUP BY retention_risk_category
      ORDER BY
        CASE retention_risk_category
          WHEN 'Critical Risk'  THEN 1
          WHEN 'High Risk'      THEN 2
          WHEN 'Moderate Risk'  THEN 3
          WHEN 'Low Risk'       THEN 4
          ELSE 5
        END
    `

    const result = await pool.query(sql, params)

    return NextResponse.json({
      data: result.rows,
    })
  } catch (error) {
    console.error("Retention risk fetch error:", error)
    return NextResponse.json(
      {
        error:   "Failed to fetch retention risk data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
