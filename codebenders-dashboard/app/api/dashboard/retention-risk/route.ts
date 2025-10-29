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
    
    // Query for retention risk category distribution
    const sql = `
      SELECT 
        retention_risk_category as category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM student_predictions), 1) as percentage
      FROM student_predictions
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

    const [rows] = await pool.query(sql)
    
    return NextResponse.json({
      data: Array.isArray(rows) ? rows : [],
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

