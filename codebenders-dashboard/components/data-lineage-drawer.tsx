"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { LineageMetricId } from "@/lib/lineage-config"
import type { LineageApiResponse } from "@/lib/lineage-types"
import { GitBranch, Loader2 } from "lucide-react"

export type LineageOpenRequest = {
  metric: LineageMetricId
  cohort?: string
  enrollmentType?: string
  credentialType?: string
  category?: string
  studentGuid?: string
  field?: string
}

function buildLineageUrl(req: LineageOpenRequest, page: number, pageSize: number) {
  const p = new URLSearchParams()
  p.set("metric", req.metric)
  p.set("page", String(page))
  p.set("pageSize", String(pageSize))
  if (req.cohort) p.set("cohort", req.cohort)
  if (req.enrollmentType) p.set("enrollmentType", req.enrollmentType)
  if (req.credentialType) p.set("credentialType", req.credentialType)
  if (req.category) p.set("category", req.category)
  if (req.studentGuid) p.set("studentGuid", req.studentGuid)
  if (req.field) p.set("field", req.field)
  return `/api/lineage?${p.toString()}`
}

export function useDataLineage() {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState<LineageOpenRequest | null>(null)
  const [page, setPage] = useState(1)

  const openLineage = useCallback((r: LineageOpenRequest) => {
    setRequest(r)
    setPage(1)
    setOpen(true)
  }, [])

  const drawer = (
    <DataLineageDrawer
      open={open}
      page={page}
      onPageChange={setPage}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setRequest(null)
          setPage(1)
        }
      }}
      request={request}
    />
  )

  return { drawer, openLineage }
}

type DataLineageDrawerProps = {
  open: boolean
  page: number
  onPageChange: (page: number) => void
  onOpenChange: (open: boolean) => void
  request: LineageOpenRequest | null
}

export function DataLineageDrawer({ open, page, onPageChange, onOpenChange, request }: DataLineageDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LineageApiResponse | null>(null)

  useEffect(() => {
    if (!open || !request) {
      return
    }

    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(buildLineageUrl(request, page, 50))
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || "Failed to load lineage")
        }
        if (!cancelled) {
          setData(json as LineageApiResponse)
        }
      } catch (e) {
        if (!cancelled) {
          setData(null)
          setError(e instanceof Error ? e.message : "Failed to load lineage")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, request, page])

  const totalPages =
    data?.sourceRows?.total != null && data.sourceRows.pageSize > 0
      ? Math.max(1, Math.ceil(data.sourceRows.total / data.sourceRows.pageSize))
      : 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <GitBranch className="h-5 w-5 shrink-0 text-muted-foreground" />
            Data lineage
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-1 pt-1">
              {data ? (
                <>
                  <p className="text-sm text-foreground font-medium">{data.metricLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Upload event, source rows, and transformation chain for this aggregate.
                  </p>
                </>
              ) : request ? (
                <p className="text-xs text-muted-foreground">Loading metric details…</p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading lineage…
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive border border-destructive/30 rounded-md p-3">{error}</div>
        )}

        {!loading && data && (
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Metric
              </h3>
              <p className="font-medium text-foreground">{data.metricLabel}</p>
              <p className="text-muted-foreground mt-1">{data.metricDescription}</p>
              {data.field ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Column: <span className="font-mono">{data.field}</span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-2">{data.aggregate.summary}</p>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Latest ingest event
              </h3>
              {data.uploadEvent ? (
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <span className="text-foreground font-medium">File:</span> {data.uploadEvent.filename}
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Schema:</span> {data.uploadEvent.schemaLabel}{" "}
                    <span className="font-mono text-xs">({data.uploadEvent.fileType})</span>
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Uploaded:</span>{" "}
                    {new Date(data.uploadEvent.uploadedAt).toLocaleString()}
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Status:</span> {data.uploadEvent.status} · rows
                    inserted {data.uploadEvent.rowsInserted.toLocaleString()}
                    {data.uploadEvent.hasValidationReport ? " · validation report stored" : ""}
                  </li>
                  {data.uploadEvent.userEmail ? (
                    <li>
                      <span className="text-foreground font-medium">By:</span> {data.uploadEvent.userEmail}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-muted-foreground">No upload history found for student-level schemas yet.</p>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Transformation chain
              </h3>
              <ol className="list-decimal pl-4 space-y-3 text-muted-foreground">
                {data.transformationSteps
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <li key={step.order}>
                      <span className="text-foreground font-medium">{step.title}</span>
                      <p className="mt-0.5 text-xs leading-relaxed">{step.detail}</p>
                    </li>
                  ))}
              </ol>
            </section>

            {data.sourceRowsRestrictedMessage ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Source rows
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{data.sourceRowsRestrictedMessage}</p>
              </section>
            ) : null}

            {data.sourceRows && data.sourceRows.rows.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Source rows (paginated)
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Showing {data.sourceRows.rows.length} of {data.sourceRows.total.toLocaleString()} · page{" "}
                  {data.sourceRows.page} of {totalPages}
                </p>
                <div className="border rounded-md overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Student GUID</th>
                        <th className="text-left p-2 font-semibold">Cohort</th>
                        <th className="text-left p-2 font-semibold">Retention %</th>
                        <th className="text-left p-2 font-semibold">Alert</th>
                        <th className="text-left p-2 font-semibold">Risk band</th>
                        <th className="text-left p-2 font-semibold">Course compl. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sourceRows.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/60">
                          <td className="p-2 font-mono whitespace-nowrap">
                            {String(row.student_guid ?? "").slice(0, 14)}…
                          </td>
                          <td className="p-2">{String(row.cohort ?? "—")}</td>
                          <td className="p-2">{row.retention_pct != null ? String(row.retention_pct) : "—"}</td>
                          <td className="p-2">{String(row.at_risk_alert ?? "—")}</td>
                          <td className="p-2">{String(row.retention_risk_category ?? "—")}</td>
                          <td className="p-2">
                            {row.course_completion_pct != null ? String(row.course_completion_pct) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 ? (
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => onPageChange(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => onPageChange(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {!data.sourceRowsRestrictedMessage &&
            data.sourceRowsVisible &&
            data.aggregate.rowCount > 0 &&
            (!data.sourceRows || data.sourceRows.rows.length === 0) ? (
              <p className="text-xs text-muted-foreground">No rows returned for this page.</p>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
