import fs from "fs"
import path from "path"

import { GLOSSARY_TOPIC_SECTIONS } from "@/lib/glossary-constants"

export function readMetricGlossaryMarkdown(): string {
  const file = path.join(process.cwd(), "content", "metric-glossary.md")
  return fs.readFileSync(file, "utf8")
}

/** Map slug → markdown body (text below `## slug`). */
export function parseGlossaryEntries(md: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = md.split(/\n/)
  let current: string | null = null
  const buf: string[] = []

  const flush = (): void => {
    if (current) out[current] = buf.join("\n").trim()
    buf.length = 0
  }

  for (const line of lines) {
    const m = /^## ([a-z0-9-]+)\s*$/.exec(line)
    if (m) {
      flush()
      current = m[1]
    } else if (current) {
      buf.push(line)
    }
  }
  flush()
  return out
}

export function formatGlossarySlugForDisplay(slug: string): string {
  return slug.replace(/-/g, " ")
}

export function buildGlossaryTopicBlocks(
  entries: Record<string, string>
): { id: string; label: string; slugs: string[] }[] {
  const present = new Set(Object.keys(entries))
  return GLOSSARY_TOPIC_SECTIONS.map((topic) => ({
    id: topic.id,
    label: topic.label,
    slugs: topic.slugOrder.filter((slug) => present.has(slug)),
  }))
}
