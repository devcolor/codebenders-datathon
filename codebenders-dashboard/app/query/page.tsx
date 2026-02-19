"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AnalysisResult } from "@/components/analysis-result"
import { QueryPlanPanel } from "@/components/query-plan-panel"
import { analyzePrompt } from "@/lib/prompt-analyzer"
import { executeQuery } from "@/lib/query-executor"
import type { QueryPlan, QueryResult } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const INSTITUTIONS = [
  { name: "Bishop State", code: "bscc" },
  { name: "University of Akron", code: "oh" },
  { name: "Cal State San Bernardino", code: "csusb" },
  { name: "Thomas More University", code: "ky" },
]

export default function QueryPage() {
  const [institution, setInstitution] = useState<string>(INSTITUTIONS[0].code)
  const [prompt, setPrompt] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [queryPlan, setQueryPlan] = useState<QueryPlan | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [useDirectDB, setUseDirectDB] = useState(true)

  const handleAnalyze = async () => {
    console.log("handleAnalyze", prompt, institution)
    if (!prompt.trim()) return

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
          body: JSON.stringify({ prompt, institution }),
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
        plan = analyzePrompt(prompt, institution)
      }

      setQueryPlan(plan)
      console.log("executing query with plan:", plan)
      const result = await executeQuery(plan, institution, useDirectDB)
      console.log("query result:", result)
      setQueryResult(result)
    } catch (error) {
      console.error("Error analyzing prompt:", error)
      alert("Error: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="border-b border-border pb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SQL Query Interface</h1>
          <p className="text-muted-foreground mt-2">Analyze student performance data with natural language queries</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Query Controls</CardTitle>
            <CardDescription>Select an institution and enter your analysis prompt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 pb-4 border-b border-border">
              <Switch id="db-mode" checked={useDirectDB} onCheckedChange={setUseDirectDB} />
              <Label htmlFor="db-mode" className="text-sm font-medium">
                {useDirectDB ? "Direct Database" : "API Mode"}
              </Label>
              <span className="text-xs text-muted-foreground">
                {useDirectDB ? "(Execute SQL directly)" : "(Fetch from API endpoints)"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-[200px_1fr_auto]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Institution</label>
                <Select value={institution} onValueChange={setInstitution}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Analysis Prompt</label>
                <Input
                  placeholder="e.g., retention by cohort for last two terms"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleAnalyze()
                    }
                  }}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleAnalyze} disabled={isAnalyzing || !prompt.trim()} className="w-full md:w-auto">
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {queryResult && queryPlan && (
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <AnalysisResult result={queryResult} plan={queryPlan} />
            <QueryPlanPanel plan={queryPlan} />
          </div>
        )}

        {!queryResult && (
          <Card className="border-dashed">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">Enter a prompt and click Analyze to see results</p>
                <p className="text-sm text-muted-foreground">Try: "Show me all cohorts" or "Count students by term"</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

