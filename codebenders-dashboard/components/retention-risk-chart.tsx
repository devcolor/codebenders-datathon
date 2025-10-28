"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface RetentionRiskData {
  category: string
  count: number
  percentage: number
}

interface RetentionRiskChartProps {
  data: RetentionRiskData[]
  loading?: boolean
}

const COLORS = {
  "Critical Risk": "#ef4444",   // red
  "High Risk": "#f97316",       // orange
  "Moderate Risk": "#eab308",   // yellow
  "Low Risk": "#22c55e",        // green
}

export function RetentionRiskChart({ data, loading = false }: RetentionRiskChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retention Risk Funnel</CardTitle>
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
          <CardTitle>Retention Risk Funnel</CardTitle>
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
    count: item.count,
    percentage: item.percentage,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Risk Funnel</CardTitle>
        <CardDescription>
          {data.reduce((sum, item) => sum + item.count, 0).toLocaleString()} total students
        </CardDescription>
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
    </Card>
  )
}

