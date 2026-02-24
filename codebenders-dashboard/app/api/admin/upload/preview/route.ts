import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse/sync"
import * as XLSX from "xlsx"

const REQUIRED_COLUMNS: Record<string, string[]> = {
  course_enrollment: ["Student_GUID", "Course_Prefix", "Course_Number", "Academic_Year", "Academic_Term"],
  pdp_cohort:        ["Institution_ID", "Cohort", "Student_GUID", "Cohort_Term"],
  pdp_ar:            ["Institution_ID", "Cohort", "Student_GUID"],
}

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role")
  if (role !== "admin" && role !== "ir") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const fileType = formData.get("fileType") as string | null

  if (!file || !fileType) {
    return NextResponse.json({ error: "Missing file or fileType" }, { status: 400 })
  }
  if (!REQUIRED_COLUMNS[fileType]) {
    return NextResponse.json({ error: `Unknown fileType: ${fileType}` }, { status: 400 })
  }

  let rows: Record<string, string>[]

  try {
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    if (file.name.endsWith(".xlsx")) {
      const wb = XLSX.read(buffer, { type: "buffer" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })
    } else {
      rows = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        to: 50,
        cast: false,
      }) as Record<string, string>[]
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse file", details: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 })
  }

  const columns = Object.keys(rows[0])
  const required = REQUIRED_COLUMNS[fileType]
  const missing = required.filter(col => !columns.includes(col))

  const warnings: string[] = []
  if (missing.length > 0) {
    warnings.push(`Missing required columns: ${missing.join(", ")}`)
  }

  return NextResponse.json({
    columns,
    sampleRows: rows.slice(0, 10),
    rowCount: rows.length,
    warnings,
  })
}
