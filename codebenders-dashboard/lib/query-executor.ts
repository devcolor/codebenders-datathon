import type { QueryPlan, QueryResult } from "./types"

export async function executeQuery(
  plan: QueryPlan,
  institutionCode: string,
  useDirectDB = false,
): Promise<QueryResult> {
  try {
    if (useDirectDB) {
      return await executeDirectDB(plan, institutionCode)
    }

    const url = plan.queryString
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: any[] = await response.json()

    // If no groupBy, return raw data or single aggregate
    if (!plan.groupBy) {
      if (plan.metric && data.length > 0) {
        const value = calculateAggregate(data, plan.metric)
        return {
          data: [{ [plan.metric]: value }],
          rowCount: 1,
        }
      }
      return {
        data: data.slice(0, 100),
        rowCount: data.length,
      }
    }

    if (data.length > 0 && plan.groupBy in data[0]) {
      const grouped = groupBy(data, plan.groupBy)

      const results = Object.entries(grouped).map(([key, records]) => {
        const result: Record<string, any> = {
          [plan.groupBy!]: key,
        }

        if (plan.metric) {
          result[plan.metric] = calculateAggregate(records, plan.metric)
        } else {
          result.count = records.length
        }

        return result
      })

      results.sort((a, b) => {
        const aVal = a[plan.groupBy!]
        const bVal = b[plan.groupBy!]
        if (typeof aVal === "string" && typeof bVal === "string") {
          return aVal.localeCompare(bVal)
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      })

      return {
        data: results,
        rowCount: results.length,
      }
    }

    return {
      data: data.slice(0, 100),
      rowCount: data.length,
    }
  } catch (error) {
    console.error("Query execution error:", error)
    throw error
  }
}

async function executeDirectDB(plan: QueryPlan, institutionCode: string): Promise<QueryResult> {
  const response = await fetch("/api/execute-sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sql: plan.sql,
      institution: institutionCode,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || "Database query failed")
  }

  const result = await response.json()

  return {
    data: result.data,
    rowCount: result.rowCount,
  }
}

function groupBy(data: any[], field: string): Record<string, any[]> {
  return data.reduce(
    (acc, record) => {
      const key = String(record[field] ?? "Unknown")
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(record)
      return acc
    },
    {} as Record<string, any[]>,
  )
}

function calculateAggregate(records: any[], metric: string): number {
  if (records.length === 0) return 0

  const values = records.map((r) => Number(r[metric])).filter((v) => !isNaN(v))

  if (values.length === 0) {
    return records.length
  }

  const sum = values.reduce((acc, val) => acc + val, 0)
  const avg = sum / values.length

  return Math.round(avg * 100) / 100
}
