"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoPopover } from "@/components/info-popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseRow {
  course_prefix: string
  course_number: string
  course_name: string
  gateway_type: string | null
  enrollments: number
  dfwi_count: number
  dfwi_rate: number
  pass_rate: number
}

interface CoursesResponse {
  courses: CourseRow[]
  total: number
}

interface FunnelCohort {
  cohort: string
  attempted: number
  passed: number
  dfwi: number
}

interface GatewayFunnelResponse {
  math: FunnelCohort[]
  english: FunnelCohort[]
}

interface CoursePair {
  prefix_a: string
  number_a: string
  name_a: string
  prefix_b: string
  number_b: string
  name_b: string
  co_enrollment_count: number
  both_pass_rate: number
}

interface SequencesResponse {
  pairs: CoursePair[]
}

interface PairStats {
  courseA: { dfwi_rate: number; pass_rate: number; enrollments: number } | null
  courseB: { dfwi_rate: number; pass_rate: number; enrollments: number } | null
  byDelivery: { delivery_method: string; co_count: number; both_pass_rate: number }[]
  byInstructor: { instructor_status: string; co_count: number; both_pass_rate: number }[]
}

interface ExplainState {
  loading: boolean
  stats?: PairStats
  explanation?: string
  error?: string
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function DfwiRate({ value }: { value: number }) {
  const v = parseFloat(String(value))
  const pct = v.toFixed(1)
  let color = "text-green-600"
  if (v >= 50) color = "text-red-600"
  else if (v >= 30) color = "text-orange-600"
  return <span className={`text-sm font-medium ${color}`}>{pct}%</span>
}

function PassRate({ value }: { value: number }) {
  const v = parseFloat(String(value))
  const pct = v.toFixed(1)
  let color = "text-red-600"
  if (v >= 70) color = "text-green-600"
  else if (v >= 50) color = "text-yellow-600"
  return <span className={`text-sm font-medium ${color}`}>{pct}%</span>
}

function GatewayTypeLabel({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>
  if (type === "M") return <span className="text-xs font-medium text-blue-700">Math Gateway</span>
  if (type === "E") return <span className="text-xs font-medium text-purple-700">English Gateway</span>
  return <span className="text-xs text-muted-foreground">{type}</span>
}

// ─── Table header helpers ─────────────────────────────────────────────────────

function Th({ label, right, info }: { label: string; right?: boolean; info?: React.ReactNode }) {
  return (
    <th className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-0.5 ${right ? "justify-end w-full" : ""}`}>
        {label}{info}
      </span>
    </th>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-foreground" />
    : <ArrowDown className="h-3 w-3 text-foreground" />
}

function ThSort<T extends string>({
  label, col, sortBy, sortDir, onSort, right, info,
}: {
  label: string; col: T; sortBy: T; sortDir: "asc" | "desc"
  onSort: (col: T) => void; right?: boolean; info?: React.ReactNode
}) {
  return (
    <th className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-0.5 ${right ? "justify-end w-full" : ""}`}>
        <button
          onClick={() => onSort(col)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          <SortIcon active={sortBy === col} dir={sortDir} />
        </button>
        {info}
      </span>
    </th>
  )
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-md bg-muted/60 min-w-[80px]">
      <span className={`text-sm font-semibold ${color ?? "text-foreground"}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── Tab helpers ──────────────────────────────────────────────────────────────

type Tab = "dfwi" | "funnel" | "sequences"

function TabButton({ id, label, active, onClick }: { id: Tab; label: string; active: boolean; onClick: (t: Tab) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
      }`}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoursesPage() {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<Tab>("dfwi")

  // ── DFWI table state ──
  const [coursesData, setCoursesData] = useState<CoursesResponse | null>(null)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  // ── Funnel state ──
  const [funnelData, setFunnelData] = useState<GatewayFunnelResponse | null>(null)
  const [funnelLoading, setFunnelLoading] = useState(true)
  const [funnelError, setFunnelError] = useState<string | null>(null)

  // ── Sequences state ──
  const [seqData, setSeqData] = useState<SequencesResponse | null>(null)
  const [seqLoading, setSeqLoading] = useState(true)
  const [seqError, setSeqError] = useState<string | null>(null)

  // ── Explain state (keyed by pairing key) ──
  const [explainMap, setExplainMap] = useState<Record<string, ExplainState>>({})

  // ── DFWI table filters + sort ──
  const [gatewayOnly, setGatewayOnly] = useState(false)
  const [minEnrollments, setMinEnrollments] = useState("10")
  const [sortBy, setSortBy] = useState<"dfwi_rate" | "enrollments">("dfwi_rate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // ── Pairings client-side sort ──
  const [pairSortBy, setPairSortBy] = useState<"co_enrollment_count" | "both_pass_rate">("co_enrollment_count")
  const [pairSortDir, setPairSortDir] = useState<"asc" | "desc">("desc")

  // ── Fetch DFWI courses ──
  useEffect(() => {
    setCoursesLoading(true)
    setCoursesError(null)
    const p = new URLSearchParams()
    p.set("gatewayOnly", String(gatewayOnly))
    p.set("minEnrollments", minEnrollments)
    p.set("sortBy", sortBy)
    p.set("sortDir", sortDir)
    fetch(`/api/courses/dfwi?${p.toString()}`)
      .then(r => r.json())
      .then(d => { setCoursesData(d); setCoursesLoading(false) })
      .catch(e => { setCoursesError(e.message); setCoursesLoading(false) })
  }, [gatewayOnly, minEnrollments, sortBy, sortDir])

  // ── Fetch gateway funnel ──
  useEffect(() => {
    setFunnelLoading(true)
    setFunnelError(null)
    fetch("/api/courses/gateway-funnel")
      .then(r => r.json())
      .then(d => { setFunnelData(d); setFunnelLoading(false) })
      .catch(e => { setFunnelError(e.message); setFunnelLoading(false) })
  }, [])

  // ── Fetch sequences ──
  useEffect(() => {
    setSeqLoading(true)
    setSeqError(null)
    fetch("/api/courses/sequences")
      .then(r => r.json())
      .then(d => { setSeqData(d); setSeqLoading(false) })
      .catch(e => { setSeqError(e.message); setSeqLoading(false) })
  }, [])

  const courses = coursesData?.courses ?? []
  const total = coursesData?.total ?? 0
  const mathData = funnelData?.math ?? []
  const englishData = funnelData?.english ?? []

  // ── Sort handlers ──
  function handleCourseSort(col: "dfwi_rate" | "enrollments") {
    if (col === sortBy) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
  }

  function handlePairSort(col: "co_enrollment_count" | "both_pass_rate") {
    if (col === pairSortBy) setPairSortDir(d => d === "asc" ? "desc" : "asc")
    else { setPairSortBy(col); setPairSortDir("desc") }
  }

  const sortedPairs = useMemo(() => {
    const raw = (seqData?.pairs ?? []).slice(0, 20)
    return [...raw].sort((a, b) => {
      const av = parseFloat(String(a[pairSortBy]))
      const bv = parseFloat(String(b[pairSortBy]))
      return pairSortDir === "desc" ? bv - av : av - bv
    })
  }, [seqData, pairSortBy, pairSortDir])

  // ── Explain pairing ──
  function pairingKey(pair: CoursePair) {
    return `${pair.prefix_a}-${pair.number_a}-${pair.prefix_b}-${pair.number_b}`
  }

  async function explainPairing(pair: CoursePair) {
    const key = pairingKey(pair)
    // Toggle collapse if already loaded
    if (explainMap[key] && !explainMap[key].loading) {
      setExplainMap(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }
    setExplainMap(prev => ({ ...prev, [key]: { loading: true } }))
    try {
      const res = await fetch("/api/courses/explain-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix_a: pair.prefix_a,
          number_a: pair.number_a,
          name_a: pair.name_a || "",
          prefix_b: pair.prefix_b,
          number_b: pair.number_b,
          name_b: pair.name_b || "",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch explanation")
      setExplainMap(prev => ({
        ...prev,
        [key]: { loading: false, stats: data.stats, explanation: data.explanation },
      }))
    } catch (e) {
      setExplainMap(prev => ({
        ...prev,
        [key]: { loading: false, error: e instanceof Error ? e.message : String(e) },
      }))
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Course Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              DFWI rates, gateway funnels, and course co-enrollment patterns
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b mb-6">
          <TabButton id="dfwi" label="DFWI Rates" active={activeTab === "dfwi"} onClick={setActiveTab} />
          <TabButton id="funnel" label="Gateway Funnel" active={activeTab === "funnel"} onClick={setActiveTab} />
          <TabButton id="sequences" label="Co-enrollment Insights" active={activeTab === "sequences"} onClick={setActiveTab} />
        </div>

        {/* ── Tab: DFWI Rates ── */}
        {activeTab === "dfwi" && (
          <section>
            {/* Filter bar */}
            <div className="bg-card border rounded-lg p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={gatewayOnly}
                    onChange={e => setGatewayOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm font-medium">Gateway courses only</span>
                </label>
                <div className="min-w-40">
                  <Select value={minEnrollments} onValueChange={v => setMinEnrollments(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Min enrollments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Min 5 enrollments</SelectItem>
                      <SelectItem value="10">Min 10 enrollments</SelectItem>
                      <SelectItem value="25">Min 25 enrollments</SelectItem>
                      <SelectItem value="50">Min 50 enrollments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              {coursesLoading ? "Loading…" : `${total.toLocaleString()} course${total !== 1 ? "s" : ""}`}
            </p>

            {coursesError && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
                {coursesError}
              </div>
            )}

            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <Th label="Course" />
                    <Th label="Course Name" />
                    <Th label="Type" />
                    <ThSort label="Enrollments" col="enrollments" sortBy={sortBy} sortDir={sortDir} onSort={handleCourseSort} right />
                    <Th label="DFWI Count" right />
                    <ThSort
                      label="DFWI Rate %"
                      col="dfwi_rate"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleCourseSort}
                      right
                      info={
                        <InfoPopover title="DFWI Rate">
                          <p>Percentage of enrolled students who received a <strong>D, F, W (Withdraw), or I (Incomplete)</strong> grade. Higher values indicate courses where students struggle most.</p>
                        </InfoPopover>
                      }
                    />
                    <ThSort
                      label="Pass Rate %"
                      col="dfwi_rate"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleCourseSort}
                      right
                      info={
                        <InfoPopover title="Pass Rate">
                          <p>Percentage of enrolled students who received a passing grade (<strong>A through C-</strong>). A pass rate below 50% signals a course where more than half of students are not succeeding.</p>
                        </InfoPopover>
                      }
                    />
                  </tr>
                </thead>
                <tbody>
                  {coursesLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b animate-pulse">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-3 py-2.5">
                            <div className="h-4 bg-muted rounded w-16" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : courses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                        No courses match the current filters.
                      </td>
                    </tr>
                  ) : (
                    courses.map((c, idx) => (
                      <tr key={`${c.course_prefix}-${c.course_number}-${idx}`} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">
                          {c.course_prefix} {c.course_number}
                        </td>
                        <td className="px-3 py-2.5 text-xs">{c.course_name ?? "—"}</td>
                        <td className="px-3 py-2.5"><GatewayTypeLabel type={c.gateway_type} /></td>
                        <td className="px-3 py-2.5 text-xs text-right">{c.enrollments.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-xs text-right">{c.dfwi_count.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right"><DfwiRate value={c.dfwi_rate} /></td>
                        <td className="px-3 py-2.5 text-right"><PassRate value={c.pass_rate} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Tab: Gateway Funnel ── */}
        {activeTab === "funnel" && (
          <section>
            <p className="text-sm text-muted-foreground mb-4">
              Enrollment, pass, and DFWI counts for gateway courses, broken down by cohort.
            </p>

            {funnelError && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
                {funnelError}
              </div>
            )}

            {funnelLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1].map(i => (
                  <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
                    <div className="h-5 bg-muted rounded w-40 mb-4" />
                    <div className="h-64 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-4">Math Gateway</h3>
                  {mathData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={mathData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="attempted" name="Attempted" fill="#3b82f6" />
                        <Bar dataKey="passed" name="Passed" fill="#22c55e" />
                        <Bar dataKey="dfwi" name="DFWI" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-4">English Gateway</h3>
                  {englishData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No data available.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={englishData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="attempted" name="Attempted" fill="#3b82f6" />
                        <Bar dataKey="passed" name="Passed" fill="#22c55e" />
                        <Bar dataKey="dfwi" name="DFWI" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Tab: Co-enrollment Insights ── */}
        {activeTab === "sequences" && (
          <section>
            <p className="text-sm text-muted-foreground mb-4">
              Course pairs most frequently taken in the same term. Click <strong>Explain</strong> on any row for an AI-powered analysis of why students struggle with the combination.
            </p>

            {seqError && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
                {seqError}
              </div>
            )}

            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <Th label="Course A" />
                    <Th label="Course B" />
                    <ThSort label="Co-enrollments" col="co_enrollment_count" sortBy={pairSortBy} sortDir={pairSortDir} onSort={handlePairSort} right />
                    <ThSort label="Both Pass Rate %" col="both_pass_rate" sortBy={pairSortBy} sortDir={pairSortDir} onSort={handlePairSort} right />
                    <Th label="" />
                  </tr>
                </thead>
                <tbody>
                  {seqLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b animate-pulse">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-3 py-2.5">
                            <div className="h-4 bg-muted rounded w-24" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : sortedPairs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                        No course pairing data available.
                      </td>
                    </tr>
                  ) : (
                    sortedPairs.map(pair => {
                      const key = pairingKey(pair)
                      const explainState = explainMap[key]
                      const isExpanded = !!explainState && !explainState.loading

                      return (
                        <>
                          <tr
                            key={key}
                            className={`border-b hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                          >
                            <td className="px-3 py-2.5 text-xs">
                              <span className="font-mono font-semibold">{pair.prefix_a} {pair.number_a}</span>
                              {pair.name_a && (
                                <span className="text-muted-foreground ml-1">— {pair.name_a}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              <span className="font-mono font-semibold">{pair.prefix_b} {pair.number_b}</span>
                              {pair.name_b && (
                                <span className="text-muted-foreground ml-1">— {pair.name_b}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-right">{pair.co_enrollment_count.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right"><PassRate value={pair.both_pass_rate} /></td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => explainPairing(pair)}
                                disabled={explainState?.loading}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                              >
                                {explainState?.loading ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Analyzing…
                                  </>
                                ) : isExpanded ? (
                                  "Hide ↑"
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3" />
                                    Explain
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded explain panel */}
                          {isExpanded && (
                            <tr key={`${key}-explain`} className="border-b bg-muted/10">
                              <td colSpan={5} className="px-4 py-4">
                                {explainState.error ? (
                                  <p className="text-sm text-destructive">{explainState.error}</p>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Individual course stats */}
                                    <div className="flex flex-wrap gap-6">
                                      {explainState.stats?.courseA && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                                            {pair.prefix_a} {pair.number_a} — Individual
                                          </p>
                                          <div className="flex gap-2">
                                            <StatChip
                                              label="DFWI Rate"
                                              value={`${explainState.stats.courseA.dfwi_rate.toFixed(1)}%`}
                                              color={explainState.stats.courseA.dfwi_rate >= 50 ? "text-red-600" : explainState.stats.courseA.dfwi_rate >= 30 ? "text-orange-600" : "text-green-600"}
                                            />
                                            <StatChip
                                              label="Pass Rate"
                                              value={`${explainState.stats.courseA.pass_rate.toFixed(1)}%`}
                                              color={explainState.stats.courseA.pass_rate >= 70 ? "text-green-600" : explainState.stats.courseA.pass_rate >= 50 ? "text-yellow-600" : "text-red-600"}
                                            />
                                            <StatChip label="Enrollments" value={explainState.stats.courseA.enrollments.toLocaleString()} />
                                          </div>
                                        </div>
                                      )}
                                      {explainState.stats?.courseB && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                                            {pair.prefix_b} {pair.number_b} — Individual
                                          </p>
                                          <div className="flex gap-2">
                                            <StatChip
                                              label="DFWI Rate"
                                              value={`${explainState.stats.courseB.dfwi_rate.toFixed(1)}%`}
                                              color={explainState.stats.courseB.dfwi_rate >= 50 ? "text-red-600" : explainState.stats.courseB.dfwi_rate >= 30 ? "text-orange-600" : "text-green-600"}
                                            />
                                            <StatChip
                                              label="Pass Rate"
                                              value={`${explainState.stats.courseB.pass_rate.toFixed(1)}%`}
                                              color={explainState.stats.courseB.pass_rate >= 70 ? "text-green-600" : explainState.stats.courseB.pass_rate >= 50 ? "text-yellow-600" : "text-red-600"}
                                            />
                                            <StatChip label="Enrollments" value={explainState.stats.courseB.enrollments.toLocaleString()} />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Delivery + instructor breakdown */}
                                    <div className="flex flex-wrap gap-6 text-xs">
                                      {explainState.stats?.byDelivery && explainState.stats.byDelivery.length > 0 && (
                                        <div>
                                          <p className="font-semibold text-muted-foreground mb-1.5">By Delivery Method</p>
                                          <div className="space-y-1">
                                            {explainState.stats.byDelivery.map(d => (
                                              <div key={d.delivery_method} className="flex items-center gap-3">
                                                <span className="text-muted-foreground w-28 truncate">{d.delivery_method}</span>
                                                <span>{d.co_count.toLocaleString()} students</span>
                                                <PassRate value={d.both_pass_rate} />
                                                <span className="text-muted-foreground">both pass</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {explainState.stats?.byInstructor && explainState.stats.byInstructor.length > 0 && (
                                        <div>
                                          <p className="font-semibold text-muted-foreground mb-1.5">By Instructor Type</p>
                                          <div className="space-y-1">
                                            {explainState.stats.byInstructor.map(d => (
                                              <div key={d.instructor_status} className="flex items-center gap-3">
                                                <span className="text-muted-foreground w-36 truncate">{d.instructor_status}</span>
                                                <span>{d.co_count.toLocaleString()} students</span>
                                                <PassRate value={d.both_pass_rate} />
                                                <span className="text-muted-foreground">both pass</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* LLM explanation */}
                                    {explainState.explanation && (
                                      <div className="flex gap-2 pt-1 border-t">
                                        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        <p className="text-sm text-foreground/90 leading-relaxed">{explainState.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
