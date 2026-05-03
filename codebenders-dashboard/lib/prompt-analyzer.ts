import type { QueryPlan } from "./types"
import { isForceDirectDb } from "./config"

// Database schema mapping
const SCHEMA_CONFIG = {
  // Map institution codes to database names (Postgres uses single DB; table name is the key)
  institutionDbMap: {
    bscc: "postgres",
    akron: "University_of_Akron",
  },
  // Primary table for student-level analytics
  mainTable: "student_level_with_predictions",
  // Map metric names to actual column names
  metricColumnMap: {
    retention_rate: "retention",
    completion_rate: "persistence",
    gpa: "gpa_group_year_1",
    credits_earned: "number_of_credits_earned_year_1",
    count: "COUNT(*)",
  },
  // Map groupBy fields to actual column names
  groupByColumnMap: {
    cohort: "cohort",
    term: "cohort_term",
    program: "program_of_study_year_1",
    course_code: "course_prefix",
    enrollment_status: "enrollment_type",
  },
}

export function analyzePrompt(prompt: string, institutionCode: string): QueryPlan {
  const lowerPrompt = prompt.toLowerCase()

  let metric: string | undefined
  if (lowerPrompt.includes("retention")) {
    metric = "retention_rate"
  } else if (lowerPrompt.includes("completion") || lowerPrompt.includes("persistence")) {
    metric = "completion_rate"
  } else if (lowerPrompt.includes("gpa")) {
    metric = "gpa"
  } else if (lowerPrompt.includes("credit")) {
    metric = "credits_earned"
  } else if (lowerPrompt.includes("enrollment") || lowerPrompt.includes("count")) {
    metric = "count"
  }

  let groupBy: string | undefined
  if (lowerPrompt.includes("by cohort") || lowerPrompt.includes("cohort")) {
    groupBy = "cohort"
  } else if (lowerPrompt.includes("by term") || lowerPrompt.includes("term")) {
    groupBy = "term"
  } else if (lowerPrompt.includes("by program") || lowerPrompt.includes("program")) {
    groupBy = "program"
  } else if (lowerPrompt.includes("by course") || lowerPrompt.includes("course")) {
    groupBy = "course_code"
  } else if (lowerPrompt.includes("by status") || lowerPrompt.includes("status")) {
    groupBy = "enrollment_status"
  }

  // Determine filters
  const filters: Record<string, any> = {}

  // NOTE: This non-LLM fallback path generates approximate filters.
  // cohort is a numeric year (e.g. 2024); cohort_term is a string ("Fall", "Spring", "Summer").
  // "Last two terms" maps to cohort = 2024 as an approximation; the LLM path handles this correctly.
  if (lowerPrompt.includes("last two terms") || lowerPrompt.includes("last 2 terms")) {
    filters.cohort = 2024
  } else if (lowerPrompt.includes("2024")) {
    filters.cohort = 2024
  } else if (lowerPrompt.includes("2025")) {
    filters.cohort = 2025
  }

  // Status filters
  if (lowerPrompt.includes("enrolled")) {
    filters.enrollment_status = "enrolled"
  } else if (lowerPrompt.includes("completed")) {
    filters.enrollment_status = "completed"
  }

  // Time hint
  let timeHint: string | undefined
  if (lowerPrompt.includes("last two terms") || lowerPrompt.includes("last 2 terms")) {
    timeHint = "Last two terms"
  } else if (lowerPrompt.includes("current")) {
    timeHint = "Current term"
  }

  let vizType: QueryPlan["vizType"] = "bar"

  if (groupBy === "term" || groupBy === "cohort") {
    vizType = "line"
  } else if (lowerPrompt.includes("share") || lowerPrompt.includes("percentage") || lowerPrompt.includes("breakdown")) {
    vizType = "pie"
  } else if (!groupBy) {
    vizType = "kpi"
  } else if (groupBy === "course_code") {
    vizType = "table"
  }

  // Map to actual database columns
  const actualMetricColumn = metric ? SCHEMA_CONFIG.metricColumnMap[metric as keyof typeof SCHEMA_CONFIG.metricColumnMap] : undefined
  const actualGroupByColumn = groupBy ? SCHEMA_CONFIG.groupByColumnMap[groupBy as keyof typeof SCHEMA_CONFIG.groupByColumnMap] : undefined

  // Generate SQL with actual schema
  const selectClause = actualGroupByColumn
    ? actualMetricColumn && actualMetricColumn !== "COUNT(*)"
      ? `${actualGroupByColumn}, AVG(${actualMetricColumn}) as ${metric}`
      : `${actualGroupByColumn}, COUNT(*) as count`
    : actualMetricColumn
      ? actualMetricColumn === "COUNT(*)"
        ? "COUNT(*) as count"
        : `AVG(${actualMetricColumn}) as ${metric}`
      : "COUNT(*) as count"

  // Map filter keys to actual column names
  const actualFilters: Record<string, any> = {}
  Object.entries(filters).forEach(([key, value]) => {
    const actualKey = SCHEMA_CONFIG.groupByColumnMap[key as keyof typeof SCHEMA_CONFIG.groupByColumnMap] || key
    actualFilters[actualKey] = value
  })

  const whereClause = Object.entries(actualFilters)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key} IN (${value.map((v) => `'${v}'`).join(", ")})`
      }
      return `${key} = '${value}'`
    })
    .join(" AND ")

  const groupByClause = actualGroupByColumn ? `GROUP BY ${actualGroupByColumn}` : ""
  const orderByColumn = actualGroupByColumn || (actualMetricColumn && actualMetricColumn !== "COUNT(*)" ? actualMetricColumn : "count")

  // Postgres: single-database, reference table directly (no cross-database backtick syntax)
  const tableName = SCHEMA_CONFIG.mainTable

  const sql = `SELECT ${selectClause}
FROM ${tableName}
${whereClause ? `WHERE ${whereClause}` : ""}
${groupByClause}
ORDER BY ${orderByColumn}`.trim()

  const queryParams = new URLSearchParams()
  queryParams.append("limit", "1000")
  queryParams.append("offset", "0")

  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, String(v)))
      } else {
        queryParams.append(key, String(value))
      }
    })
  }

  const queryString = isForceDirectDb()
    ? ""
    : `https://schools.syntex-ai.com/${institutionCode}/analysis-ready?${queryParams.toString()}`

  return {
    metric,
    groupBy,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    timeHint,
    vizType,
    sql,
    queryString,
  }
}
