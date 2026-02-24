# Design: KCTCS → Bishop State Community College Rebranding

**Date:** 2026-02-14
**Status:** Approved
**Approach:** Sequential (Data → DB → ML → Frontend → Docs → Deploy)

## Context

The application was built to demo KCTCS (Kentucky Community and Technical College System). Due to permissions issues, we're rebranding to Bishop State Community College (BSCC). University of Akron remains as a secondary institution.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data source | Generate new synthetic data | No real Bishop State data available |
| Data standard | PDP/AR file compliant | Same column schema as existing KCTCS data; standard NSC PDP field names |
| Database name | `Bishop_State_Community_College` | Mirror the institution-specific naming pattern |
| Database hosting | Supabase (Postgres) | Simpler than AWS RDS, free tier, user prefers Postgres |
| DB driver migration | mysql2 → pg (Node), pymysql → psycopg2 (Python) | Required for Postgres switch |
| Institution structure | Single IPEDS ID (102030) | Bishop State reports as one institution to IPEDS |
| Campus attribute | Main, Southwest, Carver, Baker-Gaines Central | Reflects actual Bishop State campus structure |
| Data scale | ~4,000 students | Realistic for Bishop State enrollment (~3,568 in 2023-24) |
| Demographics | 59% Black, 28% White, 63% female, 32% full-time | Matches Bishop State actual demographics |
| Frontend institutions | Bishop State (default) + University of Akron | These two were in the cohort |
| Frontend approach | Clone V0 code and modify locally | Full control, simpler workflow |
| Deployment | Same Vercel project | No need for new project |

---

## Section 1: Synthetic Data Generation

Generate ~4,000 PDP-compliant synthetic students matching Bishop State Community College demographics.

### PDP/AR Schema Compliance

The synthetic data will use the **exact same column schema** as the existing KCTCS data files, which follow the National Student Clearinghouse Postsecondary Data Partnership (PDP) Analysis-Ready file format:

- **Cohort file columns:** `id`, `Institution_ID`, `Cohort`, `Student_GUID`, `Cohort_Term`, `Student_Age`, `Enrollment_Type`, `Enrollment_Intensity_First_Term`, `Math_Placement`, `English_Placement`, `Reading_Placement`, demographics, gateway course fields, retention/persistence outcomes, credential tracking, transfer institution data, `school`, `dataset_type`, `created_at`, `zip_code`
- **AR file columns:** `id`, `student_id`, `years_to_bachelors_cohort`, `years_to_bachelor_other`, NASPA first-gen, transfer institution state/Carnegie/locale fields, `school`, `created_at`, `zip_code`
- **Course file columns:** Standard PDP course-level AR file format

### Bishop State Parameters

- **IPEDS ID:** 102030
- **Campuses:** Main (351 N Broad St), Southwest (925 Dauphin Island Pkwy), Carver (414 Stanton Rd), Baker-Gaines Central (1365 MLK Jr Ave)
- **Demographics:**
  - Race: 59% Black/African American, 28% White, 4.7% Two+ races, 2.9% Hispanic, 2.3% Asian, 1.2% Native American, 0.1% Pacific Islander
  - Gender: 63% female, 37% male
  - Enrollment: 32% full-time, 68% part-time
  - Age: 76% under 25, 24% over 25
