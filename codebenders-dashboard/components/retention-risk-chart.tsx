"use client"

import { useMemo, useRef } from "react"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { InfoPopover } from "@/components/info-popover"
import { ChartExportMenu } from "@/components/chart-export-menu"
import { getChartExportBlurb } from "@/lib/chart-export-glossary"
import { CHART_EXPORT_BRAND_LINE } from "@/lib/chart-export-filename"

interface RetentionRiskData {
  category: string
  count: number
  percentage: number
}

interface RetentionRiskChartProps {
  data: RetentionRiskData[]
  loading?: boolean
  info?: React.ReactNode
}

const COLORS = {
  "Critical Risk": "#ef4444",   // red
  "High Risk": "#f97316",       // orange
  "Moderate Risk": "#eab308",   // yellow
  "Low Risk": "#22c55e",        // green
}

const CHART_FILE_SLUG = "retention-risk-funnel" as const

export function RetentionRiskChart({ data, loading = false, info }: RetentionRiskChartProps) {
  const exportRef = useRef<HTMLDivElement>(null)

  const csvSpec = useMemo(
    () =>
      data?.length
        ? {
            headers: ["Risk Category", "Count", "Percentage"],
            rows: data.map((d) => [d.category, d.count, `${Number(d.percentage).toFixed(1)}%`]),
          }
        : null,
    [data]
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <CardTitle>Retention Risk Funnel</CardTitle>
            {info && <InfoPopover title="Retention Risk Funnel">{info}</InfoPopover>}
          </div>
          <CardDescription>Students by retention risk category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <CardTitle>Retention Risk Funnel</CardTitle>
            {info && <InfoPopover title="Retention Risk Funnel">{info}</InfoPopover>}
          </div>
          <CardDescription>Students by retention risk category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(item => ({
    category: item.category,
    count: Number(item.count),
    percentage: item.percentage,
  }))

  const totalStudents = data.reduce((sum, item) => sum + Number(item.count), 0)

  return (
    <Card ref={exportRef}>
      <CardHeader>
        <CardTitle>Retention Risk Funnel</CardTitle>
        <CardDescription>{totalStudents.toLocaleString()} total students</CardDescription>
        <p className="text-xs text-muted-foreground leading-snug max-w-prose">
          {getChartExportBlurb("retention-risk-funnel")}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/90">Data source:</span>{" "}
          student_level_with_predictions · retention_probability (XGBoost) ·{" "}
          <span className="font-medium text-foreground/90">Generated:</span>{" "}
          {new Date().toLocaleDateString()}
        </p>
        <CardAction>
          <div className="flex items-center gap-1">
            {info ? (
              <span data-chart-export-exclude>
                <InfoPopover title="Retention Risk Funnel">{info}</InfoPopover>
              </span>
            ) : null}
            <ChartExportMenu
              exportRef={exportRef}
              chartFileSlug={CHART_FILE_SLUG}
              csv={csvSpec}
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              type="category" 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))"
              width={90}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} students (${props.payload.percentage}%)`,
                "Count"
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.category as keyof typeof COLORS] || "#94a3b8"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="border-t border-border pt-6 text-xs text-muted-foreground">
        {CHART_EXPORT_BRAND_LINE}
      </CardFooter>
    </Card>
  )
}

