# Self-Service Data Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin/IR users to upload PDP cohort, course enrollment, and ML prediction files via a 3-step wizard that auto-detects file type, previews data with column mapping, and batch-upserts into Postgres.

**Architecture:** 3-step client-side wizard (`Upload → Preview & Map → Confirm`) backed by three API routes (preview, commit, history). Schema detection in `lib/upload-schemas.ts` scores file headers against known PDP/AR column signatures. Pure-logic modules are unit-tested with Vitest.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, pg, papaparse, xlsx, Vitest

**Spec:** `docs/superpowers/specs/2026-03-31-self-service-data-upload-design.md`

**Worktree:** `.worktrees/feature-86-data-upload` (branch: `feature/86-self-service-data-upload`, based on `origin/main`)

**Working directory:** All `codebenders-dashboard/` paths are relative to the worktree root.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `codebenders-dashboard/lib/upload-schemas.ts` | Schema registry, header normalization, auto-detection scoring |
| `codebenders-dashboard/lib/upload-parser.ts` | CSV/XLSX parsing to uniform row arrays |
| `codebenders-dashboard/lib/__tests__/upload-schemas.test.ts` | Unit tests for schema detection |
| `codebenders-dashboard/lib/__tests__/upload-parser.test.ts` | Unit tests for file parsing |
| `codebenders-dashboard/vitest.config.ts` | Vitest configuration |
| `codebenders-dashboard/app/admin/layout.tsx` | Admin sub-layout (shared heading) |
| `codebenders-dashboard/app/admin/upload/page.tsx` | Upload wizard (3-step, client component) |
| `codebenders-dashboard/app/admin/upload/history/page.tsx` | Upload history table |
| `codebenders-dashboard/app/api/admin/upload/preview/route.ts` | POST: parse file, detect schema, return preview |
| `codebenders-dashboard/app/api/admin/upload/commit/route.ts` | POST: validate rows, batch upsert, log to history |
| `codebenders-dashboard/app/api/admin/upload/history/route.ts` | GET: paginated upload history |
| `codebenders-dashboard/components/upload/drop-zone.tsx` | Drag-and-drop file input |
| `codebenders-dashboard/components/upload/column-mapper.tsx` | Column mapping table with dropdowns |
| `codebenders-dashboard/components/upload/data-preview.tsx` | Sample rows table |
| `codebenders-dashboard/components/upload/upload-summary.tsx` | Completion card with row counts |
| `operations/generate_test_data.py` | Python script generating synthetic PDP/AR/course test files |

### Modified Files

| File | Change |
|------|--------|
| `codebenders-dashboard/lib/roles.ts:6-14` | Add `/admin` and `/api/admin` to `ROUTE_PERMISSIONS` |
| `codebenders-dashboard/components/nav-header.tsx:15-19` | Add "Admin" link to `NAV_LINKS` (conditionally shown for admin/ir) |
| `codebenders-dashboard/package.json` | Add `papaparse`, `@types/papaparse`, `xlsx`, `vitest` |

---

## Task 1: Install Dependencies & Configure Vitest

**Files:**
- Modify: `codebenders-dashboard/package.json`
- Create: `codebenders-dashboard/vitest.config.ts`

- [ ] **Step 1: Install npm packages**

```bash
cd codebenders-dashboard
npm install papaparse xlsx
npm install -D @types/papaparse vitest
```

- [ ] **Step 2: Create Vitest config**

Create `codebenders-dashboard/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
```

- [ ] **Step 3: Add test script to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

```bash
cd codebenders-dashboard
npx vitest run
```

Expected: "No test files found" or similar clean exit.

- [ ] **Step 5: Commit**

```bash
git add codebenders-dashboard/package.json codebenders-dashboard/package-lock.json codebenders-dashboard/vitest.config.ts
git commit -m "chore: add papaparse, xlsx, vitest dependencies for upload feature"
```

---

## Task 2: Schema Registry & Detection Logic

**Files:**
- Create: `codebenders-dashboard/lib/upload-schemas.ts`
- Create: `codebenders-dashboard/lib/__tests__/upload-schemas.test.ts`

- [ ] **Step 1: Write failing tests for header normalization and schema detection**

Create `codebenders-dashboard/lib/__tests__/upload-schemas.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  normalizeHeader,
  detectSchema,
  mapColumns,
  SCHEMAS,
} from "../upload-schemas"

describe("normalizeHeader", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(normalizeHeader("Cohort Term")).toBe("cohort_term")
  })

  it("trims whitespace", () => {
    expect(normalizeHeader("  Student_GUID  ")).toBe("student_guid")
  })

  it("replaces hyphens with underscores", () => {
    expect(normalizeHeader("Co-requisite Course")).toBe("co_requisite_course")
  })

  it("collapses multiple separators", () => {
    expect(normalizeHeader("Some   Weird--Header")).toBe("some_weird_header")
  })
})

describe("detectSchema", () => {
  it("detects PDP cohort AR file from its headers", () => {
    const headers = [
      "Student_GUID", "Cohort", "Cohort_Term", "Enrollment_Type",
      "Retention", "Persistence", "GPA_Group_Year_1",
      "Gateway_Math_Status", "Gateway_English_Status",
      "Number_of_Credits_Attempted_Year_1",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("pdp_cohort_ar")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects PDP cohort submission file from spaced headers", () => {
    const headers = [
      "Student ID", "Cohort", "Cohort Term", "First Name", "Last Name",
      "Date of Birth", "Enrollment Type", "Math Placement",
      "English Placement", "Gateway Math Status",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("pdp_cohort_submission")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects course AR file", () => {
    const headers = [
      "Student_GUID", "Course_Prefix", "Course_Number", "Grade",
      "Academic_Year", "Academic_Term", "Course_Name",
      "Number_of_Credits_Attempted", "Number_of_Credits_Earned",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("course_ar")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects course submission file", () => {
    const headers = [
      "Student ID", "Course Prefix", "Course Number", "Grade",
      "Course Name", "Course CIP", "Section ID",
      "Semester/Session GPA", "Overall GPA",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("course_submission")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("detects ML predictions file", () => {
    const headers = [
      "student_guid", "prediction_type", "prediction_value",
      "model_version", "confidence_score",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("ml_predictions")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("returns null schema with low confidence for unknown headers", () => {
    const headers = ["foo", "bar", "baz", "qux"]
    const result = detectSchema(headers)
    expect(result.schema).toBeNull()
    expect(result.confidence).toBeLessThan(0.3)
  })

  it("handles mixed casing headers", () => {
    const headers = [
      "STUDENT_GUID", "cohort", "COHORT_TERM", "enrollment_type",
      "retention", "PERSISTENCE", "gpa_group_year_1",
    ]
    const result = detectSchema(headers)
    expect(result.schema?.id).toBe("pdp_cohort_ar")
  })
})

describe("mapColumns", () => {
  it("maps matched headers to canonical column names", () => {
    const headers = ["Student_GUID", "Cohort_Term", "Unknown_Col"]
    const schema = SCHEMAS.find((s) => s.id === "pdp_cohort_ar")!
    const result = mapColumns(headers, schema)

    const matched = result.filter((c) => c.status === "matched")
    const unmapped = result.filter((c) => c.status === "unmapped")

    expect(matched.length).toBe(2)
    expect(matched[0].mappedTo).toBe("student_guid")
    expect(unmapped.length).toBe(1)
    expect(unmapped[0].header).toBe("Unknown_Col")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd codebenders-dashboard
npx vitest run
```

Expected: FAIL — module `../upload-schemas` not found.

- [ ] **Step 3: Implement the schema registry**

Create `codebenders-dashboard/lib/upload-schemas.ts`:

