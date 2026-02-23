import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/courses/dfwi", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)

  const gatewayOnly    = searchParams.get("gatewayOnly") === "true"
  const minEnrollments = Math.max(1, Number(searchParams.get("minEnrollments") || 10))
  const cohort         = searchParams.get("cohort") || ""
  const term           = searchParams.get("term")   || ""
  const sortBy         = searchParams.get("sortBy") || "dfwi_rate"
  const sortDir        = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC"

  // Whitelist sort columns to prevent injection
  const SORT_COLS: Record<string, string> = {
    dfwi_rate:   "dfwi_rate",
    enrollments: "enrollments",
  }
  const orderExpr = SORT_COLS[sortBy] ?? "dfwi_rate"

  const conditions: string[] = []
  const params: unknown[]    = []

  if (gatewayOnly) {
    conditions.push("gateway_type IN ('M', 'E')")
  }

  if (cohort) {
    params.push(cohort)
    conditions.push(`cohort = $${params.length}`)
  }

  if (term) {
    params.push(term)
    conditions.push(`academic_term = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  // minEnrollments goes into HAVING — bind as a param
  params.push(minEnrollments)
  const minEnrollmentsParam = `$${params.length}`

  const sql = `
    SELECT
      course_prefix,
      course_number,
      MAX(course_name)    AS course_name,
      MAX(gateway_type)   AS gateway_type,
      COUNT(*)            AS enrollments,
      COUNT(*) FILTER (WHERE grade IN ('D', 'F', 'W', 'I'))                                         AS dfwi_count,
      ROUND(
        COUNT(*) FILTER (WHERE grade IN ('D', 'F', 'W', 'I')) * 100.0 / NULLIF(COUNT(*), 0),
        1
      )                   AS dfwi_rate,
      ROUND(
        COUNT(*) FILTER (
          WHERE grade NOT IN ('D', 'F', 'W', 'I')
            AND grade IS NOT NULL
            AND grade != ''
        ) * 100.0 / NULLIF(COUNT(*), 0),
        1
      )                   AS pass_rate
    FROM course_enrollments
    ${where}
    GROUP BY course_prefix, course_number
    HAVING COUNT(*) >= ${minEnrollmentsParam}
    ORDER BY ${orderExpr} ${sortDir}
    LIMIT 200 -- capped at 200 rows; add pagination if needed
  `

  try {
    const pool   = getPool()
    const result = await pool.query(sql, params)

    return NextResponse.json({
      courses: result.rows,
      total:   result.rows.length,
    })
  } catch (error) {
    console.error("DFWI fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch DFWI data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
