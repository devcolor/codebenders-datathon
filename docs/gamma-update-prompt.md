# Gamma.app Slide Deck Update Prompt

Paste the prompt below into Gamma.app to update the **AI-Powered Student Success Analytics** slide deck.

---

## Prompt

Update the existing "AI-Powered Student Success Analytics" slide deck for the CodeBenders Datathon submission. The platform has been fully built and deployed. Replace any draft/planned framing with current, delivered-state language. Apply the following changes slide by slide, then ensure visual consistency throughout.

---

### Overall Framing Changes

- The platform is no longer described as a multi-institution prototype. It is a **live, deployed system built for Bishop State Community College (BSCC)**, a historically Black community college in Mobile, Alabama (~4,000 students/year). It is designed to extend to other PDP institutions.
- Remove or de-emphasize KCTCS as a co-equal institution. References to University of Akron and KCTCS can appear as "future institution onboarding" examples only.
- Replace any "we will build" or "planned" language with "we built" and "delivered."

---

### Slide: Title / Cover

- Title: **AI-Powered Student Success Analytics**
- Subtitle: **Bishop State Community College × CodeBenders**
- Add: "Live at [your-vercel-url]"
- Tagline: *Turning PDP data into proactive student interventions*

---

### Slide: Problem Statement

Replace with:

**The Challenge at Bishop State Community College**

- 59% Black/African American student population — early intervention matters most for this community
- 68% part-time enrollment — students juggling work, family, and school need proactive outreach
- Gateway course bottlenecks in math and English are the #1 predictor of non-retention — but aren't surfaced in existing tools
- Advisors lack unified, predictive views of student risk before academic difficulties compound
- PDP reporting is manual and annual — no mid-cycle alerting capability

---

### Slide: Solution Overview

**What We Built**

A full-stack AI analytics platform with three layers:

1. **ML Pipeline** — 7 predictive models trained on 4,000 Bishop State students (retention, at-risk, gateway math/English success, GPA risk, time-to-credential, credential type)
2. **Readiness Engine** — PDP-aligned rule-based scoring (academic 40% + engagement 30% + ML risk 30%) with full traceability and human-readable explanations
3. **Live Dashboard** — Natural-language query interface, KPI tiles, retention risk charts, prompt history with re-run and audit trail

---

### Slide: Architecture / Tech Stack

Update the architecture diagram to reflect:

- **Data Layer:** Bishop State PDP cohort + AR files → Python ML pipeline → Postgres (Supabase, hosted, US East)
- **ML Layer:** XGBoost + Random Forest + Logistic Regression, 7 models, scikit-learn
- **Application Layer:** Next.js 16 + React 19 + TypeScript, deployed on Vercel
- **AI Features:** OpenAI-powered NLQ → SQL → Recharts visualizations
- **Audit:** Server-side JSONL query log, prompt history in localStorage

Stack badges: Python · XGBoost · scikit-learn · Next.js · Supabase · Vercel · OpenAI

---

### Slide: The 7 Predictive Models

| Model | Output | Algorithm |
|-------|--------|-----------|
| Retention Prediction | Probability + risk tier | Logistic Regression |
| At-Risk Early Warning | URGENT / HIGH / MODERATE / LOW | Composite rule engine |
| Gateway Math Success | Pass probability | XGBoost |
| Gateway English Success | Pass probability | XGBoost |
| First-Semester GPA Risk | Low GPA probability | XGBoost |
| Time-to-Credential | Predicted years to completion | Random Forest Regressor |
| Credential Type | Associate / Certificate / Bachelor | Random Forest Classifier |

Trained on 4,000 Bishop State students with cross-validation and overfitting checks.

---

### Slide: Readiness Score

**PDP-Aligned Readiness Index**

Formula:
> Readiness = (Academic × 40%) + (Engagement × 30%) + (ML Risk × 30%)

Tiers: 🟢 High ≥ 0.65 · 🟡 Medium 0.40–0.64 · 🔴 Low < 0.40

Current Bishop State distribution:
- High Readiness: 83.9% (3,355 students)
- Medium Readiness: 16.1% (645 students)

Grounded in: PDP momentum metrics, CCRC Multiple Measures research, Bird et al. (2021) transparency in predictive analytics.

Every score is fully traceable — no black box.

---

### Slide: Dashboard Features

**What Advisors & Leadership See**

- **KPI Tiles:** Overall retention rate, at-risk student count, average readiness score
- **Charts:** Retention risk distribution, readiness breakdown, at-risk alert levels
- **NLQ Query Interface:** Type a question in plain English → get a chart + data table
- **Prompt History:** Every query logged with timestamp, re-runnable in one click
- **Methodology Page:** Research citations, scoring formula, worked examples (Maria T. → 0.699 High; Jordan M. → 0.386 Low)

---

### Slide: FERPA & Transparency

**Built for Institutional Trust**

- No PII transmitted to any LLM provider — only aggregate behavioral metrics (GPA group, completion rate, placement level)
- Student GUIDs excluded from stored features
- Every readiness score traceable to its inputs
- Server-side audit log of all NLQ queries (JSONL)
- Methodology page publicly accessible for advisor onboarding

Complies with FERPA §99.31(a)(1) for legitimate educational interest use.

---

### Slide: Results & Impact

**Delivered for Bishop State**

- ✅ 4,000 students scored across 7 prediction dimensions
- ✅ Live dashboard deployed (Vercel + Supabase)
- ✅ NLQ interface with prompt history and audit trail
- ✅ PDP-aligned readiness engine with research citations
- ✅ Methodology page with worked examples for advisor transparency
- ✅ Deploy script for ongoing data refresh

---

### Slide: Next Steps / Roadmap

- **CI/CD:** GitHub Actions for automated Vercel deploy on `main` push
- **Multi-institution:** Onboard University of Akron and KCTCS using the same PDP-aligned pipeline
- **Role-based access:** Advisor vs. Leadership vs. IR views
- **Scheduled refresh:** Quarterly PDP pipeline re-runs
- **Enhanced NLQ:** Demographic equity gap queries, cohort comparison

---

### Design Notes for Gamma

- Keep the existing color scheme and layout style
- Use data callout cards for the key numbers (4,000 students, 7 models, 83.9% High Readiness)
- The architecture slide should use a left-to-right flow diagram: Data → ML Pipeline → Supabase → Next.js/Vercel → User
- The readiness score slide should visually show the three weighted components adding up to the final score
- Add Bishop State's colors (navy and gold) as accent colors where appropriate
