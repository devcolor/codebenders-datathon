/**
 * Lightweight SELECT-clause inspection for FERPA-style column exclusions.
 * Conservative: unknown shapes or unparseable SQL → not ok. Not a full SQL parser.
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function splitTopLevelCommaItems(expr: string): string[] {
  const items: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    else if (ch === "," && depth === 0) {
      items.push(expr.slice(start, i).trim())
      start = i + 1
    }
  }
  items.push(expr.slice(start).trim())
  return items
}

/** SELECT list only: stops at the first top-level FROM (parenthesis depth 0). */
function extractSelectClause(sql: string): string | null {
  const m = /\bselect\s+/i.exec(sql)
  if (!m || m.index === undefined) return null
  let i = m.index + m[0].length
  let depth = 0
  for (; i < sql.length; i++) {
    const ch = sql[i]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    else if (depth === 0 && /^from\b/i.test(sql.slice(i))) {
      return sql.slice(m.index + m[0].length, i).trim()
    }
  }
  return null
}

export function inspectSelectForFerpaExclusions(
  sql: string,
  excluded: readonly string[]
): { ok: true } | { ok: false; violation: string } {
  if (!excluded.length) return { ok: true }

  const rawClause = extractSelectClause(sql)
  if (rawClause === null) return { ok: false, violation: excluded[0] }

  const inner = rawClause.replace(/^\s*distinct\s+/i, "").trim()
  if (!inner) return { ok: false, violation: excluded[0] }

  for (const item of splitTopLevelCommaItems(inner)) {
    if (/^\*\s*$/.test(item)) {
      return { ok: false, violation: "*" }
    }
  }

  for (const col of excluded) {
    const quoted = `"${col.replace(/"/g, '""')}"`
    if (inner.includes(quoted)) {
      return { ok: false, violation: col }
    }
    const re = new RegExp(`\\b${escapeRegex(col)}\\b`, "i")
    if (re.test(inner)) {
      return { ok: false, violation: col }
    }
  }

  return { ok: true }
}