```typescript
// ── Types ────────────────────────────────────────────────────────────────────

export interface SchemaColumn {
  name: string
  aliases: string[]
  type: "text" | "numeric" | "date" | "enum"
  required: boolean
  validValues?: string[]
  transform?: (value: string) => string
}

export interface UploadSchema {
  id: string
  label: string
  targetTable: string
  upsertKey: string[]
  columns: SchemaColumn[]
}

export interface DetectionResult {
  schema: UploadSchema | null
  confidence: number
  scores: Array<{ schemaId: string; label: string; score: number }>
}

export interface ColumnMapping {
  header: string
  mappedTo: string | null
  status: "matched" | "unmapped"
}

// ── Value Transforms ─────────────────────────────────────────────────────────

const ENROLLMENT_TYPE_MAP: Record<string, string> = {
  F: "First-Time",
  R: "Re-admit",
  T: "Transfer-In",
}

const RACE_MAP: Record<string, string> = {
  W: "White",
  B: "Black or African American",
  A: "Asian",
  AN: "American Indian or Alaska Native",
  IA: "American Indian or Alaska Native",
  HP: "Native Hawaiian or Other Pacific Islander",
  TM: "Two or More Races",
  UK: "Unknown",
}

const ETHNICITY_MAP: Record<string, string> = {
  H: "Hispanic",
  N: "Not Hispanic",
  UK: "Unknown",
}

const GENDER_MAP: Record<string, string> = {
  M: "Male",
  F: "Female",
  P: "Non-binary",
  X: "Other",
  UK: "Unknown",
}

function mapLookup(map: Record<string, string>) {
  return (value: string) => map[value.trim()] ?? value
}

// ── Schema Definitions ───────────────────────────────────────────────────────

export const SCHEMAS: UploadSchema[] = [
  {
    id: "pdp_cohort_ar",
    label: "PDP Cohort AR File",
    targetTable: "student_level_with_predictions",
    upsertKey: ["student_guid"],
    columns: [
      // Identity
      { name: "student_guid", aliases: ["student_guid", "student_id"], type: "text", required: true },
      { name: "institution_id", aliases: ["institution_id"], type: "text", required: false },
      { name: "cohort", aliases: ["cohort"], type: "text", required: true },
      { name: "cohort_term", aliases: ["cohort_term"], type: "enum", required: true, validValues: ["Fall", "Winter", "Spring", "Summer"] },
      // Demographics
      { name: "student_age", aliases: ["student_age"], type: "text", required: false },
      { name: "enrollment_type", aliases: ["enrollment_type"], type: "text", required: true },
      { name: "enrollment_intensity_first_term", aliases: ["enrollment_intensity_first_term"], type: "text", required: false },
      { name: "race", aliases: ["race"], type: "text", required: false },
      { name: "ethnicity", aliases: ["ethnicity"], type: "text", required: false },
      { name: "gender", aliases: ["gender"], type: "text", required: false },
      { name: "first_gen", aliases: ["first_gen"], type: "text", required: false },
      { name: "pell_status_first_year", aliases: ["pell_status_first_year"], type: "text", required: false },
      // Academic
      { name: "math_placement", aliases: ["math_placement"], type: "text", required: false },
      { name: "english_placement", aliases: ["english_placement"], type: "text", required: false },
      { name: "reading_placement", aliases: ["reading_placement"], type: "text", required: false },
      { name: "gateway_math_status", aliases: ["gateway_math_status"], type: "text", required: false },
      { name: "gateway_english_status", aliases: ["gateway_english_status"], type: "text", required: false },
      { name: "credential_type_sought_year_1", aliases: ["credential_type_sought_year_1"], type: "text", required: false },
      { name: "gpa_group_term_1", aliases: ["gpa_group_term_1"], type: "text", required: false },
      { name: "gpa_group_year_1", aliases: ["gpa_group_year_1"], type: "text", required: false },
      // Credits
      { name: "number_of_credits_attempted_year_1", aliases: ["number_of_credits_attempted_year_1"], type: "numeric", required: false },
      { name: "number_of_credits_earned_year_1", aliases: ["number_of_credits_earned_year_1"], type: "numeric", required: false },
      { name: "number_of_credits_attempted_year_2", aliases: ["number_of_credits_attempted_year_2"], type: "numeric", required: false },
      { name: "number_of_credits_earned_year_2", aliases: ["number_of_credits_earned_year_2"], type: "numeric", required: false },
      // Outcomes (AR-specific — these discriminate AR from submission)
      { name: "retention", aliases: ["retention"], type: "numeric", required: false },
      { name: "persistence", aliases: ["persistence"], type: "numeric", required: false },
      { name: "time_to_credential", aliases: ["time_to_credential"], type: "text", required: false },
      { name: "years_to_bachelors_at_cohort_inst_", aliases: ["years_to_bachelors_at_cohort_inst_"], type: "text", required: false },
      { name: "years_to_associates_or_certificate_at_cohort_inst_", aliases: ["years_to_associates_or_certificate_at_cohort_inst_"], type: "text", required: false },
      // Metadata
      { name: "school", aliases: ["school"], type: "text", required: false },
      { name: "dataset_type", aliases: ["dataset_type"], type: "text", required: false },
    ],
  },
  {
    id: "pdp_cohort_submission",
    label: "PDP Cohort Submission File",
    targetTable: "student_level_with_predictions",
    upsertKey: ["student_guid"],
    columns: [
      // PII fields — discriminate submission from AR
      { name: "student_guid", aliases: ["student_id", "student id"], type: "text", required: true },
      { name: "cohort", aliases: ["cohort"], type: "text", required: true },
      { name: "cohort_term", aliases: ["cohort_term", "cohort term"], type: "text", required: true },
      { name: "first_name", aliases: ["first_name", "first name"], type: "text", required: false },
      { name: "last_name", aliases: ["last_name", "last name"], type: "text", required: false },
      { name: "date_of_birth", aliases: ["date_of_birth", "date of birth"], type: "date", required: false },
      { name: "enrollment_type", aliases: ["enrollment_type", "enrollment type"], type: "text", required: true, transform: mapLookup(ENROLLMENT_TYPE_MAP) },
      { name: "race", aliases: ["race"], type: "text", required: false, transform: mapLookup(RACE_MAP) },
      { name: "ethnicity", aliases: ["ethnicity"], type: "text", required: false, transform: mapLookup(ETHNICITY_MAP) },
      { name: "gender", aliases: ["gender"], type: "text", required: false, transform: mapLookup(GENDER_MAP) },
      { name: "math_placement", aliases: ["math_placement", "math placement"], type: "text", required: false },
      { name: "english_placement", aliases: ["english_placement", "english placement"], type: "text", required: false },
      { name: "gateway_math_status", aliases: ["gateway_math_status", "gateway math status"], type: "text", required: false },
      { name: "gateway_english_status", aliases: ["gateway_english_status", "gateway english status"], type: "text", required: false },
      { name: "first_gen", aliases: ["first_gen", "first gen"], type: "text", required: false },
      { name: "dual_and_summer_enrollment", aliases: ["dual_and_summer_enrollment", "dual and summer enrollment"], type: "text", required: false },
    ],
  },
  {
    id: "course_ar",
    label: "Course Enrollment AR File",
    targetTable: "course_enrollments",
    upsertKey: ["student_guid", "course_prefix", "course_number", "academic_term", "academic_year"],
    columns: [
      { name: "student_guid", aliases: ["student_guid", "student_id"], type: "text", required: true },
      { name: "cohort", aliases: ["cohort"], type: "text", required: false },
      { name: "cohort_term", aliases: ["cohort_term"], type: "text", required: false },
      { name: "academic_year", aliases: ["academic_year"], type: "text", required: true },
      { name: "academic_term", aliases: ["academic_term"], type: "text", required: true },
      { name: "course_prefix", aliases: ["course_prefix"], type: "text", required: true },
      { name: "course_number", aliases: ["course_number"], type: "text", required: true },
      { name: "section_id", aliases: ["section_id"], type: "text", required: false },
      { name: "course_name", aliases: ["course_name"], type: "text", required: false },
      { name: "course_cip", aliases: ["course_cip"], type: "text", required: false },
      { name: "course_type", aliases: ["course_type"], type: "text", required: false },
      { name: "math_or_english_gateway", aliases: ["math_or_english_gateway"], type: "text", required: false },
      { name: "grade", aliases: ["grade"], type: "text", required: true },
      { name: "number_of_credits_attempted", aliases: ["number_of_credits_attempted"], type: "numeric", required: false },
      { name: "number_of_credits_earned", aliases: ["number_of_credits_earned"], type: "numeric", required: false },
      { name: "delivery_method", aliases: ["delivery_method"], type: "text", required: false },
      { name: "course_begin_date", aliases: ["course_begin_date"], type: "date", required: false },
      { name: "course_end_date", aliases: ["course_end_date"], type: "date", required: false },
      // Demographics (joined from cohort in AR files)
      { name: "student_age", aliases: ["student_age"], type: "text", required: false },
      { name: "race", aliases: ["race"], type: "text", required: false },
      { name: "ethnicity", aliases: ["ethnicity"], type: "text", required: false },
      { name: "gender", aliases: ["gender"], type: "text", required: false },
      { name: "institution_id", aliases: ["institution_id"], type: "text", required: false },
      { name: "school", aliases: ["school"], type: "text", required: false },
    ],
  },
  {
    id: "course_submission",
    label: "Course Enrollment Submission File",
    targetTable: "course_enrollments",
    upsertKey: ["student_guid", "course_prefix", "course_number", "academic_term", "academic_year"],
    columns: [
      { name: "student_guid", aliases: ["student_id", "student id"], type: "text", required: true },
      { name: "cohort", aliases: ["cohort"], type: "text", required: false },
      { name: "cohort_term", aliases: ["cohort_term", "cohort term"], type: "text", required: false },
      { name: "academic_year", aliases: ["academic_year", "academic year"], type: "text", required: true },
      { name: "academic_term", aliases: ["term", "academic_term", "academic term"], type: "text", required: true },
      { name: "course_prefix", aliases: ["course_prefix", "course prefix"], type: "text", required: true },
      { name: "course_number", aliases: ["course_number", "course number"], type: "text", required: true },
      { name: "section_id", aliases: ["section_id", "section id"], type: "text", required: false },
      { name: "course_name", aliases: ["course_name", "course name"], type: "text", required: false },
      { name: "course_cip", aliases: ["course_cip", "course cip"], type: "text", required: false },
      { name: "course_type", aliases: ["course_type", "course type"], type: "text", required: false },
      { name: "grade", aliases: ["grade"], type: "text", required: true },
      { name: "number_of_credits_attempted", aliases: ["number_of_credits_attempted", "number of credits attempted"], type: "numeric", required: false },
      { name: "number_of_credits_earned", aliases: ["number_of_credits_earned", "number of credits earned"], type: "numeric", required: false },
      // PII fields — discriminate submission from AR
      { name: "first_name", aliases: ["first_name", "first name"], type: "text", required: false },
      { name: "last_name", aliases: ["last_name", "last name"], type: "text", required: false },
      { name: "date_of_birth", aliases: ["date_of_birth", "date of birth"], type: "date", required: false },
      { name: "semester_session_gpa", aliases: ["semester_session_gpa", "semester/session gpa"], type: "numeric", required: false },
      { name: "overall_gpa", aliases: ["overall_gpa", "overall gpa"], type: "numeric", required: false },
    ],
  },
  {
    id: "ml_predictions",
    label: "ML Predictions",
    targetTable: "student_level_with_predictions",
    upsertKey: ["student_guid"],
    columns: [
      { name: "student_guid", aliases: ["student_guid", "student_id"], type: "text", required: true },
      { name: "prediction_type", aliases: ["prediction_type"], type: "text", required: true },
      { name: "prediction_value", aliases: ["prediction_value"], type: "text", required: true },
      { name: "model_version", aliases: ["model_version"], type: "text", required: false },
      { name: "confidence_score", aliases: ["confidence_score", "confidence"], type: "numeric", required: false },
    ],
  },
]

// ── Header Normalization ─────────────────────────────────────────────────────

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[/]/g, "_")
    .replace(/[\s\-]+/g, "_")
}

// ── Schema Detection ─────────────────────────────────────────────────────────

export function detectSchema(headers: string[]): DetectionResult {
  const normalized = headers.map(normalizeHeader)

  const scores = SCHEMAS.map((schema) => {
    const schemaNames = new Set(
      schema.columns.flatMap((col) => [col.name, ...col.aliases.map(normalizeHeader)])
    )
    const matched = normalized.filter((h) => schemaNames.has(h)).length
    const score = schema.columns.length > 0 ? matched / schema.columns.length : 0
    return { schemaId: schema.id, label: schema.label, score }
  })

  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]

  if (best.score >= 0.6) {
    return {
      schema: SCHEMAS.find((s) => s.id === best.schemaId)!,
      confidence: best.score,
      scores,
    }
  }

  if (best.score >= 0.3) {
    return { schema: SCHEMAS.find((s) => s.id === best.schemaId)!, confidence: best.score, scores }
  }

  return { schema: null, confidence: best.score, scores }
}

// ── Column Mapping ───────────────────────────────────────────────────────────

export function mapColumns(headers: string[], schema: UploadSchema): ColumnMapping[] {
  return headers.map((header) => {
    const norm = normalizeHeader(header)
    const col = schema.columns.find(
      (c) => c.name === norm || c.aliases.some((a) => normalizeHeader(a) === norm)
    )
    return col
      ? { header, mappedTo: col.name, status: "matched" as const }
      : { header, mappedTo: null, status: "unmapped" as const }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd codebenders-dashboard
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codebenders-dashboard/lib/upload-schemas.ts codebenders-dashboard/lib/__tests__/upload-schemas.test.ts
git commit -m "feat(upload): schema registry with auto-detection and column mapping"
```

