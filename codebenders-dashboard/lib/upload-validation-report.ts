/** Types and CSV serialization for upload validation reports (#110). */

/** Response shape from POST /api/admin/upload/commit (validation report). */
export interface UploadCommitApiResponse {
  inserted: number
  skipped: number
  errors: UploadRowError[]
  errorsTotal: number
  errorsTruncated: boolean
  uploadId: number
  totalRowsInFile: number
  previousUpload: PreviousUploadSnapshot | null
  diff: UploadValidationDiff | null
  reportGeneratedAt: string
}

export interface UploadRowError {
  row: number
  column?: string
  message: string
}

export interface PreviousUploadSnapshot {
  id: number
  filename: string
  rowsInserted: number
  rowsSkipped: number
  errorCount: number
  uploadedAt: string
}

export interface UploadValidationDiff {
  rowsInsertedDelta: number
  rowsSkippedDelta: number
  errorCountDelta: number
  /** Percent change vs previous rows_inserted; null if no meaningful baseline. */
  percentInsertedChange: number | null
  /** True when percent change magnitude exceeds threshold (e.g. cohort size swing). */
  anomalyLargeSwing: boolean
}

const LARGE_SWING_PCT = 50

export function computeUploadDiff(
  current: { inserted: number; skipped: number; errorCount: number },
  previous: PreviousUploadSnapshot | null
): UploadValidationDiff | null {
  if (!previous) return null
  const rowsInsertedDelta = current.inserted - previous.rowsInserted
  const rowsSkippedDelta = current.skipped - previous.rowsSkipped
  const errorCountDelta = current.errorCount - previous.errorCount
  const base = previous.rowsInserted
  const percentInsertedChange =
    base > 0 ? Math.round(((current.inserted - base) / base) * 1000) / 10 : null
  const anomalyLargeSwing =
    percentInsertedChange !== null && Math.abs(percentInsertedChange) >= LARGE_SWING_PCT

  return {
    rowsInsertedDelta,
    rowsSkippedDelta,
    errorCountDelta,
    percentInsertedChange,
    anomalyLargeSwing,
  }
}

function escapeCsvCell(v: string | number): string {
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function serializeUploadValidationReportCsv(params: {
  filename: string
  schemaLabel: string
  uploadId: number
  totalRowsInFile: number
  inserted: number
  skipped: number
  errorCount: number
  errors: UploadRowError[]
  diff: UploadValidationDiff | null
  reportGeneratedAt: string
}): string {
  const lines: string[] = []
  lines.push("# Upload validation report")
  lines.push(`# Generated,${escapeCsvCell(params.reportGeneratedAt)}`)
  lines.push(`# Upload ID,${params.uploadId}`)
  lines.push(`# File,${escapeCsvCell(params.filename)}`)
  lines.push(`# Schema,${escapeCsvCell(params.schemaLabel)}`)
  lines.push(`# Rows in file,${params.totalRowsInFile}`)
  lines.push(`# Inserted,${params.inserted}`)
  lines.push(`# Skipped,${params.skipped}`)
  lines.push(`# Row-level issues (total),${params.errorCount}`)
  lines.push(`# Row-level issues (rows in this file),${params.errors.length}`)
  if (params.diff) {
    lines.push(
      `# Delta vs previous (same data type) — inserted,${params.diff.rowsInsertedDelta}`
    )
    lines.push(`# Delta — skipped,${params.diff.rowsSkippedDelta}`)
    lines.push(`# Delta — error count,${params.diff.errorCountDelta}`)
    lines.push(
      `# Pct change inserted (prev baseline),${params.diff.percentInsertedChange ?? ""}`
    )
    lines.push(`# Large swing flag,${params.diff.anomalyLargeSwing}`)
  }
  lines.push("")
  lines.push("row,column,message")
  for (const e of params.errors) {
    lines.push(
      [e.row, e.column ?? "", e.message].map((c) => escapeCsvCell(c)).join(",")
    )
  }
  return lines.join("\n")
}
