# Bishop State Student Success Analytics

A full-stack ML + web application that predicts student outcomes for **Bishop State Community College**. Seven machine learning models generate retention predictions, early warnings, time-to-credential estimates, credential type forecasts, GPA predictions, and gateway course probability scores for ~4,000 students. Results are surfaced through a live Next.js dashboard backed by Supabase Postgres.

**Live demo:** [https://codebenders-datathon.vercel.app](https://codebenders-datathon.vercel.app)
**Demo walk-through:** [docs/demo/DEMO.md](docs/demo/DEMO.md)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Data Sources                         │
│  bishop_state_cohorts_with_zip.csv                          │
│  bishop_state_courses.csv                                   │
│  bishop_state_student_level_with_zip.csv                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ML Pipeline  (ai_model/)                       │
│                                                             │
│  7 Models (XGBoost + Random Forest + Logistic Regression)   │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │ Retention (XGB)  │  │ Early Warning (Composite Score) │  │
│  │ Time-to-Cred(XGB)│  │ Credential Type (RF Classifier) │  │
│  │ GPA (RF Reg.)    │  │ Gateway Math / English (LR)     │  │
│  └──────────────────┘  └─────────────────────────────────┘  │
│                                                             │
│  Output → student_level_with_predictions table              │
└────────────────────────┬────────────────────────────────────┘
                         │  psycopg2 / pgvector
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Postgres                          │
│                                                             │
│  student_level_with_predictions   (~4,000 rows)            │
│  llm_recommendations              (~4,000 rows)            │
│  query_history                    (audit log)               │
└────────────────────────┬────────────────────────────────────┘
                         │  pg (node-postgres)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Next.js Dashboard  (codebenders-dashboard/)       │
│                                                             │
│  / Dashboard   KPI tiles, risk + readiness charts           │
│               Filter by cohort / enrollment / credential    │
│  /students     Paginated roster with sorting & export       │
│  /query        Natural language → SQL interface (OpenAI)    │
│  /methodology  Model explainability & readiness formula     │
│                                                             │
│  Deploy target: Vercel                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1 — Clone

```bash
git clone https://github.com/devcolor/codebenders-datathon.git
cd codebenders-datathon
```

### 2 — ML Pipeline

```bash
# Create and activate virtualenv
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Copy env and set your Supabase credentials (see "Supabase Setup" below)
cp codebenders-dashboard/env.example .env

# Test DB connection
python -m operations.test_db_connection

# Run the full pipeline (~10-15 min)
cd ai_model
python complete_ml_pipeline.py
```

### 3 — Dashboard

```bash
cd codebenders-dashboard

# Install Node dependencies
npm install

# Copy env and fill in credentials (see "Supabase Setup" below)
cp env.example .env.local

# Start dev server
npm run dev          # → http://localhost:3000
```

---

## Supabase Setup

### Option A — Hosted Supabase (recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string → URI (pooler)**
3. Copy the pooler connection string (`aws-0-us-east-1.pooler.supabase.com:6543`)

**`.env` (ML pipeline)**

```env
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_USER=postgres.<project-ref>
DB_PASSWORD=<your-password>
DB_PORT=6543
DB_NAME=postgres
DB_SSL=true
```

**`codebenders-dashboard/.env.local` (dashboard)**

```env
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_USER=postgres.<project-ref>
DB_PASSWORD=<your-password>
DB_PORT=6543
DB_NAME=postgres
DB_SSL=true

OPENAI_API_KEY=sk-...
```

### Option B — Local Supabase

```bash
# Requires Supabase CLI: https://supabase.com/docs/guides/cli
supabase start

# Default local credentials (custom ports to avoid conflicts)
DB_HOST=127.0.0.1
DB_PORT=54332
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
DB_SSL=false
```

---

## Project Structure

```
codebenders-datathon/
├── ai_model/
│   ├── complete_ml_pipeline.py        # Entry point — trains all 7 models
│   └── generate_bishop_state_data.py  # Synthetic data generation
│
├── codebenders-dashboard/             # Next.js 16 web application
│   ├── app/                           # App Router pages & API routes
│   │   ├── page.tsx                   # Dashboard home (KPIs + charts)
│   │   ├── students/                  # Paginated student roster
│   │   ├── query/                     # Natural language query interface
│   │   ├── methodology/               # Model explainability page
│   │   └── api/dashboard/             # kpis / risk-alerts / retention-risk / readiness
│   └── components/                    # shadcn/ui React components
│
├── data/                              # Input CSV files (~4K students, ~500K courses)
├── operations/                        # DB utilities (psycopg2, connection pool)
├── docs/
│   └── demo/DEMO.md                   # 6-minute talk track + screenshot guide
├── supabase/                          # Supabase local config
├── DATA_DICTIONARY.md                 # All field definitions
├── ML_MODELS_GUIDE.md                 # Model details & feature importance
└── QUICKSTART.md                      # Condensed setup guide
```

---

## ML Models

| # | Model | Algorithm | Target | Key Output |
|---|-------|-----------|--------|-----------|
| 1 | **Retention** | XGBoost Classifier | Retained / Not Retained | `retention_probability`, `retention_risk_category` |
| 2 | **Early Warning** | Composite Score | URGENT / HIGH / MODERATE / LOW | `at_risk_alert`, `risk_score` |
| 3 | **Time-to-Credential** | XGBoost Regressor | Years to completion | `predicted_time_to_credential` |
| 4 | **Credential Type** | Random Forest Classifier | Certificate / Associate / Bachelor | `predicted_credential_label` |
| 5 | **GPA** | Random Forest Regressor | GPA (0–4) | `predicted_gpa`, `gpa_performance` |
| 6 | **Gateway Math** | Logistic Regression | Pass gateway math (Y/N) | `gateway_math_probability` |
| 7 | **Gateway English** | Logistic Regression | Pass gateway English (Y/N) | `gateway_english_probability` |

All predictions write to the `student_level_with_predictions` table in Supabase Postgres.

---

## Dashboard Features

| Page | Description |
|------|-------------|
| **/** | Four KPI tiles (retention rate, predicted retention, at-risk count, course completion). Risk alert distribution + retention risk charts. AI readiness assessment. **Filter bar** by cohort, enrollment type, and credential type. |
| **/students** | Full paginated student roster (50/page). Sortable columns. Multi-filter (alert level, readiness tier, credential type, GUID search). CSV export up to 5,000 rows. |
| **/query** | Natural language → SQL via OpenAI. Renders results as charts or tables. Prompt history with re-run and CSV audit log export. |
| **/methodology** | Readiness score formula, worked examples, model accuracy metrics. |

---

## Database Schema

Two main tables written by the ML pipeline:

**`student_level_with_predictions`** (~4,000 rows)

| Column | Description |
|--------|-------------|
| `Student_GUID` | Anonymised student identifier |
| `Cohort` | Entry year (e.g. `2022-23`) |
| `Enrollment_Intensity_First_Term` | `Full-Time` \| `Part-Time` |
| `retention_probability` | Probability of returning (0–1) |
| `at_risk_alert` | `URGENT` \| `HIGH` \| `MODERATE` \| `LOW` |
| `gateway_math_probability` | Probability of passing gateway math (0–1) |
| `gateway_english_probability` | Probability of passing gateway English (0–1) |
| `low_gpa_probability` | Probability of GPA < 2.0 (0–1) |
| `predicted_time_to_credential` | Years to credential |
| `predicted_credential_label` | `Certificate` \| `Associate` \| `Bachelor` |

**`llm_recommendations`** (~4,000 rows)
AI-generated readiness scores, risk factors, and suggested interventions per student.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| ML Pipeline | Python 3.8+, XGBoost, scikit-learn, pandas, psycopg2 |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Charts | Recharts |
| UI Components | shadcn/ui (Radix UI) |
| Database | Supabase Postgres (pg driver) |
| AI Features | OpenAI (natural language → SQL) |
| Deployment | Vercel (dashboard), Supabase cloud (DB) |

---

## Documentation

| Topic | File |
|-------|------|
| 6-minute demo talk track | [docs/demo/DEMO.md](docs/demo/DEMO.md) |
| Screenshot capture guide | [docs/demo/screenshots/README.md](docs/demo/screenshots/README.md) |
| All data field definitions | [DATA_DICTIONARY.md](DATA_DICTIONARY.md) |
| ML model details & accuracy | [ML_MODELS_GUIDE.md](ML_MODELS_GUIDE.md) |
| Dashboard feature guide | [codebenders-dashboard/DASHBOARD_README.md](codebenders-dashboard/DASHBOARD_README.md) |
| DB utilities | [operations/README.md](operations/README.md) |
| Condensed setup | [QUICKSTART.md](QUICKSTART.md) |

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built by the CodeBenders team for the Bishop State Datathon 2025.*
