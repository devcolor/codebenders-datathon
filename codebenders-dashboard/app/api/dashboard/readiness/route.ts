import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const institution = searchParams.get("institution")
    const cohort = searchParams.get("cohort")
    const level = searchParams.get("level") // high, medium, low

    const pool = getPool()

    // Build WHERE clause with $N Postgres placeholders
    const conditions: string[] = []
    const params: any[] = []

    if (institution) {
      params.push(institution)
      conditions.push(`"Institution_ID" = $${params.length}`)
    }

    if (cohort) {
      params.push(cohort)
      conditions.push(`"Cohort" = $${params.length}`)
    }

    if (level) {
      params.push(level)
      conditions.push(`readiness_level = $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Get overall statistics
    const statsResult = await pool.query(
      `
      SELECT
        COUNT(*) as total_students,
        AVG(readiness_score) as avg_score,
        MIN(readiness_score) as min_score,
        MAX(readiness_score) as max_score,
        SUM(CASE WHEN readiness_level = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN readiness_level = 'medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN readiness_level = 'low' THEN 1 ELSE 0 END) as low_count
      FROM llm_recommendations
      ${whereClause}
    `,
      params
    )

    const stats = statsResult.rows[0]

    if (!stats) {
      return NextResponse.json({ success: true, data: null }, { status: 200 })
    }

    // Get distribution by readiness level
    const distributionResult = await pool.query(
      `
      SELECT
        readiness_level,
        COUNT(*) as count,
        AVG(readiness_score) as avg_score,
        MIN(readiness_score) as min_score,
        MAX(readiness_score) as max_score
      FROM llm_recommendations
      ${whereClause}
      GROUP BY readiness_level
      ORDER BY
        CASE readiness_level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END
    `,
      params
    )

    // Get score distribution (buckets)
    const scoreDistResult = await pool.query(
      `
      SELECT
        CASE
          WHEN readiness_score >= 0.8 THEN '0.8-1.0'
          WHEN readiness_score >= 0.6 THEN '0.6-0.8'
          WHEN readiness_score >= 0.4 THEN '0.4-0.6'
          WHEN readiness_score >= 0.2 THEN '0.2-0.4'
          ELSE '0.0-0.2'
        END as score_range,
        COUNT(*) as count
      FROM llm_recommendations
      ${whereClause}
      GROUP BY
        CASE
          WHEN readiness_score >= 0.8 THEN '0.8-1.0'
          WHEN readiness_score >= 0.6 THEN '0.6-0.8'
          WHEN readiness_score >= 0.4 THEN '0.4-0.6'
          WHEN readiness_score >= 0.2 THEN '0.2-0.4'
          ELSE '0.0-0.2'
        END
      ORDER BY score_range DESC
    `,
      params
    )

    // Get recent assessments with student details
    const recentResult = await pool.query(
      `
      SELECT
        lr.id,
        lr."Student_GUID",
        lr."Institution_ID",
        lr."Cohort",
        lr."Cohort_Term",
        lr.readiness_score,
        lr.readiness_level,
        lr.rationale,
        lr.risk_factors,
        lr.suggested_actions,
        lr.generated_at,
        lr.model_name
      FROM llm_recommendations lr
      ${whereClause}
      ORDER BY lr.generated_at DESC
      LIMIT 100
    `,
      params
    )

    // Parse JSON fields in recent assessments
    const assessments = recentResult.rows.map((row) => ({
      ...row,
      risk_factors: row.risk_factors ? JSON.parse(row.risk_factors) : [],
      suggested_actions: row.suggested_actions ? JSON.parse(row.suggested_actions) : [],
    }))

    // Get most common risk factors
    const riskFactorResult = await pool.query(
      `
      SELECT risk_factors
      FROM llm_recommendations
      ${whereClause}
    `,
      params
    )

    // Parse and count risk factors
    const riskFactorCounts: { [key: string]: number } = {}
    riskFactorResult.rows.forEach((row) => {
      if (row.risk_factors) {
        try {
          const factors = JSON.parse(row.risk_factors)
          if (Array.isArray(factors)) {
            factors.forEach((factor) => {
              const truncated = factor.substring(0, 100)
              riskFactorCounts[truncated] = (riskFactorCounts[truncated] || 0) + 1
            })
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    })

    // Sort and get top 10 risk factors
    const topRiskFactors = Object.entries(riskFactorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([factor, count]) => ({ factor, count }))

    // Get cohort breakdown
    const cohortResult = await pool.query(
      `
      SELECT
        "Cohort",
        COUNT(*) as total,
        AVG(readiness_score) as avg_score,
        SUM(CASE WHEN readiness_level = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN readiness_level = 'medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN readiness_level = 'low' THEN 1 ELSE 0 END) as low_count
      FROM llm_recommendations
      ${whereClause}
      GROUP BY "Cohort"
      ORDER BY "Cohort" DESC
    `,
      params
    )

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_students: stats.total_students,
          avg_score: parseFloat(stats.avg_score || 0).toFixed(4),
          min_score: parseFloat(stats.min_score || 0).toFixed(4),
          max_score: parseFloat(stats.max_score || 0).toFixed(4),
          high_count: stats.high_count,
          medium_count: stats.medium_count,
          low_count: stats.low_count,
        },
        distribution: distributionResult.rows,
        score_distribution: scoreDistResult.rows,
        assessments: assessments,
        top_risk_factors: topRiskFactors,
        cohort_breakdown: cohortResult.rows,
      },
    })
  } catch (error) {
    console.error("Database error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch readiness assessment data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
