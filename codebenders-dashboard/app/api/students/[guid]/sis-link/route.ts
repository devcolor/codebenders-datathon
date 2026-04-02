import { type NextRequest, NextResponse } from "next/server"
import { mkdir, appendFile } from "fs/promises"
import path from "path"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"

const LOGS_DIR = path.join(process.cwd(), "logs")
const LOG_FILE = path.join(LOGS_DIR, "query-history.jsonl")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  // Feature disabled if SIS_BASE_URL is not configured
  const sisBaseUrl = process.env.SIS_BASE_URL
  if (!sisBaseUrl) {
    return NextResponse.json({ url: null }, { status: 404 })
  }

  // Role check
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/students", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { guid } = await params
  if (!guid) {
    return NextResponse.json({ error: "Missing student GUID" }, { status: 400 })
  }

  let url: string

  try {
    // Look up SIS ID from mapping table
    const pool = getPool()
    const result = await pool.query(
      "SELECT sis_id FROM guid_sis_map WHERE student_guid = $1 LIMIT 1",
      [guid]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ url: null }, { status: 404 })
    }

    // Build URL server-side — SIS ID never reaches the client
    const sisIdParam = process.env.SIS_ID_PARAM || "id"
    const sisId = result.rows[0].sis_id
    url = `${sisBaseUrl}?${encodeURIComponent(sisIdParam)}=${encodeURIComponent(sisId)}`
  } catch (error) {
    console.error("SIS link lookup error:", error)
    return NextResponse.json(
      { error: "Failed to look up SIS link" },
      { status: 500 }
    )
  }

  // Audit log — GUID and role only, never the SIS ID
  const logEntry = {
    event: "sis_link_accessed",
    guid,
    role,
    timestamp: new Date().toISOString(),
  }
  try {
    await mkdir(LOGS_DIR, { recursive: true })
    await appendFile(LOG_FILE, JSON.stringify(logEntry) + "\n", "utf8")
  } catch (auditErr) {
    console.error("SIS audit log write failed:", auditErr)
  }

  return NextResponse.json({ url })
}
