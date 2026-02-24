import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { QueryResult, QueryPlan } from "@/lib/types"

interface AnalysisResultProps {
  result: QueryResult
  plan: QueryPlan
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
}

function isRateColumn(col: string): boolean {
  const lower = col.toLowerCase()
  return (
    lower.endsWith("_rate") ||
    lower.endsWith("_probability") ||
    lower.endsWith("_pct") ||
    lower.endsWith("_percent") ||
    lower.endsWith("_percentage")
  )
}

function formatCellValue(col: string, val: unknown): string {
  if (typeof val !== "number") return val == null ? "" : String(val)
  if (isRateColumn(col) && val >= 0 && val <= 1) return (val * 100).toFixed(1) + "%"
  return Number.isInteger(val) ? String(val) : val.toFixed(2)
}

export function AnalysisResult({ result, plan }: AnalysisResultProps) {
  const renderDataTable = () => {
    if (!result.data || result.data.length === 0) return null
    const columns = Object.keys(result.data[0] || {})
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="capitalize">
                {col.replace(/_/g, " ")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={col}>{formatCellValue(col, row[col])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  const renderVisualization = () => {
    if (!result.data || result.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-48">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </div>
      )
    }

    // Auto-detect data keys if not provided
    const dataKeys = Object.keys(result.data[0] || {})
    const groupByKey = plan.groupBy || dataKeys[0]
    const metricKey = plan.metric || dataKeys.find(key => key !== groupByKey && typeof result.data[0][key] === 'number') || dataKeys[1] || 'count'

    switch (plan.vizType) {
      case "line":
        return (
          <div className="overflow-visible">
            <ResponsiveContainer width="100%" aspect={16 / 7}>
              <LineChart data={result.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={groupByKey} stroke="var(--muted-foreground)" />
                <YAxis
                  stroke="var(--muted-foreground)"
                  // No upper-bound guard: axis ticks may slightly exceed 1.0 (chart padding),
                  // and should still render as % to stay visually consistent with data labels.
                  tickFormatter={(v: number) =>
                    isRateColumn(metricKey) && v >= 0 ? `${(v * 100).toFixed(0)}%` : String(v)
                  }
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 10, overflow: 'visible' as const }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) =>
                    isRateColumn(metricKey) && v >= 0 && v <= 1
                      ? [`${(v * 100).toFixed(1)}%`, metricKey.replace(/_/g, " ")]
                      : [v, metricKey.replace(/_/g, " ")]
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={metricKey}
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[0] }}
                  name={metricKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )

      case "bar":
        return (
          <div className="overflow-visible">
            <ResponsiveContainer width="100%" aspect={16 / 7}>
              <BarChart data={result.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={groupByKey} stroke="var(--muted-foreground)" />
                <YAxis
                  stroke="var(--muted-foreground)"
                  // No upper-bound guard: axis ticks may slightly exceed 1.0 (chart padding),
                  // and should still render as % to stay visually consistent with data labels.
                  tickFormatter={(v: number) =>
                    isRateColumn(metricKey) && v >= 0 ? `${(v * 100).toFixed(0)}%` : String(v)
                  }
                />
                <Tooltip
                  cursor={false}
                  wrapperStyle={{ zIndex: 10, overflow: 'visible' as const }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) =>
                    isRateColumn(metricKey) && v >= 0 && v <= 1
                      ? [`${(v * 100).toFixed(1)}%`, metricKey.replace(/_/g, " ")]
                      : [v, metricKey.replace(/_/g, " ")]
                  }
                />
                <Legend />
                <Bar
                  dataKey={metricKey}
                  fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  name={metricKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )

      case "pie":
        return (
          <div className="overflow-visible">
            <ResponsiveContainer width="100%" aspect={4 / 3}>
              <PieChart>
                <Pie
                  data={result.data}
                  dataKey={metricKey}
                  nameKey={groupByKey}
                  cx="50%"
                  cy="50%"
                  outerRadius="40%"
                  label
                >
                  {result.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 10, overflow: 'visible' as const }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) =>
                    isRateColumn(metricKey) && v >= 0 && v <= 1
                      ? [`${(v * 100).toFixed(1)}%`, metricKey.replace(/_/g, " ")]
                      : [v, metricKey.replace(/_/g, " ")]
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )

      case "kpi": {
        const kpiRaw = result.data[0]?.[metricKey] ?? 0
        const isRate = isRateColumn(metricKey)
        const shouldScale = isRate && typeof kpiRaw === "number" && kpiRaw >= 0 && kpiRaw <= 1
        const kpiDisplay =
          typeof kpiRaw === "number"
            ? shouldScale
              ? (kpiRaw * 100).toFixed(1)
              : kpiRaw.toFixed(1)
            : String(kpiRaw)
        const kpiSuffix = shouldScale ? "%" : ""
        return (
          <div className="flex items-center justify-center h-48">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-foreground">
                {kpiDisplay}{kpiSuffix}
              </div>
              <div className="text-xl text-muted-foreground capitalize">
                {metricKey.replace(/_/g, " ")}
              </div>
            </div>
          </div>
        )
      }

      case "table":
        return (
          <div className="rounded-md border border-border">
            {renderDataTable()}
          </div>
        )

      default:
        return <div className="text-muted-foreground">Unsupported visualization type</div>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Results</CardTitle>
        <CardDescription>
          {result.rowCount} {result.rowCount === 1 ? "record" : "records"} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderVisualization()}
        {plan.vizType !== "table" && result.data && result.data.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Raw data ({result.rowCount} rows)</p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {renderDataTable()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
