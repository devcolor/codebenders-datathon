import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"
import {
  buildStudentLevelDashboardConditionsAliased,
  optionalDashboardFilterRecord,
  type DashboardFilterParams,
} from "@/lib/dashboard-filters"
import {
  LINEAGE_STUDENT_LEVEL_SCHEMA_IDS,
  isLineageMetricId,
  lineageStepsForMetric,
  isRosterLineageField,
  rosterFieldLineageLabel,
  type LineageMetricId,
} from "@/lib/lineage-config"
import { SCHEMAS } from "@/lib/upload-schemas"

const MAX_PAGE_SIZE = 100

type LineageUploadHistoryRow = {
  id: string
  filename: string
  file_type: string
  uploaded_at: Date
  status: string
  user_email: string | null
  rows_inserted: number
  rows_skipped: number
  error_count: number
  has_validation_report: boolean
}

const METRIC_LABEL: Record<LineageMetricId, string> = {
  overall_retention: "Overall retention rate",
  avg_predicted_retention: "Average predicted retention",
  high_critical_risk_count: "Students at high / critical risk",
  avg_course_completion: "Average course completion",
  risk_alert_segment: "Risk alert segment",
  retention_risk_segment: "Retention risk segment",
  roster_cell: "Roster value",
}

function metricDescription(metric: LineageMetricId, category: string | null): string {
  switch (metric) {
    case "risk_alert_segment":
      return category
        ? `Students in the “${category}” slice of the risk alert distribution.`
        : "A slice of the risk alert distribution."
    case "retention_risk_segment":
      return category
        ? `Students in the “${category}” retention-probability band.`
        : "A slice of the retention risk distribution."
    case "roster_cell":
      return "Single student field as shown on the roster."
    default:
      return METRIC_LABEL[metric]
  }
}

