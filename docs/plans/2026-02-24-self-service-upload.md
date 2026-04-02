# Self-Service Data Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/admin/upload` page (admin/ir only) for uploading course enrollment CSVs directly into Postgres, and PDP cohort/AR files into Supabase Storage with automatic GitHub Actions ML pipeline triggering.

**Architecture:** Single unified upload page with a 3-state UI (select → preview → result). Two API routes: `/api/admin/upload/preview` (parse first 10 rows, validate columns) and `/api/admin/upload/commit` (course CSV → Postgres batch-upsert; PDP/AR → Supabase Storage + `repository_dispatch` to GitHub Actions). No new DB migrations needed — `course_enrollments` table already exists.

**Tech Stack:** Next.js 16 App Router, `csv-parse` (streaming CSV), `xlsx` (Excel), `@supabase/supabase-js` (Storage), `pg` (Postgres upsert), GitHub REST API (`repository_dispatch`), TypeScript, Tailwind CSS, shadcn/ui

---

## Task 1: Install `csv-parse` and `xlsx` packages

**Files:**
- Modify: `codebenders-dashboard/package.json` (via npm install)

**Step 1: Install packages**

```bash
cd codebenders-dashboard && npm install csv-parse xlsx
```

**Step 2: Verify they appear in `package.json` dependencies**

```bash
grep -E '"csv-parse"|"xlsx"' package.json
```

Expected output:
```
    "csv-parse": "^5.x.x",
    "xlsx": "^0.x.x",
```

**Step 3: Commit**

```bash
git add codebenders-dashboard/package.json codebenders-dashboard/package-lock.json
git commit -m "chore: add csv-parse and xlsx packages for file upload"
```

---

## Task 2: Add role permissions and nav link

**Files:**
- Modify: `codebenders-dashboard/lib/roles.ts:6-13`
- Modify: `codebenders-dashboard/components/nav-header.tsx:15-20`

**Step 1: Add `/admin` routes to `ROUTE_PERMISSIONS` in `lib/roles.ts`**

Open `codebenders-dashboard/lib/roles.ts`. After line 13 (`{ prefix: "/api/query-history/export", ... }`), add two new entries so the array looks like:

```ts
export const ROUTE_PERMISSIONS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/students",                 roles: ["admin", "advisor", "ir"] },
  { prefix: "/courses",                  roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/query",                    roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/api/students",             roles: ["admin", "advisor", "ir"] },
  { prefix: "/api/courses",              roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/api/query-summary",        roles: ["admin", "advisor", "ir", "faculty"] },
  { prefix: "/api/query-history/export", roles: ["admin", "ir"] },
  { prefix: "/admin",                    roles: ["admin", "ir"] },
  { prefix: "/api/admin",                roles: ["admin", "ir"] },
]
```

**Step 2: Add "Upload Data" nav link in `nav-header.tsx`**

The `NavHeader` component already receives `role` as a prop. Replace the `NAV_LINKS` constant and its usage so the Upload link only renders for admin/ir:

```tsx
const NAV_LINKS = [
  { href: "/",          label: "Dashboard",   roles: null },
  { href: "/courses",   label: "Courses",     roles: null },
  { href: "/students",  label: "Students",    roles: null },
  { href: "/query",     label: "Query",       roles: null },
  { href: "/admin/upload", label: "Upload Data", roles: ["admin", "ir"] as Role[] },
]
```

Then update the `nav` block to filter on role:

```tsx
<nav className="hidden sm:flex items-center gap-1">
  {NAV_LINKS.filter(({ roles }) => !roles || roles.includes(role)).map(({ href, label }) => {
    const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
    return (
      <Link
        key={href}
        href={href}
        className={`px-3 py-1 rounded text-sm transition-colors ${
          active
            ? "bg-muted font-semibold text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        {label}
      </Link>
    )
  })}
</nav>
```

**Step 3: Type-check**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add codebenders-dashboard/lib/roles.ts codebenders-dashboard/components/nav-header.tsx
git commit -m "feat: add admin/ir role permissions and Upload Data nav link"
```

---

## Task 3: Add environment variables

**Files:**
- Modify: `codebenders-dashboard/env.example`

**Step 1: Add new env vars to `env.example`**

