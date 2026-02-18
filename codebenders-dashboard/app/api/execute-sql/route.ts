import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json()

    if (!sql) {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 })
    }

    const pool = getPool()
    const result = await pool.query(sql)

    return NextResponse.json({
      data: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    })
  } catch (error) {
    console.error("SQL execution error:", error)
    return NextResponse.json(
      {
        error: "Database query failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
