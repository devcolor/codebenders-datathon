import { type NextRequest, NextResponse } from "next/server"
import { mkdir, appendFile } from "fs/promises"
import path from "path"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"

const LOGS_DIR = path.join(process.cwd(), "logs")
const LOG_FILE = path.join(LOGS_DIR, "query-history.jsonl")
const SIS_ID_PARAM = process.env.SIS_ID_PARAM || "id"

let logDirReady = false

function writeAuditLog(entry: Record<string, unknown>) {
  const doWrite = async () => {
    if (!logDirReady) {
      await mkdir(LOGS_DIR, { recursive: true })
      logDirReady = true
    }
    await appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8")
  }
  doWrite().catch(err => console.error("SIS audit log write failed:", err))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  const sisBaseUrl = process.env.SIS_BASE_URL
  if (!sisBaseUrl) {
    return NextResponse.json({ url: null }, { status: 404 })
  }

  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/students", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { guid } = await params

  let url: string

  try {
    const pool = getPool()
    const result = await pool.query(
      "SELECT sis_id FROM guid_sis_map WHERE student_guid = $1 LIMIT 1",
      [guid]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ url: null }, { status: 404 })
    }

    // SIS ID is embedded in the URL but never returned as a standalone field
    const sisId = result.rows[0].sis_id
    url = `${sisBaseUrl}?${encodeURIComponent(SIS_ID_PARAM)}=${encodeURIComponent(sisId)}`
  } catch (error) {
    console.error("SIS link lookup error:", error)
    return NextResponse.json(
      { error: "Failed to look up SIS link" },
      { status: 500 }
    )
  }

  writeAuditLog({ event: "sis_link_accessed", guid, role, timestamp: new Date().toISOString() })

  return NextResponse.json({ url })
}
