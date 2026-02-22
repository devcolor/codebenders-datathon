# Gamma.app Slide Deck Update Prompt

Paste the prompt below into Gamma.app to update the **AI-Powered Student Success Analytics** slide deck.
The current deck has 13 slides. This prompt tells you exactly what to change on each slide.

---

## Overall Framing

- The platform is **live and deployed** for **Bishop State Community College (BSCC)**, a historically Black community college in Mobile, Alabama (~4,000 students/year). It is **not** a multi-institution prototype.
- Remove University of Akron and KCTCS as co-equal institutions. They may appear only as "future institution onboarding" examples.
- Replace all "will build / planned / customize for your context" language with "built / delivered / live."
- Add Bishop State's colors (navy and gold) as accent colors where appropriate.

---

## Slide-by-Slide Instructions

---

### Slide 1 — Title / Cover

**Current:** "AI-Powered Student Success Analytics · Transforming higher education data into actionable insights that improve student readiness, retention, and institutional outcomes · Team CodeBenders · William Hill · Farron Rucker · Audrey Webb"

**Change to:**
- Title: **AI-Powered Student Success Analytics**
- Subtitle: **Bishop State Community College × CodeBenders**
- Below subtitle: `Live at [your-vercel-url]`
- Tagline: *Turning PDP data into proactive student interventions*
- Keep team names

---

### Slide 2 — The Challenge (currently "Three Institutions, One Critical Gap")

**Current:** Three-column layout showing University of Akron, Bishop State Community College, and KCTCS as separate institutions with separate pain points.

**Replace entirely with:**

**Title:** The Challenge at Bishop State Community College

Replace the three-column institution layout with a single focused problem statement for BSCC:

- 59% Black/African American student population — early intervention matters most for this community
- 68% part-time enrollment — students balancing work, family, and school need proactive outreach
- Gateway course bottlenecks in math and English are the #1 predictor of non-retention — but not surfaced in existing tools
- Advisors lack unified, predictive views of student risk before difficulties compound
- PDP reporting is manual and annual — no mid-cycle alerting capability

Remove all references to Akron and KCTCS from this slide.

---

### Slide 3 — The Common Thread (currently "Customizable Dashboards / Readiness Assessment / Predictive Analytics")

**Current:** Three generic columns describing what institutions "need."

**Replace with:**

**Title:** What Bishop State Needed — What We Built

Convert the three columns to reflect delivered capabilities:

| What They Needed | What We Delivered |
|------------------|-------------------|
| Quarterly refreshed dashboards with exportable insights | Live dashboard deployed on Vercel — KPI tiles, charts, export to CSV/JSON/Markdown |
| Student readiness levels before they impact retention | PDP-aligned Readiness Index (Academic 40% + Engagement 30% + ML Risk 30%) scoring all 4,000 students |
| Predictive models based on historical data | 7 ML models trained on 4,000 Bishop State students (XGBoost + Random Forest + Logistic Regression) |

---

### Slide 4 — The Cost of Inaction (22.3% / $10.7B / 39%)

**Current:** Three national statistics about dropout rates.

**Keep the national statistics** (they are still valid). Add one callout below the stats:

> *At Bishop State, 68% of students enroll part-time — the demographic most impacted by these national trends and the most responsive to early intervention.*

---

### Slide 5 — Our Solution (NLQ / Visualizations / Predictive Models / Export & Share)

**Current:** Four numbered points describing the solution generically.

**Update each point:**

1. **Natural Language Queries** — Type questions in plain English. Our OpenAI-powered interface translates them into SQL and returns a chart + raw data table instantly. No technical expertise required.
2. **Instant Visualizations** — Bar, line, and pie charts generated on-demand from the `student_level_with_predictions` view. All charts include a raw data table for verification.
3. **Predictive Models** — 7 ML models trained on 4,000 Bishop State students covering retention, at-risk alerting, gateway math and English success, GPA risk, time-to-credential, and credential type.
4. **Export & Share** — Download the full dashboard as CSV, JSON, or Markdown report with one click.

---

### Slide 6 — Predictive Analytics Models (currently "6 ML Models Working Together")

**Current:** Title says "6 ML Models." Lists: Retention Prediction, At-Risk Warning System, Time to Credential, Credential Type Prediction, Course Success/GPA Prediction, Gateway Math & English Success Prediction (combined).

**Change title to:** **7 ML Models Working Together to Predict Student Success**

**Replace the model list with:**

| # | Model | Output | Algorithm |
|---|-------|--------|-----------|
| 1 | Retention Prediction | Probability + risk tier | Logistic Regression |
| 2 | At-Risk Early Warning | URGENT / HIGH / MODERATE / LOW | Composite rule engine |
| 3 | Gateway Math Success | Pass probability | XGBoost |
| 4 | Gateway English Success | Pass probability | XGBoost |
| 5 | First-Semester GPA Risk | Low GPA probability | XGBoost |
| 6 | Time-to-Credential | Predicted years to completion | Random Forest Regressor |
| 7 | Credential Type | Associate / Certificate / Bachelor | Random Forest Classifier |

**Update the Key Model Insights** bullet:
- Remove "23 features" — replace with "31 features across demographics, academic prep, enrollment, course performance, and Year 1 outcomes"
- Keep the academic placement levels insight
- Add: "All 7 models trained with cross-validation and overfitting checks on 4,000 Bishop State students"

**Remove the "Implementation Timeline"** section — it describes a future plan; the models are already running.

---

### Slide 7 — Solution Architecture

**Current:** Abstract flow diagram: "PDP Cohort, PDP Course, AR Data → ML Models (5 Predictive Models) → Processing Pipeline → Storage & API → Frontend Dashboard"

