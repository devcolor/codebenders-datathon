"use client"

import { useEffect, useState } from "react"
import { KPICard } from "@/components/kpi-card"
import { RiskAlertChart } from "@/components/risk-alert-chart"
import { RetentionRiskChart } from "@/components/retention-risk-chart"
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

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertData[]>([])
  const [retentionRisk, setRetentionRisk] = useState<RetentionRiskData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    fetchDashboardData()
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
          <Link href="/query">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              SQL Query Interface
            </Button>
          </Link>
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
          />
          <KPICard
            title="Avg Predicted Retention"
            value={kpis ? `${kpis.avgPredictedRetention}%` : "—"}
            icon={Users}
            subtitle="ML model prediction"
            loading={loading}
          />
          <KPICard
            title="Students at High/Critical Risk"
            value={kpis ? kpis.highCriticalRiskCount.toLocaleString() : "—"}
            icon={AlertTriangle}
            subtitle="Require immediate intervention"
            loading={loading}
          />
          <KPICard
            title="Avg Course Completion"
            value={kpis ? `${kpis.avgCourseCompletionRate}%` : "—"}
            icon={BookOpen}
            subtitle="Credits earned / attempted"
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <RiskAlertChart data={riskAlerts} loading={loading} />
          <RetentionRiskChart data={retentionRisk} loading={loading} />
        </div>

        {/* Additional Info */}
        <div className="border-t border-border pt-6">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Data Source:</strong> kcts_student_predictions table (32,800 students)
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
