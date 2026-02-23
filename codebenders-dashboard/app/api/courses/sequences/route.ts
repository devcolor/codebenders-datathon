import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/courses/sequences", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const sql = `
    SELECT
      a.course_prefix                                                                             AS prefix_a,
      b.course_prefix                                                                             AS prefix_b,
      COUNT(*)                                                                                    AS co_enrollment_count,
      ROUND(
        COUNT(*) FILTER (
          WHERE a.grade NOT IN ('D', 'F', 'W', 'I') AND a.grade IS NOT NULL AND a.grade != ''
            AND b.grade NOT IN ('D', 'F', 'W', 'I') AND b.grade IS NOT NULL AND b.grade != ''
        ) * 100.0 / NULLIF(COUNT(*), 0),
        1
      )                                                                                           AS both_pass_rate
    FROM course_enrollments a
    JOIN course_enrollments b
      ON a.student_guid  = b.student_guid
     AND a.academic_year = b.academic_year
     AND a.academic_term = b.academic_term
     AND a.course_prefix < b.course_prefix
    GROUP BY a.course_prefix, b.course_prefix
    HAVING COUNT(*) >= 20
    ORDER BY co_enrollment_count DESC
    LIMIT 20
  `

  try {
    const pool   = getPool()
    const result = await pool.query(sql)

    return NextResponse.json({
      pairs: result.rows,
    })
  } catch (error) {
    console.error("Course sequences fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch course sequences", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