Append to the bottom of `codebenders-dashboard/env.example`:

```bash
# Supabase Storage (for PDP/AR file uploads — use the service role key, not anon)
# Find in Supabase → Project Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# GitHub Actions ML pipeline trigger
# Create a PAT at GitHub → Settings → Developer settings → Personal access tokens
# Required scope: repo (to trigger repository_dispatch)
GITHUB_PAT=ghp_your-personal-access-token-here
# Full repo path: owner/repo
GITHUB_REPO=devcolor/codebenders-datathon
```

**Step 2: Add the same vars to your local `.env.local`**

Copy the three vars above into `codebenders-dashboard/.env.local` with real values.

**Step 3: Commit**

```bash
git add codebenders-dashboard/env.example
git commit -m "docs: add env vars for Supabase Storage and GitHub Actions pipeline trigger"
```

---

## Task 4: Create the preview API route

**Files:**
- Create: `codebenders-dashboard/app/api/admin/upload/preview/route.ts`

**Background:** This route accepts a `multipart/form-data` POST with two fields:
- `file` — the uploaded file (File object)
- `fileType` — one of `"course_enrollment"`, `"pdp_cohort"`, `"pdp_ar"`

It parses the first 50 rows (or all rows if fewer), validates that required columns are present, and returns a preview payload. For `.xlsx` files, it reads the first sheet. For CSV, it uses `csv-parse`.

**Required columns per file type:**
- `course_enrollment`: `Student_GUID`, `Course_Prefix`, `Course_Number`, `Academic_Year`, `Academic_Term`
- `pdp_cohort`: `Institution_ID`, `Cohort`, `Student_GUID`, `Cohort_Term`
- `pdp_ar`: `Institution_ID`, `Cohort`, `Student_GUID`

**Step 1: Create the route file**

Create `codebenders-dashboard/app/api/admin/upload/preview/route.ts` with this content:

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse/sync"
import * as XLSX from "xlsx"

const REQUIRED_COLUMNS: Record<string, string[]> = {
  course_enrollment: ["Student_GUID", "Course_Prefix", "Course_Number", "Academic_Year", "Academic_Term"],
  pdp_cohort:        ["Institution_ID", "Cohort", "Student_GUID", "Cohort_Term"],
  pdp_ar:            ["Institution_ID", "Cohort", "Student_GUID"],
}

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role")
  if (role !== "admin" && role !== "ir") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const fileType = formData.get("fileType") as string | null

  if (!file || !fileType) {
    return NextResponse.json({ error: "Missing file or fileType" }, { status: 400 })
  }
  if (!REQUIRED_COLUMNS[fileType]) {
    return NextResponse.json({ error: `Unknown fileType: ${fileType}` }, { status: 400 })
  }

  let rows: Record<string, string>[]

  try {
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    if (file.name.endsWith(".xlsx")) {
      const wb = XLSX.read(buffer, { type: "buffer" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })
    } else {
      rows = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        to: 50,
        cast: false,
      }) as Record<string, string>[]
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse file", details: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    )
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 })
  }

  const columns = Object.keys(rows[0])
  const required = REQUIRED_COLUMNS[fileType]
  const missing = required.filter(col => !columns.includes(col))

  const warnings: string[] = []
  if (missing.length > 0) {
    warnings.push(`Missing required columns: ${missing.join(", ")}`)
  }

  return NextResponse.json({
    columns,
    sampleRows: rows.slice(0, 10),
    rowCount: rows.length,  // actual count of parsed rows (capped at 50)
    warnings,
  })
}
```

**Step 2: Type-check**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Smoke-test with curl** (while `npm run dev` is running)

```bash
curl -s -X POST http://localhost:3000/api/admin/upload/preview \
  -H "x-user-role: admin" \
  -F "fileType=course_enrollment" \
  -F "file=@../data/bishop_state_courses.csv" | jq '{columns: .columns[:3], rowCount: .rowCount, warnings: .warnings}'
