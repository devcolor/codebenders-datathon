import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()

    const sql = `
      SELECT
        at_risk_alert as category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM student_level_with_predictions), 1) as percentage
      FROM student_level_with_predictions
      WHERE at_risk_alert IS NOT NULL
      GROUP BY at_risk_alert
      ORDER BY
        CASE at_risk_alert
          WHEN 'URGENT' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MODERATE' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END
    `

    const result = await pool.query(sql)

    return NextResponse.json({
      data: result.rows,
    })
  } catch (error) {
    console.error("Risk alerts fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch risk alerts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
