import { type NextRequest, NextResponse } from "next/server"
import { streamObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

console.log("openai", openai)

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
  kctcs: {
    database: "Kentucky_Community_and_Technical_College_System",
    mainTable: "cohort",
    description: "Student cohort data with retention, persistence, and completion metrics",
    columns: {
      // Key dimensions
      Cohort: "Cohort year (numeric: 2024, 2025, etc.)",
      Cohort_Term: "Term of cohort entry (Fall, Spring, Summer)",
      Student_GUID: "Unique student identifier",
      Institution_ID: "Institution identifier",
      
      // Demographics
      Gender: "Student gender",
      Race: "Student race",
      Ethnicity: "Student ethnicity",
      Student_Age: "Age of student",
      First_Gen: "First generation status",
      NASPA_First_Generation: "NASPA first generation indicator (numeric)",
      
      // Academic info
      Enrollment_Type: "Type of enrollment",
      Enrollment_Intensity_First_Term: "Enrollment intensity in first term",
      Program_of_Study_Year_1: "Program of study in year 1",
      Credential_Type_Sought_Year_1: "Credential type being pursued",
      
      // Performance metrics
      Retention: "Retention indicator (0 or 1)",
      Persistence: "Persistence indicator (0 or 1)",
      GPA_Group_Year_1: "GPA in year 1",
      GPA_Group_Term_1: "GPA in term 1",
      
      // Credits
      Number_of_Credits_Attempted_Year_1: "Credits attempted in year 1",
      Number_of_Credits_Earned_Year_1: "Credits earned in year 1",
      Number_of_Credits_Attempted_Year_2: "Credits attempted in year 2",
      Number_of_Credits_Earned_Year_2: "Credits earned in year 2",
      
      // Completion metrics
      Years_to_Bachelors_at_cohort_inst_: "Years to bachelor's at cohort institution",
      Years_to_Associates_or_Certificate_at_cohort_inst_: "Years to associate's or certificate at cohort institution",
      Time_to_Credential: "Time to any credential",
      
      // Placement
      Math_Placement: "Math placement level",
      English_Placement: "English placement level",
      Gateway_Math_Status: "Gateway math status",
      Gateway_English_Status: "Gateway English status",
    }
  },
  akron: {
    database: "University_of_Akron",
    mainTable: "cohort",
    description: "Student cohort data - same schema as KCTCS",
    columns: {} // Same as KCTCS
  }
}

// Simple test endpoint
export async function GET() {
  console.log("[analyze] GET request received - route is working!")
  return NextResponse.json({ status: "ok", message: "Analyze route is loaded" })
}

export async function POST(request: NextRequest) {
  console.log("[analyze] POST request received")
  
  try {
    const { prompt, institution } = await request.json()

    console.log("[analyze] prompt:", prompt)
    console.log("[analyze] institution:", institution)
    console.log("[analyze] OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY)
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("[analyze] Missing OPENAI_API_KEY!")
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      )
    }
    
    const schemaInfo = SCHEMA_INFO[institution as keyof typeof SCHEMA_INFO] || SCHEMA_INFO.kctcs
    console.log("[analyze] Using schema for:", schemaInfo.database)

    console.log("[analyze] Calling streamObject...")
    const streamResult = await streamObject({
      model: openai("gpt-4o-mini"),
      schema: queryPlanSchema,
      prompt: `You are a SQL query generator for student success analytics.

DATABASE SCHEMA:
- Database: ${schemaInfo.database}
- Main Table: ${schemaInfo.mainTable}
- Description: ${schemaInfo.description}

KEY COLUMNS:
${Object.entries(schemaInfo.columns).map(([col, desc]) => `- ${col}: ${desc}`).join('\n')}

CRITICAL SCHEMA NOTES:
- Cohort: NUMERIC year only (e.g., 2024, 2025) - NOT a string like "2024-Fall"
- Cohort_Term: Term name (e.g., "Fall", "Spring", "Summer")
- To filter by "2024 Fall", use: WHERE Cohort = 2024 AND Cohort_Term = 'Fall'
- Student_Age: VARCHAR field - must use CAST(Student_Age AS UNSIGNED) for numeric comparisons

IMPORTANT QUERY INTERPRETATION RULES:

1. METRIC SELECTION:
   - ONLY include a metric if the user explicitly asks for retention, persistence, GPA, credits, etc.
   - If user asks to "segment", "compare", "show", "count", or "list" students → use COUNT(*) and NO specific metric
   - "retention" → AVG(Retention) as retention_rate
   - "persistence" or "completion" → AVG(Persistence) as completion_rate
   - "GPA" → AVG(GPA_Group_Year_1) as gpa
   - "credits" → AVG(Number_of_Credits_Earned_Year_1) as credits_earned
   - Otherwise → COUNT(*) as count

2. GROUPING & SEGMENTATION:
   - "segment by X" or "compare X" → GROUP BY X column
   - "by age", "age groups", "segment by age" → Use CASE statement to create age groups:
     CASE 
       WHEN CAST(Student_Age AS UNSIGNED) < 25 THEN 'Under 25'
       WHEN CAST(Student_Age AS UNSIGNED) >= 25 THEN '25 and Over'
     END AS age_group
   - "by gender" → GROUP BY Gender
   - "by race" → GROUP BY Race
   - "by cohort" → GROUP BY Cohort
   - "by term" → GROUP BY Cohort_Term

3. FILTERS:
   - "2024 cohort" → WHERE Cohort = 2024
   - "Fall 2024" or "2024 Fall" → WHERE Cohort = 2024 AND Cohort_Term = 'Fall'
   - "last two terms" → Look at recent Cohort and Cohort_Term combinations
   - Age filters: Use CAST(Student_Age AS UNSIGNED) for comparisons (e.g., CAST(Student_Age AS UNSIGNED) >= 25)

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
- sql: VALID executable MySQL query [REQUIRED]
- queryString: empty string [OPTIONAL]

EXAMPLE for "segment students over 25 and under 25 in 2024 cohort":
{
  "vizType": "bar",
  "sql": "SELECT CASE WHEN CAST(Student_Age AS UNSIGNED) < 25 THEN 'Under 25' ELSE '25 and Over' END AS age_group, COUNT(*) as count FROM \`${schemaInfo.database}\`.cohort WHERE Cohort = 2024 GROUP BY age_group ORDER BY age_group",
  "queryString": ""
}

Make sure the SQL is executable and addresses exactly what the user asked for!`,
    })
    console.log("[analyze] streamObject call completed")
    console.log("[analyze] streamResult keys:", Object.keys(streamResult))
    
    // The streamObject returns a promise-like object that resolves to the final value
    // We need to consume the stream to get the final object
    console.log("[analyze] Reading from stream...")
    
    let finalObject: any = {}
    
    // Consume the stream
    for await (const partialObject of streamResult.partialObjectStream) {
      finalObject = partialObject
    }
    
    console.log("[analyze] Stream consumed, final object:", finalObject)
    
    // Ensure queryString has a default value
    const result = {
      ...finalObject,
      queryString: finalObject.queryString || "",
    }
    
    console.log("[analyze] Returning result:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[analyze] Error in /api/analyze:", error)
    console.error("[analyze] Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json(
      { 
        error: "Failed to analyze prompt",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
