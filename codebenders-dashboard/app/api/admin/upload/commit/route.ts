import { NextRequest, NextResponse } from "next/server"
import { parseFileBuffer, getFileType, validateFileSize } from "@/lib/upload-parser"
import { SCHEMAS, normalizeHeader, type UploadSchema, type ColumnMapping } from "@/lib/upload-schemas"
import { getPool } from "@/lib/db"

const BATCH_SIZE = 500

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

    const columnMapping: ColumnMapping[] = JSON.parse(mappingJson)

    const fileType = getFileType(file.name)
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows } = await parseFileBuffer(buffer, fileType)

    const result = await upsertRows(rows, columnMapping, schema)

    // Log to upload_history
    const pool = getPool()
    const status =
      result.errors.length > 0 && result.inserted === 0
        ? "failed"
        : result.errors.length > 0
          ? "partial"
          : "success"

    const { rows: historyRows } = await pool.query(
      `INSERT INTO upload_history (user_id, user_email, filename, file_type, rows_inserted, rows_skipped, error_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userId, userEmail, file.name, schemaId, result.inserted, result.skipped, result.errors.length, status]
    )

    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors.slice(0, 50),
      uploadId: historyRows[0].id,
    })
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
  errors: Array<{ row: number; column?: string; message: string }>
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

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const rowIndex = i + j + 1 // 1-based for user display

      try {
        const dbRow: Record<string, string> = {}
        for (const [header, dbCol] of headerToDb) {
          let value = row[header] ?? ""
          const transform = transforms.get(dbCol)
          if (transform) value = transform(value)
          dbRow[dbCol] = value
        }

        // Check required fields have values
        const missingRequired = schema.columns
          .filter((c) => c.required && (!dbRow[c.name] || dbRow[c.name].trim() === ""))
        if (missingRequired.length > 0) {
          skipped++
          errors.push({
            row: rowIndex,
            column: missingRequired[0].name,
            message: `Empty required field: ${missingRequired[0].name}`,
          })
          continue
        }

        const cols = Object.keys(dbRow)
        const vals = Object.values(dbRow)
        const placeholders = cols.map((_, idx) => `$${idx + 1}`)
        const updateSet = cols
          .filter((c) => !schema.upsertKey.includes(c))
          .map((c) => `${c} = EXCLUDED.${c}`)
          .join(", ")

        const conflictClause = schema.upsertKey.join(", ")
        const sql = updateSet
          ? `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
             VALUES (${placeholders.join(", ")})
             ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateSet}`
          : `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
             VALUES (${placeholders.join(", ")})
             ON CONFLICT (${conflictClause}) DO NOTHING`

        await pool.query(sql, vals)
        inserted++
      } catch (err) {
        skipped++
        errors.push({
          row: rowIndex,
          message: (err as Error).message,
        })
      }
    }
  }

  return { inserted, skipped, errors }
}