```

Expected: JSON with `columns` array, `rowCount: 50`, `warnings: []`

**Step 4: Commit**

```bash
git add codebenders-dashboard/app/api/admin/upload/preview/route.ts
git commit -m "feat: add POST /api/admin/upload/preview route"
```

---

## Task 5: Create the commit route — course enrollment path

**Files:**
- Create: `codebenders-dashboard/app/api/admin/upload/commit/route.ts`

**Background:** For `course_enrollment` file type, stream-parse the full CSV and batch-upsert rows into `public.course_enrollments` in chunks of 500. Use `pg`'s `getPool()` (already available in `lib/db.ts`). The upsert conflict target is `(student_guid, course_prefix, course_number, academic_term)` — you'll need to add a unique constraint migration (Task 7) or use a simpler strategy.

Actually, since the existing load script uses TRUNCATE (not upsert), and there's no unique index on `course_enrollments`, we'll use the same approach: truncate + re-insert. This is idempotent and matches the existing pattern.

**Column mapping** from CSV header names → DB column names (matches the existing load script at `scripts/load-course-enrollments.ts`):

| CSV header | DB column |
|---|---|
| Student_GUID | student_guid |
| Cohort | cohort |
| Cohort_Term | cohort_term |
| Academic_Year | academic_year |
| Academic_Term | academic_term |
| Course_Prefix | course_prefix |
| Course_Number | course_number |
| Course_Name | course_name |
| Course_CIP | course_cip |
| Course_Type | course_type |
| Math_or_English_Gateway | gateway_type |
| Co_requisite_Course | is_co_requisite (Y/N → boolean) |
| Core_Course | is_core_course (Y/N → boolean) |
| Core_Course_Type | core_course_type |
| Delivery_Method | delivery_method |
| Grade | grade |
| Number_of_Credits_Attempted | credits_attempted |
| Number_of_Credits_Earned | credits_earned |
| Course_Instructor_Employment_Status | instructor_status |

**Step 1: Create the commit route file (course enrollment path only)**

Create `codebenders-dashboard/app/api/admin/upload/commit/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse"
import { Readable } from "stream"
import { getPool } from "@/lib/db"

const BATCH_SIZE = 500

function toBoolean(val: string): boolean | null {
  if (val === "Y") return true
  if (val === "N") return false
  return null
}

function toNumeric(val: string): number | null {
  const t = val.trim()
  if (!t || t === "null" || t === "NULL") return null
  const n = parseFloat(t)
  return isNaN(n) ? null : n
}

function toNullable(val: string): string | null {
  const t = val.trim()
  return t === "" ? null : t
}

interface EnrollmentRow {
  student_guid: string
  cohort: string | null
  cohort_term: string | null
  academic_year: string | null
  academic_term: string | null
  course_prefix: string | null
  course_number: string | null
  course_name: string | null
  course_cip: string | null
  course_type: string | null
  gateway_type: string | null
  is_co_requisite: boolean | null
  is_core_course: boolean | null
  core_course_type: string | null
  delivery_method: string | null
  grade: string | null
  credits_attempted: number | null
  credits_earned: number | null
  instructor_status: string | null
}

const COLS = [
  "student_guid", "cohort", "cohort_term", "academic_year", "academic_term",
  "course_prefix", "course_number", "course_name", "course_cip", "course_type",
  "gateway_type", "is_co_requisite", "is_core_course", "core_course_type",
  "delivery_method", "grade", "credits_attempted", "credits_earned", "instructor_status",
] as const

async function insertBatch(client: import("pg").PoolClient, batch: EnrollmentRow[]): Promise<void> {
  if (batch.length === 0) return
  const placeholders: string[] = []
  const params: unknown[] = []
  batch.forEach((row, ri) => {
    const p = COLS.map((_, ci) => `$${ri * COLS.length + ci + 1}`).join(", ")
    placeholders.push(`(${p})`)
    COLS.forEach(col => params.push(row[col]))
  })
  await client.query(
    `INSERT INTO public.course_enrollments (${COLS.join(", ")}) VALUES ${placeholders.join(", ")}`,
    params
  )
}

