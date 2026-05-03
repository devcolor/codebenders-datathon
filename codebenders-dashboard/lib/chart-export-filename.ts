/** Institution segment for export filenames (issue #106: <institution>_<chart>_<date>.ext). */
export const CHART_EXPORT_INSTITUTION_SLUG = "bishop-state-community-college" as const

export const CHART_EXPORT_INSTITUTION_NAME = "Bishop State Community College" as const

export const CHART_EXPORT_BRAND_LINE = `${CHART_EXPORT_INSTITUTION_NAME} · Student Success Dashboard` as const

export function chartExportDateStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function buildChartExportBasename(chartFileSlug: string, d = new Date()): string {
  const safe = chartFileSlug.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase()
  return `${CHART_EXPORT_INSTITUTION_SLUG}_${safe}_${chartExportDateStamp(d)}`
}
