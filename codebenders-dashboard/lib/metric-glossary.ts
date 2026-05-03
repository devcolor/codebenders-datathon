import fs from "fs"
import path from "path"

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

  const flush = () => {
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

export function glossarySlugSet(md: string): Set<string> {
  return new Set(Object.keys(parseGlossaryEntries(md)))
}
