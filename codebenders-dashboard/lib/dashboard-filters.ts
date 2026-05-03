/**
 * Shared WHERE clause for dashboard pages that filter `student_level_with_predictions`
 * (home KPIs, charts, lineage). Column names match existing API routes.
 */
export type DashboardFilterParams = {
  cohort: string
  enrollmentType: string
  credentialType: string
}

/** Query-string style object for lineage UI (omit empty keys). */
export function optionalDashboardFilterRecord(
  params: DashboardFilterParams
): Record<string, string> {
  return {
    ...(params.cohort ? { cohort: params.cohort } : {}),
    ...(params.enrollmentType ? { enrollmentType: params.enrollmentType } : {}),
    ...(params.credentialType ? { credentialType: params.credentialType } : {}),
  }
}

export function buildStudentLevelDashboardWhere(params: DashboardFilterParams): { clause: string; values: unknown[] } {
  const conditions: string[] = []
  const values: unknown[] = []

  if (params.cohort) {
    values.push(params.cohort)
    conditions.push(`"Cohort" = $${values.length}`)
  }
  if (params.enrollmentType) {
    values.push(params.enrollmentType)
    conditions.push(`"Enrollment_Intensity_First_Term" = $${values.length}`)
  }
  if (params.credentialType) {
    values.push(params.credentialType)
    conditions.push(`predicted_credential_label = $${values.length}`)
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return { clause, values }
}

/** Alias columns with table prefix `s.` for use in subqueries / JOINs. */
export function buildStudentLevelDashboardWhereAliased(
  params: DashboardFilterParams,
  tableAlias = "s"
): { clause: string; values: unknown[] } {
  const { conditions, values } = buildStudentLevelDashboardConditionsAliased(params, tableAlias)
  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return { clause, values }
}

/** Condition fragments (no `WHERE`) so callers can `AND` with lineage predicates. */
export function buildStudentLevelDashboardConditionsAliased(
  params: DashboardFilterParams,
  tableAlias = "s"
): { conditions: string[]; values: unknown[] } {
  const conditions: string[] = []
  const values: unknown[] = []

  if (params.cohort) {
    values.push(params.cohort)
    conditions.push(`${tableAlias}."Cohort" = $${values.length}`)
  }
  if (params.enrollmentType) {
    values.push(params.enrollmentType)
    conditions.push(`${tableAlias}."Enrollment_Intensity_First_Term" = $${values.length}`)
  }
  if (params.credentialType) {
    values.push(params.credentialType)
    conditions.push(`${tableAlias}.predicted_credential_label = $${values.length}`)
  }

  return { conditions, values }
}
