"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { SensitiveMlFeatureMeta } from "@/lib/sensitive-population"

type SettingsPayload = {
  institutionCode: string
  excludedMlFeatureKeys: string[]
  lowSampleThreshold: number
  updatedAt: string | null
  catalog: SensitiveMlFeatureMeta[]
}

export default function SensitiveMlSettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [threshold, setThreshold] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)

  const hydrateFromPayload = useCallback((payload: SettingsPayload) => {
    setData(payload)
    setExcluded(new Set(payload.excludedMlFeatureKeys))
    setThreshold(payload.lowSampleThreshold)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/sensitive-ml-settings")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      hydrateFromPayload(json as SettingsPayload)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [hydrateFromPayload])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    setSaving(true)
    setSaveNote(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/sensitive-ml-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excludedMlFeatureKeys: [...excluded],
          lowSampleThreshold: threshold,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save failed")
      hydrateFromPayload(json as SettingsPayload)
      setSaveNote("Saved. Re-run the Python ML pipeline so new exclusions apply to training and batch scores.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function toggleKey(mlKey: string, off: boolean) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (off) next.add(mlKey)
      else next.delete(mlKey)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/upload">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6 text-muted-foreground" />
              ML privacy & sensitive fields
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Issue #109 — exclude demographic / aid inputs from ML training; low-sample warnings for dashboards and NLQ.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings…
          </div>
        )}

        {error && !loading && (
          <div className="border border-destructive/40 bg-destructive/10 text-destructive rounded-md p-4 text-sm mb-4">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8">
            <section className="border rounded-lg p-4 space-y-4">
              <h2 className="font-semibold text-sm">Features excluded from ML</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, the checked fields are removed from all Bishop ML feature sets before training and
                inference in <code className="text-xs bg-muted px-1 rounded">complete_ml_pipeline.py</code>. They
                remain in the database for reporting if present in source data.
              </p>
              <div className="space-y-4">
                {data.catalog.map((item) => (
                  <div
                    key={item.mlKey}
                    className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">{item.mlKey}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`ex-${item.mlKey}`} className="text-xs text-muted-foreground whitespace-nowrap">
                        Exclude
                      </Label>
                      <Switch
                        id={`ex-${item.mlKey}`}
                        checked={excluded.has(item.mlKey)}
                        onCheckedChange={(v) => toggleKey(item.mlKey, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border rounded-lg p-4 space-y-3">
              <h2 className="font-semibold text-sm">Low-sample warning threshold</h2>
              <p className="text-xs text-muted-foreground">
                Dashboard KPIs and natural-language query results show a caution when the visible student count is below
                this number (after filters).
              </p>
              <Input
                type="number"
                min={1}
                max={50000}
                className="max-w-[120px]"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 1)}
              />
            </section>

            {saveNote && (
              <div className="text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md p-3 bg-emerald-50/80 dark:bg-emerald-950/30">
                {saveNote}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
              {data.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  Last updated {new Date(data.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
