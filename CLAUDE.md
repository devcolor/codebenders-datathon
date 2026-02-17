# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KCTCS Student Success Prediction - Full-stack ML + web application predicting student outcomes for Kentucky Community and Technical College System (KCTCS). Uses 5 ML models to generate retention predictions, early warnings, time-to-credential estimates, credential type forecasts, and GPA predictions for ~20K students.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| ML Pipeline | Python 3.8+, XGBoost, scikit-learn, pandas |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Charts | Recharts |
| UI Components | shadcn/ui (Radix UI) |
| Database | MariaDB 10.11, MySQL2 driver |
| AI Features | OpenAI (natural language query analysis) |
| Infrastructure | Docker Compose, Vercel |

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `ai_model/` | Python ML pipeline - 5 models (XGBoost + Random Forest) |
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
docker-compose up -d                      # Start MariaDB + phpMyAdmin
docker-compose down -v                    # Stop and remove volumes
```

## Database Schema

Three main tables in `Kentucky_Community_and_Technical_College_System`:
- `student_predictions` - Student-level predictions (~20K records)
- `course_predictions` - Course-level predictions (~500K records)
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
| Architectural patterns | `.claude/docs/architectural_patterns.md` |
| Project overview | `README.md` |
| Quick start guide | `QUICKSTART.md` |
| Data field descriptions | `DATA_DICTIONARY.md` |
| ML model details | `ML_MODELS_GUIDE.md` |
| Dashboard features | `codebenders-dashboard/DASHBOARD_README.md` |
| Database utilities | `operations/README.md` |
| Docker setup | `DOCKER_SETUP.md` |
