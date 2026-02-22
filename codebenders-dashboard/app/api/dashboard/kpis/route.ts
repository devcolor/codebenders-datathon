import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cohort        = searchParams.get("cohort")        || ""
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

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const sql = `
      SELECT
        AVG("Retention") * 100                                                       AS overall_retention_rate,
        AVG(retention_probability) * 100                                             AS avg_predicted_retention,
        SUM(CASE WHEN at_risk_alert IN ('HIGH', 'URGENT') THEN 1 ELSE 0 END)        AS high_critical_risk_count,
        AVG(course_completion_rate) * 100                                            AS avg_course_completion_rate,
        COUNT(*)                                                                     AS total_students
      FROM student_level_with_predictions
      ${where}
      LIMIT 1
    `

    const result = await pool.query(sql, params)
    const kpis = result.rows[0] ?? null

    if (!kpis) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }

    return NextResponse.json({
      overallRetentionRate:    Number(kpis.overall_retention_rate    || 0).toFixed(1),
      avgPredictedRetention:   Number(kpis.avg_predicted_retention   || 0).toFixed(1),
      highCriticalRiskCount:   Number(kpis.high_critical_risk_count  || 0),
      avgCourseCompletionRate: Number(kpis.avg_course_completion_rate || 0).toFixed(1),
      totalStudents:           Number(kpis.total_students            || 0),
    })
  } catch (error) {
    console.error("KPI fetch error:", error)
    return NextResponse.json(
      {
        error:   "Failed to fetch KPIs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
