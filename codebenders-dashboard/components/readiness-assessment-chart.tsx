'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp, TrendingDown, Users, Target, AlertTriangle } from 'lucide-react';
import { InfoPopover } from '@/components/info-popover';
import { GLOSSARY_HREF } from '@/lib/glossary-constants';

interface ReadinessData {
  summary: {
    total_students: number;
    avg_score: string;
    min_score: string;
    max_score: string;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  distribution: Array<{
    readiness_level: string;
    count: number;
    avg_score: string;
    min_score: string;
    max_score: string;
  }>;
  score_distribution: Array<{
    score_range: string;
    count: number;
  }>;
  assessments: Array<{
    id: number;
    Student_GUID: string;
    readiness_score: string;
    readiness_level: string;
    rationale: string;
    risk_factors: string[];
    suggested_actions: string[];
    Cohort: string;
    Cohort_Term: string;
    generated_at: string;
  }>;
  top_risk_factors: Array<{
    factor: string;
    count: number;
  }>;
  cohort_breakdown: Array<{
    Cohort: string;
    total: number;
    avg_score: string;
    high_count: number;
    medium_count: number;
    low_count: number;
  }>;
}

interface ReadinessAssessmentChartProps {
  data: ReadinessData | null;
  isLoading?: boolean;
  error?: string;
}

export function ReadinessAssessmentChart({ data, isLoading, error }: ReadinessAssessmentChartProps) {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Readiness Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading readiness assessment data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Readiness Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load readiness assessment data'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { summary, distribution, score_distribution, assessments, top_risk_factors, cohort_breakdown } = data;
  
  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getLevelBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level?.toLowerCase()) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };
  
  const totalStudents = summary.total_students;
  const avgScore = parseFloat(summary.avg_score);
  const highPct = totalStudents > 0 ? ((summary.high_count / totalStudents) * 100).toFixed(1) : '0';
  const mediumPct = totalStudents > 0 ? ((summary.medium_count / totalStudents) * 100).toFixed(1) : '0';
  const lowPct = totalStudents > 0 ? ((summary.low_count / totalStudents) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assessed</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              {summary.total_students.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Students with readiness assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-500" />
              {(avgScore * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Range: {(parseFloat(summary.min_score) * 100).toFixed(0)}% - {(parseFloat(summary.max_score) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Readiness</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
              {summary.high_count}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{highPct}% of students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>At Risk (Low)</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              {summary.low_count}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{lowPct}% of students</p>
          </CardContent>
        </Card>
      </div>

      {/* Readiness Level Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Readiness Level Distribution</CardTitle>
              <CardDescription>Student readiness categorization</CardDescription>
            </div>
            <InfoPopover title="Readiness Assessment">
              <p>
                AI-powered assessment analyzing student preparation, engagement, and success indicators. High readiness
                indicates students are well-positioned for success.
              </p>
              <p className="mt-3">
                <Link
                  href={`${GLOSSARY_HREF}#readiness-assessment`}
                  className="text-primary underline-offset-4 hover:underline text-xs font-medium"
                >
                  Full glossary entry (PDP / IPEDS cross-walk) →
                </Link>
              </p>
            </InfoPopover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {distribution.map((level) => {
              const percentage = totalStudents > 0 ? (level.count / totalStudents) * 100 : 0;
              const levelName = level.readiness_level.charAt(0).toUpperCase() + level.readiness_level.slice(1);
              
              return (
                <div key={level.readiness_level} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={getLevelBadgeVariant(level.readiness_level)}>
                        {levelName}
                      </Badge>
                      <span className="text-muted-foreground">
                        {level.count} students ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <span className="font-medium">
                      Avg: {(parseFloat(level.avg_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${getLevelColor(level.readiness_level)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>Readiness scores grouped by range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {score_distribution.map((range) => {
              const percentage = totalStudents > 0 ? (range.count / totalStudents) * 100 : 0;
              
              return (
                <div key={range.score_range} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium">{range.score_range}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-sm text-right">
                    {range.count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Risk Factors */}
      {top_risk_factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Common Risk Factors</CardTitle>
            <CardDescription>Issues identified across student assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {top_risk_factors.slice(0, 5).map((risk, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{risk.factor}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Affects {risk.count} student{risk.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cohort Breakdown */}
      {cohort_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Readiness by Cohort</CardTitle>
            <CardDescription>Assessment breakdown across enrollment cohorts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Cohort</th>
                    <th className="text-center py-2 px-2">Total</th>
                    <th className="text-center py-2 px-2">Avg Score</th>
                    <th className="text-center py-2 px-2">High</th>
                    <th className="text-center py-2 px-2">Medium</th>
                    <th className="text-center py-2 px-2">Low</th>
                  </tr>
                </thead>
                <tbody>
                  {cohort_breakdown.map((cohort) => (
                    <tr key={cohort.Cohort} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium">{cohort.Cohort}</td>
                      <td className="text-center py-2 px-2">{cohort.total}</td>
                      <td className="text-center py-2 px-2">
                        {(parseFloat(cohort.avg_score) * 100).toFixed(0)}%
                      </td>
                      <td className="text-center py-2 px-2 text-green-600 font-medium">
                        {cohort.high_count}
                      </td>
                      <td className="text-center py-2 px-2 text-yellow-600 font-medium">
                        {cohort.medium_count}
                      </td>
                      <td className="text-center py-2 px-2 text-red-600 font-medium">
                        {cohort.low_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Assessments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Student Assessments</CardTitle>
          <CardDescription>Latest readiness evaluations with recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {assessments.slice(0, 10).map((assessment) => (
              <div key={assessment.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{assessment.Student_GUID}</span>
                      <Badge variant={getLevelBadgeVariant(assessment.readiness_level)}>
                        {assessment.readiness_level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Score: {(parseFloat(assessment.readiness_score) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {assessment.Cohort} • {assessment.Cohort_Term}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-700">
                  <strong>Assessment:</strong> {assessment.rationale}
                </div>
                
                {assessment.risk_factors.length > 0 && (
                  <div className="space-y-1">
                    <strong className="text-sm text-red-600">Risk Factors:</strong>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {assessment.risk_factors.slice(0, 3).map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {assessment.suggested_actions.length > 0 && (
                  <div className="space-y-1">
                    <strong className="text-sm text-green-600">Suggested Actions:</strong>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {assessment.suggested_actions.slice(0, 3).map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

