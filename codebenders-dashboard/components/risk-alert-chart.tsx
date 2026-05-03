"use client"

import { useMemo, useRef } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { InfoPopover } from "@/components/info-popover"
import {
  ChartExportBrandFooter,
  ChartExportDataSourceLine,
  ChartExportGlossaryBlurb,
} from "@/components/chart-export-card-meta"
import { ChartExportMenu } from "@/components/chart-export-menu"
import { buildCategoryCountPercentageCsv } from "@/lib/chart-export-csv"

interface RiskAlertData {
  category: string
  count: number
  percentage: number
}

interface RiskAlertChartProps {
  data: RiskAlertData[]
  loading?: boolean
  info?: React.ReactNode
}

const COLORS = {
  LOW: "#22c55e",      // green
  MODERATE: "#eab308", // yellow
  HIGH: "#f97316",     // orange
  URGENT: "#ef4444",   // red
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-sm font-semibold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

const CHART_FILE_SLUG = "risk-alert-distribution" as const

export function RiskAlertChart({ data, loading = false, info }: RiskAlertChartProps) {
  const exportRef = useRef<HTMLDivElement>(null)

  const csvSpec = useMemo(
    () =>
      buildCategoryCountPercentageCsv(data, ["Alert Level", "Count", "Percentage"] as const),
    [data]
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <CardTitle>Risk Alert Distribution</CardTitle>
            {info && <InfoPopover title="Risk Alert Distribution">{info}</InfoPopover>}
          </div>
          <CardDescription>Students by risk level</CardDescription>
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
            <CardTitle>Risk Alert Distribution</CardTitle>
            {info && <InfoPopover title="Risk Alert Distribution">{info}</InfoPopover>}
          </div>
          <CardDescription>Students by risk level</CardDescription>
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
    name: item.category,
    value: Number(item.count),
    percentage: item.percentage,
  }))

  const totalStudents = data.reduce((sum, item) => sum + Number(item.count), 0)

  return (
    <Card ref={exportRef}>
      <CardHeader>
        <CardTitle>Risk Alert Distribution</CardTitle>
        <CardDescription>{totalStudents.toLocaleString()} total students</CardDescription>
        <ChartExportGlossaryBlurb slug="risk-alert-distribution" />
        <ChartExportDataSourceLine>
          student_level_with_predictions · at_risk_alert ·
        </ChartExportDataSourceLine>
        <CardAction>
          <div className="flex items-center gap-1">
            {info ? (
              <span data-chart-export-exclude>
                <InfoPopover title="Risk Alert Distribution">{info}</InfoPopover>
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
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} students (${props.payload.percentage}%)`,
                name
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => {
                const item = data.find(d => d.category === value)
                return `${value} (${item?.count.toLocaleString() || 0})`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
      <ChartExportBrandFooter />
    </Card>
  )
}

