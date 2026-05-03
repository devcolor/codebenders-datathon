/**
 * Layer A — static FERPA-oriented audit. Run from repo via:
 *   cd codebenders-dashboard && npx tsx ../.claude/skills/ferpa-audit/scripts/static-audit.ts --repo-root .. --out /tmp/ferpa-static.json
 */
import * as crypto from "crypto"
import { createRequire } from "module"
import * as fs from "fs"
import * as path from "path"

type Severity = "Critical" | "Warning" | "Note"

interface Finding {
  severity: Severity
  category: string
  file: string
  line?: number
  regulation: string
  title: string
  description: string
  remediation: string
}

interface FerpaConfig {
  version: number
  project: {
    dashboard_relative_path: string
    analyze_route_glob: string
    execute_sql_route_glob: string
    ai_transparency_file: string
    query_executor_file: string
    config_file: string
  }
  select_exclusions: string[]
  sensitive_demographics: string[]
  subpopulation_minimum_n: number
  external_data_hosts: { hostname: string; note?: string }[]
  allowlisted_external_hosts: string[]
  rbac: { header_name: string; student_data_routes: string[] }
  llm: { sdk_markers: string[] }
}

function parseArgs(argv: string[]): { repoRoot: string; outPath: string } {
  let repoRoot = process.cwd()
  let outPath = ""
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--repo-root" && argv[i + 1]) {
      repoRoot = path.resolve(argv[++i])
    } else if (argv[i] === "--out" && argv[i + 1]) {
      outPath = path.resolve(argv[++i])
    }
  }
  if (!outPath) {
    console.error("Missing --out <path.json>")
    process.exit(1)
  }
  return { repoRoot, outPath }
}

function walkFiles(root: string, exts: Set<string>): string[] {
  const out: string[] = []
  const skip = new Set(["node_modules", ".next", "dist", ".git"])
  function walk(dir: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (skip.has(e.name)) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (exts.has(path.extname(e.name))) out.push(p)
    }
  }
  walk(root)
  return out
}

function hashFile(filePath: string): string {
  const h = crypto.createHash("sha256")
  h.update(fs.readFileSync(filePath))
  return h.digest("hex").slice(0, 16)
}

function rel(repoRoot: string, abs: string): string {
  return path.relative(repoRoot, abs).split(path.sep).join("/")
}

function add(
  findings: Finding[],
  f: Finding
): void {
  findings.push(f)
}

