# Bishop State Rebranding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all KCTCS references with Bishop State Community College, migrate from MariaDB/AWS to Supabase Postgres, generate synthetic data, retrain ML models, and deploy.

**Architecture:** Sequential pipeline: synthetic data generation → database setup (Supabase Postgres) → Python DB driver migration → ML pipeline retraining → Node.js DB driver migration → frontend rebranding → documentation updates → deployment verification.

**Tech Stack:** Python 3.8+ (pandas, psycopg2, XGBoost, scikit-learn), Next.js 16/React 19/TypeScript, node-postgres (`pg`), Supabase (Postgres), Vercel

**Design doc:** `docs/plans/2026-02-14-kctcs-to-bishop-state-rebranding-design.md`

---

## Task 1: Set Up Local Supabase (via CLI + Docker)

**Prerequisites:** Docker Desktop running, Node.js installed.

**Step 1: Install Supabase CLI (if not already installed)**

```bash
brew install supabase/tap/supabase
```

**Step 2: Initialize Supabase in the project**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon
supabase init
```

This creates a `supabase/` directory with config files.

**Step 3: Start local Supabase**

```bash
supabase start
```

This spins up local Postgres (+ Auth, Storage, etc.) via Docker. On first run it pulls images (~5 min).

Expected output includes:
```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

**Step 4: Note local connection details**

The local Supabase Postgres defaults:
```
Host: 127.0.0.1
Port: 54322
Database: postgres
User: postgres
Password: postgres
```

**Step 5: Update environment files for local dev**

Update `codebenders-dashboard/.env.local`:
```
DB_HOST=127.0.0.1
DB_PORT=54322
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=postgres
```

Update `operations/` Python config to also read from env vars (done in Task 4).

**Step 6: Verify Supabase Studio**

Open http://127.0.0.1:54323 — you should see the Supabase Studio dashboard with an empty `postgres` database.

**Step 7: Commit Supabase config (not credentials)**

```bash
git add supabase/
git commit -m "feat: initialize local Supabase for Postgres development"
```

**Note:** When ready to deploy, we'll create a hosted Supabase project (Task 14) and update env vars in Vercel. The local setup uses the same Postgres interface, so no code changes needed.

---

## Task 2: Generate Synthetic Bishop State Student Data

**Files:**
- Create: `ai_model/generate_bishop_state_data.py`
- Output: `data/bishop_state_cohorts_with_zip.csv`, `data/ar_bscc_with_zip.csv`, `data/bishop_state_courses.csv`

**Step 1: Write the data generation script**

Create `ai_model/generate_bishop_state_data.py` with the following structure:

```python
"""
Synthetic Data Generator for Bishop State Community College
============================================================
Generates PDP-compliant (Postsecondary Data Partnership) synthetic student data
matching Bishop State Community College demographics.

Output files:
- data/bishop_state_cohorts_with_zip.csv (~4,000 students)
- data/ar_bscc_with_zip.csv (~4,000 students)
- data/bishop_state_courses.csv (~100,000 course records)
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
NUM_STUDENTS = 4000

# Read existing KCTCS cohort CSV header to match schema exactly
COHORT_HEADER_FILE = os.path.join(DATA_DIR, 'kctcs_cohorts_with_zip.csv')

# ---- Bishop State Demographics ----
DEMOGRAPHICS = {
    'race_dist': {
        'Black or African American': 0.59,
        'White': 0.28,
        'Two or More Races': 0.047,
        'Hispanic': 0.029,
        'Asian': 0.023,
        'American Indian or Alaska Native': 0.012,
        'Native Hawaiian or Other Pacific Islander': 0.001,
    },
    'gender_dist': {'F': 0.63, 'M': 0.37},
    'enrollment_intensity': {'Full-Time': 0.32, 'Part-Time': 0.68},
    'age_dist': {'20 and younger': 0.50, '>20 - 24': 0.26, 'Older than 24': 0.24},
    'cohorts': ['2019-20', '2020-21', '2021-22', '2022-23', '2023-24'],
    'campuses': [102030],  # Single IPEDS ID
}

# Mobile, AL area zip codes
MOBILE_ZIPS = [
    '36601', '36602', '36603', '36604', '36605', '36606', '36607', '36608',
    '36609', '36610', '36611', '36612', '36613', '36615', '36616', '36617',
    '36618', '36619', '36688', '36693', '36695',
]
# Washington County, AL zips
WASHINGTON_ZIPS = ['36524', '36540', '36560', '36562', '36571', '36572', '36575', '36587']

# Bishop State programs mapped to CIP codes
PROGRAMS = {
    '510000.0': 0.25,   # Health Sciences
    '520101.0': 0.15,   # Business/Management
    '110101.0': 0.10,   # Computer Science/STEM
    '240101.0': 0.20,   # Liberal Arts
    '480508.0': 0.10,   # Welding Technology
    '120401.0': 0.05,   # Cosmetology
    '430104.0': 0.05,   # Criminal Justice
    '150000.0': 0.05,   # Engineering Technology
    '460000.0': 0.05,   # Construction
}

TRANSFER_STATES = ['AL', 'MS', 'FL', 'GA', 'TN', 'LA']

# ... (implementation generates students matching schema from kctcs_cohorts_with_zip.csv header)
```

