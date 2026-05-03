import type { LineageTransformStep } from "@/lib/lineage-config"

export type LineageUploadEvent = {
  id: number
  filename: string
  fileType: string
  schemaLabel: string
  uploadedAt: string
  status: string
  userEmail: string | null
  rowsInserted: number
  rowsSkipped: number
  errorCount: number
  hasValidationReport: boolean
}

export type LineageApiResponse = {
  metricId: string
  metricLabel: string
  metricDescription: string
  field?: string
  filters: Record<string, string>
  dimension?: string
  aggregate: {
    rowCount: number
    summary: string
  }
  sourceRowsVisible: boolean
  sourceRowsRestrictedMessage?: string
  sourceRows?: {
    page: number
    pageSize: number
    total: number
    rows: Record<string, unknown>[]
  }
  uploadEvent: LineageUploadEvent | null
  transformationSteps: LineageTransformStep[]
}
