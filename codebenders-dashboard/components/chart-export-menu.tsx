"use client"

import { useCallback, useState } from "react"
import { Download, FileImage, FileSpreadsheet, FileType } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildChartExportBasename } from "@/lib/chart-export-filename"
import { captureElementToPngDataUrl, downloadChartPdf, downloadDataUrl } from "@/lib/chart-export-capture"

export interface ChartExportCsvSpec {
  headers: string[]
  rows: (string | number)[][]
}

interface ChartExportMenuProps {
  exportRef: React.RefObject<HTMLElement | null>
  chartFileSlug: string
  csv?: ChartExportCsvSpec | null
  disabled?: boolean
  /** Report capture failures (e.g. toast); defaults to console.error */
  onError?: (message: string) => void
}

function escapeCsvCell(v: string | number): string {
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadChartCsv(spec: ChartExportCsvSpec, basename: string): void {
  const lines = [
    spec.headers.map(escapeCsvCell).join(","),
    ...spec.rows.map((row) => row.map(escapeCsvCell).join(",")),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${basename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ChartExportMenu({
  exportRef,
  chartFileSlug,
  csv,
  disabled = false,
  onError,
}: ChartExportMenuProps) {
  const [busy, setBusy] = useState(false)

  const runExport = useCallback(
    async (kind: "png" | "pdf") => {
      const report = onError ?? ((m: string) => console.error(m))
      const el = exportRef.current
      if (!el) {
        report("Chart export: missing element")
        return
      }
      setBusy(true)
      try {
        const basename = buildChartExportBasename(chartFileSlug)
        if (kind === "png") {
          const dataUrl = await captureElementToPngDataUrl(el)
          downloadDataUrl(dataUrl, `${basename}.png`)
        } else {
          await downloadChartPdf(el, `${basename}.pdf`)
        }
      } catch (e) {
        report(e instanceof Error ? e.message : "Chart export failed")
      } finally {
        setBusy(false)
      }
    },
    [chartFileSlug, exportRef, onError]
  )

  const onCsv = useCallback(() => {
    if (!csv) return
    const basename = buildChartExportBasename(chartFileSlug)
    downloadChartCsv(csv, basename)
  }, [chartFileSlug, csv])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 h-8"
          disabled={disabled || busy}
          data-chart-export-exclude
          aria-label="Export chart"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Export chart</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {csv ? (
          <DropdownMenuItem onClick={onCsv} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => void runExport("png")}
          disabled={busy}
          className="gap-2"
        >
          <FileImage className="h-4 w-4" />
          PNG
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void runExport("pdf")}
          disabled={busy}
          className="gap-2"
        >
          <FileType className="h-4 w-4" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