The script must:
1. Read the column headers from `kctcs_cohorts_with_zip.csv` to ensure schema match
2. Generate ~4,000 students with `Student_GUID` format `BSCC_STU{:05d}`
3. Set `Institution_ID` = 102030, `school` = "BSCC", `dataset_type` = "S"
4. Distribute demographics per Bishop State actuals
5. Generate realistic academic outcomes (GPA, credits, retention, persistence, gateway courses)
6. Generate AR file (`ar_bscc_with_zip.csv`) with NSC supplementary fields
7. Generate course-level data (`bishop_state_courses.csv`) with ~25 courses per student avg
8. Use Alabama zip codes from Mobile/Washington County

**Step 2: Run the data generation**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon
python ai_model/generate_bishop_state_data.py
```

Expected output:
```
Generated 4,000 students → data/bishop_state_cohorts_with_zip.csv
Generated 4,000 AR records → data/ar_bscc_with_zip.csv
Generated ~100,000 course records → data/bishop_state_courses.csv
```

**Step 3: Validate schema compliance**

```bash
# Compare headers
head -1 data/kctcs_cohorts_with_zip.csv > /tmp/kctcs_header.txt
head -1 data/bishop_state_cohorts_with_zip.csv > /tmp/bscc_header.txt
diff /tmp/kctcs_header.txt /tmp/bscc_header.txt
```

Expected: Headers should be identical (same columns, same order).

**Step 4: Commit**

```bash
git add ai_model/generate_bishop_state_data.py data/bishop_state_cohorts_with_zip.csv data/ar_bscc_with_zip.csv data/bishop_state_courses.csv
git commit -m "feat: add synthetic Bishop State data generation script and data files"
```

---

## Task 3: Create Merged Student-Level File

**Files:**
- Create: `ai_model/merge_bishop_state_data.py` (based on `ai_model/merge_kctcs_data.py`)
- Output: `data/bishop_state_student_level_with_zip.csv`

**Step 1: Copy and adapt the merge script**

Copy `ai_model/merge_kctcs_data.py` → `ai_model/merge_bishop_state_data.py`.

Changes needed:
- Line 5: `"MERGING KCTCS DATA FILES"` → `"MERGING BISHOP STATE DATA FILES"`
- Line 9-10: `ar_kcts.csv` / `ar_kcts_with_zip.csv` → `ar_bscc_with_zip.csv`
- Line 14-15: `kctcs_cohorts.csv` / `kctcs_cohorts_with_zip.csv` → `bishop_state_cohorts_with_zip.csv`
- Line 19: `kctcs_courses.csv` → `bishop_state_courses.csv`
- Line 85: Output file `kctcs_merged_with_zip.csv` → `bishop_state_student_level_with_zip.csv`
- All print statements referencing KCTCS → Bishop State

**Step 2: Run the merge**

```bash
python ai_model/merge_bishop_state_data.py
```

Expected: Creates `data/bishop_state_student_level_with_zip.csv` with ~4,000 rows.

**Step 3: Commit**

```bash
git add ai_model/merge_bishop_state_data.py data/bishop_state_student_level_with_zip.csv
git commit -m "feat: add Bishop State data merge script and merged dataset"
```

---

## Task 4: Migrate Python DB Layer to Postgres/Supabase

**Files:**
- Modify: `operations/db_config.py`
- Modify: `operations/db_utils.py`
- Modify: `operations/__init__.py`
- Modify: `requirements.txt`

**Step 1: Update `operations/db_config.py`**

Replace entire file content:
```python
"""
Database Configuration for Supabase Postgres
=============================================
Credentials for Bishop State Community College database
"""
import os

