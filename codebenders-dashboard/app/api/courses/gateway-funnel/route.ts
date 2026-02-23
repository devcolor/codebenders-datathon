import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/courses/gateway-funnel", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const mathSql = `
    SELECT
      cohort,
      COUNT(*)                                                                  AS attempted,
      COUNT(*) FILTER (WHERE grade NOT IN ('D','F','W','I')
                         AND grade IS NOT NULL AND grade <> '')                 AS passed,
      COUNT(*) FILTER (WHERE grade IN ('D','F','W','I'))                       AS dfwi
    FROM course_enrollments
    WHERE gateway_type = 'M'
    GROUP BY cohort
    ORDER BY cohort
  `

  const englishSql = `
    SELECT
      cohort,
      COUNT(*)                                                                  AS attempted,
      COUNT(*) FILTER (WHERE grade NOT IN ('D','F','W','I')
                         AND grade IS NOT NULL AND grade <> '')                 AS passed,
      COUNT(*) FILTER (WHERE grade IN ('D','F','W','I'))                       AS dfwi
    FROM course_enrollments
    WHERE gateway_type = 'E'
    GROUP BY cohort
    ORDER BY cohort
  `

  try {
    const pool = getPool()
    const [mathResult, englishResult] = await Promise.all([
      pool.query(mathSql),
      pool.query(englishSql),
    ])

    return NextResponse.json({
      math:    mathResult.rows,
      english: englishResult.rows,
    })
  } catch (error) {
    console.error("Gateway funnel fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch gateway funnel data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
