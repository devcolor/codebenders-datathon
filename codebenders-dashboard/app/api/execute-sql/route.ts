import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

// NOTE: This route executes arbitrary SQL. It is intentionally unrestricted because
// it is an internal analytics dashboard — not publicly exposed. The DB credentials
// should be read-only at the Postgres level. The `institution` field sent by the
// client is reserved for future multi-institution routing but is unused here.
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
