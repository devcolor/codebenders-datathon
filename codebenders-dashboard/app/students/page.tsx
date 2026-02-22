"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Download, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { InfoPopover } from "@/components/info-popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentRow {
  student_guid: string
  cohort: string
  enrollment_intensity: string
  at_risk_alert: "URGENT" | "HIGH" | "MODERATE" | "LOW" | null
  retention_pct: string | null
  readiness_pct: string | null
  readiness_level: "High" | "Medium" | "Low" | null
  gateway_math_pct: string | null
  gateway_english_pct: string | null
  gpa_risk_pct: string | null
  time_to_credential: string | null
  credential_type: string | null
}

interface StudentsResponse {
  students: StudentRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

type SortKey =
  | "at_risk_alert"
  | "retention_probability"
  | "readiness_score"
  | "gateway_math_probability"
  | "gateway_english_probability"
  | "low_gpa_probability"
  | "predicted_time_to_credential"
  | "Cohort"
  | "enrollment_intensity"
  | "credential_type"

const ALERT_LEVELS = ["URGENT", "HIGH", "MODERATE", "LOW"] as const
const READINESS_TIERS = ["High", "Medium", "Low"] as const
const CREDENTIAL_TYPES = ["Associate", "Certificate", "Bachelor"] as const

// ─── Badge helpers ────────────────────────────────────────────────────────────

function AlertBadge({ level }: { level: StudentRow["at_risk_alert"] }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>
  const colors: Record<string, string> = {
    URGENT:   "bg-red-100 text-red-800 border-red-200",
    HIGH:     "bg-orange-100 text-orange-800 border-orange-200",
    MODERATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LOW:      "bg-green-100 text-green-800 border-green-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[level] ?? ""}`}>
      {level}
    </span>
  )
}

function ReadinessBadge({ level }: { level: StudentRow["readiness_level"] }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>
  const colors: Record<string, string> = {
    High:   "bg-green-100 text-green-800 border-green-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Low:    "bg-red-100 text-red-800 border-red-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[level] ?? ""}`}>
      {level}
    </span>
  )
}

function Pct({ value, invert = false }: { value: string | null; invert?: boolean }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">—</span>
  const n = parseFloat(value)
  let color = ""
  if (!isNaN(n)) {
    if (invert) {
      color = n >= 60 ? "text-red-600" : n >= 30 ? "text-yellow-600" : "text-green-600"
    } else {
      color = n >= 60 ? "text-green-600" : n >= 30 ? "text-yellow-600" : "text-red-600"
    }
  }
  return <span className={`text-sm font-medium ${color}`}>{value}%</span>
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-foreground" />
    : <ArrowDown className="h-3 w-3 text-foreground" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [data, setData]           = useState<StudentsResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Filters
  const [search, setSearch]               = useState("")
  const [alertLevels, setAlertLevels]     = useState<string[]>([])
  const [readinessTier, setReadinessTier] = useState("")
  const [credentialType, setCredentialType] = useState("")

  // Sort
  const [sortBy, setSortBy]   = useState<SortKey>("at_risk_alert")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Pagination
  const [page, setPage] = useState(1)

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    p.set("page", String(page))
    p.set("pageSize", "50")
    if (search)         p.set("search", search)
    if (alertLevels.length) p.set("alertLevel", alertLevels.join(","))
    if (readinessTier)  p.set("readinessTier", readinessTier)
    if (credentialType) p.set("credentialType", credentialType)
    p.set("sortBy", sortBy)
    p.set("sortDir", sortDir)
    return p.toString()
  }, [page, search, alertLevels, readinessTier, credentialType, sortBy, sortDir])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/students?${buildParams()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [buildParams])

  // Reset to page 1 when filters change
  const resetPage = () => setPage(1)

  function toggleAlertLevel(level: string) {
    setAlertLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
    resetPage()
  }

  function handleSort(col: SortKey) {
    if (col === sortBy) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortBy(col)
      setSortDir("desc")
    }
    resetPage()
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(resetPage, 400)
  }

  function clearFilters() {
    setSearch("")
    setAlertLevels([])
    setReadinessTier("")
    setCredentialType("")
    resetPage()
  }

  const hasFilters = search || alertLevels.length > 0 || readinessTier || credentialType

  // CSV export of current filtered view (all pages)
  async function exportCSV() {
    const p = new URLSearchParams(buildParams())
    p.set("page", "1")
    p.set("pageSize", "5000")
    const res = await fetch(`/api/students?${p.toString()}`)
    const json: StudentsResponse = await res.json()
    const rows = json.students
    if (!rows?.length) return

    const headers = [
      "Student GUID","Cohort","Enrollment","At-Risk Alert","Retention %",
      "Readiness %","Readiness Tier","Gateway Math %","Gateway English %",
      "GPA Risk %","Time to Credential","Credential Type",
    ]
    const lines = [
      headers.join(","),
      ...rows.map(r => [
        r.student_guid, r.cohort, r.enrollment_intensity ?? "",
        r.at_risk_alert ?? "", r.retention_pct ?? "",
        r.readiness_pct ?? "", r.readiness_level ?? "",
        r.gateway_math_pct ?? "", r.gateway_english_pct ?? "",
        r.gpa_risk_pct ?? "", r.time_to_credential ?? "",
        r.credential_type ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = "bishop-state-students.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const students = data?.students ?? []
  const total    = data?.total ?? 0
  const pageCount = data?.pageCount ?? 1

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Student Roster</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Bishop State Community College — all prediction scores
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-lg p-4 mb-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Student GUID…"
                className="pl-8"
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Readiness tier */}
            <div className="min-w-40">
              <Select
                value={readinessTier || "all"}
                onValueChange={v => { setReadinessTier(v === "all" ? "" : v); resetPage() }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Readiness tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All readiness tiers</SelectItem>
                  {READINESS_TIERS.map(t => (
                    <SelectItem key={t} value={t}>{t} Readiness</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Credential type */}
            <div className="min-w-40">
              <Select
                value={credentialType || "all"}
                onValueChange={v => { setCredentialType(v === "all" ? "" : v); resetPage() }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Credential type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All credential types</SelectItem>
                  {CREDENTIAL_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Alert level chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">At-risk level:</span>
            {ALERT_LEVELS.map(level => {
              const active = alertLevels.includes(level)
              const chipColors: Record<string, string> = {
                URGENT:   active ? "bg-red-100 border-red-400 text-red-800"   : "border-border text-muted-foreground",
                HIGH:     active ? "bg-orange-100 border-orange-400 text-orange-800" : "border-border text-muted-foreground",
                MODERATE: active ? "bg-yellow-100 border-yellow-400 text-yellow-800" : "border-border text-muted-foreground",
                LOW:      active ? "bg-green-100 border-green-400 text-green-800"  : "border-border text-muted-foreground",
              }
              return (
                <button
                  key={level}
                  onClick={() => toggleAlertLevel(level)}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium border cursor-pointer transition-colors ${chipColors[level]}`}
                >
                  {level}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} student${total !== 1 ? "s" : ""}`}
            {hasFilters ? " (filtered)" : ""}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page >= pageCount || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <Th label="Student GUID" />
                <ThSort label="Cohort" col="Cohort" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ThSort label="Enrollment" col="enrollment_intensity" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ThSort
                  label="At-Risk" col="at_risk_alert" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="At-Risk Alert Level"><p>Composite risk classification: <strong>URGENT</strong> — multiple high-risk signals, immediate outreach needed. <strong>HIGH</strong> — significant risk indicators. <strong>MODERATE</strong> — some risk factors present. <strong>LOW</strong> — on track. Based on retention probability, GPA risk, and gateway course signals.</p></InfoPopover>}
                />
                <ThSort
                  label="Retention %" col="retention_probability" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="Retention Probability"><p>Predicted probability (0–100%) that this student will re-enroll next academic year. Produced by a Logistic Regression model trained on 31 features. Academic placement levels account for 75% of predictive power.</p></InfoPopover>}
                />
                <ThSort
                  label="Readiness" col="readiness_score" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="PDP Readiness Index"><p>PDP-aligned composite score: Academic (40%) + Engagement (30%) + ML Risk (30%). <strong>High ≥ 65%</strong>, <strong>Medium 40–64%</strong>, <strong>Low &lt; 40%</strong>. See the Methodology page for the full formula and worked examples.</p></InfoPopover>}
                />
                <ThSort
                  label="Math %" col="gateway_math_probability" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="Gateway Math Success Probability"><p>Predicted probability (0–100%) that the student will pass their gateway math course in Year 1. Produced by an XGBoost model. Students with low math placement scores or part-time enrollment tend to score lower.</p></InfoPopover>}
                />
                <ThSort
                  label="English %" col="gateway_english_probability" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="Gateway English Success Probability"><p>Predicted probability (0–100%) that the student will pass their gateway English course in Year 1. Produced by an XGBoost model. Strong predictor of first-year persistence and long-term retention.</p></InfoPopover>}
                />
                <ThSort
                  label="GPA Risk %" col="low_gpa_probability" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="GPA Risk Probability"><p>Predicted probability (0–100%) that the student will end their first semester with a GPA below 2.0. Higher values indicate higher academic risk. Produced by an XGBoost model. Color-coded red when high.</p></InfoPopover>}
                />
                <ThSort
                  label="Time to Cred." col="predicted_time_to_credential" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="Predicted Time to Credential"><p>Estimated years from initial enrollment to credential completion, predicted by a Random Forest Regressor. Part-time students and those needing remediation typically show longer timelines.</p></InfoPopover>}
                />
                <ThSort
                  label="Credential Type" col="credential_type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}
                  info={<InfoPopover title="Predicted Credential Type"><p>Most likely credential this student will earn: <strong>Certificate</strong>, <strong>Associate</strong>, or <strong>Bachelor</strong>. Predicted by a Random Forest Classifier trained on program of study, enrollment intensity, academic preparation, and the credential the student is pursuing. Students without a completion record are classified based on their declared credential goal.</p></InfoPopover>}
                />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b animate-pulse">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-4 bg-muted rounded w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">
                    No students match the current filters.
                  </td>
                </tr>
              ) : (
                students.map(s => (
                  <tr key={s.student_guid} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {s.student_guid ? s.student_guid.slice(0, 12) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{s.cohort ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {s.enrollment_intensity === "Full Time" || s.enrollment_intensity === "FT"
                        ? "Full-time"
                        : s.enrollment_intensity === "Part Time" || s.enrollment_intensity === "PT"
                        ? "Part-time"
                        : s.enrollment_intensity ?? "—"}
                    </td>
                    <td className="px-3 py-2.5"><AlertBadge level={s.at_risk_alert} /></td>
                    <td className="px-3 py-2.5"><Pct value={s.retention_pct} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {s.readiness_pct !== null && (
                          <span className="text-sm font-medium">{s.readiness_pct}%</span>
                        )}
                        <ReadinessBadge level={s.readiness_level} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Pct value={s.gateway_math_pct} /></td>
                    <td className="px-3 py-2.5"><Pct value={s.gateway_english_pct} /></td>
                    <td className="px-3 py-2.5"><Pct value={s.gpa_risk_pct} invert /></td>
                    <td className="px-3 py-2.5 text-xs">
                      {s.time_to_credential ? `${s.time_to_credential} yr` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{s.credential_type ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination */}
        {pageCount > 1 && !loading && (
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Table header helpers ─────────────────────────────────────────────────────

function Th({ label, info }: { label: string; info?: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
      <span className="flex items-center gap-0.5">
        {label}
        {info}
      </span>
    </th>
  )
}

function ThSort({
  label, col, sortBy, sortDir, onSort, info,
}: {
  label: string
  col: SortKey
  sortBy: SortKey
  sortDir: "asc" | "desc"
  onSort: (col: SortKey) => void
  info?: React.ReactNode
}) {
  return (
    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
      <span className="flex items-center gap-0.5">
        <button
          onClick={() => onSort(col)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          <SortIcon active={sortBy === col} dir={sortDir} />
        </button>
        {info}
      </span>
    </th>
  )
}
