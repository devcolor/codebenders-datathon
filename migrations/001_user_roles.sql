-- Run this in the Supabase SQL editor (or via supabase db push)

-- Role lookup table — one row per user; references auth.users
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('admin', 'advisor', 'ir', 'faculty', 'leadership')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Row-Level Security: authenticated users may read their own role only
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by seed script) bypasses RLS automatically
