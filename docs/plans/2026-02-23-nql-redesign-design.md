# NQL Interface Redesign — Design Doc
**Issue:** #88
**Date:** 2026-02-23

## Overview

Three improvements to the Natural Query Language interface at `/query`:

1. Add **Query** nav link to the global header
2. Move query history into a **fixed left sidebar**
3. Add an opt-in **Summarize** button that generates a plain-English LLM narrative of results

---

## Architecture

### Files changed

| File | Change |
|------|--------|
| `codebenders-dashboard/components/nav-header.tsx` | Add `{ href: "/query", label: "Query" }` to `NAV_LINKS` |
| `codebenders-dashboard/app/query/page.tsx` | Redesign as sidebar + main two-column layout; add summarize state |
| `codebenders-dashboard/components/query-history-panel.tsx` | Strip Card wrapper; adapt for sidebar use (full height, scrollable) |
| `codebenders-dashboard/app/api/query-summary/route.ts` | New POST endpoint for LLM result summarization |

---

## Section 1: Nav link

Add `{ href: "/query", label: "Query" }` to the `NAV_LINKS` array in `nav-header.tsx`.

- Consistent with Dashboard / Courses / Students pattern
- Middleware already guards `/query` for `admin, advisor, ir, faculty` roles
- No role-filtering on the link itself (unauthorized users get redirected by middleware)

---

## Section 2: Sidebar layout

**Desktop (≥ 768px):**
```
┌──────────┬──────────────────────────────────────┐
│ History  │  Query Controls                      │
│ sidebar  │  [Institution] [Prompt ▸▸▸] [Run]   │
│ ~260px   │                                      │
│ • q1     ├──────────────────────────────────────┤
│ • q2     │  Analysis Results   [✦ Summarize]    │
│ • q3     │  Chart / Table                       │
│ …        │                                      │
│          │  ── LLM summary paragraph ──         │
│ [Export] │                                      │
│ [Clear]  │  Query Plan (collapsible)            │
└──────────┴──────────────────────────────────────┘
```

**Mobile (< 768px):** Sidebar hidden by default. A **History** toggle button in the page header opens it as an overlay drawer from the left.

**QueryHistoryPanel changes:**
- Remove `<Card>` wrapper — sidebar provides its own container
- Make list `flex-1 overflow-y-auto` so it fills available height
- Pin Export + Clear buttons to the bottom of the sidebar
- Header ("Recent Queries") stays at the top

**Page header:** Remove the "Back to Dashboard" `<Link>` — global nav covers navigation now. Keep the page title and description as a slim heading.

---

## Section 3: LLM result summary

**UI:** After a successful query, a `Summarize` button (Sparkles icon, ghost variant) appears next to the "Analysis Results" heading. States:
- Idle: `✦ Summarize`
- Loading: `Generating…` (spinner)
- Done: button hidden; summary paragraph renders below chart with a Sparkles icon prefix
- Error: inline error message

**Summary resets** when a new query is run.

**API: `POST /api/query-summary`**

Request body:
```json
{
  "prompt": "retention by cohort for last two terms",
  "data": [ ...up to 50 rows... ],
  "rowCount": 12,
  "vizType": "bar"
}
```

Response:
```json
{ "summary": "The Fall 2022 cohort had the highest retention rate at 71%, ..." }
```

Implementation:
- Uses `generateText` from `ai` SDK with `openai("gpt-4o-mini")`
- Caps data rows at 50 before sending to LLM
- `maxOutputTokens: 200` (2–3 sentences)
- System prompt: advisor-friendly, data-driven, no speculation beyond the numbers
- RBAC: `/api/query-summary` accessible to same roles as `/query`

---

## Frontend design

The `frontend-design` skill must be invoked when implementing the query page layout and sidebar to ensure visual quality. The redesign should feel like a professional analytics workbench — not a generic form page.

---

## Out of scope

- Streaming the summary (full text response is fine at 2–3 sentences)
- Persisting summaries to localStorage or DB
- Changing the SQL generation or execution logic
