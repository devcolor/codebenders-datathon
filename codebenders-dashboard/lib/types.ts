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

export interface HistoryEntry {
  id: string
  timestamp: string   // ISO 8601
  institution: string // institution code e.g. "bscc"
  prompt: string
  rowCount: number
  vizType: QueryPlan["vizType"]
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
