import { type NextRequest, NextResponse } from "next/server"
import { streamObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

const queryPlanSchema = z.object({
  metric: z.string().optional(),
  groupBy: z.string().optional(),
  filters: z.record(z.any()).optional(),
  timeHint: z.string().optional(),
  vizType: z.enum(["line", "bar", "pie", "kpi", "table"]),
  sql: z.string(),
  queryString: z.string().optional(),
})

// Database schema configuration
// IMPORTANT: Column names listed here are the EXACT case-sensitive names in PostgreSQL.
// Mixed-case columns (e.g. "Cohort", "Retention") must be double-quoted in generated SQL.
// All-lowercase columns (e.g. retention_probability) do not require quoting.
interface SchemaEntry {
  database: string
  mainTable: string
  description?: string
  columns: Record<string, string>
  courseTable?: string
  courseColumns?: Record<string, string>
  ferpaExcluded?: string[]
}

const SCHEMA_INFO: Record<string, SchemaEntry> = {
  bscc: {
    database: "postgres",
    mainTable: "student_level_with_predictions",
    description: "Bishop State Community College student cohort data with retention, persistence, and completion metrics",
    columns: {
      // Key dimensions — MIXED CASE: must be double-quoted in SQL
      Cohort: "Cohort year (numeric: 2019, 2020, etc.) — write as \"Cohort\"",
      Cohort_Term: "Term of cohort entry (Fall, Spring, Summer) — write as \"Cohort_Term\"",
      Student_GUID: "Unique student identifier — write as \"Student_GUID\"",
      Institution_ID: "Institution identifier (102030 for Bishop State) — write as \"Institution_ID\"",

      // Demographics — MIXED CASE: must be double-quoted in SQL
      Gender: "Student gender — write as \"Gender\"",
      Race: "Student race/ethnicity — write as \"Race\"",
      Student_Age: "Age of student (integer) — write as \"Student_Age\"",
      First_Gen: "First generation status — write as \"First_Gen\"",

      // Academic info — MIXED CASE: must be double-quoted in SQL
      Enrollment_Type: "Type of enrollment — write as \"Enrollment_Type\"",
      Enrollment_Intensity_First_Term: "Enrollment intensity in first term (Full-Time, Part-Time) — write as \"Enrollment_Intensity_First_Term\"",
      Program_of_Study_Year_1: "Program of study in year 1 (CIP code) — write as \"Program_of_Study_Year_1\"",
      Credential_Type_Sought_Year_1: "Credential type being pursued — write as \"Credential_Type_Sought_Year_1\"",
      Math_Placement: "Math placement level (C=college-level, R=remedial, N=none) — write as \"Math_Placement\"",

      // Performance metrics — MIXED CASE: must be double-quoted in SQL
      Retention: "Retention indicator (0 or 1) — write as \"Retention\"",
      Persistence: "Persistence indicator (0 or 1) — write as \"Persistence\"",
      GPA_Group_Year_1: "GPA in year 1 — write as \"GPA_Group_Year_1\"",
      GPA_Group_Term_1: "GPA in term 1 — write as \"GPA_Group_Term_1\"",

      // Credits — MIXED CASE: must be double-quoted in SQL
      Number_of_Credits_Attempted_Year_1: "Credits attempted in year 1 — write as \"Number_of_Credits_Attempted_Year_1\"",
      Number_of_Credits_Earned_Year_1: "Credits earned in year 1 — write as \"Number_of_Credits_Earned_Year_1\"",
      Number_of_Credits_Attempted_Year_2: "Credits attempted in year 2 — write as \"Number_of_Credits_Attempted_Year_2\"",
      Number_of_Credits_Earned_Year_2: "Credits earned in year 2 — write as \"Number_of_Credits_Earned_Year_2\"",

      // Completion metrics — MIXED CASE: must be double-quoted in SQL
      Time_to_Credential: "Time to any credential — write as \"Time_to_Credential\"",

      // ML predictions — all lowercase: no quoting needed
      retention_probability: "Predicted probability of retention (0-1)",
      retention_risk_category: "Risk category (Low Risk, Moderate Risk, High Risk, Critical Risk)",
      at_risk_alert: "Early warning alert level (LOW, MODERATE, HIGH, URGENT)",
      course_completion_rate: "Course completion rate (0-1)",
      passing_rate: "Course passing rate (0-1)",
    },
    courseTable: "course_enrollments",
    courseColumns: {
      course_prefix:     "Course dept code ('MAT','ENG','NUR','CIS', etc.) — lowercase, no quoting",
      course_number:     "Course number ('100','201', etc.) — lowercase, no quoting",
      course_name:       "Full course name — lowercase, no quoting",
      grade:             "Student grade: 'A','B','C','D','F','W','I','AU','P' — lowercase, no quoting",
      delivery_method:   "Delivery: 'F'=face-to-face, 'O'=online, 'H'=hybrid — lowercase, no quoting",
      instructor_status: "Instructor type: 'FT'=full-time, 'PT'=part-time — lowercase, no quoting",
      gateway_type:      "Gateway: 'M'=math gateway, 'E'=English gateway, 'N'=not a gateway — lowercase",
      credits_attempted: "Credits attempted (numeric)",
      credits_earned:    "Credits earned (numeric)",
      cohort:            "Cohort year as text — lowercase, no quoting",
      academic_year:     "Academic year e.g. '2021-22' — lowercase, no quoting",
      academic_term:     "Term e.g. 'FALL','SPRING','SUMMER' — lowercase, no quoting",
    },
    ferpaExcluded: ["Student_GUID", "student_guid"],
  },
  akron: {
    database: "University_of_Akron",
    mainTable: "cohort",
    description: "University of Akron student cohort data — same schema as Bishop State",
    columns: {},
  },
}

// Simple test endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", message: "Analyze route is loaded" })
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, institution } = await request.json()

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }

    const schemaInfo = SCHEMA_INFO[institution as keyof typeof SCHEMA_INFO] || SCHEMA_INFO.bscc

    const streamResult = streamObject({
      model: openai("gpt-4o-mini"),
      schema: queryPlanSchema,
      prompt: `You are a SQL query generator for student success analytics using PostgreSQL.

AVAILABLE TABLES:

1. ${schemaInfo.mainTable} — student-level analytics
   USE FOR: retention rates, persistence, GPA, demographics, risk scores, credential predictions, enrollment counts
   COLUMNS:
${Object.entries(schemaInfo.columns).map(([col, desc]) => `   - ${col}: ${desc}`).join("\n")}

2. ${schemaInfo.courseTable ?? "course_enrollments"} — individual course enrollment records
   USE FOR: DFW/DFWI rates by course, pass rates by course, gateway course outcomes, delivery method analysis, instructor type analysis
   NOTE: This table has NO institution_id column. Do NOT add institution filters — data is already scoped to this institution.
   COLUMNS:
${Object.entries(schemaInfo.courseColumns ?? {}).map(([col, desc]) => `   - ${col}: ${desc}`).join("\n")}

TABLE SELECTION RULE: If the question mentions "courses", "DFW", "DFWI", "withdrawal rate", "pass rate by course", "gateway course", "failing courses", "course outcomes" → use ${schemaInfo.courseTable ?? "course_enrollments"}. Otherwise use ${schemaInfo.mainTable}.

CRITICAL SCHEMA NOTES (for ${schemaInfo.mainTable}):
- Column names with uppercase letters MUST be double-quoted in PostgreSQL SQL or the query will fail.
  CORRECT:   WHERE "Cohort" = 2023 AND "Cohort_Term" = 'Fall'
  INCORRECT: WHERE cohort = 2023 AND cohort_term = 'Fall'
- "Cohort": NUMERIC year only (e.g., 2019, 2020) — NOT a string like "2024-Fall"
- "Cohort_Term": Term name (e.g., "Fall", "Spring", "Summer")
- To filter by "Fall 2023", use: WHERE "Cohort" = 2023 AND "Cohort_Term" = 'Fall'
- "Student_Age": INTEGER field — use direct numeric comparisons (e.g., "Student_Age" >= 25)
- Lowercase ML columns (retention_probability, at_risk_alert, etc.) do NOT need quoting.
- Use standard PostgreSQL syntax — no backtick quoting, no cross-database references

COMPUTING DFWI RATE from course_enrollments (returns 0–1, display layer multiplies by 100):
  ROUND(COUNT(*) FILTER (WHERE grade IN ('D','F','W','I'))::numeric / NULLIF(COUNT(*), 0), 4) AS dfwi_rate

COMPUTING PASS RATE from course_enrollments (returns 0–1, display layer multiplies by 100):
  ROUND(COUNT(*) FILTER (WHERE grade NOT IN ('D','F','W','I') AND grade IS NOT NULL AND grade != '')::numeric / NULLIF(COUNT(*), 0), 4) AS pass_rate

FERPA COMPLIANCE — NEVER include these in SELECT output:
  Student_GUID, student_guid
Do not expose individual student identifiers in query results.

IMPORTANT QUERY INTERPRETATION RULES:

1. METRIC SELECTION:
   - ONLY include a metric if the user explicitly asks for retention, persistence, GPA, credits, etc.
   - If user asks to "segment", "compare", "show", "count", or "list" students → use COUNT(*) and NO specific metric
   - "retention" → AVG("Retention") as retention_rate
   - "persistence" or "completion" → AVG("Persistence") as completion_rate
   - "GPA" → AVG("GPA_Group_Year_1") as gpa
   - "credits" → AVG("Number_of_Credits_Earned_Year_1") as credits_earned
   - Otherwise → COUNT(*) as count

2. GROUPING & SEGMENTATION:
   - "segment by X" or "compare X" → GROUP BY X column
   - "by age", "age groups", "segment by age" → Use CASE statement to create age groups:
     CASE
       WHEN "Student_Age" < 25 THEN 'Under 25'
       WHEN "Student_Age" >= 25 THEN '25 and Over'
     END AS age_group
   - "by gender" → GROUP BY "Gender"
   - "by race" → GROUP BY "Race"
   - "by cohort" → GROUP BY "Cohort"
   - "by term" → GROUP BY "Cohort_Term"

3. FILTERS:
   - "2023 cohort" → WHERE "Cohort" = 2023
   - "Fall 2023" or "2023 Fall" → WHERE "Cohort" = 2023 AND "Cohort_Term" = 'Fall'
   - Age filters: use numeric comparisons directly (e.g., "Student_Age" >= 25)

4. VISUALIZATION:
   - Comparing groups (age, gender, race, courses) → "bar"
   - Time series (cohort, term over time) → "line"
   - Single number → "kpi"
   - Percentages/shares → "pie"
   - Many rows → "table"

USER QUERY: ${prompt}
INSTITUTION: ${institution}

Generate a query plan with:
- metric: semantic metric name OR leave undefined if just counting [OPTIONAL]
- groupBy: semantic grouping field [OPTIONAL]
- filters: any filters to apply [OPTIONAL]
- timeHint: human-readable time description [OPTIONAL]
- vizType: appropriate visualization [REQUIRED]
- sql: VALID executable PostgreSQL query against the appropriate table (${schemaInfo.mainTable} or course_enrollments) [REQUIRED]
- queryString: empty string [OPTIONAL]

EXAMPLE for "segment students over 25 and under 25 in 2023 cohort":
{
  "vizType": "bar",
  "sql": "SELECT CASE WHEN \"Student_Age\" < 25 THEN 'Under 25' ELSE '25 and Over' END AS age_group, COUNT(*) as count FROM student_level_with_predictions WHERE \"Cohort\" = 2023 GROUP BY age_group ORDER BY age_group",
  "queryString": ""
}

EXAMPLE for "top 5 courses with highest DFW rates":
{
  "vizType": "bar",
  "sql": "SELECT course_prefix || ' ' || course_number AS course, MAX(course_name) AS course_name, COUNT(*) AS enrollments, ROUND(COUNT(*) FILTER (WHERE grade IN ('D','F','W','I'))::numeric / NULLIF(COUNT(*), 0), 4) AS dfwi_rate FROM course_enrollments GROUP BY course_prefix, course_number HAVING COUNT(*) >= 10 ORDER BY dfwi_rate DESC LIMIT 5",
  "queryString": ""
}

Make sure the SQL is valid PostgreSQL and addresses exactly what the user asked for!`,
    })

    let finalObject: any = {}
    for await (const partialObject of streamResult.partialObjectStream) {
      finalObject = partialObject
    }

    const result = {
      ...finalObject,
      queryString: finalObject.queryString || "",
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[analyze] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze prompt",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
