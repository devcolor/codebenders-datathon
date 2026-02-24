"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

type FileType = "course_enrollment" | "pdp_cohort" | "pdp_ar"
type Phase = "idle" | "previewing" | "preview" | "committing" | "result"

interface PreviewData {
  columns: string[]
  sampleRows: Record<string, string>[]
  rowCount: number
  warnings: string[]
}

interface CommitResult {
  // Course enrollment
  inserted?: number
  skipped?: number
  errors?: string[]
  // PDP/AR
  status?: string
  storageKey?: string
  actionsUrl?: string
  error?: string
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  course_enrollment: "Course Enrollment CSV",
  pdp_cohort:        "PDP Cohort CSV",
  pdp_ar:            "PDP AR File (.xlsx)",
}

const FILE_TYPE_ACCEPT: Record<FileType, string> = {
  course_enrollment: ".csv",
  pdp_cohort:        ".csv",
  pdp_ar:            ".csv,.xlsx",
}

export default function UploadPage() {
  const [fileType, setFileType]     = useState<FileType>("course_enrollment")
  const [file, setFile]             = useState<File | null>(null)
  const [phase, setPhase]           = useState<Phase>("idle")
  const [preview, setPreview]       = useState<PreviewData | null>(null)
  const [result, setResult]         = useState<CommitResult | null>(null)
  const [dragOver, setDragOver]     = useState(false)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setErrorMsg(null)
    setPhase("idle")
    setPreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handlePreview = async () => {
    if (!file) return
    setPhase("previewing")
    setErrorMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("fileType", fileType)
    try {
      const res = await fetch("/api/admin/upload/preview", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? "Preview failed"); setPhase("idle"); return }
      setPreview(data as PreviewData)
      setPhase("preview")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error")
      setPhase("idle")
    }
  }

  const handleCommit = async () => {
    if (!file) return
    setPhase("committing")
    setErrorMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("fileType", fileType)
    try {
      const res = await fetch("/api/admin/upload/commit", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? "Upload failed"); setPhase("preview"); return }
      setResult(data as CommitResult)
      setPhase("result")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error")
      setPhase("preview")
    }
  }

  const reset = () => {
    setFile(null)
    setPhase("idle")
    setPreview(null)
    setResult(null)
    setErrorMsg(null)
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Upload Data</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Import course enrollment CSVs or PDP/AR files. Admin and IR only.
        </p>
      </div>

      {/* ── Phase: idle / selecting ── */}
      {(phase === "idle" || phase === "previewing") && (
        <Card>
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>Choose a file type, then drop or pick your file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File type selector */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(ft => (
                <button
                  key={ft}
                  onClick={() => { setFileType(ft); setFile(null); setErrorMsg(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                  className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                    fileType === ft
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                  }`}
                >
                  {FILE_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <label
              htmlFor="file-input"
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Accepts: {FILE_TYPE_ACCEPT[fileType]}</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept={FILE_TYPE_ACCEPT[fileType]}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <Button onClick={handlePreview} disabled={!file || phase === "previewing"} className="w-full">
              {phase === "previewing" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : "Preview"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Phase: preview ── */}
      {(phase === "preview" || phase === "committing") && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview — {FILE_TYPE_LABELS[fileType]}</CardTitle>
            <CardDescription>
              {file?.name} · {preview.rowCount} rows parsed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-md border border-border overflow-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.slice(0, 8).map(col => (
                      <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                    ))}
                    {preview.columns.length > 8 && <TableHead className="text-xs text-muted-foreground">+{preview.columns.length - 8} more</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleRows.map((row, i) => (
                    <TableRow key={i}>
                      {preview.columns.slice(0, 8).map(col => (
                        <TableCell key={col} className="text-xs max-w-32 truncate">{String(row[col] ?? "")}</TableCell>
                      ))}
                      {preview.columns.length > 8 && <TableCell />}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} disabled={phase === "committing"}>Back</Button>
              <Button
                onClick={handleCommit}
                disabled={phase === "committing" || preview.warnings.some(w => w.startsWith("Missing required"))}
                className="flex-1"
              >
                {phase === "committing" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : "Confirm & Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Phase: result ── */}
      {phase === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Upload Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.inserted !== undefined && (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">{result.inserted.toLocaleString()}</span> rows inserted</p>
                {(result.skipped ?? 0) > 0 && <p className="text-muted-foreground">{result.skipped} rows skipped (missing Student_GUID)</p>}
                {result.errors && result.errors.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive">
                    {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
            {result.status === "processing" && (
              <div className="space-y-2 text-sm">
                <p>File saved to Supabase Storage. The ML pipeline has been queued in GitHub Actions.</p>
                {result.actionsUrl && (
                  <a
                    href={result.actionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View pipeline run on GitHub Actions →
                  </a>
                )}
              </div>
            )}
            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                {result.error}
              </div>
            )}
            <Button variant="outline" onClick={reset} className="w-full">Upload another file</Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
