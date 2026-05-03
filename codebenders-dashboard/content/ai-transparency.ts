/**
 * AI Transparency Page Content
 *
 * Single source of truth for the /ai-transparency page. One entry per AI or
 * AI-adjacent surface actually deployed in the dashboard.
 *
 * Editing rule: this file describes what is RUNNING TODAY. Aspirational or
 * planned features go in `status: "in_development"` with a clear note about
 * what is and isn't live. If you find yourself writing "the system will..."
 * about a deployed feature, stop — say what it does NOW.
 */

export type AISurfaceStatus = "deployed" | "in_development"

export interface AISurface {
  id: string
  name: string
  status: AISurfaceStatus
  category: "ml_model" | "natural_language" | "explainability" | "data_api"
  homegrown: boolean
  provider: string | null
  algorithm: string
  version: string
  inputs: string[]
  trainingData: {
    source: string
    cohort: string
    rowCount?: string
  } | null
  runsOn: string
  dataFlow: string
  retentionPolicy: string
  notes?: string
}

export const AI_SURFACES: AISurface[] = [
  // ─────────────────────────── ML models (6, all homegrown) ───────────────────────────
  {
    id: "retention-prediction",
    name: "Retention Prediction",
    status: "deployed",
    category: "ml_model",
    homegrown: true,
    provider: null,
    algorithm:
      "XGBoost classifier (selected from XGBoost / Logistic Regression / Random Forest comparison in `ai_model/complete_ml_pipeline.py`)",
    version: "1.0",
    inputs: [
      "Cohort year and term",
      "Enrollment intensity (full-time / part-time)",
      "Pell eligibility",
      "First-generation status",
      "Year-1 GPA band",
      "Year-1 credits earned",
      "Program of study",
    ],
    trainingData: {
      source: "Bishop State Community College historical PDP submissions",
      cohort: "Cohorts 2018-2022",
      rowCount: "~4,000 students",
    },
    runsOn: "On-premise / institution-controlled infrastructure. No third-party inference API.",
    dataFlow:
      "Features are read from the institution's Postgres database, fed to the local XGBoost model, and the resulting probability is written back to `student_predictions` in the same database. No data leaves institutional infrastructure during inference.",
    retentionPolicy:
      "Predictions stored in `student_predictions`. The model file is checked into the institutional deployment.",
  },
  {
    id: "time-to-credential",
    name: "Time-to-Credential Prediction",
    status: "deployed",
    category: "ml_model",
    homegrown: true,
    provider: null,
    algorithm: "Random Forest regressor",
    version: "1.0",
    inputs: [
      "Cohort year and term",
      "Enrollment intensity",
      "Year-1 GPA band",
      "Year-1 credits earned",
      "Program of study",
      "Gateway math/English completion flags",
    ],
    trainingData: {
      source: "Bishop State Community College historical PDP submissions",
      cohort: "Cohorts 2018-2022 with observed credential completion",
      rowCount: "~4,000 students",
    },
    runsOn: "On-premise / institution-controlled infrastructure.",
    dataFlow:
      "Local-only inference. Features in from local Postgres, prediction out to local Postgres. No outbound network calls during inference.",
    retentionPolicy: "Predictions stored in `student_predictions`. Model file in institutional deployment.",
  },
  {
    id: "credential-type",
    name: "Credential Type Prediction",
    status: "deployed",
    category: "ml_model",
    homegrown: true,
    provider: null,
    algorithm:
      "Random Forest multi-class classifier (4 classes: No Credential, Certificate, Associate, Bachelor)",
    version: "1.0",
    inputs: [
      "Cohort year and term",
      "Enrollment intensity",
      "Year-1 GPA band",
      "Year-1 credits earned",
      "Program of study",
      "Gateway math/English completion flags",
    ],
    trainingData: {
      source: "Bishop State Community College historical PDP submissions",
      cohort: "Cohorts 2018-2022 with observed credential outcomes",
      rowCount: "~4,000 students",
    },
    runsOn: "On-premise / institution-controlled infrastructure.",
    dataFlow: "Local-only inference; per-class probabilities written to `student_predictions`.",
    retentionPolicy: "Predictions stored in `student_predictions`. No third-party data flow.",
  },
  {
    id: "gateway-math",
    name: "Gateway Math Success Prediction",
    status: "deployed",
    category: "ml_model",
    homegrown: true,
    provider: null,
    algorithm: "XGBoost classifier",
    version: "1.0",
    inputs: [
      "Cohort year and term",
      "Enrollment intensity",
      "Year-1 GPA band",
      "Math placement / readiness indicators",
      "Program of study",
    ],
    trainingData: {
      source: "Bishop State Community College historical PDP submissions",
      cohort: "Cohorts 2018-2022 with observed gateway math completion",
      rowCount: "~4,000 students",
    },
    runsOn: "On-premise / institution-controlled infrastructure.",
    dataFlow: "Local-only inference; probability written to `student_predictions`.",
    retentionPolicy: "Predictions stored in `student_predictions`. No third-party data flow.",
  },
  {
    id: "gateway-english",
    name: "Gateway English Success Prediction",
    status: "deployed",
    category: "ml_model",
    homegrown: true,
    provider: null,
    algorithm: "XGBoost classifier",
    version: "1.0",
    inputs: [
      "Cohort year and term",
      "Enrollment intensity",
      "Year-1 GPA band",
      "English placement / readiness indicators",
      "Program of study",
    ],
    trainingData: {
      source: "Bishop State Community College historical PDP submissions",
      cohort: "Cohorts 2018-2022 with observed gateway English completion",
      rowCount: "~4,000 students",
    },
    runsOn: "On-premise / institution-controlled infrastructure.",
    dataFlow: "Local-only inference; probability written to `student_predictions`.",
    retentionPolicy: "Predictions stored in `student_predictions`. No third-party data flow.",
  },
  {
    id: "low-gpa",
    name: "First-Semester Low-GPA Prediction",
    status: "deployed",
    category: "ml_model",
    homegrown: true,
    provider: null,
    algorithm: "XGBoost classifier",
    version: "1.0",
    inputs: [
      "Cohort year and term",
      "Enrollment intensity",
      "Pell eligibility",
      "First-generation status",
      "Program of study",
      "Pre-enrollment readiness indicators",
    ],
    trainingData: {
      source: "Bishop State Community College historical PDP submissions",
      cohort: "Cohorts 2018-2022 with observed first-semester GPA",
      rowCount: "~4,000 students",
    },
    runsOn: "On-premise / institution-controlled infrastructure.",
    dataFlow: "Local-only inference; probability written to `student_predictions`.",
    retentionPolicy: "Predictions stored in `student_predictions`. No third-party data flow.",
  },

  // ─────────────────────────── Natural-language surfaces (3 LLM-backed + 1 rule-based fallback) ───────────────────────────
  {
    id: "nlq-analyzer",
    name: "Natural-Language Query Analyzer (Prompt → SQL)",
    status: "deployed",
    category: "natural_language",
    homegrown: false,
    provider: "OpenAI",
    algorithm: "OpenAI gpt-4o-mini via the Vercel AI SDK (`@ai-sdk/openai`), called with a structured-output schema (Zod) to generate a query plan and SQL.",
    version: "gpt-4o-mini (OpenAI model snapshot at request time)",
    inputs: [
      "The user's natural-language prompt as typed in `/query`",
      "The database schema description for the institution (table names, column names, column descriptions) — embedded in the prompt template at `app/api/analyze/route.ts`",
      "The institution code (e.g., `bscc`)",
    ],
    trainingData: null,
    runsOn:
      "Inference runs on OpenAI's infrastructure. The dashboard server (Next.js API route at `/api/analyze`) is the caller; the API key is held server-side only.",
    dataFlow:
      "When a user submits a natural-language query: (1) the prompt is sent from the browser to our `/api/analyze` route. (2) The route sends the user prompt + the institution's schema description + few-shot SQL examples to OpenAI's chat completions API (`gpt-4o-mini`). (3) OpenAI returns a structured query plan, including the SQL to execute. (4) The SQL is then executed against the institution's database (no further OpenAI involvement).\n\nNo student-level row data is sent to OpenAI — only the schema description (column names + plain-English column descriptions). The user's prompt itself is sent verbatim. Student_GUID is explicitly listed as FERPA-excluded in the prompt template.",
    retentionPolicy:
      "OpenAI's API data-handling policy applies to the prompt and schema description. As of this writing, OpenAI states that data submitted via the API is not used to train their models. We do not separately log prompts or responses to a third-party store.",
    notes:
      "If `OPENAI_API_KEY` is not configured, the route returns a 500 error and the client falls back to the rule-based analyzer (`prompt-analyzer.ts`, see next entry).",
  },
  {
    id: "nlq-rule-based-fallback",
    name: "Natural-Language Query — Rule-Based Fallback",
    status: "deployed",
    category: "natural_language",
    homegrown: true,
    provider: null,
    algorithm:
      "Hand-rolled keyword matcher in `codebenders-dashboard/lib/prompt-analyzer.ts`. The prompt is lowercased and checked against a fixed set of substrings (e.g., `\"retention\"`, `\"by cohort\"`, `\"2024\"`) which map to a `metric`, `groupBy`, and `filters` shape.",
    version: "1.0",
    inputs: [
      "The user's natural-language prompt (lowercased and substring-matched only)",
      "The institution code (used to construct the data-API URL)",
    ],
    trainingData: null,
    runsOn: "Runs in the user's browser. No outbound network call by the analyzer itself.",
    dataFlow:
      "Pure local string matching. The analyzer does not transmit the prompt anywhere. It produces a query plan; the resulting query is then executed against either the local API (`/api/execute-sql`) or the external `schools.syntex-ai.com` data API (see Data API entry).",
    retentionPolicy: "Nothing is retained by the analyzer.",
    notes:
      "Used as a fallback for the LLM-backed analyzer when OpenAI is unavailable or when running in offline / cost-sensitive contexts. Coverage is narrow — recognizes a fixed list of keywords. Outside that set, results degrade to a generic COUNT(*) query.",
  },
  {
    id: "query-summary",
    name: "Query Result Summarizer",
    status: "deployed",
    category: "natural_language",
    homegrown: false,
    provider: "OpenAI",
    algorithm: "OpenAI gpt-4o-mini, called from `/api/query-summary` to generate a short narrative summary of a tabular query result.",
    version: "gpt-4o-mini",
    inputs: [
      "The user's original prompt",
      "Up to N capped rows of the SQL query result (rows are capped server-side before transmission to limit token usage and bound exposure)",
    ],
    trainingData: null,
    runsOn:
      "Inference on OpenAI infrastructure. Caller is the dashboard server route at `app/api/query-summary/route.ts`.",
    dataFlow:
      "The capped result rows + the user's prompt are sent to OpenAI's chat completions API. The narrative summary returned by OpenAI is rendered in the UI. Whether row contents include student-level data depends on the SQL the analyzer produced — Student_GUID is FERPA-excluded by prompt design, but other student attributes may appear in result rows depending on the query.",
    retentionPolicy:
      "OpenAI API data-handling policy applies. We do not log prompts/responses to a separate third-party store.",
    notes:
      "This is the highest-sensitivity OpenAI surface in the system because *result rows* (not just schema) are transmitted. Institutions evaluating procurement should review the row cap and the query-design FERPA exclusions in `/api/analyze/route.ts`.",
  },
  {
    id: "explain-pairing",
    name: "Course-Pairing Explainer",
    status: "deployed",
    category: "natural_language",
    homegrown: false,
    provider: "OpenAI",
    algorithm:
      "OpenAI gpt-4o-mini, called from `/api/courses/explain-pairing` to generate a natural-language explanation of why two courses appear to be paired (co-enrollment patterns, sequencing, success-rate correlation).",
    version: "gpt-4o-mini",
    inputs: [
      "Two course identifiers (prefix + number)",
      "Aggregated co-enrollment statistics for the pair (counts, success rates, sequencing) computed server-side before transmission",
    ],
    trainingData: null,
    runsOn: "Inference on OpenAI infrastructure. Caller is the dashboard server route.",
    dataFlow:
      "Pre-aggregated, course-level statistics (no student-level rows) are sent to OpenAI along with the prompt template. The natural-language explanation is rendered in the UI.",
    retentionPolicy:
      "OpenAI API data-handling policy applies. No separate third-party logging.",
    notes:
      "Student-level data is NOT sent for this surface — only course-pair aggregates.",
  },

  // ─────────────────────────── Data API (third-party host) ───────────────────────────
  {
    id: "syntex-data-api",
    name: "External Analysis-Ready Data API",
    status: "deployed",
    category: "data_api",
    homegrown: false,
    provider: "schools.syntex-ai.com (project-controlled hosting; not the institution's own infrastructure)",
    algorithm:
      "REST endpoint that returns analysis-ready rows for a given institution and filter set. Not an AI model — included on this page because student data flows to a non-institutional host.",
    version: "live API; no version pin",
    inputs: [
      "Institution code in the URL path (e.g., `bscc`, `akron`)",
      "Filter parameters (cohort, enrollment_status, etc.)",
      "Pagination (`limit`, `offset`)",
    ],
    trainingData: null,
    runsOn: "schools.syntex-ai.com — hosted by the project team, not by the institution.",
    dataFlow:
      "When the dashboard is run in `useDirectDB = false` mode (default for some query paths in `lib/query-executor.ts`), query plans are converted into URL parameters and fetched from `https://schools.syntex-ai.com/<institution>/analysis-ready`. The API returns analysis-ready rows that the dashboard then groups/aggregates client-side.\n\nWhen `useDirectDB = true`, queries go to the local `/api/execute-sql` route instead and never reach syntex-ai.com.",
    retentionPolicy:
      "Logging and retention at schools.syntex-ai.com are governed by the project deployment, not by the institution. Institutions evaluating procurement should ask whether their deployment uses direct-DB mode or the external API.",
    notes:
      "This entry exists for full-stack transparency: institutions deploying this dashboard should know that, in default configuration for some queries, student-level rows are returned from a non-institutional host. A deployment hardening option to force `useDirectDB = true` end-to-end is tracked as a follow-up issue.",
  },

  // ─────────────────────────── In-development ───────────────────────────
  {
    id: "shap-narrator",
    name: "SHAP Narrator (Per-Student Explanations)",
    status: "in_development",
    category: "explainability",
    homegrown: true,
    provider: null,
    algorithm:
      "Fine-tuned small language model (Qwen 3.5-4B / Gemma 4 E4B candidates) generating natural-language explanations from SHAP feature attributions over the deployed XGBoost / Random Forest models.",
    version: "0.1 (in development — not yet deployed)",
    inputs: [
      "SHAP feature-attribution values from the deployed models",
      "Student demographic and academic features (same set as the underlying prediction)",
      "Prediction outcome (e.g., 'at risk' / 'on track')",
    ],
    trainingData: {
      source:
        "Distillation pairs generated from a teacher model over Bishop State predictions; tracked in issues #97, #99, #100.",
      cohort: "Bishop State student predictions (training-only).",
    },
    runsOn:
      "Planned: on-premise / institution-controlled inference. Final hosting decision tracked in issues #101, #102.",
    dataFlow:
      "When deployed: SHAP values + features go in locally, natural-language explanation comes out locally — no third-party inference API. During DEVELOPMENT only, training-data distillation passes through Colab notebooks (issue #98). The dashboard does NOT show SHAP-narrated explanations to users today.",
    retentionPolicy:
      "Not yet deployed. When deployed, generated explanations will be stored alongside the underlying prediction. No third-party storage planned.",
    notes:
      "Listed here for full lifecycle transparency. Institutions evaluating procurement should know what is coming as well as what is running.",
  },
]
