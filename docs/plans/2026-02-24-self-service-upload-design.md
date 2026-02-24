# Design: Self-Service Data Upload (Issue #86)

**Date:** 2026-02-24
**Author:** Claude Code

---

## Overview

Allow admin and IR users to upload institutional data files directly from the dashboard without
needing direct database or server access. Two upload paths: course enrollment CSVs (end-to-end
to Postgres) and PDP cohort/AR files (to Supabase Storage + GitHub Actions ML pipeline trigger).

---

## Scope

**In scope:**
- Course enrollment CSV → `course_enrollments` Postgres table (upsert)
- PDP Cohort CSV / PDP AR (.xlsx) → Supabase Storage + GitHub Actions `repository_dispatch`
- Preview step (first 10 rows + column validation) before commit
- Role guard: admin and ir only

**Out of scope:**
- Upload history log (future issue)
- Column remapping UI (columns must match known schema)
- ML experiment tracking / MLflow (future issue)
- Auto-triggering ML pipeline without a server (GitHub Actions is the trigger mechanism)

---

## Pages & Routing

**New page:** `codebenders-dashboard/app/admin/upload/page.tsx`

**Role guard:** Add to `lib/roles.ts` `ROUTE_PERMISSIONS`:
```ts
{ prefix: "/admin",     roles: ["admin", "ir"] },
{ prefix: "/api/admin", roles: ["admin", "ir"] },
```
Middleware already enforces this pattern via `x-user-role` header — no other auth code needed.

**Nav link:** Add "Upload Data" to `nav-header.tsx`, visible only to admin/ir roles.

**New API routes:**
- `POST /api/admin/upload/preview` — parse first 10 rows, return sample + validation summary
- `POST /api/admin/upload/commit` — full ingest (course → Postgres; PDP/AR → Storage + Actions)

---

## UI Flow (3 States)

### State 1 — Select & Drop
- Dropdown: file type (`Course Enrollment CSV` | `PDP Cohort CSV` | `PDP AR File (.xlsx)`)
- Drag-and-drop zone (click to pick; `.csv` for course/cohort, `.csv`+`.xlsx` for AR)
- "Preview" button → calls `/api/admin/upload/preview`

### State 2 — Preview
- Shows: detected file type, estimated row count, first 10 rows in a table
- Validation banner: lists missing required columns or warnings
- "Confirm & Upload" → calls `/api/admin/upload/commit`
- "Back" link to return to State 1

### State 3 — Result
- Course enrollments: `{ inserted, skipped, errors[] }` summary card
- PDP/AR: "File accepted — ML pipeline queued in GitHub Actions" + link to Actions run
- "Upload another file" resets to State 1

---

## API Routes

### `POST /api/admin/upload/preview`

**Input:** `multipart/form-data` with `file` and `fileType` fields

**Logic:**
1. Parse first 50 rows with `csv-parse` (CSV) or `xlsx` (Excel)
2. Validate required columns exist for the given `fileType`
3. Return `{ columns, sampleRows (first 10), rowCount (estimated), warnings[] }`

### `POST /api/admin/upload/commit`

**Input:** Same multipart form

**Course enrollment path:**
1. Stream-parse full CSV with `csv-parse` async iterator
2. Batch-upsert 500 rows at a time into `course_enrollments` via `pg`
3. Conflict target: `(student_guid, course_prefix, course_number, academic_term)`
4. Return `{ inserted, skipped, errors[] }`

**PDP/AR path:**
1. Upload file to Supabase Storage bucket `pdp-uploads` via `@supabase/supabase-js`
2. Call GitHub API `POST /repos/{owner}/{repo}/dispatches` with:
   ```json
   { "event_type": "ml-pipeline", "client_payload": { "file_path": "<storage-path>" } }
   ```
3. Return `{ status: "processing", actionsUrl: "https://github.com/{owner}/{repo}/actions" }`

**Role enforcement:** Read `x-user-role` header (set by middleware); return 403 if not admin/ir.

---

## GitHub Actions Workflow

**File:** `.github/workflows/ml-pipeline.yml`

**Trigger:** `repository_dispatch` with `event_type: ml-pipeline`

**Steps:**
1. Checkout repo
2. Set up Python with `venv`
3. Install dependencies (`pip install -r requirements.txt`)
4. Download uploaded file from Supabase Storage using `SUPABASE_SERVICE_KEY` secret
5. Run `venv/bin/python ai_model/complete_ml_pipeline.py --input <downloaded-file-path>`
6. Upload `ML_PIPELINE_REPORT.txt` as a GitHub Actions artifact (retained 90 days)

**Required secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GITHUB_TOKEN` (auto-provided)

---

## Required Column Schemas

### Course Enrollment CSV
Must include: `student_guid`, `course_prefix`, `course_number`, `academic_year`, `academic_term`
Optional (all other `course_enrollments` columns): filled as NULL if absent

### PDP Cohort CSV
Must include: `Institution_ID`, `Cohort`, `Student_GUID`, `Cohort_Term`

### PDP AR File (.xlsx)
Must include: `Institution_ID`, `Cohort`, `Student_GUID` (first sheet parsed)

---

## New Packages

| Package | Purpose |
|---------|---------|
| `csv-parse` | Streaming CSV parsing (async iterator mode) |
| `xlsx` | Excel (.xlsx) parsing |

---

## New Files

| File | Purpose |
|------|---------|
| `codebenders-dashboard/app/admin/upload/page.tsx` | Upload UI page |
| `codebenders-dashboard/app/api/admin/upload/preview/route.ts` | Preview API route |
| `codebenders-dashboard/app/api/admin/upload/commit/route.ts` | Commit API route |
| `.github/workflows/ml-pipeline.yml` | GitHub Actions ML pipeline trigger |

---

## Supabase Changes

**Storage bucket:** Create `pdp-uploads` bucket (private, authenticated access only).
No new database migrations required — `course_enrollments` table already exists.

**Bucket policy:** Only service role key can read/write. Signed URLs used for pipeline download.

---

## Constraints & Known Limitations

- ML pipeline trigger via GitHub Actions means a ~30-60s delay before the pipeline starts
- Vercel free tier has a 4.5 MB request body limit — large files should use Supabase Storage direct upload in a future iteration
- No upload history log in this version (deferred)
- Column remapping is out of scope — files must match the known schema
