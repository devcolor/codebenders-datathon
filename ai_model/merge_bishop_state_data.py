"""
Merge Bishop State Data Files into a Single Student-Level File
===============================================================
Reads three source files:
  1. data/bishop_state_cohorts_with_zip.csv  (one row per student)
  2. data/ar_bscc_with_zip.csv               (one row per student)
  3. data/bishop_state_courses.csv            (multiple rows per student)

Outputs:
  data/bishop_state_student_level_with_zip.csv  (one row per student, with
  aggregated course-level features)

The output schema matches what complete_ml_pipeline.py expects from
kctcs_student_level_with_zip.csv.
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime

# Resolve paths relative to project root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')

print("=" * 80)
print("MERGING BISHOP STATE DATA FILES")
print("=" * 80)

# ============================================================================
# 1. Load source files
# ============================================================================

print("\n1. Reading ar_bscc_with_zip.csv...")
ar_df = pd.read_csv(os.path.join(DATA_DIR, 'ar_bscc_with_zip.csv'))
print(f"   - Loaded {len(ar_df)} records")
print(f"   - Columns: {len(ar_df.columns)}")

print("\n2. Reading bishop_state_cohorts_with_zip.csv...")
cohorts_df = pd.read_csv(os.path.join(DATA_DIR, 'bishop_state_cohorts_with_zip.csv'))
print(f"   - Loaded {len(cohorts_df)} records")
print(f"   - Columns: {len(cohorts_df.columns)}")

print("\n3. Reading bishop_state_courses.csv...")
courses_df = pd.read_csv(os.path.join(DATA_DIR, 'bishop_state_courses.csv'))
print(f"   - Loaded {len(courses_df)} records")
print(f"   - Columns: {len(courses_df.columns)}")

# ============================================================================
# 2. Merge cohorts with AR data (one-to-one on Student_GUID)
# ============================================================================

print("\n" + "=" * 80)
print("MERGING COHORT + AR DATA")
print("=" * 80)

# Rename student_id in AR data to Student_GUID for consistency
ar_df_renamed = ar_df.rename(columns={'student_id': 'Student_GUID'})

# Drop zip_code from AR data (already present in cohorts)
if 'zip_code' in ar_df_renamed.columns:
    ar_df_renamed = ar_df_renamed.drop(columns=['zip_code'])

# Prefix AR columns to avoid conflicts (except join key and id)
ar_columns_to_rename = {col: f'ar_{col}' for col in ar_df_renamed.columns
                        if col not in ['Student_GUID', 'id']}
ar_df_renamed = ar_df_renamed.rename(columns=ar_columns_to_rename)
ar_df_renamed = ar_df_renamed.rename(columns={'id': 'ar_id'})

merged = pd.merge(
    cohorts_df,
    ar_df_renamed,
    on='Student_GUID',
    how='left',
    suffixes=('', '_ar')
)
print(f"   - Cohort + AR merge: {len(merged)} records, {len(merged.columns)} columns")

# ============================================================================
# 3. Aggregate course-level data to one row per student
# ============================================================================

print("\n" + "=" * 80)
print("AGGREGATING COURSE-LEVEL FEATURES")
print("=" * 80)

# Grade-to-numeric mapping for GPA-style calculations
grade_map = {
    'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0,
    'A+': 4.0, 'A-': 3.7, 'B+': 3.3, 'B-': 2.7,
    'C+': 2.3, 'C-': 1.7, 'D+': 1.3, 'D-': 0.7,
    'P': 3.0, 'S': 3.0,  # Pass / Satisfactory treated as C-equivalent
}
failing_grades = {'F', 'W', 'WF', 'WN', 'FN', 'U', 'I', 'E'}

courses_df['grade_numeric'] = courses_df['Grade'].map(grade_map)
courses_df['is_failing'] = courses_df['Grade'].isin(failing_grades).astype(int)
courses_df['is_passing'] = (~courses_df['Grade'].isin(failing_grades) &
                             courses_df['Grade'].notna()).astype(int)

# Ensure numeric credit columns
courses_df['Number_of_Credits_Attempted'] = pd.to_numeric(
    courses_df['Number_of_Credits_Attempted'], errors='coerce')
courses_df['Number_of_Credits_Earned'] = pd.to_numeric(
    courses_df['Number_of_Credits_Earned'], errors='coerce')


def aggregate_courses(group):
    """Aggregate course rows for a single student."""
    row = {}

    # Volume metrics
    row['total_courses_enrolled'] = len(group)
    row['unique_course_prefixes'] = group['Course_Prefix'].nunique()

    # Credit metrics
    row['total_credits_attempted'] = group['Number_of_Credits_Attempted'].sum()
    row['total_credits_earned'] = group['Number_of_Credits_Earned'].sum()
    row['avg_credits_per_course'] = group['Number_of_Credits_Attempted'].mean()

    # Completion rate
    attempted = group['Number_of_Credits_Attempted'].sum()
    earned = group['Number_of_Credits_Earned'].sum()
    row['course_completion_rate'] = (earned / attempted) if attempted > 0 else 0.0

    # Grade metrics
    graded = group['grade_numeric'].dropna()
    row['courses_with_grades'] = len(graded)
    row['average_grade'] = graded.mean() if len(graded) > 0 else np.nan
    row['min_grade'] = graded.min() if len(graded) > 0 else np.nan
    row['max_grade'] = graded.max() if len(graded) > 0 else np.nan
    row['grade_std_dev'] = graded.std() if len(graded) > 1 else 0.0
    row['failing_grades_count'] = group['is_failing'].sum()
    total_graded = group['is_passing'].sum() + group['is_failing'].sum()
    row['passing_rate'] = (group['is_passing'].sum() / total_graded) if total_graded > 0 else 0.0

    # Course type counts
    row['core_courses_taken'] = (group['Core_Course'] == 'Y').sum()
    row['gateway_math_courses'] = ((group['Math_or_English_Gateway'] == 'M') |
                                    (group['Math_or_English_Gateway'] == 'Y')).sum()
    row['gateway_english_courses'] = ((group['Math_or_English_Gateway'] == 'E') |
                                       (group['Math_or_English_Gateway'] == 'Y')).sum()
    row['corequisite_courses'] = (group['Co_requisite_Course'] == 'Y').sum()

    # Delivery method
    delivery = group['Delivery_Method'].fillna('')
    row['online_courses'] = (delivery == 'O').sum()
    row['face_to_face_courses'] = (delivery == 'F').sum()
    row['hybrid_courses'] = (delivery == 'H').sum()
    total_delivery = row['online_courses'] + row['face_to_face_courses'] + row['hybrid_courses']
    row['pct_online'] = (row['online_courses'] / total_delivery) if total_delivery > 0 else 0.0

    # Term / year diversity
    row['unique_academic_years'] = group['Academic_Year'].nunique()
    row['unique_academic_terms'] = group['Academic_Term'].nunique()

    term = group['Academic_Term'].fillna('').str.upper()
    row['fall_courses'] = term.str.contains('FALL').sum()
    row['spring_courses'] = term.str.contains('SPRING').sum()
    row['summer_courses'] = term.str.contains('SUMMER').sum()

    # Instructor employment status
    emp = group['Course_Instructor_Employment_Status'].fillna('')
    row['courses_with_fulltime_instructors'] = (emp == 'FT').sum()
    row['courses_with_parttime_instructors'] = (emp == 'PT').sum()

    # Enrolled at other institutions
    other = group['Enrolled_at_Other_Institutions'].fillna('N')
    row['enrolled_other_institutions'] = (other == 'Y').sum()

    return pd.Series(row)


print("   Aggregating courses per student...")
course_agg = courses_df.groupby('Student_GUID').apply(
    aggregate_courses, include_groups=False
).reset_index()
print(f"   - Aggregated to {len(course_agg)} student rows")

# ============================================================================
# 4. Join aggregated course features onto cohort+AR data
# ============================================================================

print("\n" + "=" * 80)
print("FINAL MERGE: COHORT+AR + COURSE AGGREGATES")
print("=" * 80)

final = pd.merge(merged, course_agg, on='Student_GUID', how='left')
print(f"   - Final dataset: {len(final)} students, {len(final.columns)} columns")

# ============================================================================
# 5. Save output
# ============================================================================

output_path = os.path.join(DATA_DIR, 'bishop_state_student_level_with_zip.csv')
print(f"\nSaving to {output_path}...")
final.to_csv(output_path, index=False)

# ============================================================================
# Summary
# ============================================================================

print("\n" + "=" * 80)
print("MERGE COMPLETE!")
print("=" * 80)
print(f"Output file: {output_path}")
print(f"Total students: {len(final):,}")
print(f"Total columns: {len(final.columns)}")

students_with_courses = final['total_courses_enrolled'].notna().sum()
students_without_courses = final['total_courses_enrolled'].isna().sum()
print(f"\nData breakdown:")
print(f"  - Students with course records: {students_with_courses:,}")
print(f"  - Students without course records: {students_without_courses:,}")
if students_with_courses > 0:
    avg_courses = final.loc[final['total_courses_enrolled'].notna(), 'total_courses_enrolled'].mean()
    print(f"  - Average courses per student (for those with courses): {avg_courses:.1f}")

print(f"\nColumn categories:")
cohort_cols = [c for c in final.columns
               if not c.startswith('ar_') and c not in course_agg.columns]
ar_cols = [c for c in final.columns if c.startswith('ar_') or c == 'ar_id']
course_feat_cols = [c for c in course_agg.columns if c != 'Student_GUID']
print(f"  - Cohort columns: {len(cohort_cols)}")
print(f"  - AR columns: {len(ar_cols)}")
print(f"  - Aggregated course features: {len(course_feat_cols)}")

print("\n" + "=" * 80)
