"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DropZone } from "@/components/upload/drop-zone"
import { ColumnMapper } from "@/components/upload/column-mapper"
import { DataPreview } from "@/components/upload/data-preview"
import { UploadSummary } from "@/components/upload/upload-summary"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import type { ColumnMapping } from "@/lib/upload-schemas"

type Step = "upload" | "preview" | "complete"

interface PreviewData {
  detectedSchema: string | null
  detectedSchemaLabel: string | null
  confidence: number
  scores: Array<{ schemaId: string; label: string; score: number }>
  columns: ColumnMapping[]
  sampleRows: Record<string, string>[]
  totalRows: number
  warnings: string[]
  errors: string[]
}

interface CommitResult {
  inserted: number
  skipped: number
  errors: Array<{ row: number; message: string }>
  uploadId: number
}

interface HistoryEntry {
  id: number
  filename: string
  fileType: string
  rowsInserted: number
  status: string
  uploadedAt: string
}

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [columns, setColumns] = useState<ColumnMapping[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)
  const [selectedSchemaLabel, setSelectedSchemaLabel] = useState<string | null>(null)
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<HistoryEntry[]>([])

  useEffect(() => {
    fetch("/api/admin/upload/history?pageSize=5")
      .then((r) => r.json())
      .then((d) => setRecentUploads(d.data ?? []))
      .catch(() => {})
  }, [])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", f)

      const res = await fetch("/api/admin/upload/preview", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Preview failed")
        setLoading(false)
        return
      }

      const data: PreviewData = await res.json()
      setPreview(data)
      setColumns(data.columns)
      setSelectedSchema(data.detectedSchema)
      setSelectedSchemaLabel(data.detectedSchemaLabel)
      setStep("preview")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSchemaOverride = useCallback(
    (schemaId: string, label: string) => {
      setSelectedSchema(schemaId)
      setSelectedSchemaLabel(label)
    },
    []
  )

  const handleCommit = useCallback(async () => {
    if (!file || !selectedSchema) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("schemaId", selectedSchema)
      formData.append("columnMapping", JSON.stringify(columns))

      const res = await fetch("/api/admin/upload/commit", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Upload failed")
        setLoading(false)
        return
      }

      const data: CommitResult = await res.json()
      setCommitResult(data)
      setStep("complete")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [file, selectedSchema, columns])

  const resetWizard = useCallback(() => {
    setStep("upload")
    setFile(null)
    setPreview(null)
    setColumns([])
    setSelectedSchema(null)
    setSelectedSchemaLabel(null)
    setCommitResult(null)
    setError(null)
  }, [])

  const headers = preview?.sampleRows?.[0] ? Object.keys(preview.sampleRows[0]) : []
  const hasRequiredErrors = (preview?.errors?.length ?? 0) > 0
  const stepLabels = ["Upload", "Preview & Map", "Complete"]
  const stepIndex = step === "upload" ? 0 : step === "preview" ? 1 : 2

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Upload Data</h1>
        <p className="text-sm text-muted-foreground">
          Drop a PDP, course, or prediction file — we&apos;ll detect the format
          automatically
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        {stepLabels.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={
                i < stepIndex
                  ? "text-green-600 line-through"
                  : i === stepIndex
                    ? "font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full"
                    : "text-muted-foreground"
              }
            >
              {i < stepIndex ? `${label} ✓` : `${i + 1}. ${label}`}
            </span>
          </span>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <DropZone onFile={handleFile} disabled={loading} />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
            </div>
          )}

          {recentUploads.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Recent Uploads</h3>
              <div className="space-y-1.5">
                {recentUploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <code>{u.filename}</code>
                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px]">
                        {u.fileType}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{u.rowsInserted} rows</span>
                      <span>{new Date(u.uploadedAt).toLocaleDateString()}</span>
                      <span className="text-green-600">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Map */}
      {step === "preview" && preview && (
        <div className="space-y-5">
          {preview.confidence >= 0.6 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold">{selectedSchemaLabel}</span>
                <span className="text-muted-foreground">
                  — {file?.name} — {preview.totalRows} rows,{" "}
                  {columns.filter((c) => c.status === "matched").length}/
                  {columns.length} columns matched
                </span>
              </div>
              <button
                className="text-xs text-muted-foreground border px-2 py-0.5 rounded hover:bg-muted"
                onClick={() => {}}
              >
                Wrong? Change type
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-semibold">
                  Couldn&apos;t confidently detect the file type
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {file?.name} has {columns.length} columns — it partially matches
                multiple schemas. Please select the correct type:
              </p>
              <div className="flex gap-2 flex-wrap">
                {preview.scores
                  .filter((s) => s.score > 0.1)
                  .map((s) => (
                    <button
                      key={s.schemaId}
                      className={`text-xs px-3 py-1.5 rounded border ${
                        selectedSchema === s.schemaId
                          ? "border-purple-600 bg-purple-50 font-semibold"
                          : "border-muted hover:bg-muted/50"
                      }`}
                      onClick={() => handleSchemaOverride(s.schemaId, s.label)}
                    >
                      {s.label}{" "}
                      <span className="text-muted-foreground">
                        ({Math.round(s.score * 100)}%)
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-2">Column Mapping</h3>
            <ColumnMapper
              columns={columns}
              schema={null}
              onMappingChange={setColumns}
            />
          </div>

          <DataPreview headers={headers} rows={preview.sampleRows} />

          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs">
              <span>
                📊 <strong>{preview.totalRows}</strong> rows
              </span>
              <span className="text-green-700">
                ✓ {columns.filter((c) => c.status === "matched").length} matched
              </span>
              {columns.filter((c) => c.status === "unmapped").length > 0 && (
                <span className="text-amber-700">
                  ⚠{" "}
                  {columns.filter((c) => c.status === "unmapped").length}{" "}
                  unmapped
                </span>
              )}
              {hasRequiredErrors && (
                <span className="text-red-700">
                  ✗ {preview.errors.length} errors
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetWizard}>
                ← Back
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleCommit}
                disabled={loading || hasRequiredErrors || !selectedSchema}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Uploading…
                  </>
                ) : (
                  `Upload ${preview.totalRows} Rows →`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === "complete" && commitResult && (
        <UploadSummary
          filename={file?.name ?? ""}
          schemaLabel={selectedSchemaLabel ?? "Unknown"}
          inserted={commitResult.inserted}
          skipped={commitResult.skipped}
          errorCount={commitResult.errors.length}
          onUploadAnother={resetWizard}
          onViewHistory={() => router.push("/admin/upload/history")}
        />
      )}
    </div>
  )
}
