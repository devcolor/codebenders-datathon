import { type NextRequest, NextResponse } from "next/server"
import mysql from "mysql2/promise"

let pool: mysql.Pool | null = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number.parseInt(process.env.DB_PORT || "3306"),
      database: process.env.DB_NAME || "pdp_analytics",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool
}

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()
    
    // Query for KPI metrics
    const sql = `
      SELECT 
        AVG(Retention) * 100 as overall_retention_rate,
        AVG(retention_probability) * 100 as avg_predicted_retention,
        SUM(CASE WHEN at_risk_alert IN ('HIGH', 'URGENT') THEN 1 ELSE 0 END) as high_critical_risk_count,
        AVG(course_completion_rate) * 100 as avg_course_completion_rate,
        COUNT(*) as total_students
      FROM student_predictions
      LIMIT 1
    `

    const [rows] = await pool.query(sql)
    const kpis = (Array.isArray(rows) && rows.length > 0 ? rows[0] : null) as any

    if (!kpis) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }

    return NextResponse.json({
      overallRetentionRate: Number(kpis.overall_retention_rate || 0).toFixed(1),
      avgPredictedRetention: Number(kpis.avg_predicted_retention || 0).toFixed(1),
      highCriticalRiskCount: Number(kpis.high_critical_risk_count || 0),
      avgCourseCompletionRate: Number(kpis.avg_course_completion_rate || 0).toFixed(1),
      totalStudents: Number(kpis.total_students || 0),
    })
  } catch (error) {
    console.error("KPI fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch KPIs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

