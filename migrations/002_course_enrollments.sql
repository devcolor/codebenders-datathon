-- Migration 002: course_enrollments table
-- Stores one row per course enrollment from bishop_state_courses.csv

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id                BIGSERIAL    PRIMARY KEY,
  student_guid      TEXT         NOT NULL,
  cohort            TEXT,
  cohort_term       TEXT,
  academic_year     TEXT,
  academic_term     TEXT,
  course_prefix     TEXT,
  course_number     TEXT,
  course_name       TEXT,
  course_cip        TEXT,
  course_type       TEXT,         -- CU (credit unit) / CC (co-req)
  gateway_type      TEXT,         -- M (math) / E (English) / N (neither)
  is_co_requisite   BOOLEAN,
  is_core_course    BOOLEAN,
  core_course_type  TEXT,
  delivery_method   TEXT,         -- F (face-to-face) / O (online) / H (hybrid)
  grade             TEXT,
  credits_attempted NUMERIC,
  credits_earned    NUMERIC,
  instructor_status TEXT          -- FT / PT
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_guid
  ON public.course_enrollments (student_guid);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course
  ON public.course_enrollments (course_prefix, course_number);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_gateway_type
  ON public.course_enrollments (gateway_type);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_term
  ON public.course_enrollments (academic_year, academic_term);