- **Student GUIDs:** `BSCC_STU00001` format
- **Zip codes:** Mobile, AL area (36601-36695) and Washington County, AL
- **Cohorts:** 2019-20 through 2023-24
- **Programs:** Health Sciences, Business/Management, STEM, Liberal Arts, Welding/Manufacturing, Cosmetology (aligned to Bishop State's actual programs, mapped to CIP codes)
- **`school` column:** `"BSCC"` (replacing `"KCTCS"`)
- **Transfer states:** AL, MS, FL, GA (Southeast region, replacing KY/OH/MI)

### Output Files

| File | Records | Description |
|------|---------|-------------|
| `data/bishop_state_cohorts_with_zip.csv` | ~4,000 | PDP cohort-level AR file |
| `data/ar_bscc_with_zip.csv` | ~4,000 | NSC Analysis-Ready supplementary data |
| `data/bishop_state_courses.csv` | ~100,000 | PDP course-level data |
| `data/bishop_state_student_level_with_zip.csv` | ~4,000 | Merged student-level file (ML pipeline input) |

---

## Section 2: Database Migration (MariaDB/AWS RDS → Supabase Postgres)

### New Infrastructure

- Create new Supabase project
- Database: `Bishop_State_Community_College` (or use Supabase's default `postgres` DB with tables directly)
- Same table structure: `student_predictions`, `course_predictions`, `ml_model_performance`

### Connection Config Changes

| File | Change |
|------|--------|
| `operations/db_config.py` | Postgres connection params: Supabase host, port 6543 (pooler) or 5432, `sslmode=require` |
| `operations/db_utils.py` | Replace `pymysql` with `psycopg2`, SQLAlchemy URI → `postgresql://` |
| `.env.local` | Update all DB_* vars for Supabase |
| `.docker.env.example` | Update to Postgres config |
| `docker-compose.yml` | Replace MariaDB with Postgres (for local dev) or remove if using Supabase directly |

### SQL Syntax Changes

| MySQL/MariaDB | Postgres Equivalent |
|---------------|-------------------|
| Backtick quoting `` ` `` | Double quotes `"` or unquoted |
| `SHOW TABLES` | `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` |
| `?` parameter placeholders | `$1, $2, $3` (node-postgres) |
| `SELECT VERSION()` | `SELECT version()` |

### Node.js Driver Migration

| Change | Details |
|--------|---------|
| Package swap | `mysql2` → `pg` in package.json |
| Connection | `mysql.createConnection()` → `new Pool()` from `pg` |
| Queries | `connection.execute(sql, [params])` → `pool.query(sql, [params])` with `$1` placeholders |
| All 6 API routes | Update connection and query patterns |

---

## Section 3: ML Pipeline Updates

### File Changes

| File | Change |
|------|--------|
| `ai_model/complete_ml_pipeline.py` | Update data file path, docstring, comments |
| `ai_model/complete_ml_pipeline_csv_only.py` | Same updates |
| `ai_model/merge_kctcs_data.py` | Rename to `merge_bishop_state_data.py`, update all file references |
| `ai_model/__init__.py` | Update module docstring |
| `requirements.txt` | Add `psycopg2-binary`, keep or remove `pymysql` |

### Model Retraining

Retrain all 5 models on ~4,000 Bishop State students:

1. **Retention Prediction** - XGBoost Binary Classification
2. **Early Warning System** - XGBoost Binary Classification
3. **Time-to-Credential** - Regression (XGBoost/Random Forest)
4. **Credential Type** - Multi-class Classification (Random Forest)
5. **Course Success/GPA** - Regression (Random Forest)

Note: With ~4K students (vs 20K), model performance may differ. We may need to adjust hyperparameters or use more aggressive regularization to avoid overfitting on the smaller dataset.

---

## Section 4: Frontend Rebranding

### Text/Branding Changes

| File | Current | New |
|------|---------|-----|
| `app/layout.tsx` | "KCTCS Student Success Dashboard" | "Bishop State Student Success Dashboard" |
| `app/layout.tsx` | "AI-Powered...for KCTCS" | "AI-Powered...for Bishop State Community College" |
| `app/page.tsx` | "KCTCS Student Analytics..." | "Bishop State Student Analytics & Predictive Models" |
| `components/export-button.tsx` | `institution: "KCTCS"` | `institution: "Bishop State"` |

### Institution Configuration

**`app/query/page.tsx`** - Update INSTITUTIONS array:
```typescript
const INSTITUTIONS = [
  { name: "Bishop State", code: "bscc" },
  { name: "University of Akron", code: "akron" },
]
```

### API Route Updates (6 routes)

All routes under `app/api/` need:
1. DB driver swap (mysql2 → pg)
2. Query parameter syntax (`?` → `$1`)
3. Default database name update
4. Connection pool setup change

Key routes:
- `app/api/analyze/route.ts` - Replace `kctcs` schema key with `bscc`, update DB name
- `app/api/execute-sql/route.ts` - Update DB connection
- `app/api/dashboard/kpis/route.ts` - Update DB connection
- `app/api/dashboard/risk-alerts/route.ts` - Update DB connection
- `app/api/dashboard/retention-risk/route.ts` - Update DB connection
- `app/api/dashboard/readiness/route.ts` - Update DB connection

### Library Updates

- `lib/prompt-analyzer.ts` - Update `institutionDbMap` (remove kctcs, add bscc)
- `lib/query-executor.ts` - Update if institution codes changed

---

## Section 5: Documentation Updates

~15+ files need updating. Replace all references:

| Find | Replace With |
|------|-------------|
| "KCTCS" | "BSCC" or "Bishop State" (context-dependent) |
| "Kentucky Community and Technical College System" | "Bishop State Community College" |
| "Kentucky_Community_and_Technical_College_System" | "Bishop_State_Community_College" |
| "kctcs_*.csv" file references | "bishop_state_*.csv" or "ar_bscc_*.csv" |
| "~20K students" / "32,800 students" | "~4,000 students" |
| "16 colleges/institutions" | "4 campuses" |
| "MariaDB" references | "Postgres" / "Supabase" |
| Kentucky zip codes | Alabama zip codes |

### Key Files

CLAUDE.md, README.md, QUICKSTART.md, DATA_DICTIONARY.md, ML_MODELS_GUIDE.md, DOCKER_SETUP.md, DASHBOARD_README.md, operations/README.md, AI_Powered_Student_Success_PRD.md, DASHBOARD_VISUALIZATIONS.md, docs/README_api.md, docs/README_datageneration.md, READINESS_ASSESSMENT_INTEGRATION.md, hackathon_github_issues.md

---

## Section 6: Deployment

### Steps

1. **Create Supabase project** - Note connection credentials (host, port, password, pooler URL)
2. **Run ML pipeline** - Generate predictions, populate Supabase database
3. **Update Vercel env vars** - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (in Vercel dashboard)
4. **Push to main** - Vercel auto-deploys
5. **Smoke test** - Dashboard loads, KPIs populate, query interface works, exports work
6. **Final KCTCS grep** - Verify no KCTCS references remain in the live UI

### Vercel Environment Variables to Update

```
DB_HOST=<supabase-host>.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.<project-ref>
DB_PASSWORD=<supabase-password>
```

---

## Files to Delete

| File | Reason |
|------|--------|
| `data/kctcs_*.csv` (all) | Replaced by bishop_state_*.csv |
| `data/ar_kcts_with_zip.csv` | Replaced by ar_bscc_with_zip.csv |
| `database_dumps/dump-Kentucky_*.sql` | Old MariaDB dump, no longer needed |
| `ai_model/merge_kctcs_data.py` | Replaced by merge_bishop_state_data.py |
| `kctcs_student_level_with_predictions_schema.json` | Replace with bishop_state version |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Postgres SQL incompatibilities | Test all API queries against Supabase before deploying |
| ML model performance on smaller dataset (~4K vs ~20K) | Validate metrics; adjust regularization if overfitting |
| Missed KCTCS references | Final `grep -ri "kctcs\|kentucky" .` sweep before deployment |
| Supabase free tier limits | ~4K students + ~100K courses well within 500MB free tier |
| Node-postgres parameter syntax | Systematic replacement of `?` with `$1, $2, $3` in all queries |
