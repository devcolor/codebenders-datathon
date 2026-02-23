/**
 * Ingestion script: streams bishop_state_courses.csv and bulk-inserts rows
 * into public.course_enrollments in batches of 500.
 *
 * Usage (from project root):
 *   NODE_PATH=codebenders-dashboard/node_modules \
 *   DB_HOST=127.0.0.1 DB_PORT=54332 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=postgres \
 *   codebenders-dashboard/node_modules/.bin/tsx scripts/load-course-enrollments.ts
 */

import fs from "fs"
import path from "path"
import readline from "readline"
import { Pool } from "pg"

// ---------------------------------------------------------------------------
// Load .env.local from codebenders-dashboard if it exists
// ---------------------------------------------------------------------------
const envLocalPath = path.resolve(__dirname, "../codebenders-dashboard/.env.local")
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
  console.log(`Loaded env from ${envLocalPath}`)
}

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------
const pool = new Pool({
  host:     process.env.DB_HOST     ?? "127.0.0.1",
  port:     parseInt(process.env.DB_PORT ?? "54332", 10),
  user:     process.env.DB_USER     ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME     ?? "postgres",
})

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
const CSV_PATH = path.resolve(__dirname, "../data/bishop_state_courses.csv")

/**
 * Parse a single CSV line, respecting double-quoted fields.
 * Returns an array of raw string values (empty string for missing cells).
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double-quote inside a quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

/** Convert "Y"/"N" CSV values to boolean (null when neither). */
function toBoolean(val: string): boolean | null {
  if (val === "Y") return true
  if (val === "N") return false
  return null
}

/** Convert a string to a numeric value, returning null for blank/non-numeric. */
function toNumeric(val: string): number | null {
  const trimmed = val.trim()
  if (trimmed === "" || trimmed === "null" || trimmed === "NULL") return null
  const n = parseFloat(trimmed)
  return isNaN(n) ? null : n
}

// ---------------------------------------------------------------------------
// Batch insert
// ---------------------------------------------------------------------------
const BATCH_SIZE = 500
const LOG_EVERY  = 10_000

interface Row {
  student_guid:      string
  cohort:            string | null
  cohort_term:       string | null
  academic_year:     string | null
  academic_term:     string | null
  course_prefix:     string | null
  course_number:     string | null
  course_name:       string | null
  course_cip:        string | null
  course_type:       string | null
  gateway_type:      string | null
  is_co_requisite:   boolean | null
  is_core_course:    boolean | null
  core_course_type:  string | null
  delivery_method:   string | null
  grade:             string | null
  credits_attempted: number | null
  credits_earned:    number | null
  instructor_status: string | null
}

async function insertBatch(client: import("pg").PoolClient, batch: Row[]): Promise<void> {
  if (batch.length === 0) return

  // Build parameterized multi-value INSERT
  const COLS = [
    "student_guid", "cohort", "cohort_term", "academic_year", "academic_term",
    "course_prefix", "course_number", "course_name", "course_cip", "course_type",
    "gateway_type", "is_co_requisite", "is_core_course", "core_course_type",
    "delivery_method", "grade", "credits_attempted", "credits_earned", "instructor_status",
  ] as const

  const numCols = COLS.length
  const valuePlaceholders: string[] = []
  const params: unknown[] = []

  batch.forEach((row, rowIdx) => {
    const placeholders = COLS.map(
      (_, colIdx) => `$${rowIdx * numCols + colIdx + 1}`
    ).join(", ")
    valuePlaceholders.push(`(${placeholders})`)
    COLS.forEach(col => params.push(row[col]))
  })

  const sql = `
    INSERT INTO public.course_enrollments (${COLS.join(", ")})
    VALUES ${valuePlaceholders.join(", ")}
  `
  await client.query(sql, params)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log(`Loading course enrollments from: ${CSV_PATH}`)

  const client = await pool.connect()
  try {
    // Truncate for idempotent re-runs
    console.log("Truncating course_enrollments…")
    await client.query("TRUNCATE TABLE public.course_enrollments RESTART IDENTITY")

    const rl = readline.createInterface({
      input: fs.createReadStream(CSV_PATH, { encoding: "utf8" }),
      crlfDelay: Infinity,
    })

    let headers: string[] = []
    let batch: Row[] = []
    let totalRows = 0
    let lineNum   = 0

    for await (const rawLine of rl) {
      lineNum++

      // First line is the header
      if (lineNum === 1) {
        headers = parseCsvLine(rawLine)
        continue
      }

      const cols = parseCsvLine(rawLine)

      // Helper to get a column value by header name (empty string → null)
      const get = (name: string): string | null => {
        const idx = headers.indexOf(name)
        if (idx === -1) return null
        const v = cols[idx]?.trim() ?? ""
        return v === "" ? null : v
      }

      const row: Row = {
        student_guid:      get("Student_GUID")                         ?? "",
        cohort:            get("Cohort"),
        cohort_term:       get("Cohort_Term"),
        academic_year:     get("Academic_Year"),
        academic_term:     get("Academic_Term"),
        course_prefix:     get("Course_Prefix"),
        course_number:     get("Course_Number"),
        course_name:       get("Course_Name"),
        course_cip:        get("Course_CIP"),
        course_type:       get("Course_Type"),
        gateway_type:      get("Math_or_English_Gateway"),
        is_co_requisite:   toBoolean(cols[headers.indexOf("Co_requisite_Course")]?.trim() ?? ""),
        is_core_course:    toBoolean(cols[headers.indexOf("Core_Course")]?.trim() ?? ""),
        core_course_type:  get("Core_Course_Type"),
        delivery_method:   get("Delivery_Method"),
        grade:             get("Grade"),
        credits_attempted: toNumeric(cols[headers.indexOf("Number_of_Credits_Attempted")]?.trim() ?? ""),
        credits_earned:    toNumeric(cols[headers.indexOf("Number_of_Credits_Earned")]?.trim() ?? ""),
        instructor_status: get("Course_Instructor_Employment_Status"),
      }

      batch.push(row)
      totalRows++

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch)
        batch = []
      }

      if (totalRows % LOG_EVERY === 0) {
        console.log(`  ...${totalRows.toLocaleString()} rows inserted`)
      }
    }

    // Flush remaining rows
    if (batch.length > 0) {
      await insertBatch(client, batch)
    }

    // Final count
    const { rows } = await client.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM public.course_enrollments"
    )
    console.log(`\nDone. Total rows in DB: ${parseInt(rows[0].count, 10).toLocaleString()}`)
    console.log(`CSV rows processed: ${totalRows.toLocaleString()}`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
