import Link from "next/link"
import { GLOSSARY_TOPIC_SECTIONS } from "@/lib/glossary-constants"
import { parseGlossaryEntries, readMetricGlossaryMarkdown } from "@/lib/metric-glossary"

function GlossaryBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean)
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {paragraphs.map((p, i) => {
        const boldLead = /^\*\*([^*]+)\*\*:\s*([\s\S]*)$/.exec(p)
        if (boldLead) {
          return (
            <p key={i}>
              <span className="font-medium text-foreground">{boldLead[1]}:</span> {boldLead[2]}
            </p>
          )
        }
        return <p key={i}>{p}</p>
      })}
    </div>
  )
}

export default function GlossaryPage() {
  const md = readMetricGlossaryMarkdown()
  const entries = parseGlossaryEntries(md)
  const allSlugs = new Set(Object.keys(entries))
  const orderedTopics = GLOSSARY_TOPIC_SECTIONS.map((t) => ({
    ...t,
    slugs: t.slugOrder.filter((s) => allSlugs.has(s)),
  }))

  const alphaSlugs = [...allSlugs].sort((a, b) => a.localeCompare(b))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-6 space-y-10">
        <header className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Metric glossary</h1>
          <p className="text-muted-foreground">
            In-context definitions for dashboard KPIs, with PDP field notes and high-level IPEDS / state
            cross-walks. Source:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">content/metric-glossary.md</code>
          </p>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              Back to dashboard
            </Link>
            {" · "}
            <Link href="/methodology" className="text-primary underline-offset-4 hover:underline">
              Methodology
            </Link>
          </p>
        </header>

        <nav aria-label="On this page" className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">By topic</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {orderedTopics.map((t) => (
              <li key={t.id}>
                <a href={`#topic-${t.id}`} className="text-primary underline-offset-4 hover:underline">
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
          <h2 className="text-sm font-semibold text-foreground pt-2">A–Z</h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono text-muted-foreground">
            {alphaSlugs.map((slug) => (
              <li key={slug}>
                <a href={`#${slug}`} className="hover:text-foreground underline-offset-2 hover:underline">
                  {slug.replace(/-/g, " ")}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {orderedTopics.map((topic) => (
          <section key={topic.id} id={`topic-${topic.id}`} className="space-y-6 scroll-mt-20">
            <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">{topic.label}</h2>
            {topic.slugs.map((slug) => {
              const body = entries[slug]
              if (!body) return null
              const title = slug.replace(/-/g, " ")
              return (
                <article key={slug} id={slug} className="scroll-mt-20 space-y-2 rounded-lg border border-border p-5">
                  <h3 className="text-lg font-medium capitalize">{title}</h3>
                  <GlossaryBody text={body} />
                </article>
              )
            })}
          </section>
        ))}

        <footer className="text-xs text-muted-foreground border-t border-border pt-6">
          <p>
            Epic tracking:{" "}
            <a
              href="https://github.com/devcolor/codebenders-datathon/issues/124"
              className="text-primary underline-offset-4 hover:underline"
            >
              #124 AASCU convening follow-ups
            </a>
            {" · "}Issue{" "}
            <a
              href="https://github.com/devcolor/codebenders-datathon/issues/105"
              className="text-primary underline-offset-4 hover:underline"
            >
              #105
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
