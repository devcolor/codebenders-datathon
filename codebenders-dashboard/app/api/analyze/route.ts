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
const SCHEMA_INFO = {
  bscc: {
    database: "postgres",
    mainTable: "student_level_with_predictions",
    description: "Bishop State Community College student cohort data with retention, persistence, and completion metrics",
    columns: {
      // Key dimensions
      cohort: "Cohort year (numeric: 2019, 2020, etc.)",
      cohort_term: "Term of cohort entry (Fall, Spring, Summer)",
      student_guid: "Unique student identifier",
      institution_id: "Institution identifier (102030 for Bishop State)",

      // Demographics
      gender: "Student gender",
      race: "Student race/ethnicity",
      student_age: "Age of student",
      first_gen: "First generation status",

      // Academic info
      enrollment_type: "Type of enrollment",
      enrollment_intensity_first_term: "Enrollment intensity in first term (Full-Time, Part-Time)",
      program_of_study_year_1: "Program of study in year 1 (CIP code)",
      credential_type_sought_year_1: "Credential type being pursued",

      // Performance metrics
      retention: "Retention indicator (0 or 1)",
      persistence: "Persistence indicator (0 or 1)",
      gpa_group_year_1: "GPA in year 1",
      gpa_group_term_1: "GPA in term 1",

      // Credits
      number_of_credits_attempted_year_1: "Credits attempted in year 1",
      number_of_credits_earned_year_1: "Credits earned in year 1",
      number_of_credits_attempted_year_2: "Credits attempted in year 2",
      number_of_credits_earned_year_2: "Credits earned in year 2",

      // Completion metrics
      time_to_credential: "Time to any credential",

      // ML predictions
      retention_probability: "Predicted probability of retention (0-1)",
      retention_risk_category: "Risk category (Low Risk, Moderate Risk, High Risk, Critical Risk)",
      at_risk_alert: "Early warning alert level (LOW, MODERATE, HIGH, URGENT)",
      predicted_gpa: "ML-predicted GPA",
    },
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

DATABASE SCHEMA:
- Main Table: ${schemaInfo.mainTable}
- Description: ${schemaInfo.description}

KEY COLUMNS:
${Object.entries(schemaInfo.columns).map(([col, desc]) => `- ${col}: ${desc}`).join("\n")}

CRITICAL SCHEMA NOTES:
- cohort: NUMERIC year only (e.g., 2019, 2020) — NOT a string like "2024-Fall"
- cohort_term: Term name (e.g., "Fall", "Spring", "Summer")
- To filter by "Fall 2023", use: WHERE cohort = 2023 AND cohort_term = 'Fall'
- student_age: INTEGER field — use direct numeric comparisons (e.g., student_age >= 25)
- Use standard PostgreSQL syntax — no backtick quoting, no cross-database references

IMPORTANT QUERY INTERPRETATION RULES:

1. METRIC SELECTION:
   - ONLY include a metric if the user explicitly asks for retention, persistence, GPA, credits, etc.
   - If user asks to "segment", "compare", "show", "count", or "list" students → use COUNT(*) and NO specific metric
   - "retention" → AVG(retention) as retention_rate
   - "persistence" or "completion" → AVG(persistence) as completion_rate
   - "GPA" → AVG(gpa_group_year_1) as gpa
   - "credits" → AVG(number_of_credits_earned_year_1) as credits_earned
   - Otherwise → COUNT(*) as count

2. GROUPING & SEGMENTATION:
   - "segment by X" or "compare X" → GROUP BY X column
   - "by age", "age groups", "segment by age" → Use CASE statement to create age groups:
     CASE
       WHEN student_age < 25 THEN 'Under 25'
       WHEN student_age >= 25 THEN '25 and Over'
     END AS age_group
   - "by gender" → GROUP BY gender
   - "by race" → GROUP BY race
   - "by cohort" → GROUP BY cohort
   - "by term" → GROUP BY cohort_term

3. FILTERS:
   - "2023 cohort" → WHERE cohort = 2023
   - "Fall 2023" or "2023 Fall" → WHERE cohort = 2023 AND cohort_term = 'Fall'
   - Age filters: use numeric comparisons directly (e.g., student_age >= 25)

4. VISUALIZATION:
   - Comparing groups (age, gender, race) → "bar"
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
- sql: VALID executable PostgreSQL query against table "${schemaInfo.mainTable}" [REQUIRED]
- queryString: empty string [OPTIONAL]

EXAMPLE for "segment students over 25 and under 25 in 2023 cohort":
{
  "vizType": "bar",
  "sql": "SELECT CASE WHEN student_age < 25 THEN 'Under 25' ELSE '25 and Over' END AS age_group, COUNT(*) as count FROM student_level_with_predictions WHERE cohort = 2023 GROUP BY age_group ORDER BY age_group",
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
