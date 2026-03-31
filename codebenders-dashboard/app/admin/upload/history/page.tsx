"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface UploadEntry {
  id: number
  userEmail: string
  filename: string
  fileType: string
  rowsInserted: number
  rowsSkipped: number
  errorCount: number
  status: "success" | "partial" | "failed"
  uploadedAt: string
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdp_cohort_ar: "bg-green-50 text-green-700",
  pdp_cohort_submission: "bg-green-50 text-green-700",
  course_ar: "bg-blue-50 text-blue-700",
  course_submission: "bg-blue-50 text-blue-700",
  ml_predictions: "bg-purple-50 text-purple-700",
}

const FILE_TYPE_LABELS: Record<string, string> = {
  pdp_cohort_ar: "PDP Cohort AR",
  pdp_cohort_submission: "PDP Cohort Submission",
  course_ar: "Course AR",
  course_submission: "Course Submission",
  ml_predictions: "ML Predictions",
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
}

export default function UploadHistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/upload/history?page=${p}&pageSize=${pageSize}`
      )
      const data = await res.json()
      setEntries(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(page)
  }, [page, fetchHistory])

  const pageCount = Math.ceil(total / pageSize)

  const statusCounts = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Upload History</h1>
          <p className="text-sm text-muted-foreground">
            All data file uploads by admin and IR users
          </p>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-700"
          onClick={() => router.push("/admin/upload")}
        >
          + New Upload
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-muted/30 border rounded-lg px-4 py-3">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Uploads</div>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="text-[11px] text-green-700 uppercase tracking-wide">Successful</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{statusCounts.success ?? 0}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-[11px] text-amber-700 uppercase tracking-wide">Partial</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{statusCounts.partial ?? 0}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="text-[11px] text-red-700 uppercase tracking-wide">Failed</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{statusCounts.failed ?? 0}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No uploads yet. Click &quot;+ New Upload&quot; to get started.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2.5 text-left font-semibold">File</th>
                <th className="px-4 py-2.5 text-left font-semibold">Type</th>
                <th className="px-4 py-2.5 text-right font-semibold">Inserted</th>
                <th className="px-4 py-2.5 text-right font-semibold">Skipped</th>
                <th className="px-4 py-2.5 text-right font-semibold">Errors</th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold">Uploaded By</th>
                <th className="px-4 py-2.5 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="px-4 py-2.5 font-mono text-xs">{e.filename}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${FILE_TYPE_COLORS[e.fileType] ?? "bg-muted text-muted-foreground"}`}>
                      {FILE_TYPE_LABELS[e.fileType] ?? e.fileType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{e.rowsInserted.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-amber-700">{e.rowsSkipped}</td>
                  <td className="px-4 py-2.5 text-right text-red-700">{e.errorCount}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] ?? ""}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.userEmail}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(e.uploadedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} uploads</span>
          <div className="flex gap-1">
            <button className="border px-2 py-1 rounded disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button
                key={p}
                className={`px-2 py-1 rounded ${p === page ? "bg-purple-600 text-white" : "border hover:bg-muted"}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className="border px-2 py-1 rounded disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