async function processCourseEnrollment(buffer: Buffer): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const pool = getPool()
  const client = await pool.connect()
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  try {
    await client.query("BEGIN")
    await client.query("TRUNCATE TABLE public.course_enrollments RESTART IDENTITY")

    const parser = Readable.from(buffer).pipe(
      parse({ columns: true, skip_empty_lines: true })
    )

    let batch: EnrollmentRow[] = []

    for await (const record of parser) {
      const r = record as Record<string, string>
      const student_guid = toNullable(r["Student_GUID"] ?? "")
      if (!student_guid) {
        skipped++
        continue
      }
      batch.push({
        student_guid,
        cohort:            toNullable(r["Cohort"] ?? ""),
        cohort_term:       toNullable(r["Cohort_Term"] ?? ""),
        academic_year:     toNullable(r["Academic_Year"] ?? ""),
        academic_term:     toNullable(r["Academic_Term"] ?? ""),
        course_prefix:     toNullable(r["Course_Prefix"] ?? ""),
        course_number:     toNullable(r["Course_Number"] ?? ""),
        course_name:       toNullable(r["Course_Name"] ?? ""),
        course_cip:        toNullable(r["Course_CIP"] ?? ""),
        course_type:       toNullable(r["Course_Type"] ?? ""),
        gateway_type:      toNullable(r["Math_or_English_Gateway"] ?? ""),
        is_co_requisite:   toBoolean(r["Co_requisite_Course"] ?? ""),
        is_core_course:    toBoolean(r["Core_Course"] ?? ""),
        core_course_type:  toNullable(r["Core_Course_Type"] ?? ""),
        delivery_method:   toNullable(r["Delivery_Method"] ?? ""),
        grade:             toNullable(r["Grade"] ?? ""),
        credits_attempted: toNumeric(r["Number_of_Credits_Attempted"] ?? ""),
        credits_earned:    toNumeric(r["Number_of_Credits_Earned"] ?? ""),
        instructor_status: toNullable(r["Course_Instructor_Employment_Status"] ?? ""),
      })
      inserted++
      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch)
        batch = []
      }
    }

    if (batch.length > 0) await insertBatch(client, batch)
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    errors.push(err instanceof Error ? err.message : String(err))
    inserted = 0
  } finally {
    client.release()
  }

  return { inserted, skipped, errors }
}

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role")
  if (role !== "admin" && role !== "ir") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const fileType = formData.get("fileType") as string | null

  if (!file || !fileType) {
    return NextResponse.json({ error: "Missing file or fileType" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (fileType === "course_enrollment") {
    const result = await processCourseEnrollment(buffer)
    return NextResponse.json(result)
  }

  // PDP/AR path — placeholder, implemented in Task 6
  return NextResponse.json({ error: `fileType "${fileType}" not yet implemented` }, { status: 501 })
}
```

**Step 2: Type-check**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Smoke-test with curl** (while `npm run dev` is running)

```bash
curl -s -X POST http://localhost:3000/api/admin/upload/commit \
  -H "x-user-role: admin" \
  -F "fileType=course_enrollment" \
  -F "file=@../data/bishop_state_courses.csv" | jq .
```

Expected: `{"inserted": <N>, "skipped": 0, "errors": []}`

**Step 4: Commit**

```bash
git add codebenders-dashboard/app/api/admin/upload/commit/route.ts
git commit -m "feat: add POST /api/admin/upload/commit — course enrollment upsert path"
```

---

## Task 6: Extend commit route — PDP/AR path (Supabase Storage + GitHub dispatch)

**Files:**
- Modify: `codebenders-dashboard/app/api/admin/upload/commit/route.ts`

**Background:** For `pdp_cohort` and `pdp_ar` file types, the commit route:
1. Creates a Supabase service-role client (uses `SUPABASE_SERVICE_ROLE_KEY`)
2. Uploads the file to the `pdp-uploads` Storage bucket with path `<fileType>/<timestamp>-<filename>`
3. Calls the GitHub `repository_dispatch` API with `GITHUB_PAT` and `GITHUB_REPO` env vars
4. Returns `{ status: "processing", storageKey, actionsUrl }`

**Before this task:** Create the `pdp-uploads` bucket in your Supabase dashboard:
- Supabase → Storage → New bucket → name: `pdp-uploads` → Private

**Step 1: Add the PDP/AR handler to the commit route**

In `codebenders-dashboard/app/api/admin/upload/commit/route.ts`, add these imports at the top:

```typescript
import { createClient } from "@supabase/supabase-js"
```

Add this function before the `POST` handler:

```typescript
async function processPdpFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): Promise<{ status: string; storageKey: string; actionsUrl: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const githubPat   = process.env.GITHUB_PAT
  const githubRepo  = process.env.GITHUB_REPO

  if (!supabaseUrl || !serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  if (!githubPat || !githubRepo)  throw new Error("Missing GITHUB_PAT or GITHUB_REPO")

  // 1. Upload to Supabase Storage
  const supabase   = createClient(supabaseUrl, serviceKey)
  const storageKey = `${fileType}/${Date.now()}-${fileName}`
  const { error: uploadError } = await supabase.storage
    .from("pdp-uploads")
    .upload(storageKey, buffer, { contentType: "application/octet-stream", upsert: false })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // 2. Trigger GitHub Actions via repository_dispatch
  const dispatchRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "ml-pipeline",
        client_payload: { storage_key: storageKey, file_type: fileType },
      }),
    }
  )

  if (!dispatchRes.ok) {
    const body = await dispatchRes.text()
    throw new Error(`GitHub dispatch failed (${dispatchRes.status}): ${body}`)
  }

  const actionsUrl = `https://github.com/${githubRepo}/actions`
  return { status: "processing", storageKey, actionsUrl }
}
```

Replace the placeholder in the `POST` handler at the bottom:

```typescript
  if (fileType === "pdp_cohort" || fileType === "pdp_ar") {
    try {
      const result = await processPdpFile(buffer, file.name, fileType)
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ error: `Unknown fileType: ${fileType}` }, { status: 400 })
```

**Step 2: Type-check**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add codebenders-dashboard/app/api/admin/upload/commit/route.ts
git commit -m "feat: extend commit route with PDP/AR → Supabase Storage + GitHub Actions dispatch"
```