---

## Task 3: File Parser Utility

**Files:**
- Create: `codebenders-dashboard/lib/upload-parser.ts`
- Create: `codebenders-dashboard/lib/__tests__/upload-parser.test.ts`

- [ ] **Step 1: Write failing tests for CSV parsing**

Create `codebenders-dashboard/lib/__tests__/upload-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { parseFileBuffer, validateFileSize, getFileType } from "../upload-parser"

describe("getFileType", () => {
  it("returns csv for .csv files", () => {
    expect(getFileType("data.csv")).toBe("csv")
  })

  it("returns xlsx for .xlsx files", () => {
    expect(getFileType("data.xlsx")).toBe("xlsx")
  })

  it("returns null for unsupported extensions", () => {
    expect(getFileType("data.pdf")).toBeNull()
    expect(getFileType("data.json")).toBeNull()
  })

  it("handles uppercase extensions", () => {
    expect(getFileType("DATA.CSV")).toBe("csv")
    expect(getFileType("DATA.XLSX")).toBe("xlsx")
  })
})

describe("validateFileSize", () => {
  it("returns true for files under 50MB", () => {
    expect(validateFileSize(1024 * 1024)).toBe(true) // 1MB
    expect(validateFileSize(50 * 1024 * 1024 - 1)).toBe(true) // just under 50MB
  })

  it("returns false for files at or over 50MB", () => {
    expect(validateFileSize(50 * 1024 * 1024)).toBe(false)
    expect(validateFileSize(100 * 1024 * 1024)).toBe(false)
  })
})

describe("parseFileBuffer", () => {
  it("parses CSV content into headers and rows", async () => {
    const csv = "Name,Age,City\nAlice,30,Mobile\nBob,25,Birmingham\n"
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv")

    expect(result.headers).toEqual(["Name", "Age", "City"])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ Name: "Alice", Age: "30", City: "Mobile" })
    expect(result.rows[1]).toEqual({ Name: "Bob", Age: "25", City: "Birmingham" })
  })

  it("handles CSV with quoted fields containing commas", async () => {
    const csv = 'Name,Description\nAlice,"Has, commas"\n'
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv")

    expect(result.rows[0].Description).toBe("Has, commas")
  })

  it("respects maxRows parameter", async () => {
    const csv = "X\na\nb\nc\nd\ne\n"
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv", 3)

    expect(result.rows).toHaveLength(3)
    expect(result.totalRows).toBe(5)
  })

  it("trims whitespace from headers", async () => {
    const csv = " Name , Age \nAlice,30\n"
    const buffer = Buffer.from(csv)
    const result = await parseFileBuffer(buffer, "csv")

    expect(result.headers).toEqual(["Name", "Age"])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd codebenders-dashboard
npx vitest run
```

Expected: FAIL — module `../upload-parser` not found.

- [ ] **Step 3: Implement the file parser**

Create `codebenders-dashboard/lib/upload-parser.ts`:

```typescript
import Papa from "papaparse"
import * as XLSX from "xlsx"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
}

export function getFileType(filename: string): "csv" | "xlsx" | null {
  const ext = filename.toLowerCase().split(".").pop()
  if (ext === "csv") return "csv"
  if (ext === "xlsx" || ext === "xls") return "xlsx"
  return null
}

export function validateFileSize(bytes: number): boolean {
  return bytes < MAX_FILE_SIZE
}

export async function parseFileBuffer(
  buffer: Buffer,
  fileType: "csv" | "xlsx",
  maxRows?: number
): Promise<ParseResult> {
  if (fileType === "xlsx") {
    return parseXlsx(buffer, maxRows)
  }
  return parseCsv(buffer, maxRows)
}

function parseCsv(buffer: Buffer, maxRows?: number): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const text = buffer.toString("utf-8")

    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    })

    if (result.errors.length > 0 && result.data.length === 0) {
      reject(new Error(`CSV parse error: ${result.errors[0].message}`))
      return
    }

    const headers = result.meta.fields ?? []
    const allRows = result.data
    const rows = maxRows ? allRows.slice(0, maxRows) : allRows

    resolve({ headers, rows, totalRows: allRows.length })
  })
}

function parseXlsx(buffer: Buffer, maxRows?: number): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        reject(new Error("Excel file has no sheets"))
        return
      }

      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      })

      if (jsonData.length === 0) {
        resolve({ headers: [], rows: [], totalRows: 0 })
        return
      }

      const headers = Object.keys(jsonData[0]).map((h) => h.trim())
      const rows = maxRows ? jsonData.slice(0, maxRows) : jsonData

      resolve({ headers, rows, totalRows: jsonData.length })
    } catch (err) {
      reject(new Error(`Excel parse error: ${(err as Error).message}`))
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd codebenders-dashboard
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add codebenders-dashboard/lib/upload-parser.ts codebenders-dashboard/lib/__tests__/upload-parser.test.ts
git commit -m "feat(upload): CSV and XLSX file parser with size validation"
```

---

## Task 4: Auth, Routing & Database Migration

**Files:**
- Modify: `codebenders-dashboard/lib/roles.ts:6-14`
- Create: `codebenders-dashboard/app/admin/layout.tsx`

- [ ] **Step 1: Add admin routes to ROUTE_PERMISSIONS**

In `codebenders-dashboard/lib/roles.ts`, add two entries to the `ROUTE_PERMISSIONS` array, after the existing entries (before the closing `]`):

```typescript
  { prefix: "/admin",                    roles: ["admin", "ir"] },
  { prefix: "/api/admin",               roles: ["admin", "ir"] },
```

- [ ] **Step 2: Create the upload_history table in Supabase**

Run this SQL against the Supabase database (via the Supabase dashboard SQL editor or `psql`):

```sql
CREATE TABLE IF NOT EXISTS public.upload_history (
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

CREATE INDEX IF NOT EXISTS idx_upload_history_uploaded_at
  ON public.upload_history (uploaded_at DESC);
```

Verify: `SELECT * FROM upload_history LIMIT 1;` should return 0 rows, no error.

- [ ] **Step 3: Create admin layout**

Create `codebenders-dashboard/app/admin/layout.tsx`:

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

This is a passthrough layout. The admin pages inherit the root layout's NavHeader. We keep this file so the `/admin` route segment exists for future admin pages.

- [ ] **Step 4: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds. The middleware now blocks non-admin/ir users from `/admin` paths.

- [ ] **Step 5: Commit**

```bash
git add codebenders-dashboard/lib/roles.ts codebenders-dashboard/app/admin/layout.tsx
git commit -m "feat(upload): add admin/ir role gate and upload_history migration"
```

---

## Task 5: API Route — Preview

