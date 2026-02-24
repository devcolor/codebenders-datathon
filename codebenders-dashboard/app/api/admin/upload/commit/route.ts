import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse"
import { Readable } from "stream"
import { getPool } from "@/lib/db"

const BATCH_SIZE = 500

function toBoolean(val: string): boolean | null {
  if (val === "Y") return true
  if (val === "N") return false
  return null
}

function toNumeric(val: string): number | null {
  const t = val.trim()
  if (!t || t === "null" || t === "NULL") return null
  const n = parseFloat(t)
  return isNaN(n) ? null : n
}

function toNullable(val: string): string | null {
  const t = val.trim()
  return t === "" ? null : t
}

interface EnrollmentRow {
  student_guid: string
  cohort: string | null
  cohort_term: string | null
  academic_year: string | null
  academic_term: string | null
  course_prefix: string | null
  course_number: string | null
  course_name: string | null
  course_cip: string | null
  course_type: string | null
  gateway_type: string | null
  is_co_requisite: boolean | null
  is_core_course: boolean | null
  core_course_type: string | null
  delivery_method: string | null
  grade: string | null
  credits_attempted: number | null
  credits_earned: number | null
  instructor_status: string | null
}

const COLS = [
  "student_guid", "cohort", "cohort_term", "academic_year", "academic_term",
  "course_prefix", "course_number", "course_name", "course_cip", "course_type",
  "gateway_type", "is_co_requisite", "is_core_course", "core_course_type",
  "delivery_method", "grade", "credits_attempted", "credits_earned", "instructor_status",
] as const

async function insertBatch(client: import("pg").PoolClient, batch: EnrollmentRow[]): Promise<void> {
  if (batch.length === 0) return
  const placeholders: string[] = []
  const params: unknown[] = []
  batch.forEach((row, ri) => {
    const p = COLS.map((_, ci) => `$${ri * COLS.length + ci + 1}`).join(", ")
    placeholders.push(`(${p})`)
    COLS.forEach(col => params.push(row[col]))
  })
  await client.query(
    `INSERT INTO public.course_enrollments (${COLS.join(", ")}) VALUES ${placeholders.join(", ")}`,
    params
  )
}

async function processCourseEnrollment(buffer: Buffer): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const pool = getPool()
  const client = await pool.connect()
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  try {
    await client.query("BEGIN")
    await client.query("TRUNCATE TABLE public.course_enrollments RESTART IDENTITY")

    const parser = Readable.from(buffer).pipe(
      parse({ columns: true, skip_empty_lines: true })
    )

    let batch: EnrollmentRow[] = []

    for await (const record of parser) {
      const r = record as Record<string, string>
      const student_guid = toNullable(r["Student_GUID"] ?? "")
      if (!student_guid) {
        skipped++
        continue
      }
      batch.push({
        student_guid,
        cohort:            toNullable(r["Cohort"] ?? ""),
        cohort_term:       toNullable(r["Cohort_Term"] ?? ""),
        academic_year:     toNullable(r["Academic_Year"] ?? ""),
        academic_term:     toNullable(r["Academic_Term"] ?? ""),
        course_prefix:     toNullable(r["Course_Prefix"] ?? ""),
        course_number:     toNullable(r["Course_Number"] ?? ""),
        course_name:       toNullable(r["Course_Name"] ?? ""),
        course_cip:        toNullable(r["Course_CIP"] ?? ""),
        course_type:       toNullable(r["Course_Type"] ?? ""),
        gateway_type:      toNullable(r["Math_or_English_Gateway"] ?? ""),
        is_co_requisite:   toBoolean(r["Co_requisite_Course"] ?? ""),
        is_core_course:    toBoolean(r["Core_Course"] ?? ""),
        core_course_type:  toNullable(r["Core_Course_Type"] ?? ""),
        delivery_method:   toNullable(r["Delivery_Method"] ?? ""),
        grade:             toNullable(r["Grade"] ?? ""),
        credits_attempted: toNumeric(r["Number_of_Credits_Attempted"] ?? ""),
        credits_earned:    toNumeric(r["Number_of_Credits_Earned"] ?? ""),
        instructor_status: toNullable(r["Course_Instructor_Employment_Status"] ?? ""),
      })
      inserted++
      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch)
        batch = []
      }
    }

    if (batch.length > 0) await insertBatch(client, batch)
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    errors.push(err instanceof Error ? err.message : String(err))
    inserted = 0
    skipped = 0
  } finally {
    client.release()
  }

  return { inserted, skipped, errors }
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
  const rawFileType = formData.get("fileType") as string | null
  const fileType = rawFileType?.toLowerCase() ?? null

  if (!file || !fileType) {
    return NextResponse.json({ error: "Missing file or fileType" }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 400 })
  }

  if (fileType === "course_enrollment") {
    const result = await processCourseEnrollment(buffer)
    return NextResponse.json(result)
  }

  // PDP/AR path — implemented in Task 6
  return NextResponse.json({ error: `fileType "${fileType}" not yet implemented` }, { status: 501 })
}
