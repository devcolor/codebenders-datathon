import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'devcolor00.czqeeakaypfi.us-west-2.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'devcolor2025',
  database: process.env.DB_NAME || 'Kentucky_Community_and_Technical_College_System',
  port: parseInt(process.env.DB_PORT || '3306'),
};

export async function GET(request: Request) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const institution = searchParams.get('institution');
    const cohort = searchParams.get('cohort');
    const level = searchParams.get('level'); // high, medium, low
    
    connection = await mysql.createConnection(dbConfig);
    
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (institution) {
      conditions.push('Institution_ID = ?');
      params.push(institution);
    }
    
    if (cohort) {
      conditions.push('Cohort = ?');
      params.push(cohort);
    }
    
    if (level) {
      conditions.push('readiness_level = ?');
      params.push(level);
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';
    
    // Get overall statistics
    const [statsRows] = await connection.execute(`
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
    `, params);
    
    const stats = (statsRows as any[])[0];
    
    // Get distribution by readiness level
    const [distributionRows] = await connection.execute(`
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
    `, params);
    
    // Get score distribution (buckets)
    const [scoreDistRows] = await connection.execute(`
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
      GROUP BY score_range
      ORDER BY score_range DESC
    `, params);
    
    // Get recent assessments with student details
    const [recentRows] = await connection.execute(`
      SELECT 
        lr.id,
        lr.Student_GUID,
        lr.Institution_ID,
        lr.Cohort,
        lr.Cohort_Term,
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
    `, params);
    
    // Parse JSON fields in recent assessments
    const assessments = (recentRows as any[]).map(row => ({
      ...row,
      risk_factors: row.risk_factors ? JSON.parse(row.risk_factors) : [],
      suggested_actions: row.suggested_actions ? JSON.parse(row.suggested_actions) : []
    }));
    
    // Get most common risk factors
    const [riskFactorRows] = await connection.execute(`
      SELECT 
        risk_factors
      FROM llm_recommendations
      ${whereClause}
    `, params);
    
    // Parse and count risk factors
    const riskFactorCounts: { [key: string]: number } = {};
    (riskFactorRows as any[]).forEach(row => {
      if (row.risk_factors) {
        try {
          const factors = JSON.parse(row.risk_factors);
          if (Array.isArray(factors)) {
            factors.forEach(factor => {
              // Truncate long factors for grouping
              const truncated = factor.substring(0, 100);
              riskFactorCounts[truncated] = (riskFactorCounts[truncated] || 0) + 1;
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });
    
    // Sort and get top 10 risk factors
    const topRiskFactors = Object.entries(riskFactorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([factor, count]) => ({ factor, count }));
    
    // Get cohort breakdown
    const [cohortRows] = await connection.execute(`
      SELECT 
        Cohort,
        COUNT(*) as total,
        AVG(readiness_score) as avg_score,
        SUM(CASE WHEN readiness_level = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN readiness_level = 'medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN readiness_level = 'low' THEN 1 ELSE 0 END) as low_count
      FROM llm_recommendations
      ${whereClause}
      GROUP BY Cohort
      ORDER BY Cohort DESC
    `, params);
    
    await connection.end();
    
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
          low_count: stats.low_count
        },
        distribution: distributionRows,
        score_distribution: scoreDistRows,
        assessments: assessments,
        top_risk_factors: topRiskFactors,
        cohort_breakdown: cohortRows
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    
    if (connection) {
      await connection.end();
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch readiness assessment data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

