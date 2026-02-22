"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentDetail {
  student_guid: string
  cohort: string
  enrollment_intensity: string
  at_risk_alert: "URGENT" | "HIGH" | "MODERATE" | "LOW" | null
  retention_pct: string | null
  gateway_math_pct: string | null
  gateway_english_pct: string | null
  gpa_risk_pct: string | null
  time_to_credential: string | null
  credential_type: string | null
  readiness_pct: string | null
  readiness_level: "high" | "medium" | "low" | null
  rationale: string | null
  risk_factors: string[]
  suggested_actions: string[]
  generated_at: string | null
  model_name: string | null
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const ALERT_COLORS: Record<string, string> = {
  URGENT:   "bg-red-100 text-red-800 border-red-200",
  HIGH:     "bg-orange-100 text-orange-800 border-orange-200",
  MODERATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW:      "bg-green-100 text-green-800 border-green-200",
}

const READINESS_COLORS: Record<string, string> = {
  high:   "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low:    "bg-red-100 text-red-800 border-red-200",
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${colorClass}`}>
      {label}
    </span>
  )
}

function PredictionCard({
  title,
  value,
  subtitle,
  colorClass,
}: {
  title: string
  value: string
  subtitle?: string
  colorClass: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium">{title}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

function pctColor(value: string | null, invert = false): string {
  if (!value) return ""
  const n = parseFloat(value)
  if (isNaN(n)) return ""
  if (invert) return n >= 60 ? "text-red-600" : n >= 30 ? "text-yellow-600" : "text-green-600"
  return n >= 60 ? "text-green-600" : n >= 30 ? "text-yellow-600" : "text-red-600"
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const { guid } = useParams<{ guid: string }>()
  const router = useRouter()

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!guid) return
    setLoading(true)
    fetch(`/api/students/${encodeURIComponent(guid)}`)
      .then(r => {
        if (r.status === 404) throw new Error("Student not found")
        if (!r.ok) throw new Error("Failed to load student data")
        return r.json()
      })
      .then(d => { setStudent(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [guid])

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-24 bg-muted rounded" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" size="sm" className="gap-1 mb-6" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back to Roster
          </Button>
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error ?? "Student not found"}
          </div>
        </div>
      </div>
    )
  }

  const alertLevel     = student.at_risk_alert ?? "LOW"
  const readinessLevel = student.readiness_level ?? ""

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Back nav */}
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back to Roster
        </Button>

        {/* Student header */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Student Identifier</p>
              <p className="font-mono text-lg font-semibold tracking-tight">
                {student.student_guid}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>Cohort {student.cohort ?? "—"}</span>
                <span>·</span>
                <span>{student.enrollment_intensity ?? "—"}</span>
                {student.credential_type && (
                  <>
                    <span>·</span>
                    <span>Expected: {student.credential_type}</span>
                  </>
                )}
                {student.time_to_credential && (
                  <>
                    <span>·</span>
                    <span>~{student.time_to_credential} yr to credential</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {student.at_risk_alert && (
                <Badge
                  label={student.at_risk_alert}
                  colorClass={ALERT_COLORS[alertLevel] ?? ""}
                />
              )}
              {student.readiness_level && (
                <Badge
                  label={`${student.readiness_level.charAt(0).toUpperCase() + student.readiness_level.slice(1)} Readiness`}
                  colorClass={READINESS_COLORS[readinessLevel] ?? ""}
                />
              )}
            </div>
          </div>

          {/* FERPA notice */}
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Data displayed is limited to de-identified academic indicators per FERPA guidelines.
              No personally identifiable information (name, SSN, address, or date of birth) is stored
              in this system. The Student Identifier above is an anonymised GUID.
            </span>
          </div>
        </div>

        {/* Prediction score cards */}
        <div>
          <h2 className="text-base font-semibold mb-3">Prediction Scores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <PredictionCard
              title="Retention Probability"
              value={student.retention_pct ? `${student.retention_pct}%` : "—"}
              subtitle="Likelihood of re-enrolling next year"
              colorClass={pctColor(student.retention_pct)}
            />
            <PredictionCard
              title="Readiness Score"
              value={student.readiness_pct ? `${student.readiness_pct}%` : "—"}
              subtitle="Academic + engagement + ML risk"
              colorClass={pctColor(student.readiness_pct)}
            />
            <PredictionCard
              title="Gateway Math"
              value={student.gateway_math_pct ? `${student.gateway_math_pct}%` : "—"}
              subtitle="Probability of passing gateway math"
              colorClass={pctColor(student.gateway_math_pct)}
            />
            <PredictionCard
              title="Gateway English"
              value={student.gateway_english_pct ? `${student.gateway_english_pct}%` : "—"}
              subtitle="Probability of passing gateway English"
              colorClass={pctColor(student.gateway_english_pct)}
            />
            <PredictionCard
              title="GPA Risk"
              value={student.gpa_risk_pct ? `${student.gpa_risk_pct}%` : "—"}
              subtitle="Probability of first-semester GPA < 2.0"
              colorClass={pctColor(student.gpa_risk_pct, true)}
            />
            <PredictionCard
              title="Time to Credential"
              value={student.time_to_credential ? `${student.time_to_credential} yr` : "—"}
              subtitle={`Predicted type: ${student.credential_type ?? "—"}`}
              colorClass="text-foreground"
            />
          </div>
        </div>

        {/* AI Readiness Assessment */}
        {(student.rationale || student.risk_factors.length > 0 || student.suggested_actions.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">AI Readiness Assessment</CardTitle>
                {student.model_name && (
                  <span className="text-xs text-muted-foreground">{student.model_name}</span>
                )}
              </div>
              {student.generated_at && (
                <p className="text-xs text-muted-foreground">
                  Generated {new Date(student.generated_at).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Rationale */}
              {student.rationale && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Assessment Rationale
                  </p>
                  <p className="text-sm leading-relaxed">{student.rationale}</p>
                </div>
              )}

              {/* Risk factors */}
              {student.risk_factors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Risk Factors
                  </p>
                  <ul className="space-y-1.5">
                    {student.risk_factors.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 h-2 w-2 rounded-full bg-orange-400 shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested actions */}
              {student.suggested_actions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Recommended Actions
                  </p>
                  <ul className="space-y-2">
                    {student.suggested_actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/40">
                          <span className="sr-only">action</span>
                        </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* No AI assessment yet */}
        {!student.rationale && student.risk_factors.length === 0 && student.suggested_actions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No AI readiness assessment has been generated for this student yet.
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
