import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20") || 20))
    const offset = (page - 1) * pageSize

    const pool = getPool()

    const [dataResult, countResult, statusResult] = await Promise.all([
      pool.query(
        `SELECT id, user_email, filename, file_type, rows_inserted, rows_skipped,
                error_count, status, uploaded_at
         FROM upload_history
         ORDER BY uploaded_at DESC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM upload_history`),
      pool.query(
        `SELECT status, COUNT(*)::int AS count FROM upload_history GROUP BY status`
      ),
    ])

    const total = countResult.rows[0].total
    const statusCounts: Record<string, number> = {}
    for (const row of statusResult.rows) {
      statusCounts[row.status] = row.count
    }

    return NextResponse.json({
      data: dataResult.rows.map((row) => ({
        id: row.id,
        userEmail: row.user_email,
        filename: row.filename,
        fileType: row.file_type,
        rowsInserted: row.rows_inserted,
        rowsSkipped: row.rows_skipped,
        errorCount: row.error_count,
        status: row.status,
        uploadedAt: row.uploaded_at,
      })),
      total,
      page,
      pageSize,
      statusCounts,
    })
  } catch (err) {
    console.error("Upload history error:", err)
    return NextResponse.json(
      { error: `Failed to fetch upload history: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
