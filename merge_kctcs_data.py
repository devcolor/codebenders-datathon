import pandas as pd
from datetime import datetime

print("=" * 80)
print("MERGING KCTCS DATA FILES")
print("=" * 80)

# Read all three CSV files
print("\n1. Reading ar_kcts.csv...")
ar_df = pd.read_csv('ar_kcts.csv')
print(f"   - Loaded {len(ar_df)} records")
print(f"   - Columns: {len(ar_df.columns)}")

print("\n2. Reading kctcs_cohorts.csv...")
cohorts_df = pd.read_csv('kctcs_cohorts.csv')
print(f"   - Loaded {len(cohorts_df)} records")
print(f"   - Columns: {len(cohorts_df.columns)}")

print("\n3. Reading kctcs_courses.csv...")
courses_df = pd.read_csv('kctcs_courses.csv')
print(f"   - Loaded {len(courses_df)} records")
print(f"   - Columns: {len(courses_df.columns)}")

# Merge strategy:
# 1. Start with cohorts (one row per student)
# 2. Left join with ar_kcts on Student_GUID = student_id
# 3. Left join with courses on Student_GUID = Student_GUID
#    This will create multiple rows per student (one per course)

print("\n" + "=" * 80)
print("MERGING DATA")
print("=" * 80)

# Step 1: Merge cohorts with ar_kcts
print("\n1. Merging cohorts with AR data...")
# Rename student_id in ar_df to Student_GUID for consistency
ar_df_renamed = ar_df.rename(columns={'student_id': 'Student_GUID'})

# Add prefix to ar columns to avoid conflicts (except Student_GUID and id)
ar_columns_to_rename = {col: f'ar_{col}' for col in ar_df_renamed.columns 
                        if col not in ['Student_GUID', 'id']}
ar_df_renamed = ar_df_renamed.rename(columns=ar_columns_to_rename)
ar_df_renamed = ar_df_renamed.rename(columns={'id': 'ar_id'})

merged_step1 = pd.merge(
    cohorts_df,
    ar_df_renamed,
    on='Student_GUID',
    how='left',
    suffixes=('', '_ar')
)
print(f"   - Result: {len(merged_step1)} records")
print(f"   - Columns: {len(merged_step1.columns)}")

# Step 2: Merge with courses
print("\n2. Merging with courses data...")
# Add prefix to courses columns to avoid conflicts (except Student_GUID and id)
courses_columns_to_rename = {col: f'course_{col}' for col in courses_df.columns 
                             if col not in ['Student_GUID', 'id'] and col not in cohorts_df.columns}
courses_df_renamed = courses_df.rename(columns=courses_columns_to_rename)
courses_df_renamed = courses_df_renamed.rename(columns={'id': 'course_id'})

# Identify columns that exist in both cohorts and courses
common_cols = set(merged_step1.columns) & set(courses_df_renamed.columns)
common_cols.remove('Student_GUID')  # Keep this as the merge key
print(f"   - Common columns (will keep from cohorts): {sorted(common_cols)}")

# For columns that exist in both, we'll keep the cohorts version and drop the courses version
for col in common_cols:
    if col in courses_df_renamed.columns:
        courses_df_renamed = courses_df_renamed.drop(columns=[col])

final_merged = pd.merge(
    merged_step1,
    courses_df_renamed,
    on='Student_GUID',
    how='left',
    suffixes=('', '_course')
)

print(f"   - Result: {len(final_merged)} records")
print(f"   - Columns: {len(final_merged.columns)}")

# Save the merged file
output_filename = 'kctcs_merged.csv'
print(f"\n3. Saving merged data to {output_filename}...")
final_merged.to_csv(output_filename, index=False)

print("\n" + "=" * 80)
print("MERGE COMPLETE!")
print("=" * 80)
print(f"\nOutput file: {output_filename}")
print(f"Total records: {len(final_merged):,}")
print(f"Total columns: {len(final_merged.columns)}")
print(f"Unique students: {final_merged['Student_GUID'].nunique():,}")

# Show some statistics
students_with_courses = final_merged[final_merged['course_id'].notna()]['Student_GUID'].nunique()
students_without_courses = final_merged[final_merged['course_id'].isna()]['Student_GUID'].nunique()

print(f"\nData breakdown:")
print(f"  - Students with course records: {students_with_courses:,}")
print(f"  - Students without course records: {students_without_courses:,}")
print(f"  - Average courses per student (for those with courses): {len(final_merged[final_merged['course_id'].notna()]) / students_with_courses:.1f}")

print(f"\nColumn categories:")
cohort_cols = [col for col in final_merged.columns if not col.startswith('ar_') and not col.startswith('course_') and col not in ['ar_id', 'course_id']]
ar_cols = [col for col in final_merged.columns if col.startswith('ar_') or col == 'ar_id']
course_cols = [col for col in final_merged.columns if col.startswith('course_') or col == 'course_id']

print(f"  - Cohort columns: {len(cohort_cols)}")
print(f"  - AR columns: {len(ar_cols)}")
print(f"  - Course columns: {len(course_cols)}")

print(f"\nFirst few column names:")
print(f"  First 10 columns: {list(final_merged.columns[:10])}")

print("\n" + "=" * 80)

