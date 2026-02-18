export interface QueryPlan {
  metric?: string
  groupBy?: string
  filters?: Record<string, any>
  timeHint?: string
  vizType: "line" | "bar" | "pie" | "kpi" | "table"
  sql: string
  queryString: string
}

export interface QueryResult {
  data: Record<string, any>[]
  rowCount: number
}

export interface PDPRecord {
  student_id: string
  institution: string
  cohort: string
  term: string
  program: string
  course_code: string
  enrollment_status: string
  retention_rate: number
  completion_rate: number
  gpa: number
  credits_earned: number
}