---

## Task 7: Create GitHub Actions ML pipeline workflow

**Files:**
- Create: `.github/workflows/ml-pipeline.yml`

**Background:** This workflow fires on `repository_dispatch` with `event_type: ml-pipeline`. It:
1. Downloads the uploaded file from Supabase Storage using a signed URL
2. Determines the target data file path from `file_type` in the payload
3. Replaces the appropriate file in `data/` with the uploaded one
4. Runs the Python ML pipeline
5. Uploads `ML_PIPELINE_REPORT.txt` as an artifact

**Required GitHub Actions secrets** (set at repo level: Settings → Secrets → Actions):
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for Storage access
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_NAME`, `DB_SSL` — Postgres credentials

**Step 1: Create the workflow file**

Create `.github/workflows/ml-pipeline.yml`:

```yaml
name: ML Pipeline

on:
  repository_dispatch:
    types: [ml-pipeline]

jobs:
  run-pipeline:
    name: Download data file and run ML pipeline
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Create virtualenv and install dependencies
        run: |
          python -m venv venv
          venv/bin/pip install --upgrade pip
          venv/bin/pip install -r requirements.txt

      - name: Download uploaded file from Supabase Storage
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          STORAGE_KEY: ${{ github.event.client_payload.storage_key }}
          FILE_TYPE: ${{ github.event.client_payload.file_type }}
        run: |
          python - <<'EOF'
          import os, urllib.request, json

          url      = os.environ["SUPABASE_URL"]
          key      = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
          storage_key = os.environ["STORAGE_KEY"]
          file_type   = os.environ["FILE_TYPE"]

          # Get a signed download URL via Supabase Storage REST API
          sign_url = f"{url}/storage/v1/object/sign/pdp-uploads/{storage_key}"
          req = urllib.request.Request(
              sign_url,
              data=json.dumps({"expiresIn": 600}).encode(),
              headers={
                  "Authorization": f"Bearer {key}",
                  "Content-Type": "application/json",
                  "apikey": key,
              },
              method="POST",
          )
          with urllib.request.urlopen(req) as resp:
              signed = json.loads(resp.read())
          signed_url = f"{url}/storage/v1{signed['signedURL']}"

          # Determine destination path
          dest = {
              "pdp_cohort": "data/bishop_state_cohorts_with_zip.csv",
              "pdp_ar":     "data/ar_bscc_with_zip.csv",
          }.get(file_type)
          if not dest:
              raise ValueError(f"Unknown file_type: {file_type}")

          print(f"Downloading to {dest}...")
          urllib.request.urlretrieve(signed_url, dest)
          print("Download complete.")
          EOF

      - name: Run ML pipeline
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_NAME: ${{ secrets.DB_NAME }}
          DB_SSL: ${{ secrets.DB_SSL }}
        run: |
          venv/bin/python ai_model/complete_ml_pipeline.py

      - name: Upload ML pipeline report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ml-pipeline-report-${{ github.run_id }}
          path: ML_PIPELINE_REPORT.txt
          retention-days: 90
