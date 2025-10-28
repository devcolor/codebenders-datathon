import { type NextRequest, NextResponse } from "next/server"
import mysql from "mysql2/promise"

// Create a connection pool for better performance
let pool: mysql.Pool | null = null

function getPool() {
  if (!pool) {
    console.log("[v0] Creating database pool with config:", {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT || "3306",
      database: process.env.DB_NAME || "University_of_Akron",
      hasPassword: !!process.env.DB_PASSWORD,
    })
    
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
    
    console.log("[v0] Database pool created successfully")
  }
  return pool
}

export async function POST(request: NextRequest) {
  try {
    const { sql, institution } = await request.json()

    if (!sql) {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 })
    }

    console.log("[v0] Executing SQL:", sql)

    const pool = getPool()
    
    // Test the connection first
    try {
      console.log("[v0] Testing database connection...")
      const connection = await pool.getConnection()
      console.log("[v0] Database connection successful!")
      connection.release()
    } catch (connError) {
      console.error("[v0] Database connection failed:", connError)
      throw new Error(`Database connection failed: ${connError instanceof Error ? connError.message : String(connError)}`)
    }
    
    console.log("[v0] Executing query...")
    const [rows] = await pool.query(sql)

    console.log("[v0] Query returned:", Array.isArray(rows) ? rows.length : 0, "records")

    return NextResponse.json({
      data: rows,
      rowCount: Array.isArray(rows) ? rows.length : 0,
    })
  } catch (error) {
    console.error("[v0] SQL execution error:", error)
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: "Database query failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