**Update to reflect the actual stack:**

Flow (left to right): **Data → ML Pipeline → Database → API → Dashboard**

- **Data:** Bishop State PDP cohort + AR files (4,000 students)
- **ML Pipeline:** Python · XGBoost · Random Forest · Logistic Regression · scikit-learn — 7 models
- **Database:** Postgres (Supabase, hosted, US East) — `student_level_with_predictions` view
- **API:** Next.js 16 API routes (serverless, Vercel) — `/api/dashboard/kpis`, `/api/analyze`, `/api/execute-sql`
- **Dashboard:** React 19 + TypeScript + Tailwind CSS + Recharts — deployed on Vercel

Add stack badges below the diagram: `Python · XGBoost · scikit-learn · Next.js 16 · React 19 · Supabase · Vercel · OpenAI`

---

### Slide 8 — How It Works (Connect / Ask / Get Insights)

**Current:** Three steps described generically ("Connect Your Data / Ask Questions / Get Insights").

**Update step descriptions:**

1. **Connect Your Data** — Bishop State's PDP cohort and AR files feed a Python ML pipeline. 7 models score every student and upsert results to Supabase with zero duplicates on re-run.
2. **Ask Questions** — Type natural language queries like *"Show retention rate by credential type"* or *"How many students are at urgent risk?"*. OpenAI translates them to SQL in real time.
3. **Get Insights** — Receive instant bar, line, or pie charts plus a raw data table. Every query is logged to localStorage and a server-side JSONL audit trail for FERPA compliance.

---

### Slide 9 — Live Demo

**Current:** Just a title slide ("Live Demo").

**Replace with:**

**Title:** Live Platform

Add content:
- URL: `[your-vercel-url]` (bold, large text)
- Three callout cards:
  1. **KPI Dashboard** — Retention rate, at-risk count, readiness score, completion rate — all live from Supabase
  2. **NLQ Query Interface** — Type any question, get a chart + data table in seconds
  3. **Methodology Page** — Full scoring formula, research citations, worked examples (Maria T. → High 0.699; Jordan M. → Low 0.386)

---

### Slide 10 — Measurable Return on Investment

**Current:** Four rows: Early Intervention, Increased Retention, Resource Advocacy, Leadership Engagement.

**Keep structure. Update text:**

- **Early Intervention** — 4,000 Bishop State students are now scored daily across 7 risk dimensions. Advisors can identify URGENT-risk students before they drop.
- **Increased Retention** — Data-driven interventions targeting the 83.9% High Readiness vs. 16.1% Medium Readiness populations enable earlier, more effective outreach.
- **Resource Advocacy** — The Readiness Index is grounded in CCRC Multiple Measures research and Bird et al. (2021) — citations that strengthen grant applications.
- **Leadership Engagement** — Exportable CSV/JSON/Markdown reports and a live dashboard give leadership presentation-ready data at any time.

---

### Slide 11 — Real-World Impact Scenarios (For Advisors / For Leadership)

**Current:** Two columns with generic bullet points.

**Update bullets:**

**For Advisors:**
- Readiness scores + at-risk alert levels (URGENT/HIGH/MODERATE/LOW) prioritize which students to contact first
- Gateway math and English success predictions identify students who need support *before* they fail the course
- Natural-language query interface — no SQL needed to pull custom cohort reports
- Prompt history lets advisors re-run any past query in one click

**For Leadership:**
- KPI dashboard shows overall retention rate, at-risk count, average readiness score, and course completion rate at a glance
- 7-model prediction suite covers every major student outcome metric required for PDP reporting
- Methodology page documents every formula and research citation — ready for accreditation or grant review
- Full audit trail of all queries for FERPA compliance review

---

### Slide 12 — Your Next Steps (currently "Customize / Engage / Pilot and Scale")

**Current:** Describes onboarding steps for a *prospective* institution.

**Replace entirely with:**

**Title:** What's Live — What's Next

**Delivered (checkmarks):**
- ✅ 4,000 students scored across 7 prediction dimensions
- ✅ Live dashboard deployed (Vercel + Supabase, US East)
- ✅ NLQ interface with prompt history and server-side audit trail
- ✅ PDP-aligned readiness engine with research citations
- ✅ Methodology page with worked examples for advisor transparency

**Roadmap:**
- 🔲 Role-based access (Advisor / Leadership / IR views)
- 🔲 GitHub Actions for automated deploy on `main` push
- 🔲 Multi-institution onboarding (University of Akron, KCTCS)
- 🔲 Student roster table with per-student drill-down
- 🔲 Dashboard filtering by cohort, term, and demographic attributes

---

### Slide 13 — Closing ("Let's Transform Student Success Together")

**Current:** Generic closing slide with tagline "The question isn't whether we can predict student success. The question is: what will we do with that knowledge?"

**Keep the tagline.** Update the body:

> We built a live, deployed AI analytics platform for Bishop State Community College — 4,000 students scored, 7 models running, advisors empowered. The platform is live today at `[your-vercel-url]`.

Add callout cards for three key numbers:
- **4,000** students scored
- **7** predictive models
- **83.9%** High Readiness

---

## Design Notes

- Keep the existing color scheme and layout style
- Add Bishop State navy and gold as accent colors on data callout cards
- The architecture slide (Slide 7) should use a left-to-right flow diagram
- The readiness score content (Slide 3) should visually show the three weighted components (40% + 30% + 30%) summing to the final score
- Use data callout cards for the key numbers: 4,000 students, 7 models, 83.9% High Readiness
