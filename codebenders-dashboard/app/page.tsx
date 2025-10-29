"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/kpi-card"
import { RiskAlertChart } from "@/components/risk-alert-chart"
import { RetentionRiskChart } from "@/components/retention-risk-chart"
import { ReadinessAssessmentChart } from "@/components/readiness-assessment-chart"
import { ExportButton } from "@/components/export-button"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, AlertTriangle, BookOpen, Search } from "lucide-react"
import Link from "next/link"

interface KPIData {
  overallRetentionRate: string
  avgPredictedRetention: string
  highCriticalRiskCount: number
  avgCourseCompletionRate: string
  totalStudents: number
}

interface RiskAlertData {
  category: string
  count: number
  percentage: number
}

interface RetentionRiskData {
  category: string
  count: number
  percentage: number
}

interface ReadinessData {
  summary: {
    total_students: number
    avg_score: string
    min_score: string
    max_score: string
    high_count: number
    medium_count: number
    low_count: number
  }
  distribution: any[]
  score_distribution: any[]
  assessments: any[]
  top_risk_factors: any[]
  cohort_breakdown: any[]
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertData[]>([])
  const [retentionRisk, setRetentionRisk] = useState<RetentionRiskData[]>([])
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [readinessLoading, setReadinessLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readinessError, setReadinessError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all data in parallel
        const [kpisRes, riskAlertsRes, retentionRiskRes] = await Promise.all([
          fetch("/api/dashboard/kpis"),
          fetch("/api/dashboard/risk-alerts"),
          fetch("/api/dashboard/retention-risk"),
        ])

        if (!kpisRes.ok || !riskAlertsRes.ok || !retentionRiskRes.ok) {
          throw new Error("Failed to fetch dashboard data")
        }

        const [kpisData, riskAlertsData, retentionRiskData] = await Promise.all([
          kpisRes.json(),
          riskAlertsRes.json(),
          retentionRiskRes.json(),
        ])

        setKpis(kpisData)
        setRiskAlerts(riskAlertsData.data || [])
        setRetentionRisk(retentionRiskData.data || [])
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    const fetchReadinessData = async () => {
      try {
        setReadinessLoading(true)
        setReadinessError(null)

        const response = await fetch("/api/dashboard/readiness")
        
        if (!response.ok) {
          throw new Error("Failed to fetch readiness assessment data")
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          setReadinessData(result.data)
        } else {
          throw new Error(result.error || "Invalid readiness data format")
        }
      } catch (err) {
        console.error("Error fetching readiness data:", err)
        setReadinessError(err instanceof Error ? err.message : "Failed to load readiness assessment")
      } finally {
        setReadinessLoading(false)
      }
    }

    fetchDashboardData()
    fetchReadinessData()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Student Success Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              KCTCS Student Analytics & Predictive Models
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton 
              data={{
                kpis,
                riskAlerts,
                retentionRisk
              }}
              disabled={loading || !kpis}
            />
            <Link href="/query">
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                SQL Query Interface
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Overall Retention Rate"
            value={kpis ? `${kpis.overallRetentionRate}%` : "—"}
            icon={TrendingUp}
            subtitle={kpis ? `${kpis.totalStudents.toLocaleString()} total students` : undefined}
            loading={loading}
            info={
              <>
                <p><strong>What it shows:</strong> Percentage of students retained year-to-year based on historical data.</p>
                <p className="mt-2"><strong>Data source:</strong> Retention field from student cohort records (0=Not Retained, 1=Retained).</p>
                <p className="mt-2"><strong>Use for:</strong> Baseline institutional performance metric.</p>
              </>
            }
          />
          <KPICard
            title="Avg Predicted Retention"
            value={kpis ? `${kpis.avgPredictedRetention}%` : "—"}
            icon={Users}
            subtitle="ML model prediction"
            loading={loading}
            info={
              <>
                <p><strong>Model:</strong> XGBoost Classifier trained on 31 features including demographics, academic prep, and course performance.</p>
                <p className="mt-2"><strong>Accuracy:</strong> 52.2% (retention is inherently difficult to predict)</p>
                <p className="mt-2"><strong>Top predictive factors:</strong></p>
                <ul className="list-disc pl-4 mt-1">
                  <li>Math Placement (35.1% importance)</li>
                  <li>Passing Rate (3.0%)</li>
                  <li>First Year GPA (2.9%)</li>
                </ul>
                <p className="mt-2"><strong>Use for:</strong> Early identification of at-risk students for proactive intervention.</p>
              </>
            }
          />
          <KPICard
            title="Students at High/Critical Risk"
            value={kpis ? kpis.highCriticalRiskCount.toLocaleString() : "—"}
            icon={AlertTriangle}
            subtitle="Require immediate intervention"
            loading={loading}
            info={
              <>
                <p><strong>How it's calculated:</strong> Composite risk score combining:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>50%: Retention probability (inverted)</li>
                  <li>20%: GPA thresholds (&lt;2.0, &lt;2.5)</li>
                  <li>20%: Completion rate (&lt;50%, &lt;70%)</li>
                  <li>10%: Credit progress (&lt;6, &lt;12 credits)</li>
                </ul>
                <p className="mt-2"><strong>Alert levels:</strong></p>
                <ul className="list-disc pl-4 mt-1">
                  <li><strong>URGENT:</strong> Immediate contact needed (1.5%)</li>
                  <li><strong>HIGH:</strong> Priority intervention (25.4%)</li>
                </ul>
                <p className="mt-2"><strong>Recommended actions:</strong> Immediate advisor outreach, financial aid review, tutoring referrals.</p>
              </>
            }
          />
          <KPICard
            title="Avg Course Completion"
            value={kpis ? `${kpis.avgCourseCompletionRate}%` : "—"}
            icon={BookOpen}
            subtitle="Credits earned / attempted"
            loading={loading}
            info={
              <>
                <p><strong>Formula:</strong> (Total credits earned ÷ Total credits attempted) × 100</p>
                <p className="mt-2"><strong>Interpretation:</strong></p>
                <ul className="list-disc pl-4 mt-1">
                  <li>&gt;85%: Strong performance</li>
                  <li>70-85%: Moderate risk</li>
                  <li>&lt;70%: High risk indicator</li>
                  <li>&lt;50%: Critical - failing nearly half of courses</li>
                </ul>
                <p className="mt-2"><strong>Why it matters:</strong> Strong predictor of retention and credential completion.</p>
              </>
            }
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <RiskAlertChart 
            data={riskAlerts} 
            loading={loading}
            info={
              <>
                <p><strong>What it shows:</strong> Distribution of students across risk alert levels (URGENT, HIGH, MODERATE, LOW).</p>
                <p className="mt-2"><strong>How "At-Risk" is calculated:</strong></p>
                <p className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                  at_risk = (Retention == 0) OR<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Persistence == 0) OR<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(GPA &lt; 2.0) OR<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Completion Rate &lt; 60%)
                </p>
                <p className="mt-2">A student is flagged as "at-risk" if they meet ANY of these conditions:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>Not retained in subsequent year</li>
                  <li>Did not persist term-to-term</li>
                  <li>GPA below 2.0</li>
                  <li>Completing less than 60% of courses</li>
                </ul>
                <p className="mt-2"><strong>Alert severity levels:</strong> Based on composite risk score combining retention probability, GPA, completion rate, and credit progress.</p>
                <p className="mt-2"><strong>Use for:</strong> Daily advisor task lists, automated alerts, resource allocation.</p>
              </>
            }
          />
          <RetentionRiskChart 
            data={retentionRisk} 
            loading={loading}
            info={
              <>
                <p><strong>What it shows:</strong> Distribution of students based on Model 1's retention probability predictions.</p>
                <p className="mt-2"><strong>Model:</strong> XGBoost Classifier (52.2% accuracy, 0.54 AUC-ROC)</p>
                <p className="mt-2"><strong>Risk categories:</strong></p>
                <ul className="list-disc pl-4 mt-1">
                  <li><strong>Critical Risk:</strong> Retention probability &lt;0.3</li>
                  <li><strong>High Risk:</strong> Retention probability 0.3-0.5</li>
                  <li><strong>Moderate Risk:</strong> Retention probability 0.5-0.7</li>
                  <li><strong>Low Risk:</strong> Retention probability &gt;0.7</li>
                </ul>
                <p className="mt-2"><strong>Note:</strong> These are different from Risk Alerts above. This chart shows pure retention probability, while Risk Alerts combine retention with GPA and completion metrics.</p>
              </>
            }
          />
        </div>

        {/* Readiness Assessment Section */}
        <div className="border-t border-border pt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Student Readiness Assessment
            </h2>
            <p className="text-muted-foreground mt-1">
              AI-powered analysis identifying student preparation levels and intervention needs
            </p>
          </div>
          <ReadinessAssessmentChart 
            data={readinessData}
            isLoading={readinessLoading}
            error={readinessError || undefined}
          />
        </div>

        {/* Additional Info */}
        <div className="border-t border-border pt-6">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Data Source:</strong> student_predictions table (32,800 students)
            </p>
            <p className="mt-1">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