function appendMetricPredicate(
  metric: LineageMetricId,
  category: string | null,
  studentGuid: string | null,
  conditions: string[],
  values: unknown[]
): { error?: string } {
  switch (metric) {
    case "high_critical_risk_count":
      conditions.push(`s.at_risk_alert IN ('HIGH', 'URGENT')`)
      return {}
    case "risk_alert_segment":
      if (!category?.trim()) return { error: "category is required for risk_alert_segment" }
      values.push(category.trim())
      conditions.push(`s.at_risk_alert = $${values.length}`)
      return {}
    case "retention_risk_segment":
      if (!category?.trim()) return { error: "category is required for retention_risk_segment" }
      values.push(category.trim())
      conditions.push(`s.retention_risk_category = $${values.length}`)
      return {}
    case "roster_cell":
      if (!studentGuid?.trim()) return { error: "studentGuid is required for roster_cell" }
      values.push(studentGuid.trim())
      conditions.push(`s."Student_GUID" = $${values.length}`)
      return {}
    default:
      return {}
  }
}

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const metricRaw = searchParams.get("metric") || ""
  if (!isLineageMetricId(metricRaw)) {
    return NextResponse.json(
      { error: "Invalid or missing metric", allowed: "overall_retention | avg_predicted_retention | …" },
      { status: 400 }
    )
  }
  const metric = metricRaw

  const cohort = searchParams.get("cohort") ?? ""
  const enrollmentType = searchParams.get("enrollmentType") ?? ""
  const credentialType = searchParams.get("credentialType") ?? ""
  const category = searchParams.get("category") ?? ""
  const studentGuid = searchParams.get("studentGuid") ?? ""
  const fieldRaw = searchParams.get("field") ?? ""
  const categoryForApi = category || null

  if (metric === "roster_cell") {
    if (!isRosterLineageField(fieldRaw)) {
      return NextResponse.json({ error: "Invalid or missing field for roster_cell" }, { status: 400 })
    }
  }

  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize") || 50)))
  const offset = (page - 1) * pageSize

  const showIdentifiers = canAccess("/api/students", role)

  const filterParams: DashboardFilterParams = { cohort, enrollmentType, credentialType }
  const { conditions: filterConds, values: filterVals } =
    metric === "roster_cell"
      ? { conditions: [] as string[], values: [] as unknown[] }
      : buildStudentLevelDashboardConditionsAliased(filterParams, "s")

  const conditions = [...filterConds]
  const values = [...filterVals]

  const predErr = appendMetricPredicate(metric, categoryForApi, studentGuid || null, conditions, values)
  if (predErr.error) {
    return NextResponse.json({ error: predErr.error }, { status: 400 })
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const pool = getPool()

  try {
    const [countRes, uploadRes] = await Promise.all([
      pool.query<{ c: number }>(
        `SELECT COUNT(*)::int AS c FROM student_level_with_predictions s ${whereSql}`,
        values
      ),
      pool.query<LineageUploadHistoryRow>(
        `SELECT id, filename, file_type, uploaded_at, status, user_email, rows_inserted, rows_skipped, error_count,
                (validation_report IS NOT NULL) AS has_validation_report
         FROM upload_history
         WHERE file_type = ANY($1::text[])
         ORDER BY uploaded_at DESC
         LIMIT 1`,
        [LINEAGE_STUDENT_LEVEL_SCHEMA_IDS]
      ),
    ])

    const rowCount = Number(countRes.rows[0]?.c ?? 0)
    const uploadRow = uploadRes.rows[0]

    const schemaMeta = uploadRow ? SCHEMAS.find((x) => x.id === uploadRow.file_type) : undefined

    let sourceRows: Record<string, unknown>[] | undefined
    if (showIdentifiers && rowCount > 0) {
      const dataSql = `
        SELECT
          s."Student_GUID" AS student_guid,
          s."Cohort" AS cohort,
          s."Enrollment_Intensity_First_Term" AS enrollment_intensity,
          s."Retention" AS retention,
          ROUND((s.retention_probability * 100)::numeric, 1) AS retention_pct,
          s.at_risk_alert,
          s.retention_risk_category,
          ROUND((s.course_completion_rate * 100)::numeric, 1) AS course_completion_pct
        FROM student_level_with_predictions s
        ${whereSql}
        ORDER BY s."Student_GUID"
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `
      const dataRes = await pool.query(dataSql, [...values, pageSize, offset])
      sourceRows = dataRes.rows as Record<string, unknown>[]
    }

    const steps = lineageStepsForMetric(metric)
    if (metric === "roster_cell" && isRosterLineageField(fieldRaw)) {
      const rf = rosterFieldLineageLabel(fieldRaw)
      steps.push({
        order: 4,
        title: rf.label,
        detail: rf.detail,
      })
    }

    const uploadEvent = uploadRow
      ? {
          id: Number(uploadRow.id),
          filename: uploadRow.filename,
          fileType: uploadRow.file_type,
          schemaLabel: schemaMeta?.label ?? uploadRow.file_type,
          uploadedAt: uploadRow.uploaded_at.toISOString(),
          status: uploadRow.status,
          userEmail: uploadRow.user_email,
          rowsInserted: Number(uploadRow.rows_inserted ?? 0),
          rowsSkipped: Number(uploadRow.rows_skipped ?? 0),
          errorCount: Number(uploadRow.error_count ?? 0),
          hasValidationReport: Boolean(uploadRow.has_validation_report),
        }
      : null

    return NextResponse.json({
      metricId: metric,
      metricLabel: METRIC_LABEL[metric],
      metricDescription: metricDescription(metric, categoryForApi),
      field: metric === "roster_cell" ? fieldRaw : undefined,
      filters: metric === "roster_cell" ? {} : optionalDashboardFilterRecord(filterParams),
      dimension: category || undefined,
      aggregate: {
        rowCount,
        summary:
          metric === "roster_cell"
            ? "One student row."
            : `${rowCount.toLocaleString()} student(s) match the current filters and metric scope.`,
      },
      sourceRowsVisible: showIdentifiers,
      sourceRowsRestrictedMessage: showIdentifiers
        ? undefined
        : "Row-level identifiers are available to Admin, Advisor, and IR roles (same access as the student roster).",
      sourceRows:
        showIdentifiers && sourceRows
          ? { page, pageSize, total: rowCount, rows: sourceRows }
          : undefined,
      uploadEvent,
      transformationSteps: steps,
    })
  } catch (error) {
    console.error("Lineage API error:", error)
    return NextResponse.json(
      {
        error: "Failed to load lineage",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
