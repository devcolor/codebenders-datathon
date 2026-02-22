**AI-Powered Student Success Analytics – Product Requirements Document (PRD)**

**1\. Overview**

This Product Requirements Document (PRD) defines the goals, requirements, and deliverables for the AI-Powered Student Success Analytics platform, developed by CodeBenders for the Datathon. The platform was built and deployed for **Bishop State Community College (BSCC)** — a historically Black community college serving ~4,000 students annually in Mobile, Alabama — and is designed to be extensible to other institutions using the Postsecondary Data Partnership (PDP) data standard.

The platform combines seven machine learning models, a rule-based readiness scoring engine, a natural-language query interface, and a live analytics dashboard to give advisors, faculty, and institutional leadership actionable, data-informed insights for improving student retention and success.

**2\. Problem Statement**

Bishop State Community College faces challenges common to community colleges serving under-resourced student populations:

• Students are majority Black/African American (59%), with high rates of part-time enrollment (68%) and first-generation college attendance — populations for whom early intervention is most impactful.

• Existing data systems lack unified predictive capabilities. Advisors cannot quickly identify which students are at risk before academic difficulties compound.

• Gateway course bottlenecks — particularly in math and English — are a leading predictor of non-retention, but course-level risk is not surfaced in existing tools.

• Institutional reporting is slow and manual, limiting the ability to act on PDP data between annual submission cycles.

**3\. Primary Users**

• **Advisors** – Need early-warning insights and student-level risk indicators to prioritize caseloads.

• **Institutional Researchers** – Need structured access to PDP + AR files + SIS data for analysis and federal reporting.

• **Faculty** – Need course-level success indicators, gateway course insights, and readiness trends by cohort.

• **Leadership** – Needs high-level retention, readiness, and enrollment metrics for resource planning and grant reporting.

• **IT/Data Teams** – Need a streamlined, automated, validated data submission and ingestion workflow.

**4\. Goals & Objectives**

1\. Deliver a unified analytics dashboard integrating PDP, AR, and institutional data for Bishop State.

2\. Provide seven predictive models covering retention, gateway course success, readiness, GPA risk, time-to-credential, and credential type outcomes.

3\. Enable natural-language queries for fast, self-service analytics without SQL knowledge.

4\. Surface a transparent, PDP-aligned readiness score for every student with human-readable explanations.

5\. Improve student success metrics by enabling early, data-informed interventions.

**5\. Scope**

IN SCOPE:

• Data ingestion pipeline (PDP → AR merge → institutional sources → Postgres/Supabase warehouse).

• Unified dashboard with NLQ (natural-language querying) and prompt history/audit trail.

• Seven predictive models: retention, at-risk early warning, gateway math success, gateway English success, GPA prediction, time-to-credential, credential type.

• Readiness index calculation (0.0–1.0 scale, PDP-aligned, rule-based with full traceability).

• Methodology page with research citations and worked examples.

• Live deployment to Vercel backed by hosted Supabase.

OUT OF SCOPE (for Datathon):

• Real-time pipelines beyond PDP/AR files.

• SIS system integration requiring institutional credentials.

• GitHub Actions CI/CD (manual deploy script provided as interim solution).

**6\. Institutional Requirements — Bishop State Community College**

• Role-based access to PDP dashboards for advisors, faculty, and leadership.

• A faculty-facing AI tool for chart generation and natural-language querying of student data.

• Course sequencing insights and identification of high-risk gateway courses.

• Readiness scoring that accounts for math placement level, enrollment intensity, and PDP momentum metrics.

• Transparent, explainable predictions that advisors can act on without data science expertise.

• FERPA-compliant data handling: no PII transmitted to LLM providers; student identifiers excluded from stored features.

**7\. Functional Requirements**

FR1. Data Integration

• System must ingest PDP cohort and course files.

• System must ingest AR files and merge with PDP using unique student IDs.

• System must support mapping to institutional data schemas.

FR2. Readiness Assessment

• System must compute a readiness score (0.0–1.0) composed of academic (40%), engagement (30%), and ML risk (30%) sub-scores.

• Score must be PDP-aligned, using the five PDP momentum metrics as inputs.

• Every score must be fully traceable to its input features (stored as JSONB, no PII).

• Score tier thresholds: High ≥ 0.65, Medium 0.40–0.64, Low < 0.40.

FR3. Predictive Analytics

