"use client"

import { useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Download } from "lucide-react"
import {
  serializeUploadValidationReportCsv,
  UPLOAD_INSERTED_SWING_THRESHOLD_PCT,
  type UploadCommitApiResponse,
} from "@/lib/upload-validation-report"

function reportFilenameDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function signedIntLabel(n: number): string {
  const sign = n >= 0 ? "+" : ""
  return `${sign}${n.toLocaleString()}`
}

function summaryIconClass(headlineFailed: boolean, headlinePartial: boolean): string {
  if (headlineFailed) return "text-red-600"
  if (headlinePartial) return "text-amber-600"
  return "text-green-600"
}

interface UploadSummaryProps {
  filename: string
  schemaLabel: string
  report: UploadCommitApiResponse
  onUploadAnother: () => void
  onViewHistory: () => void
}

export function UploadSummary({
  filename,
  schemaLabel,
  report,
  onUploadAnother,
  onViewHistory,
}: UploadSummaryProps) {
  const { inserted, skipped, errors, errorsTotal, errorsTruncated, diff } = report

  const headlineOk = inserted > 0 && errorsTotal === 0 && skipped === 0
  const headlinePartial = inserted > 0 && (errorsTotal > 0 || skipped > 0)
  const headlineFailed = inserted === 0 && errorsTotal > 0

  const downloadCsv = useCallback(() => {
    const csv = serializeUploadValidationReportCsv({
      filename,
      schemaLabel,
      uploadId: report.uploadId,
      totalRowsInFile: report.totalRowsInFile,
      inserted: report.inserted,
      skipped: report.skipped,
      errorCount: report.errorsTotal,
      errors: report.errors,
      diff: report.diff,
      reportGeneratedAt: report.reportGeneratedAt,
    })
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `upload-validation-report_${report.uploadId}_${reportFilenameDate(report.reportGeneratedAt)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filename, schemaLabel, report])

  const statusClass = useMemo(() => {
    if (headlineFailed) return "bg-red-50 border-red-200"
    if (headlinePartial) return "bg-amber-50 border-amber-200"
    return "bg-green-50 border-green-200"
  }, [headlineFailed, headlinePartial])

  const iconClass = summaryIconClass(headlineFailed, headlinePartial)

  return (
    <div className="text-center space-y-6 max-w-2xl mx-auto">
      <div className={`border rounded-xl p-8 ${statusClass}`}>
        {headlineFailed ? (
          <AlertTriangle className={`mx-auto h-10 w-10 ${iconClass} mb-3`} />
        ) : (
          <CheckCircle className={`mx-auto h-10 w-10 ${iconClass} mb-3`} />
        )}
        <h2 className="text-lg font-bold">
          {headlineFailed ? "Upload did not insert rows" : "Upload complete"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {filename} — {schemaLabel}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Validation report #{report.uploadId} · {report.totalRowsInFile.toLocaleString()} rows in file
        </p>
        <div className="flex justify-center gap-8 mt-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-green-700">{inserted}</span>
            <br />
            <span className="text-muted-foreground">inserted</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-700">{skipped}</span>
            <br />
            <span className="text-muted-foreground">skipped</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-red-700">{errorsTotal}</span>
            <br />
            <span className="text-muted-foreground">row issues</span>
          </div>
        </div>
      </div>

      {diff ? (
        <div className="text-left rounded-lg border bg-muted/30 p-4 text-sm">
          <h3 className="font-semibold mb-2">Compared to previous upload (same data type)</h3>
          <p className="text-muted-foreground text-xs mb-2">
            Prior: {report.previousUpload?.filename} ·{" "}
            {report.previousUpload?.rowsInserted?.toLocaleString() ?? "—"} inserted ·{" "}
            {new Date(report.previousUpload?.uploadedAt ?? "").toLocaleString()}
          </p>
          <ul className="space-y-1 text-xs">
            <li>
              <span className="font-medium">Δ Inserted:</span> {signedIntLabel(diff.rowsInsertedDelta)}
            </li>
            <li>
              <span className="font-medium">Δ Skipped:</span> {signedIntLabel(diff.rowsSkippedDelta)}
            </li>
            <li>
              <span className="font-medium">Δ Row-level issues:</span>{" "}
              {signedIntLabel(diff.errorCountDelta)}
            </li>
            {diff.percentInsertedChange != null ? (
              <li>
                <span className="font-medium">Change vs prior inserted:</span>{" "}
                {diff.percentInsertedChange}%
              </li>
            ) : null}
          </ul>
          {diff.anomalyLargeSwing ? (
            <p className="mt-3 text-amber-800 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Inserted row count moved by {UPLOAD_INSERTED_SWING_THRESHOLD_PCT}% or more vs the last upload
              of this type — confirm cohort or file scope before relying on aggregates.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-left">
          No prior upload of this data type in history — baseline established for future diffs.
        </p>
      )}

      <div className="text-left rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm">Row-level messages</h3>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={downloadCsv}>
            <Download className="h-3.5 w-3.5" />
            Download report (CSV)
          </Button>
        </div>
        {errorsTruncated ? (
          <p className="text-xs text-amber-800 mb-2">
            Showing first {errors.length} of {errorsTotal} messages in the UI and export slice. Full counts
            are in the database report when <code className="text-[10px]">validation_report</code> is
            enabled.
          </p>
        ) : null}
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {headlineOk
              ? "No row-level validation messages — clean run."
              : "No per-row messages returned; see inserted vs skipped counts above."}
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto rounded border bg-background text-xs font-mono">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="p-2 w-14">Row</th>
                  <th className="p-2 w-24">Column</th>
                  <th className="p-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={`${e.row}-${i}`} className="border-t">
                    <td className="p-2 align-top">{e.row}</td>
                    <td className="p-2 align-top text-muted-foreground">{e.column ?? "—"}</td>
                    <td className="p-2 align-top whitespace-pre-wrap">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={onUploadAnother}>
          Upload another file
        </Button>
        <Button variant="outline" onClick={onViewHistory}>
          View upload history
        </Button>
      </div>
    </div>
  )
}
