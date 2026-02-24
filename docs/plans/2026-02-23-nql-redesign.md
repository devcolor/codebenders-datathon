# NQL Interface Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Query" nav link, move query history into a fixed left sidebar, and add an opt-in LLM "Summarize" button that generates a plain-English narrative from query results.

**Architecture:** Four file changes — nav link is a one-liner, the new `POST /api/query-summary` route reuses the existing `@ai-sdk/openai` + `generateText` pattern from other API routes, `QueryHistoryPanel` is stripped of its Card wrapper and made sidebar-native, and the query page is restructured as a two-column layout (260px sidebar + flex-1 main). Use the `frontend-design` skill for the page layout task.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui, `ai` v5 + `@ai-sdk/openai` v2, Lucide icons.

**Design doc:** `docs/plans/2026-02-23-nql-redesign-design.md`

---

### Task 1: Add "Query" to global nav

**Files:**
- Modify: `codebenders-dashboard/components/nav-header.tsx`

**Context:**
`NAV_LINKS` is an array at the top of the file. The `/query` route is already RBAC-guarded in `lib/roles.ts` for `admin, advisor, ir, faculty`. The middleware injects `x-user-role` and redirects unauthorized users — no change to `roles.ts` needed for the nav link itself.

**Step 1: Add the link**

In `nav-header.tsx`, update `NAV_LINKS`:

```ts
const NAV_LINKS = [
  { href: "/",        label: "Dashboard" },
  { href: "/courses", label: "Courses"   },
  { href: "/students", label: "Students" },
  { href: "/query",   label: "Query"     },
]
```

