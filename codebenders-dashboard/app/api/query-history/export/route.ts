import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { canAccess, type Role } from "@/lib/roles"

const LOG_FILE = path.join(process.cwd(), "logs", "query-history.jsonl")

function escapeCsvField(value: unknown): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (role && !canAccess("/api/query-history/export", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam   = searchParams.get("to")

  const fromDate = fromParam ? new Date(fromParam) : null
  const toDate   = toParam   ? new Date(toParam)   : null

  let raw: string
  try {
    raw = await readFile(LOG_FILE, "utf-8")
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      return NextResponse.json({ error: "Audit log does not exist yet" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to read audit log" }, { status: 500 })
  }

  const lines = raw.split("\n").filter(Boolean)

  const rows: string[] = [
    ["timestamp", "institution", "prompt", "vizType", "rowCount"].join(","),
  ]

  for (const line of lines) {
    let entry: Record<string, unknown>
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    // Date-range filter
    if (fromDate || toDate) {
      const ts = new Date(entry.timestamp as string)
      if (fromDate && ts < fromDate) continue
      if (toDate   && ts > toDate)   continue
    }

    rows.push(
      [
        escapeCsvField(entry.timestamp),
        escapeCsvField(entry.institution),
        escapeCsvField(entry.prompt),
        escapeCsvField(entry.vizType),
        escapeCsvField(entry.rowCount),
      ].join(",")
    )
  }

  const csv = rows.join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="query-audit-log.csv"',
    },
  })
}
