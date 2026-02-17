import type { QueryPlan } from "./types"

// Database schema mapping
const SCHEMA_CONFIG = {
  // Map institution codes to database names
  institutionDbMap: {
    kctcs: "Kentucky_Community_and_Technical_College_System",
    akron: "University_of_Akron",
  },
  // Primary table for student-level analytics
  mainTable: "cohort",
  // Map metric names to actual column names
  metricColumnMap: {
    retention_rate: "Retention",
    completion_rate: "Persistence",
    gpa: "GPA_Group_Year_1",
    credits_earned: "Number_of_Credits_Earned_Year_1",
    count: "COUNT(*)",
  },
  // Map groupBy fields to actual column names
  groupByColumnMap: {
    cohort: "Cohort",
    term: "Cohort_Term",
    program: "Program_of_Study_Year_1",
    course_code: "Course_Prefix",
    enrollment_status: "Enrollment_Type",
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

  if (lowerPrompt.includes("last two terms") || lowerPrompt.includes("last 2 terms")) {
    if (groupBy === "cohort") {
      filters.cohort = ["2024-Fall", "2025-Spring"]
    } else {
      filters.term = ["Fall 2024", "Spring 2025"]
    }
  } else if (lowerPrompt.includes("2024")) {
    filters.term = ["Spring 2024", "Fall 2024"]
  } else if (lowerPrompt.includes("2025")) {
    filters.term = ["Spring 2025", "Fall 2025"]
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

  // Get database name for institution
  const dbName = SCHEMA_CONFIG.institutionDbMap[institutionCode as keyof typeof SCHEMA_CONFIG.institutionDbMap] || institutionCode
  const tableName = SCHEMA_CONFIG.mainTable

  const sql = `SELECT ${selectClause}
FROM \`${dbName}\`.${tableName}
${whereClause ? `WHERE ${whereClause}` : ""}
${groupByClause}
ORDER BY ${orderByColumn}`.trim()

  const queryParams = new URLSearchParams()

  // Add limit parameter
  queryParams.append("limit", "1000")
  queryParams.append("offset", "0")

  // Convert filters to query parameters
  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // For array values, add multiple parameters with the same key
        value.forEach((v) => queryParams.append(key, String(v)))
      } else {
        queryParams.append(key, String(value))
      }
    })
  }

  const queryString = `https://schools.syntex-ai.com/${institutionCode}/analysis-ready?${queryParams.toString()}`

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
