-- Issue #110 / epic #124: persist upload validation report for audit trail (AASCU convening follow-up).

ALTER TABLE public.upload_history
  ADD COLUMN IF NOT EXISTS validation_report JSONB;

COMMENT ON COLUMN public.upload_history.validation_report IS
  'Row-level validation summary, diff vs prior upload of same schema, and metadata.';
