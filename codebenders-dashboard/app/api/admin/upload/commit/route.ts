import { NextRequest, NextResponse } from "next/server"
import { parseFileBuffer, getFileType, validateFileSize } from "@/lib/upload-parser"
import { SCHEMAS, type UploadSchema, type ColumnMapping } from "@/lib/upload-schemas"
import { getPool } from "@/lib/db"
import {
  computeUploadDiff,
  type PreviousUploadSnapshot,
  type UploadCommitApiResponse,
  type UploadCurrentMetrics,
  type UploadHistoryStoredReport,
  type UploadRowError,
} from "@/lib/upload-validation-report"

const BATCH_SIZE = 500
const MAX_ERRORS_IN_REPORT = 5000
const MAX_ERRORS_IN_RESPONSE = 3000

type UploadHistoryRow = {
  id: string
  filename: string
  rows_inserted: number
  rows_skipped: number
  error_count: number
  uploaded_at: Date
}

function pgErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code)
  }
  return undefined
}

function isUndefinedColumnPgError(err: unknown): boolean {
  return pgErrorCode(err) === "42703"
}

function previousUploadFromRow(row: UploadHistoryRow): PreviousUploadSnapshot {
  return {
    id: Number(row.id),
    filename: row.filename,
    rowsInserted: row.rows_inserted,
    rowsSkipped: row.rows_skipped,
    errorCount: row.error_count,
    uploadedAt: row.uploaded_at.toISOString(),
  }
}

function uploadStatus(errorsCount: number, inserted: number): "failed" | "partial" | "success" {
  if (errorsCount > 0 && inserted === 0) return "failed"
  if (errorsCount > 0) return "partial"
  return "success"
}