/** Regex: excluded column appears in SELECT ... context in a TS string literal */
function scanSqlLiteralsForExclusions(
  content: string,
  relPath: string,
  exclusions: string[],
  findings: Finding[]
): void {
  const re = /[`'"]([\s\S]*?\bSELECT\b[\s\S]*?)[`'"]/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const chunk = m[1]
    const line = content.slice(0, m.index).split("\n").length
    if (!/\bfrom\b/i.test(chunk)) continue
    for (const col of exclusions) {
      const word = new RegExp(`\\b${col.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      if (word.test(chunk) && !/FERPA-OK:/i.test(chunk)) {
        add(findings, {
          severity: "Warning",
          category: "select_exclusion_literal",
          file: relPath,
          line,
          regulation: "§99.31(a)(1)(i) — legitimate educational interest",
          title: "SQL text may select a restricted student identifier or field",
          description:
            `A string in this file contains a SELECT-style fragment that references "${col}". Under FERPA, releasing such fields in the wrong context can expose personally identifiable information from education records. Institutions should verify this string is never executed for end-user export without appropriate access control and minimization.`,
          remediation:
            "Remove the column from selectable output, aggregate or de-identify, or mark the line with // FERPA-OK: <institutional authority> after legal review.",
        })
        break
      }
    }
  }
}

function scanConsoleLeak(
  ts: typeof import("typescript"),
  sourceFile: import("typescript").SourceFile,
  relPath: string,
  findings: Finding[],
  isClientish: boolean
): void {
  function visit(node: import("typescript").Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["log", "debug", "info"].includes(node.expression.name.text) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "console"
    ) {
      const args = node.arguments.map((a) => a.getText(sourceFile)).join(" ")
      if (
        /\b(plan|result|data|rows|students?|response)\b/i.test(args) &&
        !/FERPA-OK:/i.test(node.getFullText(sourceFile))
      ) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart())
        add(findings, {
          severity: isClientish ? "Warning" : "Note",
          category: "console_leak",
          file: relPath,
          line: pos.line + 1,
          regulation: "§99.33 — limits on redisclosure",
          title: "Console logging may capture student-level query or response objects",
          description:
            "Browser or server consoles are not a controlled disclosure channel. Logging plans, results, or ambiguous large objects can place education-record-derived data where institutional access rules no longer apply (screenshots, remote debugging, third-party tooling).",
          remediation:
            "Remove debug logs before release; log only non-identifying error codes server-side, or gate verbose logging behind a secure, audited diagnostics mode.",
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
}

function apiUrlFromRouteFile(routeFile: string, dashRoot: string): string {
  const apiRoot = path.join(dashRoot, "app", "api")
  const dir = path.dirname(routeFile)
  let rel = path.relative(apiRoot, dir)
  if (rel.startsWith("..")) return ""
  const segments = rel.split(path.sep).filter(Boolean)
  const url = segments.map((s) => (s.startsWith("[") && s.endsWith("]") ? `:${s.slice(1, -1)}` : s)).join("/")
  return `/api/${url}`
}

function main(): void {
  const { repoRoot, outPath } = parseArgs(process.argv)
  const req = createRequire(path.join(repoRoot, "codebenders-dashboard", "package.json"))
  const ts: typeof import("typescript") = req("typescript")
  const parseYaml = req("yaml").parse as (s: string) => unknown
  const configPath = path.join(repoRoot, "ferpa-config.yaml")
  if (!fs.existsSync(configPath)) {
    console.error("ferpa-config.yaml not found at repo root")
    process.exit(1)
  }
  const config = parseYaml(fs.readFileSync(configPath, "utf8")) as FerpaConfig
  const findings: Finding[] = []
  const dashRoot = path.join(repoRoot, config.project.dashboard_relative_path)

  const executeSql = path.join(repoRoot, config.project.execute_sql_route_glob)
  if (fs.existsSync(executeSql)) {
    const ex = fs.readFileSync(executeSql, "utf8")
    if (!ex.includes("inspectSelectForFerpaExclusions")) {
      add(findings, {
        severity: "Critical",
        category: "ferpa_select_enforcement_gap",
        file: rel(repoRoot, executeSql),
        regulation: "§99.31(a)(1)(i) — legitimate educational interest",
        title: "Arbitrary SQL execution path has no FERPA column guard",
        description:
          "The `/api/analyze` route applies a conservative SELECT-clause check (`inspectSelectForFerpaExclusions`) for columns such as Student_GUID, in addition to prompt instructions (#127). This endpoint executes whatever SQL the caller supplies with no equivalent guard — so the same identifier could still appear in results when queries bypass the analyzer (for example rule-based fallback → `/api/execute-sql`).",
        remediation:
          "Reuse the same SELECT-clause inspection used by /api/analyze, restrict to prepared institutional queries, or enforce column allowlists at the database role level.",
      })
    }
    if (!ex.includes(config.rbac.header_name)) {
      add(findings, {
        severity: "Warning",
        category: "rbac_gap",
        file: rel(repoRoot, executeSql),
        regulation: "§99.31(a)(1)(i) — legitimate educational interest",
        title: "SQL execution API does not check institutional role header",
        description:
          "Without application-layer role checks, any caller who can reach this route may exercise the privileges of the database connection — a common mismatch with FERPA’s expectation that access to education records tracks legitimate educational interest.",
        remediation:
          "Require the configured role header (or stronger authn/authz) before executing SQL, aligned to institutional policy.",
      })
    }
  }

  const analyzeRoute = path.join(repoRoot, config.project.analyze_route_glob)
  if (fs.existsSync(analyzeRoute)) {
    const an = fs.readFileSync(analyzeRoute, "utf8")
    if (!an.includes(config.rbac.header_name)) {
      add(findings, {
        severity: "Warning",
        category: "rbac_gap",
        file: rel(repoRoot, analyzeRoute),
        regulation: "§99.31(a)(1)(i) — legitimate educational interest",
        title: "LLM query planner route has no role header check",
        description:
          "This route sends schema metadata to a vendor model and returns executable SQL. Institutional policy usually ties such capability to specific staff roles; missing header checks increase the risk of over-broad access if the network perimeter is ever misconfigured.",
        remediation:
          "Enforce the same RBAC primitive used elsewhere before invoking the model or returning a plan.",
      })
    }
    if (an.includes("Student_GUID") && an.includes("FERPA COMPLIANCE")) {
      add(findings, {
        severity: "Note",
        category: "vendor_schema_disclosure",
        file: rel(repoRoot, analyzeRoute),
        regulation: "§99.31(a)(1)(ii)(A)(B) — contractor disclosure rules",
        title: "Cloud LLM receives schema text that names the student identifier column",
        description:
          "Even when result rows are not sent, the prompt embeds column names and descriptions that reveal how individuals are keyed in the database. Vendors may log prompts for abuse monitoring; institutions should treat this as a controlled disclosure bounded by contract and the school-official framework.",
        remediation:
          "Confirm vendor agreements, data processing addenda, and institutional notices align with this disclosure; minimize schema detail where possible.",
      })
    }
  }

  const cfgFile = path.join(repoRoot, config.project.config_file)
  const qeFile = path.join(repoRoot, config.project.query_executor_file)
  if (fs.existsSync(cfgFile) && fs.existsSync(qeFile)) {
    const cfg = fs.readFileSync(cfgFile, "utf8")
    const qe = fs.readFileSync(qeFile, "utf8")
    if (cfg.includes("schools.syntex-ai.com") && /fetch\s*\(\s*url\s*\)/.test(qe)) {
      add(findings, {
        severity: "Warning",
        category: "external_student_data_host",
        file: rel(repoRoot, qeFile),
        regulation: "§99.31(a)(1)(ii)(A)(B) — contractor disclosure rules",
        title: "Query executor can fetch student-level rows from a non-institutional host",
        description:
          "When direct-database mode and FORCE_DIRECT_DB hardening are not in effect, the dashboard retrieves analysis-ready rows from a project-hosted API domain rather than from the institution’s Postgres deployment. That shifts custody of student-level payloads and may affect contractual and FERPA oversight expectations.",
        remediation:
          "Set FORCE_DIRECT_DB=true (or equivalent) for procurement-hardened installs; document the residual code path in transparency materials until removed.",
      })
    }
  }

  for (const routeRel of config.rbac.student_data_routes) {
    const abs = path.join(dashRoot, routeRel)
    if (!fs.existsSync(abs)) continue
    const txt = fs.readFileSync(abs, "utf8")
    if (!txt.includes(config.rbac.header_name)) {
      add(findings, {
        severity: "Warning",
        category: "rbac_gap",
        file: rel(repoRoot, abs),
        regulation: "§99.31(a)(1)(i) — legitimate educational interest",
        title: "Student-data API route omits configured role header check",
        description:
          "This route appears on the institutional student-data route list in ferpa-config.yaml but does not reference the configured RBAC header. Access to education records should follow role-based institutional policy.",
        remediation:
          "Add the same role verification pattern used on other student endpoints, or remove the route from the list after documenting why it is exempt.",
      })
    }
  }

  const apiFiles = walkFiles(path.join(dashRoot, "app", "api"), new Set([".ts"]))
  const llmRoutes: string[] = []
  const markers = config.llm.sdk_markers
  for (const f of apiFiles) {
    if (!f.endsWith(`${path.sep}route.ts`)) continue
    const t = fs.readFileSync(f, "utf8")
    if (markers.some((m) => t.includes(m))) {
      llmRoutes.push(f)
    }
  }

  const transparencyPath = path.join(repoRoot, config.project.ai_transparency_file)
  const transparency = fs.existsSync(transparencyPath)
    ? fs.readFileSync(transparencyPath, "utf8")
    : ""

  for (const f of llmRoutes) {
    const apiPath = apiUrlFromRouteFile(f, dashRoot)
    const mentioned =
      Boolean(apiPath) &&
      (transparency.includes(apiPath) ||
        (apiPath.includes("analyze") && transparency.includes("analyze")) ||
        (apiPath.includes("query-summary") && transparency.includes("query-summary")) ||
        (apiPath.includes("explain-pairing") && transparency.includes("explain-pairing")))
    if (apiPath && !mentioned) {
      add(findings, {
        severity: "Note",
        category: "ai_transparency_drift",
        file: rel(repoRoot, f),
        regulation: "§99.7 — policy and rights awareness",
        title: "LLM call site may be missing from the AI transparency inventory",
        description:
          "Institutions increasingly publish AI transparency pages for procurement. An undeployed or undocumented model route creates a gap between what legal teams believe is running and what code can execute.",
        remediation:
          "Add an entry to content/ai-transparency.ts describing inputs, vendor, and data flow for this route.",
      })
    }
  }

  const scanRoots = [path.join(dashRoot, "app"), path.join(dashRoot, "lib")]
  for (const sr of scanRoots) {
    if (!fs.existsSync(sr)) continue
    for (const f of walkFiles(sr, new Set([".ts", ".tsx"]))) {
      const r = rel(repoRoot, f)
      // Prompt templates intentionally name excluded columns for the model; covered by vendor_schema_disclosure.
      if (r.endsWith("app/api/analyze/route.ts")) continue
      if (r.includes("__tests__") || r.endsWith(".test.ts")) continue
      const content = fs.readFileSync(f, "utf8")
      // Identifier-focused literals only; raw demographics are assessed via Layer B small-N.
      scanSqlLiteralsForExclusions(content, r, config.select_exclusions, findings)
    }
  }

  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES2022, allowJs: true }
  for (const f of walkFiles(path.join(dashRoot, "app"), new Set([".tsx", ".ts"]))) {
    const content = fs.readFileSync(f, "utf8")
    const sf = ts.createSourceFile(f, content, ts.ScriptTarget.ES2022, true, f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const clientish = f.includes(`${path.sep}app${path.sep}`) && !f.includes(`${path.sep}app${path.sep}api${path.sep}`)
    scanConsoleLeak(ts, sf, rel(repoRoot, f), findings, clientish)
  }

  const seen = new Set<string>()
  const deduped = findings.filter((f) => {
    const k = `${f.severity}|${f.category}|${f.file}|${f.line ?? 0}|${f.title}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const payload = {
    layer: "A",
    generatedAt: new Date().toISOString(),
    configPath: rel(repoRoot, configPath),
    configHash: hashFile(configPath),
    repoRoot,
    findings: deduped,
  }
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8")
  console.error(`Layer A: ${deduped.length} findings → ${outPath}`)
}

main()