**Files:**
- Create: `codebenders-dashboard/app/api/admin/upload/preview/route.ts`

- [ ] **Step 1: Create the preview API route**

Create `codebenders-dashboard/app/api/admin/upload/preview/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { parseFileBuffer, getFileType, validateFileSize } from "@/lib/upload-parser"
import { detectSchema, mapColumns } from "@/lib/upload-schemas"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "File exceeds 50 MB limit" },
        { status: 413 }
      )
    }

    const fileType = getFileType(file.name)
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .csv or .xlsx file." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { headers, rows, totalRows } = await parseFileBuffer(buffer, fileType, 50)

    const detection = detectSchema(headers)

    const columns = detection.schema
      ? mapColumns(headers, detection.schema)
      : headers.map((h) => ({ header: h, mappedTo: null, status: "unmapped" as const }))

    const missingRequired = detection.schema
      ? detection.schema.columns
          .filter((c) => c.required)
          .filter((c) => !columns.some((col) => col.mappedTo === c.name))
          .map((c) => `Missing required column: ${c.name}`)
      : []

    const warnings = detection.schema
      ? detection.schema.columns
          .filter((c) => !c.required)
          .filter((c) => !columns.some((col) => col.mappedTo === c.name))
          .slice(0, 5)
          .map((c) => `Missing optional column: ${c.name}`)
      : []

    return NextResponse.json({
      detectedSchema: detection.schema?.id ?? null,
      detectedSchemaLabel: detection.schema?.label ?? null,
      confidence: Math.round(detection.confidence * 100) / 100,
      scores: detection.scores,
      columns,
      sampleRows: rows.slice(0, 10),
      totalRows,
      warnings,
      errors: missingRequired,
    })
  } catch (err) {
    console.error("Upload preview error:", err)
    return NextResponse.json(
      { error: `Failed to parse file: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds with new route listed.

- [ ] **Step 3: Commit**

```bash
git add codebenders-dashboard/app/api/admin/upload/preview/route.ts
git commit -m "feat(upload): preview API route with schema detection"
```

---

## Task 6: API Routes — Commit & History

**Files:**
- Create: `codebenders-dashboard/app/api/admin/upload/commit/route.ts`
- Create: `codebenders-dashboard/app/api/admin/upload/history/route.ts`

- [ ] **Step 1: Create the commit API route**

Create `codebenders-dashboard/app/api/admin/upload/commit/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { parseFileBuffer, getFileType, validateFileSize } from "@/lib/upload-parser"
import { SCHEMAS, normalizeHeader, type UploadSchema, type ColumnMapping } from "@/lib/upload-schemas"
import { getPool } from "@/lib/db"

const BATCH_SIZE = 500

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? ""
  const userEmail = request.headers.get("x-user-email") ?? ""

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const schemaId = formData.get("schemaId") as string | null
    const mappingJson = formData.get("columnMapping") as string | null

    if (!file || !schemaId || !mappingJson) {
      return NextResponse.json(
        { error: "Missing file, schemaId, or columnMapping" },
        { status: 400 }
      )
    }

    if (!validateFileSize(file.size)) {
      return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 })
    }

    const schema = SCHEMAS.find((s) => s.id === schemaId)
    if (!schema) {
      return NextResponse.json({ error: `Unknown schema: ${schemaId}` }, { status: 400 })
    }

    const columnMapping: ColumnMapping[] = JSON.parse(mappingJson)

    const fileType = getFileType(file.name)
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows } = await parseFileBuffer(buffer, fileType)

    const result = await upsertRows(rows, columnMapping, schema)

    // Log to upload_history
    const pool = getPool()
    const status =
      result.errors.length > 0 && result.inserted === 0
        ? "failed"
        : result.errors.length > 0
          ? "partial"
          : "success"

    const { rows: historyRows } = await pool.query(
      `INSERT INTO upload_history (user_id, user_email, filename, file_type, rows_inserted, rows_skipped, error_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userId, userEmail, file.name, schemaId, result.inserted, result.skipped, result.errors.length, status]
    )

    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors.slice(0, 50),
      uploadId: historyRows[0].id,
    })
  } catch (err) {
    console.error("Upload commit error:", err)
    return NextResponse.json(
      { error: `Upload failed: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}

interface UpsertResult {
  inserted: number
  skipped: number
  errors: Array<{ row: number; column?: string; message: string }>
}

async function upsertRows(
  rows: Record<string, string>[],
  columnMapping: ColumnMapping[],
  schema: UploadSchema
): Promise<UpsertResult> {
  const pool = getPool()
  let inserted = 0
  let skipped = 0
  const errors: UpsertResult["errors"] = []

  // Build the header→dbColumn map from the user-confirmed mapping
  const headerToDb = new Map<string, string>()
  for (const col of columnMapping) {
    if (col.mappedTo) {
      headerToDb.set(col.header, col.mappedTo)
    }
  }

  // Build transform lookup from schema
  const transforms = new Map<string, (v: string) => string>()
  for (const col of schema.columns) {
    if (col.transform) {
      transforms.set(col.name, col.transform)
    }
  }

  // Check required columns are mapped
  const mappedDbCols = new Set(headerToDb.values())
  for (const col of schema.columns) {
    if (col.required && !mappedDbCols.has(col.name)) {
      errors.push({ row: 0, column: col.name, message: `Required column not mapped: ${col.name}` })
    }
  }
  if (errors.length > 0) return { inserted: 0, skipped: 0, errors }

  // Get the actual DB columns for the target table to filter to valid columns only
  const dbColNames = Array.from(mappedDbCols)

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const rowIndex = i + j + 1 // 1-based for user display

      try {
        const dbRow: Record<string, string> = {}
        for (const [header, dbCol] of headerToDb) {
          let value = row[header] ?? ""
          const transform = transforms.get(dbCol)
          if (transform) value = transform(value)
          dbRow[dbCol] = value
        }

        // Check required fields have values
        const missingRequired = schema.columns
          .filter((c) => c.required && (!dbRow[c.name] || dbRow[c.name].trim() === ""))
        if (missingRequired.length > 0) {
          skipped++
          errors.push({
            row: rowIndex,
            column: missingRequired[0].name,
            message: `Empty required field: ${missingRequired[0].name}`,
          })
          continue
        }

        const cols = Object.keys(dbRow)
        const vals = Object.values(dbRow)
        const placeholders = cols.map((_, idx) => `$${idx + 1}`)
        const updateSet = cols
          .filter((c) => !schema.upsertKey.includes(c))
          .map((c) => `${c} = EXCLUDED.${c}`)
          .join(", ")

        const conflictClause = schema.upsertKey.join(", ")
        const sql = updateSet
          ? `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
             VALUES (${placeholders.join(", ")})
             ON CONFLICT (${conflictClause}) DO UPDATE SET ${updateSet}`
          : `INSERT INTO ${schema.targetTable} (${cols.join(", ")})
             VALUES (${placeholders.join(", ")})
             ON CONFLICT (${conflictClause}) DO NOTHING`

        await pool.query(sql, vals)
        inserted++
      } catch (err) {
        skipped++
        errors.push({
          row: rowIndex,
          message: (err as Error).message,
        })
      }
    }
  }

  return { inserted, skipped, errors }
}
```

- [ ] **Step 2: Create the history API route**

Create `codebenders-dashboard/app/api/admin/upload/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")))
    const offset = (page - 1) * pageSize

    const pool = getPool()

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, user_email, filename, file_type, rows_inserted, rows_skipped,
                error_count, status, uploaded_at
         FROM upload_history
         ORDER BY uploaded_at DESC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM upload_history`),
    ])

    const total = countResult.rows[0].total

    return NextResponse.json({
      data: dataResult.rows.map((row) => ({
        id: row.id,
        userEmail: row.user_email,
        filename: row.filename,
        fileType: row.file_type,
        rowsInserted: row.rows_inserted,
        rowsSkipped: row.rows_skipped,
        errorCount: row.error_count,
        status: row.status,
        uploadedAt: row.uploaded_at,
      })),
      total,
      page,
      pageSize,
    })
  } catch (err) {
    console.error("Upload history error:", err)
    return NextResponse.json(
      { error: `Failed to fetch upload history: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds with all three API routes listed.

- [ ] **Step 4: Commit**

```bash
git add codebenders-dashboard/app/api/admin/upload/commit/route.ts codebenders-dashboard/app/api/admin/upload/history/route.ts
git commit -m "feat(upload): commit and history API routes with batch upsert"
```

---

## Task 7: UI Components — Drop Zone, Column Mapper, Data Preview, Upload Summary

**Files:**
- Create: `codebenders-dashboard/components/upload/drop-zone.tsx`
- Create: `codebenders-dashboard/components/upload/column-mapper.tsx`
- Create: `codebenders-dashboard/components/upload/data-preview.tsx`
- Create: `codebenders-dashboard/components/upload/upload-summary.tsx`

- [ ] **Step 1: Create the DropZone component**

Create `codebenders-dashboard/components/upload/drop-zone.tsx`:

```tsx
"use client"

import { useCallback, useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile, disabled]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
      e.target.value = ""
    },
    [onFile]
  )

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
        dragging
          ? "border-purple-500 bg-purple-50"
          : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40"
      } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      <p className="font-semibold text-sm">Drag & drop your file here</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        .csv or .xlsx up to 50 MB
      </p>
      <Button
        variant="default"
        size="sm"
        className="bg-purple-600 hover:bg-purple-700"
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
        disabled={disabled}
      >
        Browse Files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the ColumnMapper component**