```

**Step 2: Commit**

```bash
git add .github/workflows/ml-pipeline.yml
git commit -m "feat: add GitHub Actions ML pipeline workflow triggered by repository_dispatch"
```

---

## Task 8: Create the upload page UI

**Files:**
- Create: `codebenders-dashboard/app/admin/upload/page.tsx`

**Background:** This is a client component (`"use client"`) with three local state phases: `idle` (file selection), `preview` (showing sample rows + warnings), and `result` (showing outcome). It uses `fetch` to call the two API routes. Drag-and-drop is implemented with native HTML5 `onDrop` / `onDragOver` events.

**Step 1: Create the page file**

Create `codebenders-dashboard/app/admin/upload/page.tsx`:

```tsx
"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

type FileType = "course_enrollment" | "pdp_cohort" | "pdp_ar"
type Phase = "idle" | "previewing" | "preview" | "committing" | "result"

interface PreviewData {
  columns: string[]
  sampleRows: Record<string, string>[]
  rowCount: number
  warnings: string[]
}

interface CommitResult {
  // Course enrollment
  inserted?: number
  skipped?: number
  errors?: string[]
  // PDP/AR
  status?: string
  storageKey?: string
  actionsUrl?: string
  error?: string
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  course_enrollment: "Course Enrollment CSV",
  pdp_cohort:        "PDP Cohort CSV",
  pdp_ar:            "PDP AR File (.xlsx)",
}

const FILE_TYPE_ACCEPT: Record<FileType, string> = {
  course_enrollment: ".csv",
  pdp_cohort:        ".csv",
  pdp_ar:            ".csv,.xlsx",
}

