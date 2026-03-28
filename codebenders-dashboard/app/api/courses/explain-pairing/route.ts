import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { canAccess, type Role } from "@/lib/roles"
import { generateExplanation } from "@/lib/model-client"

const DELIVERY_LABELS: Record<string, string> = {
  F: "Face-to-Face",
  O: "Online",
  H: "Hybrid",
}

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/courses/explain-pairing", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (process.env.MODEL_BACKEND !== "ollama" && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  const body = await request.json()
  const { prefix_a, number_a, name_a, prefix_b, number_b, name_b } = body

  if (!prefix_a || !number_a || !prefix_b || !number_b) {
    return NextResponse.json({ error: "Missing course identifiers" }, { status: 400 })
  }

  const pool = getPool()

  try {
    // Query 1: Individual DFWI + pass rates for each course
    const [indivRes, deliveryRes, instrRes] = await Promise.all([
      pool.query(
        `SELECT
          course_prefix,
          course_number,
          COUNT(*) AS enrollments,
          ROUND(
            COUNT(*) FILTER (WHERE grade IN ('D','F','W','I') AND grade IS NOT NULL AND grade <> '')
              * 100.0 / NULLIF(COUNT(*), 0), 1
          ) AS dfwi_rate,
          ROUND(
            COUNT(*) FILTER (WHERE grade NOT IN ('D','F','W','I') AND grade IS NOT NULL AND grade <> '')
              * 100.0 / NULLIF(COUNT(*), 0), 1
          ) AS pass_rate
        FROM course_enrollments
        WHERE (course_prefix = $1 AND course_number = $2)
           OR (course_prefix = $3 AND course_number = $4)
        GROUP BY course_prefix, course_number`,
        [prefix_a, number_a, prefix_b, number_b],
      ),

      // Query 2: Co-enrollment stats by delivery method
      pool.query(
        `SELECT
          a.delivery_method,
          COUNT(*) AS co_count,
          ROUND(
            COUNT(*) FILTER (
              WHERE a.grade NOT IN ('D','F','W','I') AND a.grade IS NOT NULL AND a.grade <> ''
                AND b.grade NOT IN ('D','F','W','I') AND b.grade IS NOT NULL AND b.grade <> ''
            ) * 100.0 / NULLIF(COUNT(*), 0), 1
          ) AS both_pass_rate
        FROM course_enrollments a
        JOIN course_enrollments b
          ON  a.student_guid  = b.student_guid
          AND a.academic_year = b.academic_year
          AND a.academic_term = b.academic_term
        WHERE a.course_prefix = $1 AND a.course_number = $2
          AND b.course_prefix = $3 AND b.course_number = $4
        GROUP BY a.delivery_method
        ORDER BY co_count DESC`,
        [prefix_a, number_a, prefix_b, number_b],
      ),

      // Query 3: Co-enrollment stats by instructor status
      pool.query(
        `SELECT
          a.instructor_status,
          COUNT(*) AS co_count,
          ROUND(
            COUNT(*) FILTER (
              WHERE a.grade NOT IN ('D','F','W','I') AND a.grade IS NOT NULL AND a.grade <> ''
                AND b.grade NOT IN ('D','F','W','I') AND b.grade IS NOT NULL AND b.grade <> ''
            ) * 100.0 / NULLIF(COUNT(*), 0), 1
          ) AS both_pass_rate
        FROM course_enrollments a
        JOIN course_enrollments b
          ON  a.student_guid  = b.student_guid
          AND a.academic_year = b.academic_year
          AND a.academic_term = b.academic_term
        WHERE a.course_prefix = $1 AND a.course_number = $2
          AND b.course_prefix = $3 AND b.course_number = $4
        GROUP BY a.instructor_status
        ORDER BY co_count DESC`,
        [prefix_a, number_a, prefix_b, number_b],
      ),
    ])

    const courseA = indivRes.rows.find(
      r => r.course_prefix === prefix_a && r.course_number === number_a,
    )
    const courseB = indivRes.rows.find(
      r => r.course_prefix === prefix_b && r.course_number === number_b,
    )

    const byDelivery = deliveryRes.rows.map(r => ({
      delivery_method: DELIVERY_LABELS[r.delivery_method] ?? r.delivery_method ?? "Unknown",
      co_count: Number(r.co_count),
      both_pass_rate: parseFloat(r.both_pass_rate),
    }))

    const byInstructor = instrRes.rows.map(r => ({
      instructor_status:
        r.instructor_status === "FT"
          ? "Full-Time Instructor"
          : r.instructor_status === "PT"
            ? "Part-Time Instructor"
            : (r.instructor_status ?? "Unknown"),
      co_count: Number(r.co_count),
      both_pass_rate: parseFloat(r.both_pass_rate),
    }))

    const stats = {
      courseA: courseA
        ? {
            dfwi_rate: parseFloat(courseA.dfwi_rate),
            pass_rate: parseFloat(courseA.pass_rate),
            enrollments: Number(courseA.enrollments),
          }
        : null,
      courseB: courseB
        ? {
            dfwi_rate: parseFloat(courseB.dfwi_rate),
            pass_rate: parseFloat(courseB.pass_rate),
            enrollments: Number(courseB.enrollments),
          }
        : null,
      byDelivery,
      byInstructor,
    }

    // Build prompt context
    const labelA = `${prefix_a} ${number_a}${name_a ? ` (${name_a})` : ""}`
    const labelB = `${prefix_b} ${number_b}${name_b ? ` (${name_b})` : ""}`

    const statsLineA = courseA
      ? `${labelA}: ${courseA.dfwi_rate}% DFWI, ${courseA.pass_rate}% pass rate, ${Number(courseA.enrollments).toLocaleString()} total enrollments`
      : `${labelA}: no individual stats available`

    const statsLineB = courseB
      ? `${labelB}: ${courseB.dfwi_rate}% DFWI, ${courseB.pass_rate}% pass rate, ${Number(courseB.enrollments).toLocaleString()} total enrollments`
      : `${labelB}: no individual stats available`

    const deliverySection = byDelivery.length
      ? byDelivery
          .map(d => `  ${d.delivery_method}: ${d.co_count} co-enrolled, ${d.both_pass_rate}% both passed`)
          .join("\n")
      : "  No delivery breakdown available"

    const instrSection = byInstructor.length
      ? byInstructor
          .map(i => `  ${i.instructor_status}: ${i.co_count} co-enrolled, ${i.both_pass_rate}% both passed`)
          .join("\n")
      : "  No instructor breakdown available"

    const llmPrompt = `You are an academic success analyst at a community college. An advisor is reviewing co-enrollment data for two courses students frequently take in the same term.

INDIVIDUAL COURSE STATS:
- ${statsLineA}
- ${statsLineB}

CO-ENROLLMENT BREAKDOWN (students taking both courses in the same term):

By delivery method:
${deliverySection}

By instructor type:
${instrSection}

Write a concise analysis (3-4 sentences) that:
1. Explains why students might struggle when taking both courses together (consider workload, cognitive load, prerequisite overlap, or scheduling demands)
2. Highlights which conditions show better or worse outcomes based on the data
3. Ends with one specific, actionable recommendation for advisors

Be practical and data-driven. Do not speculate beyond what the numbers show.`

    const result = { text: await generateExplanation(llmPrompt, 320) }

    return NextResponse.json({ stats, explanation: result.text })
  } catch (error) {
    console.error("[explain-pairing] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate explanation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
