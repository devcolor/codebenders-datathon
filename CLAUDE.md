# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bishop State Student Success Prediction - Full-stack ML + web application predicting student outcomes for Bishop State Community College. Uses 6 ML models to generate retention predictions, time-to-credential estimates, credential type forecasts, gateway math/English success predictions, and first-semester low-GPA predictions for ~4K students. Authoritative AI/ML inventory: `codebenders-dashboard/content/ai-transparency.ts`.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| ML Pipeline | Python 3.8+, XGBoost, scikit-learn, pandas |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Charts | Recharts |
| UI Components | shadcn/ui (Radix UI) |
| Database | Postgres (Supabase), pg driver |
| AI Features | OpenAI gpt-4o-mini for: NL query → SQL analyzer (`codebenders-dashboard/app/api/analyze`), query result summarizer (`codebenders-dashboard/app/api/query-summary`), course-pairing explainer (`codebenders-dashboard/app/api/courses/explain-pairing`). Rule-based fallback at `codebenders-dashboard/lib/prompt-analyzer.ts`. Authoritative list: `codebenders-dashboard/content/ai-transparency.ts`. |
| Infrastructure | Docker Compose, Vercel |

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `ai_model/` | Python ML pipeline - 6 models (XGBoost + Random Forest). Authoritative inventory: `codebenders-dashboard/content/ai-transparency.ts`. |
| `codebenders-dashboard/` | Next.js web application |
| `codebenders-dashboard/app/` | App Router pages and API routes |
| `codebenders-dashboard/components/` | React components (shadcn/ui based) |
| `codebenders-dashboard/lib/` | Utilities: prompt-analyzer.ts, query-executor.ts |
| `operations/` | Database utilities and configuration |
| `data/` | CSV data files (~20K students, ~500K courses) |

## Essential Commands

### ML Pipeline
```bash
pip install -r requirements.txt           # Install Python dependencies
cd ai_model && python complete_ml_pipeline.py   # Run full pipeline
python -m operations.test_db_connection   # Test DB connection
```

### Dashboard
```bash
cd codebenders-dashboard
npm install                               # Install dependencies
npm run dev                               # Dev server (localhost:3000)
npm run build                             # Production build
npm run lint                              # Lint check
```

### Docker
```bash
docker-compose up -d                      # Start Postgres + pgAdmin
docker-compose down -v                    # Stop and remove volumes
```

## Database Schema

Three main tables in the `bishop_state` Postgres database:
- `student_predictions` - Student-level predictions (~4K records)
- `course_predictions` - Course-level predictions (~100K records)
- `ml_model_performance` - Model metrics and training history

## Key Entry Points

| File | Purpose |
|------|---------|
| `ai_model/complete_ml_pipeline.py:1` | Main ML entry point |
| `codebenders-dashboard/app/page.tsx:1` | Dashboard home page |
| `codebenders-dashboard/app/query/page.tsx:1` | Query interface page |
| `codebenders-dashboard/lib/prompt-analyzer.ts:30` | LLM-powered SQL generation |
| `operations/db_config.py:8` | Database configuration |

## Python Environment

- **Always** use the project virtualenv at `venv/` when running Python commands.
- Activate with `source venv/bin/activate` or use `venv/bin/python` directly.
- Install dependencies into the venv, not globally.

## Git Commit Rules

- **Never** add `Co-Authored-By` lines to commit messages.

## Additional Documentation

Check these files for detailed information on specific topics:

| Topic | File |
|-------|------|
| AI / ML surface inventory (models, LLM routes, data flows) | `codebenders-dashboard/content/ai-transparency.ts` |
| Architectural patterns | `.claude/docs/architectural_patterns.md` |
| Project overview | `README.md` |
| Quick start guide | `QUICKSTART.md` |
| Data field descriptions | `DATA_DICTIONARY.md` |
| ML model details | `ML_MODELS_GUIDE.md` |
| Dashboard features | `codebenders-dashboard/DASHBOARD_README.md` |
| Database utilities | `operations/README.md` |
| Docker setup | `DOCKER_SETUP.md` |
