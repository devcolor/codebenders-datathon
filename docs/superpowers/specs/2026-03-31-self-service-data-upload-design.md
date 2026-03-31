# Self-Service Data Upload — Design Spec

**Issue:** #86
**Date:** 2026-03-31
**Status:** Draft

## Overview

Allow admin and IR users to upload institutional data files (PDP cohort, AR, course enrollment, ML predictions) directly from the dashboard. The system auto-detects file type and schema from headers, previews data with column mapping, and batch-upserts into Postgres.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Sub-route approach: `/admin/upload` + `/admin/upload/history` | Matches existing app structure, clean separation, room for future admin pages |
| File type selection | Auto-detect from headers (no manual type selector step) | Reduces friction; schemas are distinct enough for reliable detection |
| Column mapping | Hybrid — auto-match known schemas, dropdown remapper for unknowns | Covers AR + Submission format variations without forcing strict formatting |
| File parsing | In-memory, 50 MB hard cap | Real-world files are a few MB (4K students, 100K courses); streaming is over-engineered |
| Upload history | `upload_history` table in Supabase cloud | Same DB as auth and data; `user_id` + `user_email` stored, no FK to `auth.users` |
| New packages | `papaparse` (CSV), `xlsx` (Excel) | Popular, well-maintained, cover both file formats |

## Supported File Types

