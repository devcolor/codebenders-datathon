"use client"

import type { ReactElement, ReactNode } from "react"

import { CardFooter } from "@/components/ui/card"
import type { MetricGlossarySlug } from "@/lib/glossary-constants"
import { CHART_EXPORT_BRAND_LINE } from "@/lib/chart-export-filename"
import { getChartExportBlurb } from "@/lib/chart-export-glossary"

export function ChartExportGlossaryBlurb(props: { slug: MetricGlossarySlug }): ReactElement {
  return (
    <p className="text-xs text-muted-foreground leading-snug max-w-prose">
      {getChartExportBlurb(props.slug)}
    </p>
  )
}

export function ChartExportDataSourceLine(props: { children: ReactNode }): ReactElement {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground/90">Data source:</span> {props.children}{" "}
      <span className="font-medium text-foreground/90">Generated:</span>{" "}
      {new Date().toLocaleDateString()}
    </p>
  )
}

export function ChartExportBrandFooter(): ReactElement {
  return (
    <CardFooter className="border-t border-border pt-6 text-xs text-muted-foreground">
      {CHART_EXPORT_BRAND_LINE}
    </CardFooter>
  )
}
