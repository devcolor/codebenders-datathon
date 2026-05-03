"use client"

import { useCallback, useState, type RefObject } from "react"
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
import {
  captureElementToPngDataUrl,
  downloadChartExportCsv,
  downloadChartPdf,
  downloadDataUrl,
} from "@/lib/chart-export-capture"
import type { ChartExportCsvSpec } from "@/lib/chart-export-csv"

interface ChartExportMenuProps {
  exportRef: RefObject<HTMLElement | null>
  chartFileSlug: string
  csv?: ChartExportCsvSpec | null
  disabled?: boolean
  /** Report capture failures (e.g. toast); defaults to console.error */
  onError?: (message: string) => void
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
    downloadChartExportCsv(csv, `${basename}.csv`)
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