• Seven predictive models: retention probability, at-risk alert level, gateway math success, gateway English success, first-semester GPA risk, time-to-credential, credential type.

• Models must provide calibrated probabilities, not just binary predictions.

• At-risk alerts must be consistent with retention probability (no contradictions).

FR4. Dashboard Requirements

• KPI tiles: overall retention rate, at-risk count, average readiness score, enrollment counts.

• Charts: retention risk distribution, readiness distribution, at-risk breakdown.

• Student-level drill-down with all prediction columns visible.

• Filtering by cohort, term, demographic attributes, and credential type.

FR5. AI Querying

• NLQ interface must translate natural-language prompts into SQL and return visualizations.

• Supported query types: retention trends, readiness distributions, gateway course performance, demographic equity gaps.

• All queries must be logged to a prompt history panel (client) and server-side audit log (JSONL).

• Users must be able to re-run any prior query from the history panel.

FR6. Role-Based Access

• Admin, Advisor, IR, Faculty, Leadership roles.

• Access rules must define PDP visibility, AR visibility, and student-level data controls.

FR7. Reporting & Methodology

• Methodology page must document the scoring formula, research citations (PDP, CCRC, CAPR), and worked examples showing end-to-end score calculations for both high- and low-readiness students.

• Server-side query audit log must be exportable for compliance review.

**8\. Non-Functional Requirements**

NFR1. Performance – Dashboard responses must render within 2–4 seconds for typical queries.

NFR2. Security – PDP and AR files contain PII; encryption at rest + access control required. No student identifiers transmitted to LLM providers.

NFR3. Maintainability – Models must be retrainable as new cohorts are added. Re-running the pipeline upserts scores without duplicates.

NFR4. Usability – Dashboards and methodology page must be accessible to non-technical users (advisors, faculty).

NFR5. Auditability – All data transformations and NLQ queries traceable for compliance (federal/state reporting). Prompt history logged server-side.

**9\. Data Pipeline Requirements**

• Must clean, validate, and conform PDP files to required schema.

• Must support merging PDP cohort + PDP course + AR files into a unified student-level dataset.

• Seven ML models trained and scored against the merged dataset in a single pipeline run.

• Rule-based readiness scoring run as a separate, re-runnable step after the ML pipeline.

• All outputs upserted to Postgres (Supabase) — no duplicates on re-run.

• Data refreshed by re-running `scripts/deploy.sh --with-data`.

**10\. Success Metrics**

• **4,000 Bishop State students** scored with retention probability, readiness level, and seven prediction columns.

• **Live deployment** at Vercel, backed by hosted Supabase (US East region).

• **Readiness engine** producing High (83.9%), Medium (16.1%) distributions with full PDP alignment.

• **NLQ interface** with prompt history, re-run, and server-side audit logging.

• **Methodology page** with research citations and worked examples for advisor trust and transparency.

• **Seven ML models** trained with cross-validation and overfitting checks, performance metrics stored in database.

**11\. Risks & Assumptions**

RISKS:

• AR and PDP data schemas vary by institution — onboarding additional institutions requires schema mapping work.

• Annual PDP submission cycles limit real-time insights between cohort years.

• Connection pooler configuration varies by Supabase region — must be verified per deployment.

ASSUMPTIONS:

• PDP + AR data is accessible and provided for Bishop State.

• Vercel serverless functions use the Supabase transaction pooler (port 6543), not the direct connection.

• Dashboard usage patterns will mirror reported advisor and faculty workflows.

**12\. Current Status & Next Steps**

DELIVERED:

• Full ML pipeline (7 models) trained and scored against 4,000 Bishop State students.

• Rule-based readiness engine (PDP-aligned) with audit logging.

• Live dashboard deployed to Vercel with Supabase backend.

• NLQ interface with prompt history and server-side audit trail.

• Methodology page with research citations, scoring formula, and worked examples.

NEXT STEPS:

• Set up GitHub Actions for automated Vercel deploy on push to `main` (interim: `scripts/deploy.sh`).

• Obtain `devcolor/codebenders-datathon` repo write access for CI/CD integration.

• Onboard additional institutions (University of Akron, KCTCS) using the same PDP-aligned pipeline.

• Add role-based access control (advisor vs. leadership vs. IR views).

• Explore scheduled pipeline re-runs for quarterly PDP refresh cycles.
