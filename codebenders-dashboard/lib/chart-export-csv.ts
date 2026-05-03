export interface ChartExportCsvSpec {
  headers: string[]
  rows: (string | number)[][]
}

function escapeCsvCell(v: string | number): string {
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function serializeChartExportCsv(spec: ChartExportCsvSpec): string {
  const lines = [
    spec.headers.map(escapeCsvCell).join(","),
    ...spec.rows.map((row) => row.map(escapeCsvCell).join(",")),
  ]
  return lines.join("\n")
}

/** CSV for charts with category, count, and percentage columns. */
export function buildCategoryCountPercentageCsv(
  data: { category: string; count: number; percentage: number }[] | null | undefined,
  columnHeaders: readonly [string, string, string]
): ChartExportCsvSpec | null {
  if (!data?.length) return null
  return {
    headers: [...columnHeaders],
    rows: data.map((d) => [d.category, d.count, `${Number(d.percentage).toFixed(1)}%`]),
  }
}
