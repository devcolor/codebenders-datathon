# SIS Deep-Link from Student Detail View — Design Spec

**Date:** 2026-04-01
**Issue:** #78
**Scope:** Proof of concept / demo
**Branch:** `feature/sis-deep-link` (from `main`)

## Summary

Add a FERPA-compliant "Open in SIS" button to the student detail page that constructs a deep-link URL to the institution's Student Information System. Identity resolution happens server-side — the browser never receives the SIS student ID. This POC validates the architecture with sample data and a configurable demo URL.

## Architecture

```
Browser (student detail page)
  │
  ├─ GET /api/students/[guid]/sis-link
  │     │
  │     ├─ Role check (x-user-role header, admin/advisor/ir only)
  │     ├─ Query guid_sis_map table for sis_id
  │     ├─ Build URL: SIS_BASE_URL?SIS_ID_PARAM=<sis_id>
  │     ├─ Append audit log entry (GUID + role, never sis_id)
  │     └─ Return { url } or 404
  │
  └─ window.open(url, "_blank")
```

The SIS ID never reaches the client. The audit log records access by GUID and role only.

## 1. Database — `guid_sis_map` Table

Table in the existing Postgres database:

```sql
CREATE TABLE guid_sis_map (
  student_guid TEXT PRIMARY KEY,
  sis_id       TEXT NOT NULL
);
```

A seed script picks ~20 random GUIDs from `student_level_with_predictions` and assigns fake SIS IDs (`BSC-100001` through `BSC-100020`). This demonstrates both the happy path (button works) and the fallback (no mapping → disabled button with tooltip).

## 2. Environment Configuration

Two server-only env vars in `.env.local` (no `NEXT_PUBLIC_` prefix):

```env
# SIS deep-link (leave blank to hide the button entirely)
SIS_BASE_URL=https://sis-demo.example.com/students
# Query param name the SIS expects (default: id)
SIS_ID_PARAM=id
```

When `SIS_BASE_URL` is unset, the API returns 404 and the UI hides the button — the feature is effectively disabled.

## 3. API Route — `GET /api/students/[guid]/sis-link`

**File:** `codebenders-dashboard/app/api/students/[guid]/sis-link/route.ts`

**Behavior:**

| Condition | Response |
|-----------|----------|
| `SIS_BASE_URL` unset | 404 `{ url: null }` |
| Role not in `admin, advisor, ir` | 403 `{ error: "Forbidden" }` |
| No mapping in `guid_sis_map` | 404 `{ url: null }` |
| Mapping found | 200 `{ url: "https://sis-demo.example.com/students?id=BSC-100001" }` |

**Role gating:** Reads `x-user-role` header injected by existing middleware. No changes to `lib/roles.ts` needed — the `/api/students` prefix is already gated to `admin`, `advisor`, `ir`.

**Audit logging:** Appends to `logs/query-history.jsonl`:

```json
{ "event": "sis_link_accessed", "guid": "<guid>", "role": "advisor", "timestamp": "2026-04-01T12:00:00.000Z" }
```

The `sis_id` is never logged.

## 4. UI — "Open in SIS" Button

**File:** `codebenders-dashboard/app/students/[guid]/page.tsx`

**Placement:** In the student header card, alongside the existing alert/readiness badges.

**Visibility logic** (determined by the API response on page load):

| API result | Button state |
|------------|--------------|
| 200 with URL | Visible and clickable — opens URL in new tab |
| 404 (no mapping) | Visible but disabled — tooltip: "No SIS record linked for this student" |
| 403 or fetch error | Hidden entirely |

Uses existing `Button` from shadcn/ui and `ExternalLink` icon from lucide-react. No new component file needed.

## Files Changed

| File | Change |
|------|--------|
| `operations/seed_guid_sis_map.py` | New — seed script for demo data |
| `codebenders-dashboard/.env.local` | Add `SIS_BASE_URL`, `SIS_ID_PARAM` |
| `codebenders-dashboard/app/api/students/[guid]/sis-link/route.ts` | New — server-side SIS URL builder |
| `codebenders-dashboard/app/students/[guid]/page.tsx` | Add "Open in SIS" button with fetch logic |

## Out of Scope

- Row-Level Security on `guid_sis_map` (not needed for POC)
- Real institution SIS integration (demo uses placeholder URL)
- `.env.example` file (can be added later)
- Supabase Edge Function alternative

## Acceptance Criteria (from issue #78)

- [x] `SIS_BASE_URL` env var controls whether the button appears (hidden when blank)
- [x] Button only visible to Advisor + IR + Admin roles
- [x] SIS ID is never stored in `student_level_with_predictions` or `llm_recommendations`
- [x] SIS ID is never returned by any public API endpoint (only pre-built URL returned)
- [x] Every deep-link access is logged (GUID + role, not SIS ID)
- [x] Button shows a graceful fallback if no mapping exists for a GUID
- [x] Works with any SIS that accepts a query-param student ID in a URL