export default function UploadPage() {
  const [fileType, setFileType]     = useState<FileType>("course_enrollment")
  const [file, setFile]             = useState<File | null>(null)
  const [phase, setPhase]           = useState<Phase>("idle")
  const [preview, setPreview]       = useState<PreviewData | null>(null)
  const [result, setResult]         = useState<CommitResult | null>(null)
  const [dragOver, setDragOver]     = useState(false)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setErrorMsg(null)
    setPhase("idle")
    setPreview(null)
    setResult(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handlePreview = async () => {
    if (!file) return
    setPhase("previewing")
    setErrorMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("fileType", fileType)
    try {
      const res = await fetch("/api/admin/upload/preview", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? "Preview failed"); setPhase("idle"); return }
      setPreview(data as PreviewData)
      setPhase("preview")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error")
      setPhase("idle")
    }
  }

  const handleCommit = async () => {
    if (!file) return
    setPhase("committing")
    setErrorMsg(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("fileType", fileType)
    try {
      const res = await fetch("/api/admin/upload/commit", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? "Upload failed"); setPhase("preview"); return }
      setResult(data as CommitResult)
      setPhase("result")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error")
      setPhase("preview")
    }
  }

  const reset = () => {
    setFile(null)
    setPhase("idle")
    setPreview(null)
    setResult(null)
    setErrorMsg(null)
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Upload Data</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Import course enrollment CSVs or PDP/AR files. Admin and IR only.
        </p>
      </div>

      {/* ── Phase: idle / selecting ── */}
      {(phase === "idle" || phase === "previewing") && (
        <Card>
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>Choose a file type, then drop or pick your file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File type selector */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(ft => (
                <button
                  key={ft}
                  onClick={() => { setFileType(ft); setFile(null); setErrorMsg(null) }}
                  className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                    fileType === ft
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                  }`}
                >
                  {FILE_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <label
              htmlFor="file-input"
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Accepts: {FILE_TYPE_ACCEPT[fileType]}</p>
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept={FILE_TYPE_ACCEPT[fileType]}
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <Button onClick={handlePreview} disabled={!file || phase === "previewing"} className="w-full">
              {phase === "previewing" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : "Preview"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Phase: preview ── */}
      {(phase === "preview" || phase === "committing") && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview — {FILE_TYPE_LABELS[fileType]}</CardTitle>
            <CardDescription>
              {file?.name} · {preview.rowCount} rows parsed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-md border border-border overflow-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.slice(0, 8).map(col => (
                      <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                    ))}
                    {preview.columns.length > 8 && <TableHead className="text-xs text-muted-foreground">+{preview.columns.length - 8} more</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleRows.map((row, i) => (
                    <TableRow key={i}>
                      {preview.columns.slice(0, 8).map(col => (
                        <TableCell key={col} className="text-xs max-w-32 truncate">{String(row[col] ?? "")}</TableCell>
                      ))}
                      {preview.columns.length > 8 && <TableCell />}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} disabled={phase === "committing"}>Back</Button>
              <Button
                onClick={handleCommit}
                disabled={phase === "committing" || preview.warnings.some(w => w.startsWith("Missing required"))}
                className="flex-1"
              >
                {phase === "committing" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : "Confirm & Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Phase: result ── */}
      {phase === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Upload Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.inserted !== undefined && (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">{result.inserted.toLocaleString()}</span> rows inserted</p>
                {(result.skipped ?? 0) > 0 && <p className="text-muted-foreground">{result.skipped} rows skipped (missing Student_GUID)</p>}
                {result.errors && result.errors.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive">
                    {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
            {result.status === "processing" && (
              <div className="space-y-2 text-sm">
                <p>File saved to Supabase Storage. The ML pipeline has been queued in GitHub Actions.</p>
                {result.actionsUrl && (
                  <a
                    href={result.actionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View pipeline run on GitHub Actions →
                  </a>
                )}
              </div>
            )}
            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                {result.error}
              </div>
            )}
            <Button variant="outline" onClick={reset} className="w-full">Upload another file</Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
```

**Step 2: Type-check**

```bash
cd codebenders-dashboard && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Visual check** (while `npm run dev` is running)

- Log in as an admin or IR user
- Navigate to `/admin/upload`
- Verify "Upload Data" appears in the nav
- Try dragging and dropping `data/bishop_state_courses.csv`
- Verify the preview table shows first 10 rows
- Verify "Confirm & Upload" runs and returns a result

**Step 4: Commit**

```bash
git add codebenders-dashboard/app/admin/upload/page.tsx
git commit -m "feat: add /admin/upload page with drag-drop, preview, and commit UI"
```

---

## Task 9: Final type-check, lint, and push

**Step 1: Full type-check + lint**

```bash
cd codebenders-dashboard && npx tsc --noEmit && npm run lint
```

Expected: 0 errors, 0 warnings (or only pre-existing warnings).

**Step 2: Push and open PR**

```bash
git push origin <your-feature-branch>
gh pr create \
  --title "feat: self-service data upload for course and PDP/AR files (#86)" \
  --body "Closes #86

## Summary
- \`/admin/upload\` page (admin/ir only) with drag-drop, preview, and commit
- Course enrollment CSVs stream-parsed and batch-upserted into \`course_enrollments\` Postgres table
- PDP cohort CSVs and AR .xlsx files uploaded to Supabase Storage \`pdp-uploads\` bucket
- GitHub Actions workflow \`ml-pipeline.yml\` triggered via \`repository_dispatch\` after PDP/AR upload

## New env vars required (see env.example)
- \`SUPABASE_SERVICE_ROLE_KEY\`
- \`GITHUB_PAT\`
- \`GITHUB_REPO\`

## GitHub Actions secrets required
- \`SUPABASE_URL\`, \`SUPABASE_SERVICE_ROLE_KEY\`, \`DB_HOST\`, \`DB_USER\`, \`DB_PASSWORD\`, \`DB_PORT\`, \`DB_NAME\`, \`DB_SSL\`

## Test plan
- [ ] Admin/IR can access \`/admin/upload\`; other roles get redirected
- [ ] Upload Data nav link visible to admin/IR only
- [ ] Course enrollment CSV preview shows first 10 rows with correct columns
- [ ] Course enrollment commit inserts rows into \`course_enrollments\` table
- [ ] PDP cohort CSV commit uploads to Supabase Storage and returns \`status: processing\`
- [ ] \`npx tsc --noEmit\` passes with 0 errors
"
```
