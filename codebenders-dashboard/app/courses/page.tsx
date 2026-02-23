"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
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

// ─── Table header helper ──────────────────────────────────────────────────────

function Th({ label, right }: { label: string; right?: boolean }) {
  return (
    <th
      className={`px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    >
      {label}
    </th>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoursesPage() {
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

  // ── Filters ──
  const [gatewayOnly, setGatewayOnly] = useState(false)
  const [minEnrollments, setMinEnrollments] = useState("10")
  const [sortBy, setSortBy] = useState<"dfwi_rate" | "enrollments">("dfwi_rate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

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
  const pairs = (seqData?.pairs ?? []).slice(0, 20)

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

        {/* ── Section 1: Filter bar + DFWI Table ── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">High-Risk Course DFWI Rates</h2>

          {/* Filter bar */}
          <div className="bg-card border rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">

              {/* Gateway only toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gatewayOnly}
                  onChange={e => setGatewayOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm font-medium">Gateway courses only</span>
              </label>

              {/* Min enrollments */}
              <div className="min-w-40">
                <Select
                  value={minEnrollments}
                  onValueChange={v => setMinEnrollments(v)}
                >
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

              {/* Sort by */}
              <div className="min-w-40">
                <Select
                  value={sortBy}
                  onValueChange={v => setSortBy(v as "dfwi_rate" | "enrollments")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dfwi_rate">DFWI Rate</SelectItem>
                    <SelectItem value="enrollments">Enrollments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort direction */}
              <div className="min-w-36">
                <Select
                  value={sortDir}
                  onValueChange={v => setSortDir(v as "asc" | "desc")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-2">
            {coursesLoading ? "Loading…" : `${total.toLocaleString()} course${total !== 1 ? "s" : ""}`}
          </p>

          {/* Error */}
          {coursesError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
              {coursesError}
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <Th label="Course" />
                  <Th label="Course Name" />
                  <Th label="Type" />
                  <Th label="Enrollments" right />
                  <Th label="DFWI Count" right />
                  <Th label="DFWI Rate %" right />
                  <Th label="Pass Rate %" right />
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

        {/* ── Section 2: Gateway Course Funnel ── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Gateway Course Funnel</h2>

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
              {/* Math Gateway */}
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

              {/* English Gateway */}
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

        {/* ── Section 3: Top Course Pairings ── */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Top Course Pairings</h2>

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
                  <Th label="Co-enrollments" right />
                  <Th label="Both Pass Rate %" right />
                </tr>
              </thead>
              <tbody>
                {seqLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <div className="h-4 bg-muted rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pairs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                      No course pairing data available.
                    </td>
                  </tr>
                ) : (
                  pairs.map(pair => (
                    <tr key={`${pair.prefix_a}-${pair.number_a}-${pair.prefix_b}-${pair.number_b}`} className="border-b hover:bg-muted/30 transition-colors">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
