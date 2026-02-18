import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()

    const sql = `
      SELECT
        retention_risk_category as category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM student_level_with_predictions), 1) as percentage
      FROM student_level_with_predictions
      WHERE retention_risk_category IS NOT NULL
      GROUP BY retention_risk_category
      ORDER BY
        CASE retention_risk_category
          WHEN 'Critical Risk' THEN 1
          WHEN 'High Risk' THEN 2
          WHEN 'Moderate Risk' THEN 3
          WHEN 'Low Risk' THEN 4
          ELSE 5
        END
    `

    const result = await pool.query(sql)

    return NextResponse.json({
      data: result.rows,
    })
  } catch (error) {
    console.error("Retention risk fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch retention risk data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
