-- Issue #109: per-institution sensitive-population / ML feature exclusion settings.

CREATE TABLE IF NOT EXISTS public.institution_sensitive_ml_settings (
  institution_code text PRIMARY KEY,
  excluded_ml_feature_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  low_sample_threshold integer NOT NULL DEFAULT 30
    CHECK (low_sample_threshold >= 1 AND low_sample_threshold <= 50000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid,
  updated_by_email text
);

COMMENT ON TABLE public.institution_sensitive_ml_settings IS
  'Issue #109: ML features excluded from training/inference and thresholds for low-sample warnings.';

INSERT INTO public.institution_sensitive_ml_settings (institution_code)
VALUES ('bscc')
ON CONFLICT (institution_code) DO NOTHING;