Create `codebenders-dashboard/components/upload/column-mapper.tsx`:

```tsx
"use client"

import { useState } from "react"
import type { ColumnMapping, UploadSchema } from "@/lib/upload-schemas"

interface ColumnMapperProps {
  columns: ColumnMapping[]
  schema: UploadSchema | null
  onMappingChange: (columns: ColumnMapping[]) => void
}

export function ColumnMapper({ columns, schema, onMappingChange }: ColumnMapperProps) {
  const [showAll, setShowAll] = useState(false)

  const matched = columns.filter((c) => c.status === "matched")
  const unmapped = columns.filter((c) => c.status === "unmapped")

  const availableTargets = schema
    ? schema.columns
        .map((c) => c.name)
        .filter((name) => !columns.some((col) => col.mappedTo === name))
    : []

  function handleRemap(header: string, newTarget: string | null) {
    const updated = columns.map((col) =>
      col.header === header
        ? { ...col, mappedTo: newTarget, status: (newTarget ? "matched" : "unmapped") as "matched" | "unmapped" }
        : col
    )
    onMappingChange(updated)
  }

  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      {/* Header */}
      <div className="grid grid-cols-[1fr_24px_1fr_80px] gap-2 px-4 py-2.5 bg-muted font-semibold border-b">
        <span>File Column</span>
        <span />
        <span>Maps To</span>
        <span>Status</span>
      </div>

      {/* Unmapped columns (always shown) */}
      {unmapped.map((col) => (
        <div
          key={col.header}
          className="grid grid-cols-[1fr_24px_1fr_80px] gap-2 px-4 py-2 border-b bg-amber-50/50 items-center"
        >
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">
            {col.header}
          </code>
          <span className="text-muted-foreground">→</span>
          <select
            className="text-xs border border-amber-400 rounded px-2 py-1 bg-white"
            value={col.mappedTo ?? ""}
            onChange={(e) =>
              handleRemap(col.header, e.target.value || null)
            }
          >
            <option value="">— select or skip —</option>
            {availableTargets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-center">
            unmapped
          </span>
        </div>
      ))}

      {/* Matched columns (collapsed by default) */}
      {matched.length > 0 && !showAll && (
        <button
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 text-center"
          onClick={() => setShowAll(true)}
        >
          + {matched.length} matched columns (click to expand)
        </button>
      )}

      {showAll &&
        matched.map((col) => (
          <div
            key={col.header}
            className="grid grid-cols-[1fr_24px_1fr_80px] gap-2 px-4 py-2 border-b items-center"
          >
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">
              {col.header}
            </code>
            <span className="text-muted-foreground">→</span>
            <span className="text-xs text-green-700">{col.mappedTo}</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded text-center">
              matched
            </span>
          </div>
        ))}

      {showAll && matched.length > 0 && (
        <button
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 text-center"
          onClick={() => setShowAll(false)}
        >
          Collapse matched columns
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create the DataPreview component**

Create `codebenders-dashboard/components/upload/data-preview.tsx`:

```tsx
"use client"

interface DataPreviewProps {
  headers: string[]
  rows: Record<string, string>[]
}

