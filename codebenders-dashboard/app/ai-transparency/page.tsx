import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Bot, Cloud, Database, ServerCog, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AI_SURFACE_CATEGORY_ORDER,
  AI_SURFACES,
  groupAISurfacesByCategory,
  type AISurface,
} from "@/content/ai-transparency"

export const metadata: Metadata = {
  title: "AI Transparency — Bishop State Student Success Dashboard",
  description:
    "What AI runs in this dashboard, where it runs, what data flows where, and what is retained.",
}

const CATEGORY_META: Record<
  AISurface["category"],
  { label: string; sectionTitle: string; icon: typeof Bot; tint: string }
> = {
  ml_model: {
    label: "ML model",
    sectionTitle: "ML models",
    icon: ServerCog,
    tint: "text-emerald-600",
  },
  natural_language: {
    label: "Natural language",
    sectionTitle: "Natural languages",
    icon: Sparkles,
    tint: "text-violet-600",
  },
  explainability: {
    label: "Explainability",
    sectionTitle: "Explainability",
    icon: Bot,
    tint: "text-sky-600",
  },
  data_api: {
    label: "Data API",
    sectionTitle: "Data APIs",
    icon: Database,
    tint: "text-amber-600",
  },
}

function StatusBadge({ status }: { status: AISurface["status"] }) {
  if (status === "deployed") {
    return (
      <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
        Deployed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
      In development
    </Badge>
  )
}

function ProvenanceBadge({ surface }: { surface: AISurface }) {
  if (surface.homegrown) {
    return (
      <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50">
        <ServerCog className="h-3 w-3 mr-1" />
        Homegrown
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
      <Cloud className="h-3 w-3 mr-1" />
      Third-party: {surface.provider}
    </Badge>
  )
}

function SurfaceCard({ surface }: { surface: AISurface }) {
  const cat = CATEGORY_META[surface.category]
  const Icon = cat.icon
  return (
    <Card id={surface.id}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${cat.tint}`} />
            <CardTitle className="text-lg">{surface.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={surface.status} />
            <ProvenanceBadge surface={surface} />
          </div>
        </div>
        <CardDescription>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{cat.label}</span>
          <span className="mx-2 text-muted-foreground">•</span>
          <span className="text-xs">Version: {surface.version}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Field label="Algorithm" value={surface.algorithm} />
        <Field
          label="Inputs"
          value={
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
              {surface.inputs.map((line, index) => (
                <li key={`${surface.id}-in-${index}`}>{line}</li>
              ))}
            </ul>
          }
        />
        {surface.trainingData && (
          <Field
            label="Training data"
            value={
              <span className="text-muted-foreground">
                {surface.trainingData.source}
                <br />
                <span className="text-xs">
                  Cohort: {surface.trainingData.cohort}
                  {surface.trainingData.rowCount ? ` • ${surface.trainingData.rowCount}` : ""}
                </span>
              </span>
            }
          />
        )}
        <Field label="Where it runs" value={surface.runsOn} />
        <Field label="Data flow on invocation" value={surface.dataFlow} />
        <Field label="Retention policy" value={surface.retentionPolicy} />
        {surface.notes && (
          <div className="border-l-2 border-amber-300 bg-amber-50/40 px-3 py-2 rounded-r text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Note
            </span>
            <p className="mt-1">{surface.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-1">
        {label}
      </div>
      <div className="text-muted-foreground whitespace-pre-line">{value}</div>
    </div>
  )
}

export default function AITransparencyPage() {
  const grouped = groupAISurfacesByCategory(AI_SURFACES)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8 max-w-4xl">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Transparency</h1>
          <p className="text-muted-foreground mt-2">
            What AI is running in this dashboard, where it runs, what data flows where, and what is
            retained. Maintained as a living inventory — entries describe what is{" "}
            <em>deployed today</em>, with planned features clearly flagged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href="/methodology"
              className="text-blue-600 hover:underline"
            >
              See also: Readiness Methodology →
            </Link>
          </div>
        </div>

        {/* How to read this page */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">How to read this page</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Every AI or AI-adjacent surface in the dashboard is listed below with: the algorithm,
              the inputs, the training data (if any), where the inference runs, what data flows on
              invocation, and the retention policy.
            </p>
            <p>
              <strong className="text-foreground">Homegrown</strong> surfaces run on
              institution-controlled infrastructure with no third-party data flow.{" "}
              <strong className="text-foreground">Third-party</strong> surfaces transmit data to an
              external provider — those entries spell out exactly what is sent, what is excluded,
              and what the provider retains.
            </p>
            <p>
              <strong className="text-foreground">In development</strong> entries are not running in
              production today — they are listed for full lifecycle transparency so institutions can
              evaluate what is coming alongside what exists.
            </p>
          </CardContent>
        </Card>

        {/* Surfaces grouped by category */}
        {AI_SURFACE_CATEGORY_ORDER.map((category) => {
          const items = grouped[category]
          if (items.length === 0) return null
          const cat = CATEGORY_META[category]
          const Icon = cat.icon
          return (
            <section key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${cat.tint}`} />
                <h2 className="text-xl font-semibold">{cat.sectionTitle}</h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="grid gap-4">
                {items.map((s) => (
                  <SurfaceCard key={s.id} surface={s} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Footer / contact */}
        <section className="border-t border-border pt-6 text-sm text-muted-foreground space-y-2">
          <p>
            This page is maintained at{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              codebenders-dashboard/content/ai-transparency.ts
            </code>
            . Each entry corresponds to code in the repository — see{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ai_model/</code> for the ML
            pipeline and <code className="text-xs bg-muted px-1.5 py-0.5 rounded">app/api/</code>{" "}
            for the LLM-backed routes.
          </p>
          <p>
            Questions or audit requests should be directed to your institutional point-of-contact
            for this deployment.
          </p>
        </section>
      </div>
    </div>
  )
}
