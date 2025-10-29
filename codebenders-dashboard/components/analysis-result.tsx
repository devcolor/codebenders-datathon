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
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function AnalysisResult({ result, plan }: AnalysisResultProps) {
  const renderVisualization = () => {
    if (!result.data || result.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[400px]">
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
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={groupByKey} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={metricKey}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[0] }}
                name={metricKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={groupByKey} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar 
                dataKey={metricKey} 
                fill={CHART_COLORS[0]} 
                radius={[4, 4, 0, 0]}
                name={metricKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={result.data}
                dataKey={metricKey}
                nameKey={groupByKey}
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {result.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case "kpi":
        const kpiValue = result.data[0]?.[metricKey] || 0
        return (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center space-y-4">
              <div className="text-6xl font-bold text-foreground">
                {typeof kpiValue === "number" ? kpiValue.toFixed(1) : kpiValue}
                {metricKey.includes("rate") || metricKey.includes("percentage") ? "%" : ""}
              </div>
              <div className="text-xl text-muted-foreground capitalize">{metricKey.replace(/_/g, " ")}</div>
            </div>
          </div>
        )

      case "table":
        const columns = Object.keys(result.data[0] || {})
        return (
          <div className="rounded-md border border-border">
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
                      <TableCell key={col}>{typeof row[col] === "number" ? row[col].toFixed(2) : row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      <CardContent>{renderVisualization()}</CardContent>
    </Card>
  )
}
