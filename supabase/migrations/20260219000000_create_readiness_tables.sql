-- Migration: Create readiness scoring tables
-- Created: 2026-02-19
-- Supports: Option C (rule-based scoring) and future Option A (Ollama LLM)
-- FERPA-safe: no PII stored in input_features

-- ============================================================================
-- Table 1: readiness_generation_runs
-- Audit log for each batch scoring run
-- ============================================================================
CREATE TABLE IF NOT EXISTS readiness_generation_runs (
    run_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    source          TEXT NOT NULL,          -- 'rule_engine' | 'ollama'
    model_version   TEXT NOT NULL,          -- 'rules_v1' | 'llama3.2:3b'
    students_input  INTEGER,
    students_scored INTEGER,
    errors          INTEGER DEFAULT 0,
    error_sample    JSONB,
    triggered_by    TEXT DEFAULT 'manual'   -- 'manual' | 'pipeline' | 'scheduled'
);

-- ============================================================================
-- Table 2: llm_recommendations
-- One row per student assessment (frontend-compatible schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS llm_recommendations (
    id                  BIGSERIAL PRIMARY KEY,
    "Student_GUID"      TEXT NOT NULL,
    "Institution_ID"    TEXT,
    "Cohort"            TEXT,
    "Cohort_Term"       TEXT,
    readiness_score     NUMERIC(5,4) NOT NULL,  -- 0.0000 to 1.0000
    readiness_level     TEXT NOT NULL,           -- 'high' | 'medium' | 'low'
    rationale           TEXT,
    risk_factors        TEXT,    -- JSON array of human-readable strings (frontend compat)
    suggested_actions   TEXT,    -- JSON array of human-readable strings (frontend compat)
    model_name          TEXT NOT NULL,
    generated_at        TIMESTAMPTZ DEFAULT NOW(),
    -- Observability columns (Option A can populate these too)
    source              TEXT NOT NULL DEFAULT 'rule_engine',
    model_version       TEXT NOT NULL DEFAULT 'rules_v1',
    input_features      JSONB,   -- stripped profile (no GUID, no zip)
    generation_ms       INTEGER,
    run_id              UUID REFERENCES readiness_generation_runs(run_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_llm_rec_guid    ON llm_recommendations ("Student_GUID");
CREATE INDEX IF NOT EXISTS idx_llm_rec_cohort  ON llm_recommendations ("Cohort");
CREATE INDEX IF NOT EXISTS idx_llm_rec_level   ON llm_recommendations (readiness_level);
CREATE INDEX IF NOT EXISTS idx_llm_rec_run     ON llm_recommendations (run_id);

-- Unique constraint enables UPSERT on re-runs
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_rec_guid_unique ON llm_recommendations ("Student_GUID");
