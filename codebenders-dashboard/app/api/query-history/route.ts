import { type NextRequest, NextResponse } from "next/server"
import { mkdir, appendFile } from "fs/promises"
import path from "path"

const LOGS_DIR = path.join(process.cwd(), "logs")
const LOG_FILE = path.join(LOGS_DIR, "query-history.jsonl")

interface QueryHistoryEntry {
  prompt: string
  institution: string
  vizType: string
  rowCount: number
  timestamp: string
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const entry = body as Record<string, unknown>

  // Validate required fields
  if (
    typeof entry.prompt !== "string" ||
    typeof entry.institution !== "string" ||
    typeof entry.vizType !== "string" ||
    typeof entry.rowCount !== "number" ||
    typeof entry.timestamp !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid required fields: prompt, institution, vizType, rowCount, timestamp" },
      { status: 400 }
    )
  }

  const record: QueryHistoryEntry = {
    prompt: entry.prompt,
    institution: entry.institution,
    vizType: entry.vizType,
    rowCount: entry.rowCount,
    timestamp: entry.timestamp,
  }

  try {
    await mkdir(LOGS_DIR, { recursive: true })
    await appendFile(LOG_FILE, JSON.stringify(record) + "\n", "utf8")
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("query-history write error:", error)
    return NextResponse.json(
      { error: "Failed to write log entry" },
      { status: 500 }
    )
  }
}
