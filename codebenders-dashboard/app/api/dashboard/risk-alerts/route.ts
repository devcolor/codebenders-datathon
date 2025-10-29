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
    
    // Query for risk alert distribution
    const sql = `
      SELECT 
        at_risk_alert as category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM student_predictions), 1) as percentage
      FROM student_predictions
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

    const [rows] = await pool.query(sql)
    
    return NextResponse.json({
      data: Array.isArray(rows) ? rows : [],
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