async function insertUploadHistoryRow(params: {
  pool: ReturnType<typeof getPool>
  baseInsertParams: readonly [
    string,
    string,
    string,
    string,
    number,
    number,
    number,
    "failed" | "partial" | "success",
  ]
  reportJson: UploadHistoryStoredReport
}): Promise<number> {
  const { pool, baseInsertParams, reportJson } = params
  try {
    const insertedRow = await pool.query(
      `INSERT INTO upload_history (user_id, user_email, filename, file_type, rows_inserted, rows_skipped, error_count, status, validation_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb) RETURNING id`,
      [...baseInsertParams, JSON.stringify(reportJson)]
    )
    return Number(insertedRow.rows[0].id)
  } catch (err: unknown) {
    if (!isUndefinedColumnPgError(err)) throw err
  }

  const insertedRow = await pool.query(
    `INSERT INTO upload_history (user_id, user_email, filename, file_type, rows_inserted, rows_skipped, error_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [...baseInsertParams]
  )
  return Number(insertedRow.rows[0].id)
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? ""
  const userEmail = request.headers.get("x-user-email") ?? ""

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const schemaId = formData.get("schemaId") as string | null
    const mappingJson = formData.get("columnMapping") as string | null

    if (!file || !schemaId || !mappingJson) {
      return NextResponse.json(
        { error: "Missing file, schemaId, or columnMapping" },
        { status: 400 }
      )
    }

    if (!validateFileSize(file.size)) {
      return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 })
    }

    const schema = SCHEMAS.find((s) => s.id === schemaId)
    if (!schema) {
      return NextResponse.json({ error: `Unknown schema: ${schemaId}` }, { status: 400 })
    }

    let columnMapping: ColumnMapping[]
    try {
      columnMapping = JSON.parse(mappingJson)
    } catch {
      return NextResponse.json({ error: "Invalid column mapping JSON" }, { status: 400 })
    }

    const fileType = getFileType(file.name)
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows } = await parseFileBuffer(buffer, fileType)

    const result = await upsertRows(rows, columnMapping, schema)

    const pool = getPool()
    const status = uploadStatus(result.errors.length, result.inserted)

    const prevRes = await pool.query<UploadHistoryRow>(
      `SELECT id, filename, rows_inserted, rows_skipped, error_count, uploaded_at
       FROM upload_history
       WHERE file_type = $1
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [schemaId]
    )

    const previousUpload: PreviousUploadSnapshot | null = prevRes.rows[0]
      ? previousUploadFromRow(prevRes.rows[0])
      : null

    const reportGeneratedAt = new Date().toISOString()
    const currentMetrics: UploadCurrentMetrics = {
      inserted: result.inserted,
      skipped: result.skipped,
      errorCount: result.errors.length,
    }
    const diff = computeUploadDiff(currentMetrics, previousUpload)

    const errorsForStorage = result.errors.slice(0, MAX_ERRORS_IN_REPORT)
    const reportJson: UploadHistoryStoredReport = {
      version: 1,
      schemaId,
      totalRowsInFile: rows.length,
      inserted: result.inserted,
      skipped: result.skipped,
      errors: errorsForStorage,
      errorsTotal: result.errors.length,
      errorsTruncated: result.errors.length > errorsForStorage.length,
      previousUpload,
      diff,
      generatedAt: reportGeneratedAt,
    }

    const baseInsertParams = [
      userId,
      userEmail,
      file.name,
      schemaId,
      result.inserted,
      result.skipped,
      result.errors.length,
      status,
    ] as const

    const historyId = await insertUploadHistoryRow({
      pool,
      baseInsertParams,
      reportJson,
    })

    const responseBody: UploadCommitApiResponse = {
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors.slice(0, MAX_ERRORS_IN_RESPONSE),
      errorsTotal: result.errors.length,
      errorsTruncated: result.errors.length > MAX_ERRORS_IN_RESPONSE,
      uploadId: historyId,
      totalRowsInFile: rows.length,
      previousUpload,
      diff,
      reportGeneratedAt,
    }

    return NextResponse.json(responseBody)
  } catch (err) {
    console.error("Upload commit error:", err)
    return NextResponse.json(
      { error: `Upload failed: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}

interface UpsertResult {
  inserted: number
  skipped: number
  errors: UploadRowError[]
}

async function upsertRows(
  rows: Record<string, string>[],
  columnMapping: ColumnMapping[],
  schema: UploadSchema
): Promise<UpsertResult> {
  const pool = getPool()
  let inserted = 0
  let skipped = 0
  const errors: UpsertResult["errors"] = []

  // Build the header→dbColumn map from the user-confirmed mapping
  const headerToDb = new Map<string, string>()
  for (const col of columnMapping) {
    if (col.mappedTo) {
      headerToDb.set(col.header, col.mappedTo)
    }
  }

  // Build transform lookup from schema
  const transforms = new Map<string, (v: string) => string>()
  for (const col of schema.columns) {
    if (col.transform) {
      transforms.set(col.name, col.transform)
    }
  }

  // Check required columns are mapped
  const mappedDbCols = new Set(headerToDb.values())
  for (const col of schema.columns) {
    if (col.required && !mappedDbCols.has(col.name)) {
      errors.push({ row: 0, column: col.name, message: `Required column not mapped: ${col.name}` })
    }
  }
  if (errors.length > 0) return { inserted: 0, skipped: 0, errors }

  // Build SQL template once — columns are determined by the mapping, not per-row
  const cols = Array.from(headerToDb.values())
  const conflictClause = schema.upsertKey.join(", ")
  const updateSet = cols
    .filter((c) => !schema.upsertKey.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ")

  // Cache required column names
  const requiredDbCols = schema.columns
    .filter((c) => c.required)
    .map((c) => c.name)

  // Process in batches — one INSERT per batch (N+1 → N/BATCH_SIZE queries)
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchValues: string[] = []
    const batchParams: string[] = []
    let paramIdx = 1

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const rowIndex = i + j + 1

      const dbRow: Record<string, string> = {}
      for (const [header, dbCol] of headerToDb) {
        let value = row[header] ?? ""
        const transform = transforms.get(dbCol)
        if (transform) value = transform(value)
        dbRow[dbCol] = value
      }

      // Check required fields have values
      const missing = requiredDbCols.find((c) => !dbRow[c] || dbRow[c].trim() === "")
      if (missing) {
        skipped++
        errors.push({ row: rowIndex, column: missing, message: `Empty required field: ${missing}` })
        continue
      }

      const rowPlaceholders = cols.map(() => `$${paramIdx++}`)
      batchValues.push(`(${rowPlaceholders.join(", ")})`)
      batchParams.push(...cols.map((c) => dbRow[c]))
    }

    if (batchValues.length === 0) continue

    try {
      const batchSql = updateSet
        ? `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
           VALUES ${batchValues.join(", ")}
           ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateSet}`
        : `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
           VALUES ${batchValues.join(", ")}
           ON CONFLICT (${conflictClause}) DO NOTHING`

      const result = await pool.query(batchSql, batchParams)
      inserted += result.rowCount ?? 0
    } catch {
      // If batch fails, fall back to per-row to identify the bad row(s)
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]
        const rowIndex = i + j + 1

        const dbRow: Record<string, string> = {}
        for (const [header, dbCol] of headerToDb) {
          let value = row[header] ?? ""
          const transform = transforms.get(dbCol)
          if (transform) value = transform(value)
          dbRow[dbCol] = value
        }

        const missing = requiredDbCols.find((c) => !dbRow[c] || dbRow[c].trim() === "")
        if (missing) continue // already counted above

        try {
          const singlePlaceholders = cols.map((_, idx) => `$${idx + 1}`)
          const singleSql = updateSet
            ? `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
               VALUES (${singlePlaceholders.join(", ")})
               ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateSet}`
            : `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
               VALUES (${singlePlaceholders.join(", ")})
               ON CONFLICT (${conflictClause}) DO NOTHING`

          await pool.query(singleSql, cols.map((c) => dbRow[c]))
          inserted++
        } catch (rowErr) {
          skipped++
          errors.push({ row: rowIndex, message: (rowErr as Error).message })
        }
      }
    }
  }

  return { inserted, skipped, errors }
}
