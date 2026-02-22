# Changelog

All notable changes to the Bishop State Student Success Dashboard are documented here.

Each version corresponds to a git tag. To compare any two versions:
```
git log v0.1.0-kctcs..v0.2.0-bishop-state-data --oneline
```

---

## [v0.6.0-readiness-engine] — 2026-02-20

Student readiness scoring, PDP-aligned methodology documentation, and optional LiteLLM narrative enrichment.

### Added
- Rule-based readiness score engine (`ai_model/generate_readiness_scores.py`) — deterministic, FERPA-safe, fully auditable
- Supabase migration creating `llm_recommendations` and `readiness_generation_runs` tables
- `docs/READINESS_METHODOLOGY.md` — full scoring formula, PDP alignment table, FERPA compliance notes, and 5 research citations (CCRC, CAPR, Bird et al. 2021)
- Model 9 (Readiness Score) section in `ML_MODELS_GUIDE.md`
- PDP credit momentum (12-credit Year 1 milestone) and math placement components to rule engine
- Optional `--enrich-with-llm` flag using LiteLLM for provider-agnostic narrative enrichment (OpenAI, Ollama, Anthropic, Azure)
- `/methodology` page in Next.js dashboard with scoring breakdown tables, PDP alignment, and references
- Methodology nav button in dashboard header

### Fixed
- Stale chart subtitles showing concatenated strings instead of student counts (PostgreSQL `COUNT(*)` bigint → string coercion)
- Data source footnote referencing wrong table name and student count

---

## [v0.5.0-docs-cleanup] — 2026-02-19

Final documentation sweep and removal of all remaining KCTCS references.

### Added
- Docker setup migrated from MariaDB to Postgres

### Changed
- All documentation rebranded from KCTCS/MariaDB to Bishop State/Postgres

### Removed
- Old KCTCS data files and merge script

### Fixed
- Final sweep removing remaining KCTCS references across codebase

---

## [v0.4.0-frontend-rebrand] — 2026-02-18

Frontend UI, dashboard API routes, and query API fully migrated to Bishop State Community College and Postgres.

### Changed
- Frontend UI rebranded from KCTCS to Bishop State Community College (institution name, colors, copy)
- Dashboard API routes migrated from `mysql2`/KCTCS to `pg`/Bishop State
- Query API routes migrated from `mysql2`/KCTCS to `pg`/Bishop State
- Shared Postgres connection pool module added for Next.js

### Fixed
- Cohort filter format in non-LLM prompt-analyzer fallback path

---

## [v0.3.0-postgres-migration] — 2026-02-17

Python ML pipeline database layer fully migrated from MariaDB to Postgres.

### Changed
- Python DB layer migrated from `pymysql`/MariaDB to `psycopg2`/Postgres
- ML pipeline updated for Bishop State data and Supabase Postgres

---

## [v0.2.0-bishop-state-data] — 2026-02-17

Bishop State data introduced and local Supabase development environment initialized.

### Added
- Local Supabase setup for Postgres development
- Synthetic Bishop State student data generation script
- Bishop State data merge script and merged dataset
- Updated ML models and documentation for Bishop State

---

## [v0.1.0-kctcs] — 2025-10-29

Baseline snapshot of the KCTCS/MariaDB codebase immediately before the Bishop State rebranding effort began.

### Context
This tag marks the final state of the project when it was built for Kentucky Community and Technical College System (KCTCS) using MariaDB. All subsequent versions represent the migration to Bishop State Community College and Postgres.

---

*Generated from git tags. See [GitHub Releases](https://github.com/devcolor/codebenders-datathon/releases) or use `git log <tag1>..<tag2>` for full commit details between versions.*
