import { NextRequest, NextResponse } from "next/server"
import { parseFileBuffer, getFileType, validateFileSize } from "@/lib/upload-parser"
import { detectSchema, mapColumns } from "@/lib/upload-schemas"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "File exceeds 50 MB limit" },
        { status: 413 }
      )
    }

    const fileType = getFileType(file.name)
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .csv or .xlsx file." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { headers, rows, totalRows } = await parseFileBuffer(buffer, fileType, 50)

    const detection = detectSchema(headers)

    const columns = detection.schema
      ? mapColumns(headers, detection.schema)
      : headers.map((h) => ({ header: h, mappedTo: null, status: "unmapped" as const }))

    const missingRequired = detection.schema
      ? detection.schema.columns
          .filter((c) => c.required)
          .filter((c) => !columns.some((col) => col.mappedTo === c.name))
          .map((c) => `Missing required column: ${c.name}`)
      : []

    const warnings = detection.schema
      ? detection.schema.columns
          .filter((c) => !c.required)
          .filter((c) => !columns.some((col) => col.mappedTo === c.name))
          .slice(0, 5)
          .map((c) => `Missing optional column: ${c.name}`)
      : []

    return NextResponse.json({
      detectedSchema: detection.schema?.id ?? null,
      detectedSchemaLabel: detection.schema?.label ?? null,
      confidence: Math.round(detection.confidence * 100) / 100,
      scores: detection.scores,
      columns,
      sampleRows: rows.slice(0, 10),
      totalRows,
      warnings,
      errors: missingRequired,
    })
  } catch (err) {
    console.error("Upload preview error:", err)
    return NextResponse.json(
      { error: `Failed to parse file: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