| File Type | Format | Target Table | Key Identifier |
|-----------|--------|--------------|----------------|
| PDP Cohort AR | CSV/XLSX | `student_level_with_predictions` | `student_guid` |
| PDP Cohort Submission | CSV | `student_level_with_predictions` | `student_id` (inserted as `student_guid` — institution's ID becomes the de-identified key) |
| Course Enrollment AR | CSV/XLSX | `course_enrollments` | `student_guid` + `course_prefix` + `course_number` + `term` |
| Course Enrollment Submission | CSV | `course_enrollments` | `student_id` + `course_prefix` + `course_number` + `term` |
| ML Predictions | CSV | `student_level_with_predictions` / `course_predictions` | `student_guid` + `prediction_type` |

## PDP File Formats Reference

Based on the NSC PDP Data File Submission Guide v2.3.

### PDP Cohort Submission (v2.0) — 43 columns

Institutions submit this to NSC. Key columns: `Cohort`, `Cohort Term`, `SSN` (conditional), `Student ID`, `First Name`, `Last Name`, `Date of Birth`, `Ethnicity`, `Race`, `Enrollment Type` (F/R/T), `Math Placement` (C/N/UK), `English Placement` (C/N/UK), `Gateway Math Status` (R/N/UK), `Gateway English Status` (R/N/UK), `Gender` (M/F/P/X/UK).

Values use single-character codes (e.g., `F` = First-time, `T` = Transfer).

### PDP Cohort AR File — ~90 columns

NSC returns this after processing. Contains all submitted fields plus calculated outcomes: `Retention` (0/1), `Persistence` (0/1), `GPA_Group_Year_1`, credits attempted/earned by year, gateway completion status, credential/transfer fields (`Years_to_Bachelors_Cohort`, etc.).

Column names use underscored format (`Enrollment_Type`, `Cohort_Term`). Values are spelled out (`"First-Time"`, `"Transfer-In"` instead of `F`, `T`).

### PDP Course Submission (v2.0) — 60 columns

One row per course enrollment per student. Key columns: `Course Prefix`, `Course Number`, `Section ID`, `Course Name`, `Course CIP`, `Course Type`, `Grade`, `Number of Credits Attempted`, `Number of Credits Earned`, `Delivery Method`, `Pell Recipient`, `Degree Type Sought`, `Semester/Session GPA`, `Overall GPA`.

### PDP Course AR File — ~39 columns (de-identified)

NSC returns this. Uses `Student_GUID` instead of PII. Column names underscored. Subset of submission fields plus joined cohort info.

### Value Translation (Submission → AR)

| Field | Submission | AR / Project |
|-------|-----------|--------------|
| Enrollment Type | `F`, `R`, `T` | `First-Time`, `Re-admit`, `Transfer-In` |
| Race | `W`, `B`, `AN`, etc. | `White`, `Black or African American`, etc. |
| Math/English Placement | `C`, `N`, `UK` | `C`, `R`, `N` (project uses `R` for remedial) |
| Credential Type | `C1`, `A`, `B`, etc. | `01`, `A`, `B` |

## Schema Detection

### Algorithm

1. Parse first 50 rows of the uploaded file
2. Normalize all headers: trim whitespace, lowercase, replace spaces/hyphens with underscores
3. For each known schema, count how many required + optional columns match (exact name or alias)
4. Score = matched / total_schema_columns
5. Best match above 60% threshold → auto-select with green banner
6. Best match below 60% → amber warning, user picks from ranked options
7. No match above 30% → treat as Custom CSV, full manual mapping

### Schema Registry (`lib/upload-schemas.ts`)

Each schema entry:

```typescript
interface UploadSchema {
  id: string                    // e.g. "pdp_cohort_ar"
  label: string                 // e.g. "PDP Cohort AR File"
  targetTable: string           // e.g. "student_level_with_predictions"
  upsertKey: string[]           // e.g. ["student_guid"]
  columns: SchemaColumn[]
}

interface SchemaColumn {
  name: string                  // canonical DB column name
  aliases: string[]             // alternate header names to match
  type: "text" | "numeric" | "date" | "enum"
  required: boolean
  validValues?: string[]        // for enum types
  transform?: (value: string) => string  // e.g. "F" → "First-Time"
}
```

## UI Flow

### 3-Step Wizard

**Step 1 — Upload**
- Page: `/admin/upload`
- Drag-and-drop zone accepting `.csv` and `.xlsx`, 50 MB max
- Recent uploads shown inline (last 5 from `upload_history`)
- On file drop: POST to `/api/admin/upload/preview`

**Step 2 — Preview & Map**
- Same page, wizard advances in-place (client-side state, no navigation)
- Auto-detection banner:
  - Green (≥60% confidence): "Detected: PDP Cohort AR File — 82/90 columns matched" with "Wrong? Change type" escape hatch
  - Amber (<60%): "Couldn't confidently detect type" with ranked clickable options
- Column mapping table:
  - Matched columns collapsed by default ("+N more matched columns")
  - Unmapped columns shown expanded with dropdown to select target column or "skip"
- Data preview table: first 10 rows, horizontally scrollable
- Validation summary bar: row count, matched columns, unmapped columns, errors
- "Upload N Rows →" button (disabled if required columns missing)

**Step 3 — Confirm**
- POST to `/api/admin/upload/commit` with file + column mapping
- Progress state while uploading
- Completion card: inserted / skipped / error counts
- Buttons: "Upload Another File" (reset wizard) | "View Upload History" (navigate)

### Upload History Page

- Page: `/admin/upload/history`
- Summary stat cards: total uploads, successful, partial, failed
- Paginated table: filename, type badge, inserted/skipped/errors, status pill, uploader email, date
- "+ New Upload" button in header

## API Routes

### `POST /api/admin/upload/preview`

**Request:** multipart form data with `file` field

**Response:**
```json
{
  "detectedSchema": "pdp_cohort_ar",
  "confidence": 0.85,
  "columns": [
    { "header": "Cohort_Term", "mappedTo": "cohort_term", "status": "matched" },
    { "header": "Custom_Field", "mappedTo": null, "status": "unmapped" }
  ],
  "sampleRows": [{ "Cohort_Term": "Fall", "Student_GUID": "BSCC_STU00001" }],
  "totalRows": 500,
  "warnings": ["Missing optional column: Middle_Name"],
  "errors": ["Missing required column: Student_GUID"]
}
```

### `POST /api/admin/upload/commit`

**Request:** multipart form data with `file` field + `columnMapping` JSON field + `schemaId` field

**Processing:**
1. Parse full file in memory
2. Apply column mapping (rename headers per user selections)
3. Apply value transformations (coded → spelled-out for submission files)
4. Validate each row against schema
5. Batch upsert in chunks of 500 rows
6. Write `upload_history` record

**Response:**
```json
{
  "inserted": 487,
  "skipped": 13,
  "errors": [{ "row": 42, "column": "GPA_Group_Year_1", "message": "Invalid value: 'X'" }],
  "uploadId": 17
}
```

**Upsert strategy:** `INSERT ... ON CONFLICT (upsert_key) DO UPDATE SET ...`

### `GET /api/admin/upload/history`

**Query params:** `page` (default 1), `pageSize` (default 20)

**Response:**
```json
{
  "data": [
    {
      "id": 17,
      "filename": "cohort_fall_2024.csv",
      "fileType": "pdp_cohort_ar",
      "rowsInserted": 487,
      "rowsSkipped": 13,
      "errorCount": 0,
      "status": "success",
      "userEmail": "admin@bscc.edu",
      "uploadedAt": "2026-03-28T14:30:00Z"
    }
  ],
  "total": 23
}
```

## Auth & Routing

Add to `ROUTE_PERMISSIONS` in `lib/roles.ts`:

```typescript
{ prefix: "/admin",     roles: ["admin", "ir"] },
{ prefix: "/api/admin", roles: ["admin", "ir"] },
```

API routes extract `x-user-id` and `x-user-email` from middleware-set headers. No additional auth logic needed.

## Database Migration

```sql
CREATE TABLE public.upload_history (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL,
  user_email    TEXT NOT NULL,
  filename      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  rows_inserted INT DEFAULT 0,
  rows_skipped  INT DEFAULT 0,
  error_count   INT DEFAULT 0,
  status        TEXT CHECK (status IN ('success', 'partial', 'failed')) NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_upload_history_uploaded_at ON public.upload_history (uploaded_at DESC);
```

No FK to `auth.users` — cross-schema FKs to Supabase's `auth` schema are fragile.

## Test Data Generation

Python script `operations/generate_test_data.py` producing synthetic but realistic files:

| Output File | Format | Rows | Description |
|-------------|--------|------|-------------|
| `test_pdp_cohort_ar.csv` | PDP AR | 500 | 90 columns, Bishop State demographics, underscored headers, spelled-out values |
| `test_pdp_cohort_submission.csv` | PDP Submission | 500 | 35 columns, spaced headers, coded values (F/T/R) |
| `test_course_ar.csv` | Course AR | 5,000 | 39 columns, de-identified with Student_GUID |
| `test_course_submission.csv` | Course Submission | 5,000 | 56 columns, spaced headers |
| `test_ml_predictions.csv` | Internal | 500 | student_guid, prediction_type, prediction_value |
| `test_oversized.csv` | Any | ~60MB | For 50 MB rejection testing |
| `test_bad_headers.csv` | Malformed | 100 | Random columns, tests low-confidence detection |
| `test_mixed_casing.csv` | PDP AR | 200 | Headers like `STUDENT_GUID`, `cohort_term`, `Enrollment_Type` |

Uses Bishop State's OPEID, Alabama zip codes, realistic GPA distributions, and proper PDP enumerated values.

## New Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| `papaparse` | CSV parsing (browser + Node) | `npm install papaparse @types/papaparse` |
| `xlsx` | Excel (.xlsx) parsing | `npm install xlsx` |

## File Structure

```
codebenders-dashboard/
├── app/
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout (shared header/nav)
│   │   └── upload/
│   │       ├── page.tsx            # Upload wizard (3-step)
│   │       └── history/
│   │           └── page.tsx        # Upload history table
│   └── api/
│       └── admin/
│           └── upload/
│               ├── preview/
│               │   └── route.ts    # POST: parse & detect schema
│               ├── commit/
│               │   └── route.ts    # POST: validate & upsert
│               └── history/
│                   └── route.ts    # GET: paginated upload log
├── components/
│   └── upload/
│       ├── drop-zone.tsx           # Drag-and-drop file input
│       ├── column-mapper.tsx       # Column mapping table
│       ├── data-preview.tsx        # Sample rows table
│       └── upload-summary.tsx      # Completion card
├── lib/
│   ├── upload-schemas.ts           # Schema registry + detection logic
│   └── upload-parser.ts            # CSV/XLSX parsing utilities
operations/
└── generate_test_data.py           # Test data generator
```

## Acceptance Criteria (from issue #86)

- [ ] Admin/IR users can reach `/admin/upload` (leadership/advisor/faculty get 403)
- [ ] CSV and Excel uploads both work for all supported file types
- [ ] Preview step shows first 10 rows before committing
- [ ] Column mapping is auto-detected for known PDP/AR schemas
- [ ] Upload is idempotent — re-uploading the same file doesn't duplicate rows
- [ ] Files > 50 MB are rejected with a clear error message
- [ ] Upload history log persisted and visible in the UI
- [ ] Progress feedback shown during large file ingestion
