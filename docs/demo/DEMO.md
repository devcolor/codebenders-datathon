# Demo Script — AI-Powered Student Success Analytics

**Team:** CodeBenders — William Hill, Farron Rucker, Audrey Webb
**Duration:** 5–7 minutes
**Live URL:** `[your-vercel-url]`

---

## Before You Start

- Open the live dashboard in a browser tab (full screen, zoom 90%)
- Open a second tab ready on the `/query` page
- Open a third tab ready on the `/methodology` page
- Clear localStorage so prompt history is empty: DevTools → Application → Local Storage → delete `bishop_query_history`

---

## Talk Track

---

### [0:00 – 0:45] The Problem

> "Bishop State Community College in Mobile, Alabama serves about 4,000 students a year. 59% are Black or African American. 68% enroll part-time — they're balancing work, family, and school simultaneously. These are the students for whom early intervention matters most, and they're the ones most likely to fall through the cracks."

> "Bishop State's advisors had no unified way to see which students were at risk *before* academic difficulties compounded. PDP reporting is annual — there's no mid-cycle alerting. Gateway course failures in math and English are the number one predictor of non-retention, but that signal wasn't surfacing anywhere advisors could act on it."

> "We built a live, deployed platform to change that."

---

### [0:45 – 2:15] Dashboard Walkthrough

*Navigate to the dashboard home page (`/`).*

> "This is the live dashboard, backed by Supabase and deployed on Vercel. Every number here is live from our database."

**Point to the four KPI tiles:**

> "Four key metrics at a glance — overall retention rate, predicted retention from our ML models, the number of students at high or urgent risk right now, and average course completion rate across all 4,000 students."

**Point to the At-Risk Breakdown chart (right side):**

> "This is our at-risk alert breakdown. Our composite rule engine classifies every student as URGENT, HIGH, MODERATE, or LOW risk. Advisors can see immediately how many students need attention this week."

**Point to the Retention Risk Distribution chart:**

> "Retention risk distribution — the proportion of students in each risk band, powered by our Logistic Regression retention model."

**Point to the Readiness Distribution chart:**

> "And our PDP-aligned Readiness Index. 83.9% of Bishop State students score High Readiness — that's a strong baseline. The 16.1% in Medium is exactly where advisors should focus outreach."

**Click Export button:**

> "Everything on this dashboard is exportable — CSV, JSON, or a formatted Markdown report — ready to drop into a board presentation or grant application."

---

### [2:15 – 4:00] Natural Language Query Interface

*Switch to the `/query` tab. Institution is already set to Bishop State.*

> "Now here's where it gets interesting. Advisors and institutional researchers don't know SQL. They shouldn't have to. So we built a natural-language query interface powered by OpenAI."

**Type the first query:**

```
Show retention rate by credential type
```

> "I'll type a plain English question and hit Run."

*Wait for chart to render.*

> "OpenAI translates that into SQL against our `student_level_with_predictions` view, runs it against Supabase, and returns a bar chart — with the raw data table right below so you can verify every number."

**Type the second query:**

```
How many students are at urgent or high risk?
```

*Wait for result.*

> "Simple question, instant answer. No analyst needed, no ticket to file."

**Type the third query:**

```
Compare average readiness score between full-time and part-time students
```

*Wait for result.*

> "That's an equity gap query — exactly the kind of insight that strengthens a grant application or informs advising strategy."

**Point to the Prompt History panel that has appeared:**

> "Every query is logged here with a timestamp. One click to re-run any past query. And server-side, every query appends to a JSONL audit log — that's our FERPA compliance trail. No student PII is ever sent to OpenAI — only aggregate behavioral metrics."

---

### [4:00 – 5:15] Methodology Page

*Switch to the `/methodology` tab.*

> "Predictive tools in education live or die on trust. Advisors won't act on a score they can't explain. So we built a full methodology page."

**Scroll to the Readiness Index formula:**

> "Our Readiness Index is grounded in three bodies of research — the PDP momentum metrics, CCRC Multiple Measures, and Bird et al. 2021. The formula is transparent: Academic sub-score at 40%, Engagement at 30%, ML risk at 30%. Every student's score is fully traceable to its inputs."

**Scroll to the Worked Examples section:**

> "And we built worked examples. Maria T. is a full-time student with strong placement scores — we walk through exactly how her 0.699 High Readiness score was calculated. Jordan M. is a part-time student with remediation needs — his 0.386 Low Readiness walks through the same math. Any advisor can follow this. No data science background required."

---

### [5:15 – 6:00] Architecture & Impact

> "Under the hood: a Python ML pipeline running 7 models — XGBoost, Random Forest, and Logistic Regression — trained on Bishop State's 4,000 students with cross-validation. Results upsert into Supabase Postgres. The frontend is Next.js 16 with React 19, deployed on Vercel."

> "Seven prediction dimensions per student: retention probability, at-risk alert level, gateway math success, gateway English success, first-semester GPA risk, time-to-credential, and credential type. And the readiness engine runs as a separate step on top, producing the PDP-aligned composite score."

**Delivered metrics:**

> "4,000 students scored. Live platform deployed today. NLQ with audit trail. Methodology page with research citations. A deploy script that re-runs the full pipeline and re-deploys in one command."

---

### [6:00 – 6:30] Closing

> "This isn't a prototype — it's a deployed system advisors can use right now. The roadmap includes role-based access so advisors, leadership, and IR each see the right view, a student roster table with per-student drill-down, and dashboard filtering by cohort, demographic, and credential type."

> "The question Bishop State has always had the data to answer. We just built the tool to ask it."

---

## Example NLQ Queries (for live demo)

Use these in order — they build a narrative:

| Query | Why it works well |
|-------|------------------|
| `Show retention rate by credential type` | Clean bar chart, clear story |
| `How many students are at urgent or high risk?` | KPI-style answer, dramatic number |
| `Compare average readiness score between full-time and part-time students` | Equity gap — directly relevant to BSCC demographics |
| `Show the distribution of gateway math success probability` | Connects to the #1 retention risk factor |
| `Which cohort year has the lowest average readiness score?` | Useful for trend analysis demo |

---

## Screenshots to Capture

Save to `docs/screenshots/`. Use the live Vercel URL in the browser bar.

| Filename | What to capture |
|----------|----------------|
| `01-dashboard-kpis.png` | Top of home page: all four KPI tiles visible |
| `02-charts-overview.png` | Scroll to show all three charts in one view |
| `03-query-bar-chart.png` | NLQ result: "Show retention rate by credential type" with bar chart + data table |
| `04-query-kpi-result.png` | NLQ result: "How many students are at urgent or high risk?" |
| `05-prompt-history.png` | After running 2–3 queries: the history panel visible with Re-run buttons |
| `06-methodology-formula.png` | Methodology page: readiness formula section |
| `07-worked-examples.png` | Methodology page: Maria T. and Jordan M. side-by-side |
