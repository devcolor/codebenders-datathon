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
  const listStart = m.index + m[0].length
  let depth = 0
  for (let i = listStart; i < sql.length; i++) {
    const ch = sql[i]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    else if (depth === 0 && /^from\b/i.test(sql.slice(i))) {
      return sql.slice(listStart, i).trim()
    }
  }
  return null
}

export function inspectSelectForFerpaExclusions(
  sql: string,
  excluded: readonly string[]
): { ok: true } | { ok: false; violation: string } {
  if (!excluded.length) return { ok: true }

  const raw = extractSelectClause(sql)
  const selectList = (raw?.replace(/^\s*distinct\s+/i, "").trim()) ?? ""
  if (!selectList) return { ok: false, violation: excluded[0] }

  if (splitTopLevelCommaItems(selectList).some((item) => /^\*\s*$/.test(item))) {
    return { ok: false, violation: "*" }
  }

  for (const col of excluded) {
    const quoted = `"${col.replace(/"/g, '""')}"`
    if (selectList.includes(quoted)) {
      return { ok: false, violation: col }
    }
    if (new RegExp(`\\b${escapeRegex(col)}\\b`, "i").test(selectList)) {
      return { ok: false, violation: col }
    }
  }

  return { ok: true }
}