# Supabase Postgres Connection Settings
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'db.<project-ref>.supabase.co'),
    'user': os.environ.get('DB_USER', 'postgres.<project-ref>'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', 'postgres'),
    'port': int(os.environ.get('DB_PORT', '6543')),
    'sslmode': 'require'
}

# Table names
TABLES = {
    'student_predictions': 'student_level_with_predictions',
    'course_predictions': 'course_predictions',
    'model_performance': 'ml_model_performance'
}
```

Note: The actual Supabase credentials should come from environment variables. Update the defaults after Task 1 is complete.

**Step 2: Update `operations/db_utils.py`**

Replace `pymysql` with `psycopg2`:
- Line 8: `import pymysql` → `import psycopg2` and `from psycopg2.extras import RealDictCursor`
- Lines 15-31: `get_connection()` — change `pymysql.connect(...)` to `psycopg2.connect(...)` with `cursor_factory=RealDictCursor`
- Lines 34-46: `get_sqlalchemy_engine()` — change connection string from `mysql+pymysql://` to `postgresql+psycopg2://`, add `?sslmode=require`
- Lines 120-156: `create_model_performance_table()` — change `pymysql` cursor usage to `psycopg2` cursor (use `conn.cursor()` pattern with `conn.commit()`)
- Lines 159-210: `save_model_performance()` — change `pymysql` cursor to `psycopg2` cursor, replace `%s` style with psycopg2 `%s` (same syntax, but use `conn.commit()`)
- Lines 213-235: `test_connection()` — replace `pymysql` connect with `psycopg2`, change `SHOW TABLES` to `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`

**Step 3: Update `requirements.txt`**

Add `psycopg2-binary` if not present. The existing file already has `supabase` and `python-dotenv`.

**Step 4: Test the connection**

```bash
python -m operations.test_db_connection
```

Expected: `✓ Connected to database: postgres` and table listing.

**Step 5: Commit**

```bash
git add operations/db_config.py operations/db_utils.py requirements.txt
git commit -m "feat: migrate Python DB layer from pymysql/MariaDB to psycopg2/Supabase Postgres"
```

---

## Task 5: Update ML Pipeline for Bishop State

**Files:**
- Modify: `ai_model/complete_ml_pipeline.py`
- Modify: `ai_model/complete_ml_pipeline_csv_only.py`
- Modify: `ai_model/__init__.py`

**Step 1: Update `ai_model/complete_ml_pipeline.py`**

Key changes:
- Line 2: Docstring `"KCTCS Student Success Prediction"` → `"Bishop State Student Success Prediction"`
- Line 74: `'kctcs_student_level_with_zip.csv'` → `'bishop_state_student_level_with_zip.csv'`
- All print statements referencing KCTCS → Bishop State

**Step 2: Update `ai_model/complete_ml_pipeline_csv_only.py`**

Same changes as above — update file references and KCTCS mentions.

**Step 3: Update `ai_model/__init__.py`**

Replace "Kentucky Community and Technical College System (KCTCS)" with "Bishop State Community College (BSCC)".

