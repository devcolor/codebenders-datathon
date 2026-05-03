"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AnalysisResult } from "@/components/analysis-result"
import { QueryPlanPanel } from "@/components/query-plan-panel"
import { QueryHistoryPanel } from "@/components/query-history-panel"
import { analyzePrompt } from "@/lib/prompt-analyzer"
import { executeQuery } from "@/lib/query-executor"
import { isForceDirectDb } from "@/lib/config"
import type { QueryPlan, QueryResult, HistoryEntry } from "@/lib/types"
import { Loader2, Sparkles, PanelLeft } from "lucide-react"

const INSTITUTIONS = [
  { name: "Bishop State", code: "bscc" },
  { name: "University of Akron", code: "oh" },
  { name: "Cal State San Bernardino", code: "csusb" },
  { name: "Thomas More University", code: "ky" },
]

const forceDirectDbEnv = isForceDirectDb()

export default function QueryPage() {
  const [institution, setInstitution] = useState<string>(INSTITUTIONS[0].code)
  const [prompt, setPrompt] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [queryPlan, setQueryPlan] = useState<QueryPlan | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [useDirectDB, setUseDirectDB] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    // Read from localStorage on mount (client-only)
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("bishop_query_history") || "[]")
    } catch {
      return []
    }
  })

  const handleAnalyze = async (
    overridePrompt?: string,
    overrideInstitution?: string,
  ) => {
    setSummary(null)
    setSummaryError(null)

    const activePrompt = overridePrompt ?? prompt
    const activeInstitution = overrideInstitution ?? institution

    console.log("handleAnalyze", activePrompt, activeInstitution)
    if (!activePrompt.trim()) return

    setIsAnalyzing(true)
    try {
      const enableLLM = process.env.NEXT_PUBLIC_ENABLE_LLM === "1"
      console.log("enableLLM", enableLLM)
      let plan: QueryPlan

      if (enableLLM) {
        console.log("fetching analyze")
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: activePrompt, institution: activeInstitution }),
        })

        console.log("response status:", response.status)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("response error", response.status, errorData)
          throw new Error("Failed to analyze prompt: " + (errorData.error || response.statusText))
        }

        plan = await response.json()
        console.log("plan received:", plan)
      } else {
        plan = analyzePrompt(activePrompt, activeInstitution)
      }

      setQueryPlan(plan)
      console.log("executing query with plan:", plan)
      const result = await executeQuery(plan, activeInstitution, useDirectDB)
      console.log("query result:", result)
      setQueryResult(result)

      // Persist history entry
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        institution: activeInstitution,
        prompt: activePrompt,
        rowCount: result.rowCount,
        vizType: plan.vizType,
      }
      // Prepend and cap at 50 entries
      setHistory(prev => {
        const updated = [entry, ...prev].slice(0, 50)
        localStorage.setItem("bishop_query_history", JSON.stringify(updated))
        return updated
      })

      // Fire-and-forget audit log — don't await or block on failure
      fetch("/api/query-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(() => {/* ignore audit failures */})
    } catch (error) {
      console.error("Error analyzing prompt:", error)
      alert("Error: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRerun = (entry: HistoryEntry) => {
    setInstitution(entry.institution)
    setPrompt(entry.prompt)
    handleAnalyze(entry.prompt, entry.institution)
  }

  const handleClear = () => {
    setHistory([])
    localStorage.removeItem("bishop_query_history")
  }

  const handleSummarize = async () => {
    if (!queryResult || !queryPlan) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const res = await fetch("/api/query-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          data: queryResult.data,
          rowCount: queryResult.rowCount,
          vizType: queryPlan.vizType,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setSummary(json.summary)
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : String(e))
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slim page-level header bar */}
      <header className="h-12 flex items-center gap-3 px-4 border-b border-border/60 shrink-0">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Open query history"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Title group */}
        <span className="text-sm font-semibold tracking-widest uppercase text-foreground">
          Query Interface
        </span>
        <span className="hidden sm:block h-4 w-px bg-border/60" aria-hidden="true" />
        <span className="hidden sm:block text-xs text-muted-foreground font-mono">
          Natural Language Analytics
        </span>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-[260px] border-r border-border/60 flex-col shrink-0 bg-muted/20">
          <QueryHistoryPanel entries={history} onRerun={handleRerun} onClear={handleClear} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-background border-r border-border/60 flex flex-col">
              <QueryHistoryPanel entries={history} onRerun={handleRerun} onClear={handleClear} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Query controls */}
          <div className="border border-border/60 rounded-lg p-5 space-y-4">
            {/* DB mode toggle row */}
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/40">
              <Switch
                id="db-mode"
                checked={forceDirectDbEnv || useDirectDB}
                onCheckedChange={(v) => {
                  if (!forceDirectDbEnv) setUseDirectDB(v)
                }}
                disabled={forceDirectDbEnv}
              />
              <Label htmlFor="db-mode" className="text-sm font-medium cursor-pointer">
                {forceDirectDbEnv || useDirectDB ? "Direct Database" : "API Mode"}
              </Label>
              <span className="text-xs text-muted-foreground font-mono">
                {forceDirectDbEnv
                  ? "(FORCE_DIRECT_DB — external API disabled)"
                  : useDirectDB
                    ? "(execute SQL directly)"
                    : "(fetch from API endpoints)"}
              </span>
            </div>

            {/* Institution selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70">
                Institution
              </label>
              <Select value={institution} onValueChange={setInstitution}>
                <SelectTrigger className="border-border/60 bg-background text-sm w-full md:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTIONS.map((inst) => (
                    <SelectItem key={inst.code} value={inst.code}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Query textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70">
                Natural Language Query
              </label>
              <textarea
                placeholder="e.g., retention by cohort for last two terms"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAnalyze()
                  }
                }}
                className="flex w-full rounded-md border border-border/60 bg-muted/20 px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
              />
            </div>

            {/* Run button row */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing || !prompt.trim()}
                className="bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold tracking-wide uppercase px-5"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    Analyzing…
                  </>
                ) : (
                  "Run Analysis"
                )}
              </Button>
            </div>
          </div>

          {/* Empty state */}
          {!queryResult && (
            <div className="border border-dashed border-border/50 rounded-lg py-12 flex items-center justify-center">
              <div className="text-center space-y-1.5">
                <p className="text-sm text-muted-foreground">Enter a query above and run analysis to see results</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Try: &ldquo;Show me all cohorts&rdquo; or &ldquo;Count students by term&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Results section */}
          {queryResult && queryPlan && (
            <div className="space-y-3">
              {/* Results header row */}
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Results
                </h2>
                {!summary && (
                  <button
                    onClick={handleSummarize}
                    disabled={summaryLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
                  >
                    {summaryLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Summarize
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* AI summary block */}
              {summary && (
                <div className="flex gap-2 px-4 py-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <Sparkles className="h-4 w-4 text-amber-500/70 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
                </div>
              )}
              {summaryError && (
                <p className="text-xs text-destructive">{summaryError}</p>
              )}

              <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                <AnalysisResult result={queryResult} plan={queryPlan} />
                <QueryPlanPanel plan={queryPlan} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