**Step 2: Verify type check passes**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```
Expected: no errors.

**Step 3: Commit**

```bash
git add codebenders-dashboard/components/nav-header.tsx
git commit -m "feat: add Query link to global nav header (#88)"
```

---

### Task 2: Create POST /api/query-summary route

**Files:**
- Create: `codebenders-dashboard/app/api/query-summary/route.ts`
- Modify: `codebenders-dashboard/lib/roles.ts` (add RBAC entry)

**Context:**
Follow the exact pattern from `app/api/courses/explain-pairing/route.ts`:
- Import `generateText` from `"ai"`, `createOpenAI` from `"@ai-sdk/openai"`
- Instantiate `const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })`
- Use `generateText({ model: openai("gpt-4o-mini"), prompt, maxOutputTokens: 200 })`
- Return `NextResponse.json({ summary: result.text })`
- Guard with `canAccess("/api/query-summary", role)`

**Step 1: Add RBAC entry in `lib/roles.ts`**

```ts
{ prefix: "/api/query-summary", roles: ["admin", "advisor", "ir", "faculty"] },
```

Add it after the existing `/api/courses` entry.

**Step 2: Create the route**

```ts
import { type NextRequest, NextResponse } from "next/server"
import { canAccess, type Role } from "@/lib/roles"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/query-summary", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  const { prompt, data, rowCount, vizType } = await request.json()

  if (!prompt || !Array.isArray(data)) {
    return NextResponse.json({ error: "prompt and data are required" }, { status: 400 })
  }

  // Cap rows sent to LLM to avoid token overflow
  const sampleRows = data.slice(0, 50)

  const llmPrompt = `You are a student success analyst at a community college. An advisor ran the following query and got these results.

QUERY: "${prompt}"
RESULT: ${rowCount} rows, visualization type: ${vizType}
DATA SAMPLE:
${JSON.stringify(sampleRows, null, 2)}

Write a 2-3 sentence plain-English summary of what these results show. Be specific about the numbers. Do not speculate beyond the data. Address the advisor directly.`

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: llmPrompt,
      maxOutputTokens: 200,
    })
    return NextResponse.json({ summary: result.text })
  } catch (error) {
    console.error("[query-summary] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate summary", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
```

**Step 3: Verify type check**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add codebenders-dashboard/app/api/query-summary/route.ts \
        codebenders-dashboard/lib/roles.ts
git commit -m "feat: add POST /api/query-summary LLM result narration (#88)"
```

---

### Task 3: Adapt QueryHistoryPanel for sidebar

**Files:**
- Modify: `codebenders-dashboard/components/query-history-panel.tsx`

**Context:**
Currently renders a `<Card>` with `<CardHeader>` and `<CardContent>`. In the sidebar it will be rendered inside an `<aside>` that provides the container. The component needs to fill the sidebar height (flex column, scrollable list, pinned footer).

The props interface `{ entries, onRerun, onClear }` stays identical — only the markup changes.

**Step 1: Rewrite the component markup**

Replace the entire return value with:

```tsx
return (
  <div className="flex flex-col h-full">
    {/* Sidebar header */}
    <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
      <span className="text-sm font-semibold">Recent Queries</span>
      <a
        href="/api/query-history/export"
        download="query-audit-log.csv"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Export
      </a>
    </div>

    {/* Scrollable list */}
    <ul className="flex-1 overflow-y-auto divide-y divide-border">
      {entries.length === 0 ? (
        <li className="px-4 py-6 text-xs text-muted-foreground text-center">
          No queries yet
        </li>
      ) : (
        entries.map((entry) => {
          const truncated = entry.prompt.length > 55
            ? entry.prompt.slice(0, 55) + "…"
            : entry.prompt

          return (
            <li key={entry.id} className="px-4 py-3">
              <button
                onClick={() => onRerun(entry)}
                className="w-full text-left group"
              >
                <p
                  className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug"
                  title={entry.prompt}
                >
                  {truncated}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {relativeTime(entry.timestamp)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {entry.rowCount} rows
                  </span>
                </div>
              </button>
            </li>
          )
        })
      )}
    </ul>

    {/* Pinned footer */}
    {entries.length > 0 && (
      <div className="shrink-0 px-4 py-2 border-t">
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear history
        </button>
      </div>
    )}
  </div>
)
```

Also remove the now-unused imports: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Download`, `Badge`.

**Step 2: Verify type check and lint**

```bash
cd codebenders-dashboard && npx tsc --noEmit && npm run lint
```
Expected: no errors.

**Step 3: Commit**

```bash
git add codebenders-dashboard/components/query-history-panel.tsx
git commit -m "refactor: adapt QueryHistoryPanel for sidebar layout (#88)"
```

---

### Task 4: Redesign query page with sidebar layout and Summarize button

**Files:**
- Modify: `codebenders-dashboard/app/query/page.tsx`

**Context:**
This is the most involved change. Use the **`frontend-design` skill** to implement the visual design — the page should feel like a professional analytics workbench, not a generic form. Read the design doc at `docs/plans/2026-02-23-nql-redesign-design.md` before starting.

**Key structural changes:**
- Outer container: `min-h-screen bg-background flex flex-col`
- Slim page header bar: title + mobile sidebar toggle button
- Body: `flex flex-1 overflow-hidden`
  - `<aside>`: `hidden md:flex w-[260px] border-r flex-col shrink-0` — contains `<QueryHistoryPanel>`
  - Mobile overlay: triggered by `sidebarOpen` state, shows sidebar as left drawer with backdrop
  - `<main>`: `flex-1 overflow-auto p-6 space-y-6` — contains controls + results
- Remove the "Back to Dashboard" `<Link>` (global nav covers navigation)

**New state to add:**

```ts
const [sidebarOpen, setSidebarOpen] = useState(false)
const [summary, setSummary] = useState<string | null>(null)
const [summaryLoading, setSummaryLoading] = useState(false)
const [summaryError, setSummaryError] = useState<string | null>(null)
```

**Reset summary when new query starts** — add these lines at the top of `handleAnalyze`:

```ts
setSummary(null)
setSummaryError(null)
```

**Summarize handler:**

```ts
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
```

**Summarize button** — render inside or adjacent to the `<AnalysisResult>` card heading area. Pass `summary`, `summaryLoading`, `summaryError`, and `onSummarize` as props to a wrapper, OR render inline above/below `<AnalysisResult>`. Inline is simpler — wrap both in a section:

```tsx
{queryResult && queryPlan && (
  <div className="space-y-3">
    {/* Results header with Summarize button */}
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Results
      </h2>
      {!summary && (
        <button
          onClick={handleSummarize}
          disabled={summaryLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
        >
          {summaryLoading
            ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
            : <><Sparkles className="h-3 w-3" /> Summarize</>}
        </button>
      )}
    </div>

    {/* LLM summary */}
    {summary && (
      <div className="flex gap-2 px-4 py-3 rounded-lg bg-muted/50 border">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
      </div>
    )}
    {summaryError && (
      <p className="text-xs text-destructive">{summaryError}</p>
    )}

    {/* Existing results layout */}
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <AnalysisResult result={queryResult} plan={queryPlan} />
      <QueryPlanPanel plan={queryPlan} />
    </div>
  </div>
)}
```

**New imports needed:** `Loader2`, `Sparkles`, `PanelLeft` (or `Menu`) from `lucide-react`.

**Mobile sidebar overlay:**

```tsx
{/* Mobile sidebar overlay */}
{sidebarOpen && (
  <div className="fixed inset-0 z-50 md:hidden">
    <div
      className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      onClick={() => setSidebarOpen(false)}
    />
    <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-background border-r flex flex-col">
      <QueryHistoryPanel entries={history} onRerun={handleRerun} onClear={handleClear} />
    </aside>
  </div>
)}
```

**Mobile toggle button** in the slim page header:

```tsx
<button
  onClick={() => setSidebarOpen(true)}
  className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
>
  <PanelLeft className="h-4 w-4" />
</button>
```

**Step 1: Invoke the `frontend-design` skill**

Before writing code, invoke `frontend-design` skill with this brief:

> "Redesign the `/query` page as an analytics workbench with a fixed 260px left sidebar for query history and a main content area on the right. The page has a slim header bar (title + mobile toggle), sidebar (history list, scrollable, pinned footer), and main (query controls card, results section with Summarize button, chart/table). Match the existing shadcn/ui dashboard aesthetic. Avoid generic AI design — go for a refined, focused analytics tool feel."

Use the generated design guidance for color, spacing, and typography decisions while implementing the structural changes above.

**Step 2: Implement the page**

Apply all structural changes documented above. Keep all existing logic (`handleAnalyze`, `handleRerun`, `handleClear`) unchanged.

**Step 3: Verify type check, lint, and build**

```bash
cd codebenders-dashboard && npx tsc --noEmit && npm run lint && npm run build
```
Expected: no errors or type failures.

**Step 4: Commit**

```bash
git add codebenders-dashboard/app/query/page.tsx
git commit -m "feat: sidebar layout + LLM Summarize button on query page (#88)"
```

---

## Final verification

After all tasks:

```bash
cd codebenders-dashboard && npx tsc --noEmit && npm run lint && npm run build
```

All three must pass before creating the PR.