**Step 4: Run the ML pipeline**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon
python ai_model/complete_ml_pipeline.py
```

This will:
1. Load `data/bishop_state_student_level_with_zip.csv`
2. Train all 5 models on ~4,000 students
3. Generate predictions
4. Save to Supabase Postgres (student_predictions, course_predictions, ml_model_performance tables)

Expected runtime: 5-15 minutes depending on machine.

**Step 5: Verify database population**

```bash
python -c "
from operations.db_utils import get_connection
conn = get_connection()
cur = conn.cursor()
cur.execute('SELECT COUNT(*) as cnt FROM student_level_with_predictions')
print('Students:', cur.fetchone())
cur.execute('SELECT COUNT(*) as cnt FROM course_predictions')
print('Courses:', cur.fetchone())
cur.execute('SELECT COUNT(*) as cnt FROM ml_model_performance')
print('Models:', cur.fetchone())
conn.close()
"
```

Expected: ~4,000 students, ~100K courses, 5 model records.

**Step 6: Commit**

```bash
git add ai_model/complete_ml_pipeline.py ai_model/complete_ml_pipeline_csv_only.py ai_model/__init__.py
git commit -m "feat: update ML pipeline for Bishop State data and Supabase Postgres"
```

---

## Task 6: Create Shared Postgres Pool for Next.js API Routes

**Files:**
- Create: `codebenders-dashboard/lib/db.ts`
- Modify: `codebenders-dashboard/package.json` (add `pg`, `@types/pg`; remove `mysql2`)

**Step 1: Install pg, remove mysql2**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard
npm install pg @types/pg
npm uninstall mysql2
```

**Step 2: Create shared database pool module**

Create `codebenders-dashboard/lib/db.ts`:
```typescript
import { Pool } from "pg"

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number.parseInt(process.env.DB_PORT || "6543"),
      database: process.env.DB_NAME || "postgres",
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 10,
    })
  }
  return pool
}
```

**Step 3: Commit**

```bash
git add codebenders-dashboard/lib/db.ts codebenders-dashboard/package.json codebenders-dashboard/package-lock.json
git commit -m "feat: add shared Postgres pool module, swap mysql2 for pg"
```

---

## Task 7: Migrate Dashboard API Routes to Postgres

**Files:**
- Modify: `codebenders-dashboard/app/api/dashboard/kpis/route.ts`
- Modify: `codebenders-dashboard/app/api/dashboard/risk-alerts/route.ts`
- Modify: `codebenders-dashboard/app/api/dashboard/retention-risk/route.ts`
- Modify: `codebenders-dashboard/app/api/dashboard/readiness/route.ts`

**Step 1: Update `kpis/route.ts`**