export function DataPreview({ headers, rows }: DataPreviewProps) {
  if (rows.length === 0) return null

  // Show at most 8 columns to prevent horizontal overflow; user can scroll
  const displayHeaders = headers.slice(0, 8)
  const hasMore = headers.length > 8

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Data Preview</h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted">
              {displayHeaders.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-semibold border-b whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
              {hasMore && (
                <th className="px-3 py-2 text-left font-semibold border-b text-muted-foreground">
                  +{headers.length - 8} more
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                {displayHeaders.map((h) => (
                  <td
                    key={h}
                    className="px-3 py-1.5 border-b whitespace-nowrap font-mono max-w-[200px] truncate"
                  >
                    {row[h] ?? ""}
                  </td>
                ))}
                {hasMore && (
                  <td className="px-3 py-1.5 border-b text-muted-foreground">
                    …
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the UploadSummary component**

Create `codebenders-dashboard/components/upload/upload-summary.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface UploadSummaryProps {
  filename: string
  schemaLabel: string
  inserted: number
  skipped: number
  errorCount: number
  onUploadAnother: () => void
  onViewHistory: () => void
}

export function UploadSummary({
  filename,
  schemaLabel,
  inserted,
  skipped,
  errorCount,
  onUploadAnother,
  onViewHistory,
}: UploadSummaryProps) {
  return (
    <div className="text-center space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-xl p-8">
        <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-3" />
        <h2 className="text-lg font-bold">Upload Complete</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {filename} — {schemaLabel}
        </p>
        <div className="flex justify-center gap-8 mt-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-green-600">{inserted}</span>
            <br />
            <span className="text-muted-foreground">inserted</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-600">{skipped}</span>
            <br />
            <span className="text-muted-foreground">skipped</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-red-600">{errorCount}</span>
            <br />
            <span className="text-muted-foreground">errors</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          className="bg-purple-600 hover:bg-purple-700"
          onClick={onUploadAnother}
        >
          Upload Another File
        </Button>
        <Button variant="outline" onClick={onViewHistory}>
          View Upload History
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds (components are not yet imported by pages, but should compile).

- [ ] **Step 6: Commit**

```bash
git add codebenders-dashboard/components/upload/
git commit -m "feat(upload): drop-zone, column-mapper, data-preview, upload-summary components"
```

---

## Task 8: Upload Wizard Page

**Files:**
- Create: `codebenders-dashboard/app/admin/upload/page.tsx`

- [ ] **Step 1: Create the upload wizard page**

Create `codebenders-dashboard/app/admin/upload/page.tsx`:

```tsx
"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DropZone } from "@/components/upload/drop-zone"
import { ColumnMapper } from "@/components/upload/column-mapper"
import { DataPreview } from "@/components/upload/data-preview"
import { UploadSummary } from "@/components/upload/upload-summary"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import type { ColumnMapping } from "@/lib/upload-schemas"

type Step = "upload" | "preview" | "complete"

interface PreviewData {
  detectedSchema: string | null
  detectedSchemaLabel: string | null
  confidence: number
  scores: Array<{ schemaId: string; label: string; score: number }>
  columns: ColumnMapping[]
  sampleRows: Record<string, string>[]
  totalRows: number
  warnings: string[]
  errors: string[]
}

interface CommitResult {
  inserted: number
  skipped: number
  errors: Array<{ row: number; message: string }>
  uploadId: number
}

interface HistoryEntry {
  id: number
  filename: string
  fileType: string
  rowsInserted: number
  status: string
  uploadedAt: string
}

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [columns, setColumns] = useState<ColumnMapping[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)
  const [selectedSchemaLabel, setSelectedSchemaLabel] = useState<string | null>(null)
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<HistoryEntry[]>([])

  // Fetch recent uploads on mount
  useEffect(() => {
    fetch("/api/admin/upload/history?pageSize=5")
      .then((r) => r.json())
      .then((d) => setRecentUploads(d.data ?? []))
      .catch(() => {})
  }, [])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", f)

      const res = await fetch("/api/admin/upload/preview", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Preview failed")
        setLoading(false)
        return
      }

      const data: PreviewData = await res.json()
      setPreview(data)
      setColumns(data.columns)
      setSelectedSchema(data.detectedSchema)
      setSelectedSchemaLabel(data.detectedSchemaLabel)
      setStep("preview")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSchemaOverride = useCallback(
    async (schemaId: string, label: string) => {
      if (!file) return
      setSelectedSchema(schemaId)
      setSelectedSchemaLabel(label)
      // Re-run preview with overridden schema detection isn't needed —
      // the column mapping will be recalculated on the server during commit.
      // For the preview, we just re-map columns client-side.
      // This is a simplification — the preview route already returns all columns.
    },
    [file]
  )

  const handleCommit = useCallback(async () => {
    if (!file || !selectedSchema) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("schemaId", selectedSchema)
      formData.append("columnMapping", JSON.stringify(columns))

      const res = await fetch("/api/admin/upload/commit", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Upload failed")
        setLoading(false)
        return
      }

      const data: CommitResult = await res.json()
      setCommitResult(data)
      setStep("complete")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [file, selectedSchema, columns])

  const resetWizard = useCallback(() => {
    setStep("upload")
    setFile(null)
    setPreview(null)
    setColumns([])
    setSelectedSchema(null)
    setSelectedSchemaLabel(null)
    setCommitResult(null)
    setError(null)
  }, [])

  const headers = preview?.sampleRows?.[0] ? Object.keys(preview.sampleRows[0]) : []
  const hasRequiredErrors = (preview?.errors?.length ?? 0) > 0
  const stepLabels = ["Upload", "Preview & Map", "Complete"]
  const stepIndex = step === "upload" ? 0 : step === "preview" ? 1 : 2

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Upload Data</h1>
        <p className="text-sm text-muted-foreground">
          Drop a PDP, course, or prediction file — we&apos;ll detect the format
          automatically
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        {stepLabels.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={
                i < stepIndex
                  ? "text-green-600 line-through"
                  : i === stepIndex
                    ? "font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full"
                    : "text-muted-foreground"
              }
            >
              {i < stepIndex ? `${label} ✓` : `${i + 1}. ${label}`}
            </span>
          </span>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <DropZone onFile={handleFile} disabled={loading} />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
            </div>
          )}

          {/* Recent uploads */}
          {recentUploads.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Recent Uploads</h3>
              <div className="space-y-1.5">
                {recentUploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <code>{u.filename}</code>
                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px]">
                        {u.fileType}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{u.rowsInserted} rows</span>
                      <span>
                        {new Date(u.uploadedAt).toLocaleDateString()}
                      </span>
                      <span className="text-green-600">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Map */}
      {step === "preview" && preview && (
        <div className="space-y-5">
          {/* Detection banner */}
          {preview.confidence >= 0.6 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold">{selectedSchemaLabel}</span>
                <span className="text-muted-foreground">
                  — {file?.name} — {preview.totalRows} rows,{" "}
                  {columns.filter((c) => c.status === "matched").length}/
                  {columns.length} columns matched
                </span>
              </div>
              <button
                className="text-xs text-muted-foreground border px-2 py-0.5 rounded hover:bg-muted"
                onClick={() => {
                  /* Show schema picker — handled below */
                }}
              >
                Wrong? Change type
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm mb-3">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-semibold">
                  Couldn&apos;t confidently detect the file type
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {file?.name} has {columns.length} columns — it partially matches
                multiple schemas. Please select the correct type:
              </p>
              <div className="flex gap-2 flex-wrap">
                {preview.scores
                  .filter((s) => s.score > 0.1)
                  .map((s) => (
                    <button
                      key={s.schemaId}
                      className={`text-xs px-3 py-1.5 rounded border ${
                        selectedSchema === s.schemaId
                          ? "border-purple-600 bg-purple-50 font-semibold"
                          : "border-muted hover:bg-muted/50"
                      }`}
                      onClick={() => handleSchemaOverride(s.schemaId, s.label)}
                    >
                      {s.label}{" "}
                      <span className="text-muted-foreground">
                        ({Math.round(s.score * 100)}%)
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Column mapping */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Column Mapping</h3>
            <ColumnMapper
              columns={columns}
              schema={null}
              onMappingChange={setColumns}
            />
          </div>

          {/* Data preview */}
          <DataPreview headers={headers} rows={preview.sampleRows} />

          {/* Validation summary + actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs">
              <span>
                📊 <strong>{preview.totalRows}</strong> rows
              </span>
              <span className="text-green-700">
                ✓ {columns.filter((c) => c.status === "matched").length} matched
              </span>
              {columns.filter((c) => c.status === "unmapped").length > 0 && (
                <span className="text-amber-700">
                  ⚠{" "}
                  {columns.filter((c) => c.status === "unmapped").length}{" "}
                  unmapped
                </span>
              )}
              {hasRequiredErrors && (
                <span className="text-red-700">
                  ✗ {preview.errors.length} errors
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetWizard}>
                ← Back
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleCommit}
                disabled={loading || hasRequiredErrors || !selectedSchema}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Uploading…
                  </>
                ) : (
                  `Upload ${preview.totalRows} Rows →`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === "complete" && commitResult && (
        <UploadSummary
          filename={file?.name ?? ""}
          schemaLabel={selectedSchemaLabel ?? "Unknown"}
          inserted={commitResult.inserted}
          skipped={commitResult.skipped}
          errorCount={commitResult.errors.length}
          onUploadAnother={resetWizard}
          onViewHistory={() => router.push("/admin/upload/history")}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds. `/admin/upload` should appear in the route list.

- [ ] **Step 3: Commit**

```bash
git add codebenders-dashboard/app/admin/upload/page.tsx
git commit -m "feat(upload): 3-step upload wizard page with auto-detection"
```

---

## Task 9: Upload History Page

**Files:**
- Create: `codebenders-dashboard/app/admin/upload/history/page.tsx`

- [ ] **Step 1: Create the upload history page**

Create `codebenders-dashboard/app/admin/upload/history/page.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface UploadEntry {
  id: number
  userEmail: string
  filename: string
  fileType: string
  rowsInserted: number
  rowsSkipped: number
  errorCount: number
  status: "success" | "partial" | "failed"
  uploadedAt: string
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdp_cohort_ar: "bg-green-50 text-green-700",
  pdp_cohort_submission: "bg-green-50 text-green-700",
  course_ar: "bg-blue-50 text-blue-700",
  course_submission: "bg-blue-50 text-blue-700",
  ml_predictions: "bg-purple-50 text-purple-700",
}

const FILE_TYPE_LABELS: Record<string, string> = {
  pdp_cohort_ar: "PDP Cohort AR",
  pdp_cohort_submission: "PDP Cohort Submission",
  course_ar: "Course AR",
  course_submission: "Course Submission",
  ml_predictions: "ML Predictions",
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
}

export default function UploadHistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/upload/history?page=${p}&pageSize=${pageSize}`
      )
      const data = await res.json()
      setEntries(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(page)
  }, [page, fetchHistory])

  const pageCount = Math.ceil(total / pageSize)

  const statusCounts = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Upload History</h1>
          <p className="text-sm text-muted-foreground">
            All data file uploads by admin and IR users
          </p>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-700"
          onClick={() => router.push("/admin/upload")}
        >
          + New Upload
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-muted/30 border rounded-lg px-4 py-3">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Total Uploads
          </div>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="text-[11px] text-green-700 uppercase tracking-wide">
            Successful
          </div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {statusCounts.success ?? 0}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-[11px] text-amber-700 uppercase tracking-wide">
            Partial
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {statusCounts.partial ?? 0}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="text-[11px] text-red-700 uppercase tracking-wide">
            Failed
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {statusCounts.failed ?? 0}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No uploads yet. Click &quot;+ New Upload&quot; to get started.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2.5 text-left font-semibold">File</th>
                <th className="px-4 py-2.5 text-left font-semibold">Type</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Inserted
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Skipped
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Errors
                </th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold">
                  Uploaded By
                </th>
                <th className="px-4 py-2.5 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.id}
                  className={i % 2 === 1 ? "bg-muted/20" : ""}
                >
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {e.filename}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded ${FILE_TYPE_COLORS[e.fileType] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {FILE_TYPE_LABELS[e.fileType] ?? e.fileType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {e.rowsInserted.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-700">
                    {e.rowsSkipped}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-700">
                    {e.errorCount}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] ?? ""}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {e.userEmail}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(e.uploadedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total} uploads
          </span>
          <div className="flex gap-1">
            <button
              className="border px-2 py-1 rounded disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Prev
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  className={`px-2 py-1 rounded ${
                    p === page
                      ? "bg-purple-600 text-white"
                      : "border hover:bg-muted"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            <button
              className="border px-2 py-1 rounded disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds with `/admin/upload/history` in the route list.

- [ ] **Step 3: Commit**

```bash
git add codebenders-dashboard/app/admin/upload/history/page.tsx
git commit -m "feat(upload): upload history page with stats and pagination"
```

---

## Task 10: Nav Header Update

**Files:**
- Modify: `codebenders-dashboard/components/nav-header.tsx:1-77`

- [ ] **Step 1: Add Admin link to NavHeader**

In `codebenders-dashboard/components/nav-header.tsx`, replace the `NAV_LINKS` constant and update the component to conditionally show the Admin link:

Replace:

```typescript
const NAV_LINKS = [
  { href: "/",          label: "Dashboard" },
  { href: "/courses",   label: "Courses"   },
  { href: "/students",  label: "Students"  },
  { href: "/query",     label: "Query"     },
]
```

With:

```typescript
const NAV_LINKS = [
  { href: "/",          label: "Dashboard" },
  { href: "/courses",   label: "Courses"   },
  { href: "/students",  label: "Students"  },
  { href: "/query",     label: "Query"     },
  { href: "/admin/upload", label: "Admin", roles: ["admin", "ir"] as const },
]
```

Then update the nav rendering to filter by role. Replace the `<nav>` section inside the component:

Replace:

```tsx
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
```

With:

```tsx
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.filter((link) => !("roles" in link) || link.roles.includes(role)).map(({ href, label }) => {
```

- [ ] **Step 2: Verify build passes**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds. Admin link only visible to admin/ir roles.

- [ ] **Step 3: Commit**

```bash
git add codebenders-dashboard/components/nav-header.tsx
git commit -m "feat(upload): add Admin nav link for admin/ir roles"
```

---

## Task 11: Test Data Generator

**Files:**
- Create: `operations/generate_test_data.py`

- [ ] **Step 1: Create the test data generation script**

Create `operations/generate_test_data.py`:

```python
"""Generate synthetic PDP/AR/course test data for upload feature testing.

Usage:
    python -m operations.generate_test_data

Outputs files to data/test_uploads/
"""

import csv
import os
import random
import string

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "test_uploads")

COHORTS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
TERMS = ["Fall", "Winter", "Spring", "Summer"]
ENROLLMENT_TYPES_AR = ["First-Time", "Re-admit", "Transfer-In"]
ENROLLMENT_TYPES_SUB = ["F", "R", "T"]
RACES_AR = [
    "White", "Black or African American", "Asian",
    "American Indian or Alaska Native", "Two or More Races", "Unknown",
]
RACES_SUB = ["W", "B", "A", "AN", "TM", "UK"]
ETHNICITIES_AR = ["Hispanic", "Not Hispanic", "Unknown"]
ETHNICITIES_SUB = ["H", "N", "UK"]
GENDERS_AR = ["Male", "Female", "Non-binary", "Unknown"]
GENDERS_SUB = ["M", "F", "P", "UK"]
PLACEMENTS = ["C", "R", "N"]
GPA_GROUPS = ["0.00 - 1.00", "1.01 - 2.00", "2.01 - 3.00", "3.01 - 4.00"]
CREDENTIAL_TYPES = ["A", "B", "01"]
AL_ZIPS = [
    "36603", "36604", "36610", "36617", "36693", "36695",
    "36571", "36560", "36526", "36507",
]
COURSE_PREFIXES = [
    "MTH", "ENG", "BIO", "HIS", "PSY", "CIS", "ART",
    "CHM", "SPH", "ECO", "SOC", "PHY", "MUS",
]
GRADES = ["A", "B", "C", "D", "F", "W", "I", "P"]
DELIVERY_METHODS = ["O", "F", "H"]
BISHOP_STATE_OPEID = "01030800"


def rand_guid(i: int) -> str:
    return f"BSCC_STU{i:05d}"


def rand_gpa() -> str:
    return f"{random.uniform(0, 4):.2f}"


def rand_credits() -> str:
    return str(random.randint(0, 24))


def generate_cohort_ar(n: int = 500) -> None:
    """Generate PDP Cohort AR file (90 columns, underscored headers, spelled-out values)."""
    path = os.path.join(OUTPUT_DIR, "test_pdp_cohort_ar.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        headers = [
            "id", "Institution_ID", "Cohort", "Student_GUID", "Cohort_Term",
            "Student_Age", "Enrollment_Type", "Enrollment_Intensity_First_Term",
            "Math_Placement", "English_Placement", "Reading_Placement",
            "Dual_and_Summer_Enrollment", "Race", "Ethnicity", "Gender",
            "First_Gen", "Pell_Status_First_Year", "Attendance_Status_Term_1",
            "Credential_Type_Sought_Year_1", "Program_of_Study_Term_1",
            "GPA_Group_Term_1", "GPA_Group_Year_1",
            "Number_of_Credits_Attempted_Year_1", "Number_of_Credits_Earned_Year_1",
            "Number_of_Credits_Attempted_Year_2", "Number_of_Credits_Earned_Year_2",
            "Number_of_Credits_Attempted_Year_3", "Number_of_Credits_Earned_Year_3",
            "Number_of_Credits_Attempted_Year_4", "Number_of_Credits_Earned_Year_4",
            "Gateway_Math_Status", "Gateway_English_Status",
            "AttemptedGatewayMathYear1", "AttemptedGatewayEnglishYear1",
            "CompletedGatewayMathYear1", "CompletedGatewayEnglishYear1",
            "GatewayMathGradeY1", "GatewayEnglishGradeY1",
            "AttemptedDevMathY1", "AttemptedDevEnglishY1",
            "CompletedDevMathY1", "CompletedDevEnglishY1",
            "Retention", "Persistence",
            "Years_to_Bachelors_at_cohort_inst_", "Years_to_Bachelor_at_other_inst_",
            "First_Year_to_Bachelors_at_cohort_inst_", "First_Year_to_Bachelor_at_other_inst_",
            "Years_to_Associates_or_Certificate_at_cohort_inst_",
            "First_Year_to_Associates_or_Certificate_at_cohort_inst_",
            "Years_to_Latest_Associates_at_Cohort_Inst",
            "Years_to_Latest_Certificate_at_Cohort_Inst",
            "First_Year_to_Associates_at_Cohort_Inst",
            "First_Year_to_Certificate_at_Cohort_Inst",
            "Years_to_Associates_or_Certificate_at_other_inst_",
            "First_Year_to_Associates_or_Certificate_at_other_inst_",
            "Years_to_Latest_Associates_at_Other_Inst",
            "Years_to_Latest_Certificate_at_Other_Inst",
            "First_Year_to_Associates_at_Other_Inst",
            "First_Year_to_Certificate_at_Other_Inst",
            "Years_of_Last_Enrollment_at_cohort_institution",
            "Years_of_Last_Enrollment_at_other_institution",
            "Time_to_Credential", "Special_Program", "NASPA_First_Generation",
            "Incarcerated_Status", "Military_Status", "Employment_Status",
            "Disability_Status", "Foreign_Language_Completion",
            "Program_of_Study_Year_1",
            "Most_Recent_Bachelors_at_Other_Institution_STATE",
            "Most_Recent_Associates_or_Certificate_at_Other_Ins_dccdad65",
            "Most_Recent_Last_Enrollment_at_Other_institution_STATE",
            "First_Bachelors_at_Other_Institution_STATE",
            "First_Associates_or_Certificate_at_Other_Institution_STATE",
            "Most_Recent_Bachelors_at_Other_Institution_CARNEGIE",
            "Most_Recent_Associates_or_Certificate_at_Other_Ins_5a42b456",
            "Most_Recent_Last_Enrollment_at_Other_institution_CARNEGIE",
            "First_Bachelors_at_Other_Institution_CARNEGIE",
            "First_Associates_or_Certificate_at_Other_Instituti_9c09d367",
            "Most_Recent_Bachelors_at_Other_Institution_LOCALE",
            "Most_Recent_Associates_or_Certificate_at_Other_Ins_9cc1796c",
            "Most_Recent_Last_Enrollment_at_Other_institution_LOCALE",
            "First_Bachelors_at_Other_Institution_LOCALE",
            "First_Associates_or_Certificate_at_Other_Institution_LOCALE",
            "school", "dataset_type", "created_at", "zip_code",
        ]
        writer.writerow(headers)

        for i in range(1, n + 1):
            cohort = random.choice(COHORTS)
            writer.writerow([
                i, BISHOP_STATE_OPEID, cohort, rand_guid(i),
                random.choice(TERMS),
                random.choice(["20 and younger", ">20 - 24", "Older than 24"]),
                random.choice(ENROLLMENT_TYPES_AR),
                random.choice(["Full-Time", "Part-Time"]),
                random.choice(PLACEMENTS), random.choice(PLACEMENTS), random.choice(PLACEMENTS),
                random.choice(["", "DE", "SE", "DS"]),
                random.choice(RACES_AR), random.choice(ETHNICITIES_AR), random.choice(GENDERS_AR),
                random.choice(["Y", "N", "UK"]),
                random.choice(["Y", "N", "UK"]),
                random.choice(["First-Time Full-Time", "First-Time Part-Time", "Transfer-In Full-Time"]),
                random.choice(CREDENTIAL_TYPES),
                random.choice(["Liberal Arts", "Nursing", "Business", "Welding", "HVAC"]),
                random.choice(GPA_GROUPS), random.choice(GPA_GROUPS),
                rand_credits(), rand_credits(), rand_credits(), rand_credits(),
                rand_credits(), rand_credits(), rand_credits(), rand_credits(),
                random.choice(PLACEMENTS), random.choice(PLACEMENTS),
                random.choice(["Y", "N"]), random.choice(["Y", "N"]),
                random.choice(["Y", "N"]), random.choice(["Y", "N"]),
                random.choice(GRADES + [""]), random.choice(GRADES + [""]),
                random.choice(["Y", "N"]), random.choice(["Y", "N"]),
                random.choice(["Y", "N"]), random.choice(["Y", "N"]),
                random.choice([0, 1]), random.choice([0, 1]),
                # Credential years — mostly empty for community college
                "", "", "", "",
                random.choice(["", "2", "3"]), random.choice(["", "2020-21", "2021-22"]),
                "", "", "", "",
                "", "", "", "", "", "",
                random.choice(["", "1", "2", "3"]),
                random.choice(["", "1", "2"]),
                random.choice(["2", "3", "4", ""]),
                "", random.choice(["", "0", "1", "2", "3", "4", "5", "6"]),
                random.choice(["", "N", "UK"]),
                random.choice(["", "0", "1", "2"]),
                random.choice(["", "0", "1", "2", "3", "4"]),
                random.choice(["", "Y", "N", "UK"]),
                random.choice(["", "Y", "N"]),
                random.choice(["Liberal Arts", "Nursing", "Business", "Welding", ""]),
                # Transfer institution fields — mostly empty
                "", "", "", "", "",
                "", "", "", "", "",
                "", "", "", "", "",
                "Bishop State Community College", "cohort", "2026-03-31",
                random.choice(AL_ZIPS),
            ])
    print(f"  Generated {path} ({n} rows)")


def generate_cohort_submission(n: int = 500) -> None:
    """Generate PDP Cohort Submission file (35 columns, spaced headers, coded values)."""
    path = os.path.join(OUTPUT_DIR, "test_pdp_cohort_submission.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        headers = [
            "CH1", "Cohort", "Cohort Term", "Cohort Term Begin Date",
            "Cohort Term End Date", "SSN", "ITIN", "Student ID",
            "First Name", "Middle Name", "Last Name",
            "Street Line 1", "Street Line 2", "City", "State",
            "Zip/Postal Code", "Country", "Date of Birth",
            "Ethnicity", "Race", "Institution ID Type", "Institution ID",
            "HS Completion Status", "HS Completion Year",
            "HS Unweighted GPA", "HS Weighted GPA", "First Gen",
            "Dual and Summer Enrollment", "Enrollment Type",
            "Number of College Credits Attempted to Transfer",
            "Number of College Transfer Credits Accepted",
            "Math Placement", "English Placement",
            "Gateway Math Status", "Gateway English Status",
        ]
        writer.writerow(headers)

        first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Elizabeth"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor"]

        for i in range(1, n + 1):
            cohort = random.choice(COHORTS)
            year = int(cohort.split("-")[0])
            writer.writerow([
                "D1", cohort, random.choice(TERMS),
                f"{year}0815", f"{year}1215",
                "", "",
                f"STU{i:06d}",
                random.choice(first_names), random.choice(["A", "B", "C", "M", ""]),
                random.choice(last_names),
                f"{random.randint(100, 9999)} Main St", "",
                "Mobile", "AL", random.choice(AL_ZIPS), "US",
                f"{random.randint(1985, 2005)}{random.randint(1, 12):02d}{random.randint(1, 28):02d}",
                random.choice(ETHNICITIES_SUB),
                random.choice(RACES_SUB),
                "OPEID", BISHOP_STATE_OPEID,
                random.choice(["G", "H", "E", ""]),
                str(random.randint(2015, 2023)),
                rand_gpa(), rand_gpa(),
                random.choice(["N", "P", "C", ""]),
                random.choice(["", "DE", "SE"]),
                random.choice(ENROLLMENT_TYPES_SUB),
                str(random.randint(0, 60)),
                str(random.randint(0, 60)),
                random.choice(["C", "N", "UK"]),
                random.choice(["C", "N", "UK"]),
                random.choice(["R", "N", "UK"]),
                random.choice(["R", "N", "UK"]),
            ])
    print(f"  Generated {path} ({n} rows)")


def generate_course_ar(n: int = 5000) -> None:
    """Generate Course Enrollment AR file (39 columns)."""
    path = os.path.join(OUTPUT_DIR, "test_course_ar.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        headers = [
            "id", "Student_GUID", "Student_Age", "Race", "Ethnicity", "Gender",
            "Institution_ID", "Cohort", "Cohort_Term", "Academic_Year",
            "Academic_Term", "Course_Prefix", "Course_Number", "Section_ID",
            "Course_Name", "Course_CIP", "Course_Type",
            "Math_or_English_Gateway", "Co_requisite_Course", "Core_Course",
            "Core_Course_Type", "Core_Competency_Completed",
            "Course_Begin_Date", "Course_End_Date", "Delivery_Method",
            "Grade", "Number_of_Credits_Attempted", "Number_of_Credits_Earned",
            "Enrolled_at_Other_Institutions",
            "Enrollment_Record_at_Other_Institutions_STATEs",
            "Enrollment_Record_at_Other_Institutions_CARNEGIEs",
            "Enrollment_Record_at_Other_Institutions_LOCALEs",
            "Credential_Engine_Identifier",
            "Course_Instructor_Employment_Status", "Course_Instructor_Rank",
            "Term_Program_of_Study", "school", "dataset_type", "created_at",
        ]
        writer.writerow(headers)

        for i in range(1, n + 1):
            student_num = random.randint(1, 500)
            cohort = random.choice(COHORTS)
            year = int(cohort.split("-")[0])
            prefix = random.choice(COURSE_PREFIXES)
            num = f"{random.randint(100, 299)}"
            credits_attempted = random.randint(1, 5)
            grade = random.choice(GRADES)
            credits_earned = credits_attempted if grade not in ("F", "W", "I") else 0
            writer.writerow([
                i, rand_guid(student_num),
                random.choice(["20 and younger", ">20 - 24", "Older than 24"]),
                random.choice(RACES_AR), random.choice(ETHNICITIES_AR),
                random.choice(GENDERS_AR), BISHOP_STATE_OPEID,
                cohort, random.choice(TERMS),
                random.choice([cohort, f"{year + 1}-{str(year + 2)[2:]}"]),
                random.choice(TERMS),
                prefix, num, f"{random.randint(1, 20):02d}",
                f"{prefix} {num} - Intro to {prefix}",
                f"{random.randint(10, 52)}.{random.randint(1000, 9999)}",
                random.choice(["CU", "CG", "CD", "EL", "GE"]),
                random.choice(["M", "E", "NA"]),
                random.choice(["Y", "N"]), random.choice(["Y", "N"]),
                "", random.choice(["Y", "N"]),
                f"{year}0815", f"{year}1215",
                random.choice(DELIVERY_METHODS),
                grade, str(credits_attempted), str(credits_earned),
                "", "", "", "", "",
                random.choice(["PT", "FT"]),
                str(random.randint(1, 7)),
                random.choice(["Liberal Arts", "Nursing", "Business", ""]),
                "Bishop State Community College", "course", "2026-03-31",
            ])
    print(f"  Generated {path} ({n} rows)")


def generate_ml_predictions(n: int = 500) -> None:
    """Generate ML predictions file."""
    path = os.path.join(OUTPUT_DIR, "test_ml_predictions.csv")
    pred_types = ["retention", "early_warning", "time_to_credential", "credential_type", "gpa"]
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["student_guid", "prediction_type", "prediction_value", "model_version", "confidence_score"])
        for i in range(1, n + 1):
            for pt in pred_types:
                if pt == "retention":
                    val = f"{random.uniform(0, 1):.3f}"
                elif pt == "gpa":
                    val = rand_gpa()
                elif pt == "time_to_credential":
                    val = str(random.randint(2, 8))
                elif pt == "credential_type":
                    val = random.choice(["Associate", "Certificate", "Bachelor"])
                else:
                    val = random.choice(["Low", "Medium", "High", "Critical"])
                writer.writerow([
                    rand_guid(i), pt, val, "v2.1",
                    f"{random.uniform(0.5, 1.0):.3f}",
                ])
    print(f"  Generated {path} ({n * len(pred_types)} rows)")


def generate_edge_cases() -> None:
    """Generate edge case test files."""
    # Bad headers
    path = os.path.join(OUTPUT_DIR, "test_bad_headers.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["foo", "bar", "baz", "qux", "quux"])
        for _ in range(100):
            writer.writerow([
                "".join(random.choices(string.ascii_lowercase, k=5))
                for _ in range(5)
            ])
    print(f"  Generated {path} (100 rows)")

    # Mixed casing
    path = os.path.join(OUTPUT_DIR, "test_mixed_casing.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "STUDENT_GUID", "cohort", "COHORT_TERM", "enrollment_type",
            "Retention", "PERSISTENCE", "gpa_group_year_1",
            "Gateway_Math_Status", "gateway_english_status",
        ])
        for i in range(1, 201):
            writer.writerow([
                rand_guid(i), random.choice(COHORTS), random.choice(TERMS),
                random.choice(ENROLLMENT_TYPES_AR),
                random.choice([0, 1]), random.choice([0, 1]),
                random.choice(GPA_GROUPS),
                random.choice(PLACEMENTS), random.choice(PLACEMENTS),
            ])
    print(f"  Generated {path} (200 rows)")

    # Oversized file (~60MB)
    path = os.path.join(OUTPUT_DIR, "test_oversized.csv")
    cols = [f"col_{i}" for i in range(50)]
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        row_count = 0
        while os.path.getsize(path) < 60 * 1024 * 1024:
            writer.writerow(["x" * 20 for _ in range(50)])
            row_count += 1
    print(f"  Generated {path} ({row_count} rows, ~60MB)")


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Generating test upload data...")
    generate_cohort_ar()
    generate_cohort_submission()
    generate_course_ar()
    generate_ml_predictions()
    generate_edge_cases()
    print("Done!")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the generator**

```bash
source venv/bin/activate
python -m operations.generate_test_data
```

Expected output:
```
Generating test upload data...
  Generated data/test_uploads/test_pdp_cohort_ar.csv (500 rows)
  Generated data/test_uploads/test_pdp_cohort_submission.csv (500 rows)
  Generated data/test_uploads/test_course_ar.csv (5000 rows)
  Generated data/test_uploads/test_ml_predictions.csv (2500 rows)
  Generated data/test_uploads/test_bad_headers.csv (100 rows)
  Generated data/test_uploads/test_mixed_casing.csv (200 rows)
  Generated data/test_uploads/test_oversized.csv (...rows, ~60MB)
Done!
```

- [ ] **Step 3: Add test_uploads to .gitignore**

Append to `.gitignore`:

```
data/test_uploads/
```

- [ ] **Step 4: Commit**

```bash
git add operations/generate_test_data.py .gitignore
git commit -m "feat(upload): test data generator for PDP, AR, and course files"
```

---

## Task 12: Final Build Verification & Lint

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd codebenders-dashboard
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run lint**

```bash
cd codebenders-dashboard
npm run lint
```

Expected: No errors (warnings are acceptable).

- [ ] **Step 3: Run production build**

```bash
cd codebenders-dashboard
npm run build
```

Expected: Build succeeds with these new routes:
- `/admin/upload`
- `/admin/upload/history`
- `/api/admin/upload/preview`
- `/api/admin/upload/commit`
- `/api/admin/upload/history`

- [ ] **Step 4: Manual smoke test (if dev server available)**

```bash
cd codebenders-dashboard
npm run dev
```

Then navigate to `http://localhost:3000/admin/upload` (as admin user) and:
1. Verify the drop zone renders
2. Drop `data/test_uploads/test_pdp_cohort_ar.csv`
3. Verify preview shows detected schema and column mapping
4. Verify "Upload N Rows" button appears
5. Navigate to `/admin/upload/history`
6. Verify the history table renders (empty at first)

- [ ] **Step 5: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "fix: address lint issues in upload feature"
```

(Only if Step 2 required changes.)