Replace the full file. Key changes:
- Remove `import mysql from "mysql2/promise"` and local pool setup
- Add `import { getPool } from "@/lib/db"`
- Change `pool.query(sql)` → `pool.query(sql)` (pg returns `{ rows }` not `[rows]`)
- Access results via `result.rows[0]` instead of destructuring `[rows]`

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const pool = getPool()

    const sql = `
      SELECT
        AVG("Retention") * 100 as overall_retention_rate,
        AVG(retention_probability) * 100 as avg_predicted_retention,
        SUM(CASE WHEN at_risk_alert IN ('HIGH', 'URGENT') THEN 1 ELSE 0 END) as high_critical_risk_count,
        AVG(course_completion_rate) * 100 as avg_course_completion_rate,
        COUNT(*) as total_students
      FROM student_predictions
      LIMIT 1
    `

    const result = await pool.query(sql)
    const kpis = result.rows[0]

    if (!kpis) {
      return NextResponse.json({ error: "No data found" }, { status: 404 })
    }

    return NextResponse.json({
      overallRetentionRate: Number(kpis.overall_retention_rate || 0).toFixed(1),
      avgPredictedRetention: Number(kpis.avg_predicted_retention || 0).toFixed(1),
      highCriticalRiskCount: Number(kpis.high_critical_risk_count || 0),
      avgCourseCompletionRate: Number(kpis.avg_course_completion_rate || 0).toFixed(1),
      totalStudents: Number(kpis.total_students || 0),
    })
  } catch (error) {
    console.error("KPI fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch KPIs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
```

**Note on Postgres quoting:** If column names like `Retention` are mixed-case in Postgres, they need double-quote quoting (`"Retention"`). Check the actual table DDL after ML pipeline runs. If columns are all lowercase in Postgres, remove the quotes.

**Step 2: Update `risk-alerts/route.ts`**

Same pattern: remove mysql2 import, use `getPool()` from `@/lib/db`, access `result.rows`.

**Step 3: Update `retention-risk/route.ts`**

Same pattern.

**Step 4: Update `readiness/route.ts`**

This route uses `mysql.createConnection()` directly (not pool). Replace with pg Pool pattern. Also replace `?` parameter placeholders with `$1, $2, $3`.

Example change for parameterized queries:
```typescript
// Before (mysql2):
conditions.push('Institution_ID = ?');
const [rows] = await connection.execute(sql, params);

// After (pg):
conditions.push(`"Institution_ID" = $${conditions.length + 1}`);
const result = await pool.query(sql, params);
const rows = result.rows;
```

**Step 5: Verify locally**

```bash
cd /Users/william-meroxa/Development/codebenders-datathon/codebenders-dashboard
npm run dev
```

Open http://localhost:3000 — dashboard should load with Bishop State data from Supabase.

**Step 6: Commit**

```bash
git add codebenders-dashboard/app/api/dashboard/
git commit -m "feat: migrate dashboard API routes from mysql2 to pg (Postgres)"
```

---

## Task 8: Migrate Query API Routes to Postgres

**Files:**
- Modify: `codebenders-dashboard/app/api/analyze/route.ts`
- Modify: `codebenders-dashboard/app/api/execute-sql/route.ts`
- Modify: `codebenders-dashboard/lib/prompt-analyzer.ts`
- Modify: `codebenders-dashboard/lib/query-executor.ts`

**Step 1: Update `analyze/route.ts`**

Key changes in SCHEMA_INFO (lines 23-79):
- Replace `kctcs` key with `bscc`
- Update database name: `"Kentucky_Community_and_Technical_College_System"` → `"postgres"` (Supabase default)
- Remove or update `akron` entry's database name
- Update schema descriptions

**Step 2: Update `execute-sql/route.ts`**

Replace mysql2 pool with pg pool from `@/lib/db`. Change `pool.query(sql)` result access to `result.rows`.

**Step 3: Update `lib/prompt-analyzer.ts`**

Lines 4-28: Update `SCHEMA_CONFIG.institutionDbMap`:
```typescript
institutionDbMap: {
  bscc: "postgres",
  akron: "University_of_Akron",
}
```

Remove `kctcs` entry.

**Step 4: Update `lib/query-executor.ts`**

If it references institution codes or database names, update accordingly.

**Step 5: Verify query interface**

Open http://localhost:3000/query → select Bishop State → enter a query like "Show retention rates by cohort" → verify results.

**Step 6: Commit**

```bash
git add codebenders-dashboard/app/api/analyze/ codebenders-dashboard/app/api/execute-sql/ codebenders-dashboard/lib/prompt-analyzer.ts codebenders-dashboard/lib/query-executor.ts
git commit -m "feat: migrate query API routes to Postgres and rebrand to Bishop State"
```

---

## Task 9: Rebrand Frontend UI

**Files:**
- Modify: `codebenders-dashboard/app/layout.tsx`
- Modify: `codebenders-dashboard/app/page.tsx`
- Modify: `codebenders-dashboard/app/query/page.tsx`
- Modify: `codebenders-dashboard/components/export-button.tsx`

**Step 1: Update `layout.tsx`**

- Line 16: `title: "KCTCS Student Success Dashboard"` → `title: "Bishop State Student Success Dashboard"`
- Line 17: `description: "AI-Powered Student Success Analytics & Predictive Models for KCTCS"` → `description: "AI-Powered Student Success Analytics & Predictive Models for Bishop State Community College"`

**Step 2: Update `page.tsx`**

Find the line with `"KCTCS Student Analytics & Predictive Models"` and replace with `"Bishop State Student Analytics & Predictive Models"`.

**Step 3: Update `query/page.tsx`**

Replace INSTITUTIONS array (lines 18-24):
```typescript
const INSTITUTIONS = [
  { name: "Bishop State", code: "bscc" },
  { name: "University of Akron", code: "akron" },
]
```

Remove KCTCS, Cal State San Bernardino, and Thomas More entries.

**Step 4: Update `export-button.tsx`**

- Line 77: `institution: "KCTCS"` → `institution: "Bishop State"`
- Line 106: `**Institution:** KCTCS` → `**Institution:** Bishop State`

**Step 5: Verify visually**

- http://localhost:3000 — title should say "Bishop State", no KCTCS visible
- http://localhost:3000/query — dropdown should show Bishop State + Akron only
- Export a report in each format (CSV, JSON, Markdown) — verify "Bishop State" in output

**Step 6: Commit**

```bash
git add codebenders-dashboard/app/layout.tsx codebenders-dashboard/app/page.tsx codebenders-dashboard/app/query/page.tsx codebenders-dashboard/components/export-button.tsx
git commit -m "feat: rebrand frontend from KCTCS to Bishop State Community College"
```

---

## Task 10: Update Docker Configuration

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.docker.env.example`

**Step 1: Update `.docker.env.example`**

Replace MariaDB config with Postgres:
```env
# Postgres Configuration for Docker Compose
# Copy this file to .docker.env and update with your values

# Database name
POSTGRES_DB=postgres

# Database user
POSTGRES_USER=postgres

# Database password
POSTGRES_PASSWORD=devcolor2025

# Port mapping
POSTGRES_PORT=5432

# pgAdmin port (optional)
PGADMIN_PORT=8080
```

**Step 2: Update `docker-compose.yml`**

Replace MariaDB service with Postgres. Replace phpMyAdmin with pgAdmin (optional). Or simplify to just point at Supabase directly and remove the local DB service entirely (since we're using Supabase for the demo).

**Step 3: Commit**

```bash
git add docker-compose.yml .docker.env.example
git commit -m "feat: update Docker config from MariaDB to Postgres"
```

---

## Task 11: Update Documentation

**Files:** ~15 markdown files (see design doc Section 5 for full list)

**Step 1: Update CLAUDE.md**

Key replacements:
- "KCTCS Student Success Prediction" → "Bishop State Student Success Prediction"
- "Kentucky Community and Technical College System (KCTCS)" → "Bishop State Community College (BSCC)"
- Database name references
- "MariaDB" → "Postgres/Supabase"
- "~20K students" → "~4,000 students"
- Table: `Kentucky_Community_and_Technical_College_System` → `Bishop_State_Community_College` (or `postgres`)
- File references: `kctcs_*.csv` → `bishop_state_*.csv`
- "MySQL2 driver" → "node-postgres (pg) driver"

**Step 2: Update README.md**

Full pass replacing KCTCS → Bishop State, updating tech stack (MariaDB → Postgres), data counts, institution descriptions.

**Step 3: Update remaining docs**

For each file, do a find-replace pass:
- QUICKSTART.md
- DATA_DICTIONARY.md (update file names, record counts, institution references, `school` column values)
- ML_MODELS_GUIDE.md
- DOCKER_SETUP.md (MariaDB → Postgres throughout)
- DASHBOARD_README.md
- operations/README.md
- AI_Powered_Student_Success_PRD.md
- DASHBOARD_VISUALIZATIONS.md
- docs/README_api.md
- docs/README_datageneration.md
- READINESS_ASSESSMENT_INTEGRATION.md
- DOCUMENTATION_ISSUES.md
- hackathon_github_issues.md

**Step 4: Update schema file**

Replace `kctcs_student_level_with_predictions_schema.json` with `bishop_state_student_level_with_predictions_schema.json`. Update title, description, and `school` field values inside.

**Step 5: Commit**

```bash
git add *.md docs/ operations/README.md codebenders-dashboard/*.md bishop_state_student_level_with_predictions_schema.json
git commit -m "docs: rebrand all documentation from KCTCS to Bishop State Community College"
```

---

## Task 12: Clean Up Old KCTCS Files

**Files:**
- Delete: `data/kctcs_*.csv` (all KCTCS data files)
- Delete: `data/ar_kcts_with_zip.csv`
- Delete: `database_dumps/dump-Kentucky_*.sql`
- Delete: `ai_model/merge_kctcs_data.py`
- Delete: `kctcs_student_level_with_predictions_schema.json`

**Step 1: Remove old files**

```bash
rm data/kctcs_*.csv
rm data/ar_kcts_with_zip.csv
rm database_dumps/dump-Kentucky_Community_and_Technical_College_System-*.sql
rm ai_model/merge_kctcs_data.py
rm kctcs_student_level_with_predictions_schema.json
```

**Step 2: Verify no broken references**

```bash
grep -ri "kctcs\|kentucky\|ar_kcts\|kcts" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v .git | grep -v ".csv"
```

Expected: No matches in code files. Some matches in docs are OK if they're historical context.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old KCTCS data files and scripts"
```

---

## Task 13: Final Verification Sweep

**Step 1: Full grep for remaining KCTCS references**

```bash
grep -ri "kctcs\|kentucky_community\|kentucky community" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.yml" --include="*.env*" . | grep -v node_modules | grep -v .git
```

Fix any remaining references found.

**Step 2: Build the Next.js app**

```bash
cd codebenders-dashboard && npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Run the app locally and smoke test**

```bash
npm run dev
```

Test:
- [ ] Dashboard loads at http://localhost:3000
- [ ] KPI cards show data (not zeros or errors)
- [ ] Risk alert chart renders
- [ ] Retention risk chart renders
- [ ] No "KCTCS" text visible anywhere on the page
- [ ] Query page at /query shows Bishop State + Akron in dropdown
- [ ] A sample query executes and returns results
- [ ] Export button produces correct output with "Bishop State"

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: resolve remaining KCTCS references and verify build"
```

---

## Task 14: Create Hosted Supabase & Deploy to Vercel

**Step 1: Create hosted Supabase project (manual — user does this in browser)**

Go to https://supabase.com/dashboard → New Project:
- Project name: `bishop-state-analytics`
- Database password: (save securely)
- Region: US East (closest to Vercel iad1)

Note connection details from Settings → Database:
```
Host: db.<project-ref>.supabase.co
Port: 6543 (connection pooler — use this for serverless)
Database: postgres
User: postgres.<project-ref>
Password: <your-password>
```

**Step 2: Populate hosted database**

Update `operations/db_config.py` env var defaults (or set env vars) to point at hosted Supabase, then re-run the ML pipeline:

```bash
export DB_HOST=db.<project-ref>.supabase.co
export DB_PORT=6543
export DB_NAME=postgres
export DB_USER=postgres.<project-ref>
export DB_PASSWORD=<your-password>

cd /Users/william-meroxa/Development/codebenders-datathon
python ai_model/complete_ml_pipeline.py
```

Verify data landed in hosted Supabase via Studio dashboard.

**Step 3: Update Vercel environment variables**

In Vercel dashboard (https://vercel.com/william-hills-projects/codebenders-dashboard/settings/environment-variables):

```
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.<project-ref>
DB_PASSWORD=<supabase-password>
OPENAI_API_KEY=<existing-key>
NEXT_PUBLIC_ENABLE_LLM=1
```

**Step 4: Push to main**

```bash
git checkout main
git merge docs-update
git push origin main
```

Vercel auto-deploys on push to main.

**Step 5: Verify live deployment**

Wait for Vercel build to complete, then test the production URL:
- [ ] Dashboard loads with Bishop State branding
- [ ] KPIs populate from hosted Supabase
- [ ] Query interface works
- [ ] No console errors referencing KCTCS or MySQL

**Step 6: Final confirmation**

View page source / network tab to confirm no KCTCS strings in HTML or API responses.

---

## Summary of Commits

| Task | Commit Message |
|------|---------------|
| 1 | `feat: initialize local Supabase for Postgres development` |
| 2 | `feat: add synthetic Bishop State data generation script and data files` |
| 3 | `feat: add Bishop State data merge script and merged dataset` |
| 4 | `feat: migrate Python DB layer from pymysql/MariaDB to psycopg2/Supabase Postgres` |
| 5 | `feat: update ML pipeline for Bishop State data and Supabase Postgres` |
| 6 | `feat: add shared Postgres pool module, swap mysql2 for pg` |
| 7 | `feat: migrate dashboard API routes from mysql2 to pg (Postgres)` |
| 8 | `feat: migrate query API routes to Postgres and rebrand to Bishop State` |
| 9 | `feat: rebrand frontend from KCTCS to Bishop State Community College` |
| 10 | `feat: update Docker config from MariaDB to Postgres` |
| 11 | `docs: rebrand all documentation from KCTCS to Bishop State Community College` |
| 12 | `chore: remove old KCTCS data files and scripts` |
| 13 | `fix: resolve remaining KCTCS references and verify build` |
| 14 | Create hosted Supabase + Deploy (no code commit) |
