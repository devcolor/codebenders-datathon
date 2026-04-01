"""
Test Data Generator for PDP/AR/Course/ML CSV Files
====================================================
Generates synthetic test CSV files for upload pipeline testing.

Usage:
    python -m operations.generate_test_data
"""

import csv
import os
import random
import string
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path

# ── Seed for reproducibility ─────────────────────────────────────────────────
random.seed(42)

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "data" / "test_uploads"

# ── Bishop State constants ────────────────────────────────────────────────────
INSTITUTION_ID = "01030800"          # Bishop State OPEID
INSTITUTION_ID_NUMERIC = 102030      # legacy numeric form used in real data
SCHOOL = "BSCC"

# Alabama ZIP codes (Mobile County and surrounding areas)
AL_ZIPS = [
    "36601", "36602", "36603", "36604", "36605", "36606", "36607",
    "36608", "36609", "36610", "36611", "36612", "36613", "36615",
    "36617", "36618", "36619", "36693", "36695", "36701", "36702",
    "36720", "36726", "36736", "36748", "36751", "36756", "36758",
    "36769", "36782", "36785", "36789", "36792", "36801", "36830",
]

# ── PDP enumerated values (from actual data files) ────────────────────────────
RACES = ["White", "Black or African American", "Asian",
         "Two or More Races", "American Indian or Alaska Native",
         "Native Hawaiian or Other Pacific Islander", "Unknown"]
ETHNICITIES = ["N", "H"]
GENDERS = ["M", "F"]
STUDENT_AGES = ["20 and younger", ">20 - 24", "Older than 24"]
ENROLLMENT_TYPES = ["First-Time", "Transfer-In", "Re-Admit", "Dual/Concurrent"]
ENROLLMENT_INTENSITIES = ["Full-Time", "Part-Time"]
PLACEMENTS = ["C", "R", "N"]                            # College-ready, Remedial, N/A
DUAL_SUMMER = ["", "DS", "SE", "DE"]
FIRST_GEN = ["A", "B", "C", "N", "P", "UK"]
PELL_STATUS = ["Y", "N"]
COHORT_TERMS = ["FALL", "SPRING", "SUMMER"]
CREDENTIAL_TYPES = ["A", "B", "C1", "C2"]               # Associates, Bachelor's, Cert1, Cert2
GATEWAY_STATUS = ["R", "N", "UK"]                       # Ready, Not-ready, Unknown
COHORTS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
ACADEMIC_YEARS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25"]
ACADEMIC_TERMS = ["FALL", "SPRING", "SUMMER"]
YES_NO = ["Y", "N"]

# Attendance_Status_Term_1 — composite of enrollment type + intensity
ATTENDANCE_STATUSES = [
    "First-Time Full-Time", "First-Time Part-Time",
    "Transfer-In Full-Time", "Transfer-In Part-Time",
]

# ── Spelled-out values for PDP AR cohort (underscored headers) ────────────────
RACE_SPELLEDOUT = [
    "White", "Black or African American", "Asian",
    "Two or More Races", "American Indian or Alaska Native", "Unknown",
]
SPECIAL_PROGRAMS = [
    "", "STEM Scholars 2019", "Trio SSS", "Honors Program",
    "Adult Education Bridge", "SNAP E&T", "",
]
MILITARY_STATUSES = ["N", "Y"]
EMPLOYMENT_STATUSES = ["FU", "FP", "PT", "N", "UK"]
DISABILITY_STATUSES = ["Y", "N"]
INCARCERATED_STATUSES = ["Y", "N", "N", "N", "N"]     # skew toward N

# CIP codes realistic for BSCC programs
CIP_CODES = [
    510000.0, 120401.0, 110101.0, 520101.0, 220301.0,
    430107.0, 190101.0, 510801.0, 513801.0, 270101.0,
    230101.0, 150000.0, 460000.0, 470000.0, 480000.0,
]

# Course prefixes used at BSCC
COURSE_PREFIXES = [
    "ENG", "MAT", "NUR", "CIS", "COS", "CRJ", "PSY", "ART",
    "SPH", "BIO", "HIS", "SOC", "PHY", "CHE", "BUS",
]
COURSE_TYPES = ["CU", "CC"]                 # Credit-Unit, Co-requisite Credit
GATEWAY_FLAGS = ["N", "M", "E"]             # None, Math, English
DELIVERY_METHODS = ["F", "O", "H"]          # Face-to-face, Online, Hybrid
GRADES = ["A", "A-", "B+", "B", "B-", "C", "D", "F", "W", "I"]
GRADE_WEIGHTS = [12, 5, 5, 12, 5, 10, 6, 6, 8, 1]     # realistic distribution
INSTRUCTOR_STATUSES = ["FT", "PT"]
INSTRUCTOR_RANKS = ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0"]
CORE_COURSE_TYPES = ["", "Communications", "Fine Arts", "Mathematics",
                     "Humanities", "Social Sciences", "Natural Sciences"]
STATES = ["AL", "GA", "MS", "FL", "TN", "", ""]

# ML prediction types
PREDICTION_TYPES = [
    "retention", "early_warning", "time_to_credential",
    "credential_type", "gpa",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_student_guid(idx: int) -> str:
    return f"BSCC_STU{idx:05d}"


def rand_gpa(lo: float = 0.5, hi: float = 4.0) -> float:
    """Return a GPA rounded to 2 decimal places with a roughly normal shape."""
    val = random.gauss(2.7, 0.6)
    return round(max(lo, min(hi, val)), 2)


def rand_credits(mean: int = 12) -> int:
    return max(0, int(random.gauss(mean, 4)))


def rand_date_str(start: date, end: date) -> str:
    delta = (end - start).days
    return (start + timedelta(days=random.randint(0, delta))).strftime("%Y%m%d") + ".0"


def rand_bool_int() -> int:
    return random.randint(0, 1)


def rand_years_to_credential() -> float:
    """Return a plausible time-to-credential value."""
    return round(random.choice([0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
                 + random.uniform(0, 0.9), 1)


def rand_zip() -> str:
    return random.choice(AL_ZIPS)


def rand_program_cip() -> float:
    return random.choice(CIP_CODES)


def rand_course_number() -> int:
    return random.choice([100, 101, 102, 200, 201, 202, 110, 115, 120, 250])


def rand_section_id() -> int:
    return random.randint(100, 999)


# ── Column definitions ────────────────────────────────────────────────────────

# Cohort AR (PDP) — 90 columns, underscored headers, spelled-out values
COHORT_AR_COLUMNS = [
    "id", "Institution_ID", "Cohort", "Student_GUID", "Cohort_Term",
    "Student_Age", "Enrollment_Type", "Enrollment_Intensity_First_Term",
    "Math_Placement", "English_Placement", "Reading_Placement",
    "Dual_and_Summer_Enrollment", "Race", "Ethnicity", "Gender",
    "First_Gen", "Pell_Status_First_Year", "Attendance_Status_Term_1",
    "Credential_Type_Sought_Year_1", "Program_of_Study_Term_1",
    "GPA_Group_Term_1", "GPA_Group_Year_1",
    "Number_of_Credits_Attempted_Year_1", "Number_of_Credits_Earned_Year_1",
    "Number_of_Credits_Attempted_Year_2", "Number_of_Credits_Earned_Year_2",
    "Number_of_Credits_Attempted_Year_3", "Number_of_Credits_Earned_Year_3",
    "Number_of_Credits_Attempted_Year_4", "Number_of_Credits_Earned_Year_4",
    "Gateway_Math_Status", "Gateway_English_Status",
    "AttemptedGatewayMathYear1", "AttemptedGatewayEnglishYear1",
    "CompletedGatewayMathYear1", "CompletedGatewayEnglishYear1",
    "GatewayMathGradeY1", "GatewayEnglishGradeY1",
    "AttemptedDevMathY1", "AttemptedDevEnglishY1",
    "CompletedDevMathY1", "CompletedDevEnglishY1",
    "Retention", "Persistence",
    "Years_to_Bachelors_at_cohort_inst_",
    "Years_to_Bachelor_at_other_inst_",
    "First_Year_to_Bachelors_at_cohort_inst_",
    "First_Year_to_Bachelor_at_other_inst_",
    "Years_to_Associates_or_Certificate_at_cohort_inst_",
    "First_Year_to_Associates_or_Certificate_at_cohort_inst_",
    "Years_to_Latest_Associates_at_Cohort_Inst",
    "Years_to_Latest_Certificate_at_Cohort_Inst",
    "First_Year_to_Associates_at_Cohort_Inst",
    "First_Year_to_Certificate_at_Cohort_Inst",
    "Years_to_Associates_or_Certificate_at_other_inst_",
    "First_Year_to_Associates_or_Certificate_at_other_inst_",
    "Years_to_Latest_Associates_at_Other_Inst",
    "Years_to_Latest_Certificate_at_Other_Inst",
    "First_Year_to_Associates_at_Other_Inst",
    "First_Year_to_Certificate_at_Other_Inst",
    "Years_of_Last_Enrollment_at_cohort_institution",
    "Years_of_Last_Enrollment_at_other_institution",
    "Time_to_Credential",
    "Special_Program",
    "NASPA_First_Generation",
    "Incarcerated_Status",
    "Military_Status",
    "Employment_Status",
    "Disability_Status",
    "Foreign_Language_Completion",
    "Program_of_Study_Year_1",
    "Most_Recent_Bachelors_at_Other_Institution_STATE",
    "Most_Recent_Associates_or_Certificate_at_Other_Ins_dccdad65",
    "Most_Recent_Last_Enrollment_at_Other_institution_STATE",
    "First_Bachelors_at_Other_Institution_STATE",
    "First_Associates_or_Certificate_at_Other_Institution_STATE",
    "Most_Recent_Bachelors_at_Other_Institution_CARNEGIE",
    "Most_Recent_Associates_or_Certificate_at_Other_Ins_5a42b456",
    "Most_Recent_Last_Enrollment_at_Other_institution_CARNEGIE",
    "First_Bachelors_at_Other_Institution_CARNEGIE",
    "First_Associates_or_Certificate_at_Other_Instituti_9c09d367",
    "Most_Recent_Bachelors_at_Other_Institution_LOCALE",
    "Most_Recent_Associates_or_Certificate_at_Other_Ins_9cc1796c",
    "Most_Recent_Last_Enrollment_at_Other_institution_LOCALE",
    "First_Bachelors_at_Other_Institution_LOCALE",
    "First_Associates_or_Certificate_at_Other_Institution_LOCALE",
    "school",
    "dataset_type",
    "created_at",
    "zip_code",
]

# Cohort Submission — 35 columns, spaced headers, coded values (F/T/R style)
COHORT_SUBMISSION_COLUMNS = [
    "Institution ID", "Cohort", "Student GUID", "Cohort Term",
    "Student Age", "Enrollment Type", "Enrollment Intensity First Term",
    "Math Placement", "English Placement", "Reading Placement",
    "Dual and Summer Enrollment", "Race", "Ethnicity", "Gender",
    "First Gen", "Pell Status First Year", "Credential Type Sought Year 1",
    "GPA Group Term 1", "GPA Group Year 1",
    "Number of Credits Attempted Year 1", "Number of Credits Earned Year 1",
    "Number of Credits Attempted Year 2", "Number of Credits Earned Year 2",
    "Gateway Math Status", "Gateway English Status",
    "Retention", "Persistence",
    "Time to Credential",
    "Special Program",
    "Military Status",
    "Employment Status",
    "Disability Status",
    "Incarcerated Status",
    "First Gen NASPA",
    "Zip Code",
]

# Course AR — 39 columns, de-identified with Student_GUID
COURSE_AR_COLUMNS = [
    "id", "Student_GUID", "Student_Age", "Race", "Ethnicity", "Gender",
    "Institution_ID", "Cohort", "Cohort_Term",
    "Academic_Year", "Academic_Term",
    "Course_Prefix", "Course_Number", "Section_ID",
    "Course_Name", "Course_CIP",
    "Course_Type", "Math_or_English_Gateway",
    "Co_requisite_Course", "Core_Course", "Core_Course_Type",
    "Core_Competency_Completed",
    "Course_Begin_Date", "Course_End_Date",
    "Delivery_Method", "Grade",
    "Number_of_Credits_Attempted", "Number_of_Credits_Earned",
    "Enrolled_at_Other_Institutions",
    "Enrollment_Record_at_Other_Institutions_STATEs",
    "Enrollment_Record_at_Other_Institutions_CARNEGIEs",
    "Enrollment_Record_at_Other_Institutions_LOCALEs",
    "Credential_Engine_Identifier",
    "Course_Instructor_Employment_Status",
    "Course_Instructor_Rank",
    "Term_Program_of_Study",
    "school",
    "dataset_type",
    "created_at",
]


# ── Row generators ────────────────────────────────────────────────────────────

def make_cohort_ar_row(idx: int) -> dict:
    """Generate one PDP cohort AR row (underscored headers, spelled-out values)."""
    cohort = random.choice(COHORTS)
    cohort_term = random.choice(COHORT_TERMS)
    enroll_type = random.choice(ENROLLMENT_TYPES)
    enroll_intensity = random.choice(ENROLLMENT_INTENSITIES)
    retention = random.randint(0, 1)
    persistence = random.randint(0, 1)
    credits_att_y1 = rand_credits(12)
    credits_earn_y1 = min(credits_att_y1, rand_credits(10))
    credits_att_y2 = rand_credits(12)
    credits_earn_y2 = min(credits_att_y2, rand_credits(10))
    credits_att_y3 = rand_credits(10)
    credits_earn_y3 = min(credits_att_y3, rand_credits(9))
    credits_att_y4 = rand_credits(8)
    credits_earn_y4 = min(credits_att_y4, rand_credits(7))
    gpa_term = rand_gpa()
    gpa_year = rand_gpa()
    has_credential = random.random() < 0.55
    time_to_credential = rand_years_to_credential() if has_credential else 0.0
    gw_math = random.choice(GATEWAY_STATUS)
    gw_eng = random.choice(GATEWAY_STATUS)
    att_gw_math = random.choice(["Y", "", "N"])
    att_gw_eng = random.choice(["Y", "", "N"])
    comp_gw_math = "Y" if att_gw_math == "Y" and random.random() < 0.7 else ""
    comp_gw_eng = "Y" if att_gw_eng == "Y" and random.random() < 0.7 else ""
    cip = rand_program_cip()
    state = random.choice(STATES)

    # Build attendance status consistent with enrollment type + intensity
    if enroll_type in ("First-Time", "Dual/Concurrent"):
        et_prefix = "First-Time"
    elif enroll_type == "Transfer-In":
        et_prefix = "Transfer-In"
    else:
        et_prefix = "First-Time"
    attendance_status = f"{et_prefix} {enroll_intensity}"

    return {
        "id": idx,
        "Institution_ID": INSTITUTION_ID_NUMERIC,
        "Cohort": cohort,
        "Student_GUID": make_student_guid(idx),
        "Cohort_Term": cohort_term,
        "Student_Age": random.choice(STUDENT_AGES),
        "Enrollment_Type": enroll_type,
        "Enrollment_Intensity_First_Term": enroll_intensity,
        "Math_Placement": random.choice(PLACEMENTS),
        "English_Placement": random.choice(PLACEMENTS),
        "Reading_Placement": random.choice(PLACEMENTS),
        "Dual_and_Summer_Enrollment": random.choice(DUAL_SUMMER),
        "Race": random.choice(RACE_SPELLEDOUT),
        "Ethnicity": random.choice(ETHNICITIES),
        "Gender": random.choice(GENDERS),
        "First_Gen": random.choice(FIRST_GEN),
        "Pell_Status_First_Year": random.choice(PELL_STATUS),
        "Attendance_Status_Term_1": attendance_status,
        "Credential_Type_Sought_Year_1": random.choice(CREDENTIAL_TYPES),
        "Program_of_Study_Term_1": cip,
        "GPA_Group_Term_1": gpa_term,
        "GPA_Group_Year_1": gpa_year,
        "Number_of_Credits_Attempted_Year_1": float(credits_att_y1),
        "Number_of_Credits_Earned_Year_1": float(credits_earn_y1),
        "Number_of_Credits_Attempted_Year_2": float(credits_att_y2),
        "Number_of_Credits_Earned_Year_2": float(credits_earn_y2),
        "Number_of_Credits_Attempted_Year_3": float(credits_att_y3),
        "Number_of_Credits_Earned_Year_3": float(credits_earn_y3),
        "Number_of_Credits_Attempted_Year_4": float(credits_att_y4),
        "Number_of_Credits_Earned_Year_4": float(credits_earn_y4),
        "Gateway_Math_Status": gw_math,
        "Gateway_English_Status": gw_eng,
        "AttemptedGatewayMathYear1": att_gw_math,
        "AttemptedGatewayEnglishYear1": att_gw_eng,
        "CompletedGatewayMathYear1": comp_gw_math,
        "CompletedGatewayEnglishYear1": comp_gw_eng,
        "GatewayMathGradeY1": round(rand_gpa(), 2) if comp_gw_math == "Y" else "",
        "GatewayEnglishGradeY1": round(rand_gpa(), 2) if comp_gw_eng == "Y" else "",
        "AttemptedDevMathY1": random.choice(["Y", "", "N"]),
        "AttemptedDevEnglishY1": random.choice(["Y", "", "N"]),
        "CompletedDevMathY1": random.choice(["Y", "", "N"]),
        "CompletedDevEnglishY1": random.choice(["Y", "", "N"]),
        "Retention": retention,
        "Persistence": persistence,
        "Years_to_Bachelors_at_cohort_inst_": 0.0,
        "Years_to_Bachelor_at_other_inst_": 0.0,
        "First_Year_to_Bachelors_at_cohort_inst_": 0.0,
        "First_Year_to_Bachelor_at_other_inst_": 0.0,
        "Years_to_Associates_or_Certificate_at_cohort_inst_": rand_years_to_credential() if has_credential else 0.0,
        "First_Year_to_Associates_or_Certificate_at_cohort_inst_": rand_years_to_credential() if has_credential else 0.0,
        "Years_to_Latest_Associates_at_Cohort_Inst": rand_years_to_credential() if has_credential else 0.0,
        "Years_to_Latest_Certificate_at_Cohort_Inst": rand_years_to_credential() if has_credential else 0.0,
        "First_Year_to_Associates_at_Cohort_Inst": rand_years_to_credential() if has_credential else 0.0,
        "First_Year_to_Certificate_at_Cohort_Inst": rand_years_to_credential() if has_credential else 0.0,
        "Years_to_Associates_or_Certificate_at_other_inst_": 0.0,
        "First_Year_to_Associates_or_Certificate_at_other_inst_": 0.0,
        "Years_to_Latest_Associates_at_Other_Inst": 0.0,
        "Years_to_Latest_Certificate_at_Other_Inst": 0.0,
        "First_Year_to_Associates_at_Other_Inst": 0.0,
        "First_Year_to_Certificate_at_Other_Inst": 0.0,
        "Years_of_Last_Enrollment_at_cohort_institution": round(random.uniform(1.0, 6.0), 1),
        "Years_of_Last_Enrollment_at_other_institution": 0.0,
        "Time_to_Credential": time_to_credential,
        "Special_Program": random.choice(SPECIAL_PROGRAMS),
        "NASPA_First_Generation": random.choice(["-1.0", "0.0", "1.0"]),
        "Incarcerated_Status": random.choice(INCARCERATED_STATUSES),
        "Military_Status": random.choice(MILITARY_STATUSES),
        "Employment_Status": random.choice(EMPLOYMENT_STATUSES),
        "Disability_Status": random.choice(DISABILITY_STATUSES),
        "Foreign_Language_Completion": random.choice(YES_NO),
        "Program_of_Study_Year_1": cip,
        "Most_Recent_Bachelors_at_Other_Institution_STATE": state,
        "Most_Recent_Associates_or_Certificate_at_Other_Ins_dccdad65": state,
        "Most_Recent_Last_Enrollment_at_Other_institution_STATE": state,
        "First_Bachelors_at_Other_Institution_STATE": state,
        "First_Associates_or_Certificate_at_Other_Institution_STATE": state,
        "Most_Recent_Bachelors_at_Other_Institution_CARNEGIE": "",
        "Most_Recent_Associates_or_Certificate_at_Other_Ins_5a42b456": "",
        "Most_Recent_Last_Enrollment_at_Other_institution_CARNEGIE": "",
        "First_Bachelors_at_Other_Institution_CARNEGIE": "",
        "First_Associates_or_Certificate_at_Other_Instituti_9c09d367": "",
        "Most_Recent_Bachelors_at_Other_Institution_LOCALE": "",
        "Most_Recent_Associates_or_Certificate_at_Other_Ins_9cc1796c": "",
        "Most_Recent_Last_Enrollment_at_Other_institution_LOCALE": "",
        "First_Bachelors_at_Other_Institution_LOCALE": "",
        "First_Associates_or_Certificate_at_Other_Institution_LOCALE": "",
        "school": SCHOOL,
        "dataset_type": "S",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "zip_code": rand_zip(),
    }


def make_cohort_submission_row(idx: int) -> dict:
    """Generate one PDP cohort submission row (spaced headers, coded values)."""
    enroll_type = random.choice(["F", "T", "R", "D"])     # First, Transfer, Re-admit, Dual
    enroll_intensity = random.choice(["F", "P"])            # Full, Part
    cohort_term = random.choice(["F", "S", "U"])            # coded term
    student_age = random.choice(["1", "2", "3"])            # coded age band
    gpa_term = rand_gpa()
    gpa_year = rand_gpa()
    has_credential = random.random() < 0.55

    return {
        "Institution ID": INSTITUTION_ID,
        "Cohort": random.choice(COHORTS),
        "Student GUID": make_student_guid(idx),
        "Cohort Term": cohort_term,
        "Student Age": student_age,
        "Enrollment Type": enroll_type,
        "Enrollment Intensity First Term": enroll_intensity,
        "Math Placement": random.choice(["C", "R", "N"]),
        "English Placement": random.choice(["C", "R", "N"]),
        "Reading Placement": random.choice(["C", "R", "N"]),
        "Dual and Summer Enrollment": random.choice(["", "DS", "SE", "DE"]),
        "Race": random.choice(["1", "2", "3", "4", "5", "6", "7"]),   # coded race
        "Ethnicity": random.choice(["H", "N"]),
        "Gender": random.choice(["M", "F"]),
        "First Gen": random.choice(["A", "B", "C", "N", "P", "UK"]),
        "Pell Status First Year": random.choice(["Y", "N"]),
        "Credential Type Sought Year 1": random.choice(["A", "B", "C1", "C2"]),
        "GPA Group Term 1": gpa_term,
        "GPA Group Year 1": gpa_year,
        "Number of Credits Attempted Year 1": rand_credits(12),
        "Number of Credits Earned Year 1": rand_credits(10),
        "Number of Credits Attempted Year 2": rand_credits(12),
        "Number of Credits Earned Year 2": rand_credits(10),
        "Gateway Math Status": random.choice(["R", "N", "UK"]),
        "Gateway English Status": random.choice(["R", "N", "UK"]),
        "Retention": random.randint(0, 1),
        "Persistence": random.randint(0, 1),
        "Time to Credential": rand_years_to_credential() if has_credential else 0.0,
        "Special Program": random.choice(["", "STEM", "TRIO", "HONORS"]),
        "Military Status": random.choice(["Y", "N"]),
        "Employment Status": random.choice(["FU", "FP", "PT", "N"]),
        "Disability Status": random.choice(["Y", "N"]),
        "Incarcerated Status": random.choice(["Y", "N"]),
        "First Gen NASPA": random.choice(["-1", "0", "1"]),
        "Zip Code": rand_zip(),
    }


def make_course_ar_row(idx: int, student_guid: str, student_idx: int) -> dict:
    """Generate one course AR row."""
    cohort = random.choice(COHORTS)
    cohort_term = random.choice(COHORT_TERMS)
    academic_year = random.choice(ACADEMIC_YEARS)
    academic_term = random.choice(ACADEMIC_TERMS)
    prefix = random.choice(COURSE_PREFIXES)
    course_num = rand_course_number()
    cip = rand_program_cip()
    core = random.choice(["Y", "N"])
    core_type = random.choice(CORE_COURSE_TYPES) if core == "Y" else ""
    credits_att = random.choice([1, 2, 3, 4])
    credits_earn = credits_att if random.random() < 0.75 else 0
    grade = random.choices(GRADES, weights=GRADE_WEIGHTS, k=1)[0]

    # Dates consistent with academic term
    year_num = int(academic_year[:4])
    if academic_term == "FALL":
        begin = date(year_num, 8, 15)
        end = date(year_num, 12, 15)
    elif academic_term == "SPRING":
        begin = date(year_num, 1, 10)
        end = date(year_num, 5, 10)
    else:  # SUMMER
        begin = date(year_num, 5, 20)
        end = date(year_num, 8, 5)

    course_names = {
        "ENG": "English Composition", "MAT": "College Algebra",
        "NUR": "Nursing Fundamentals", "CIS": "Intro to Computers",
        "COS": "Cosmetology Basics", "CRJ": "Criminal Justice",
        "PSY": "Psychology", "ART": "Art Appreciation",
        "SPH": "Public Speaking", "BIO": "Biology",
        "HIS": "American History", "SOC": "Sociology",
        "PHY": "Physics", "CHE": "Chemistry", "BUS": "Business Principles",
    }

    return {
        "id": idx,
        "Student_GUID": student_guid,
        "Student_Age": random.choice(STUDENT_AGES),
        "Race": random.choice(RACE_SPELLEDOUT),
        "Ethnicity": random.choice(ETHNICITIES),
        "Gender": random.choice(GENDERS),
        "Institution_ID": INSTITUTION_ID_NUMERIC,
        "Cohort": cohort,
        "Cohort_Term": cohort_term,
        "Academic_Year": academic_year,
        "Academic_Term": academic_term,
        "Course_Prefix": prefix,
        "Course_Number": course_num,
        "Section_ID": rand_section_id(),
        "Course_Name": course_names.get(prefix, f"{prefix} Course"),
        "Course_CIP": cip,
        "Course_Type": random.choice(COURSE_TYPES),
        "Math_or_English_Gateway": random.choice(GATEWAY_FLAGS),
        "Co_requisite_Course": random.choice(["Y", "N"]),
        "Core_Course": core,
        "Core_Course_Type": core_type,
        "Core_Competency_Completed": random.choice(["Y", "N"]),
        "Course_Begin_Date": begin.strftime("%Y%m%d") + ".0",
        "Course_End_Date": end.strftime("%Y%m%d") + ".0",
        "Delivery_Method": random.choice(DELIVERY_METHODS),
        "Grade": grade,
        "Number_of_Credits_Attempted": credits_att,
        "Number_of_Credits_Earned": credits_earn,
        "Enrolled_at_Other_Institutions": "N",
        "Enrollment_Record_at_Other_Institutions_STATEs": "",
        "Enrollment_Record_at_Other_Institutions_CARNEGIEs": "",
        "Enrollment_Record_at_Other_Institutions_LOCALEs": "",
        "Credential_Engine_Identifier": "",
        "Course_Instructor_Employment_Status": random.choice(INSTRUCTOR_STATUSES),
        "Course_Instructor_Rank": random.choice(INSTRUCTOR_RANKS),
        "Term_Program_of_Study": cip,
        "school": SCHOOL,
        "dataset_type": "S",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def make_ml_prediction_row(student_idx: int, prediction_type: str, row_id: int) -> dict:
    """Generate one ML prediction row (one student × one prediction type)."""
    guid = make_student_guid(student_idx)
    cohort = random.choice(COHORTS)
    cohort_term = random.choice(COHORT_TERMS)

    # Type-specific value ranges
    if prediction_type == "retention":
        value = round(random.uniform(0.3, 0.99), 4)
        confidence = round(random.uniform(0.65, 0.98), 4)
        label = "retained" if value >= 0.5 else "not_retained"
    elif prediction_type == "early_warning":
        value = round(random.uniform(0.0, 1.0), 4)
        confidence = round(random.uniform(0.60, 0.95), 4)
        label = "at_risk" if value >= 0.4 else "on_track"
    elif prediction_type == "time_to_credential":
        value = round(random.uniform(1.0, 6.0), 2)
        confidence = round(random.uniform(0.55, 0.90), 4)
        label = f"{round(value)} years"
    elif prediction_type == "credential_type":
        value = round(random.uniform(0.0, 1.0), 4)
        confidence = round(random.uniform(0.60, 0.92), 4)
        label = random.choice(["Associate's", "Certificate", "Bachelor's"])
    else:  # gpa
        value = rand_gpa(0.5, 4.0)
        confidence = round(random.uniform(0.55, 0.88), 4)
        label = f"GPA {value}"

    return {
        "id": row_id,
        "Student_GUID": guid,
        "Institution_ID": INSTITUTION_ID,
        "Cohort": cohort,
        "Cohort_Term": cohort_term,
        "Prediction_Type": prediction_type,
        "Prediction_Value": value,
        "Prediction_Label": label,
        "Confidence_Score": confidence,
        "Model_Version": "1.0.0",
        "Created_At": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ── File generators ───────────────────────────────────────────────────────────

def generate_pdp_cohort_ar(path: Path, n_rows: int = 500) -> None:
    """500 rows × 90 columns — underscored headers, spelled-out values."""
    print(f"  Generating {path.name} ({n_rows} rows, {len(COHORT_AR_COLUMNS)} columns)...")
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COHORT_AR_COLUMNS)
        writer.writeheader()
        for i in range(1, n_rows + 1):
            writer.writerow(make_cohort_ar_row(i))
    print(f"    -> {path}")


def generate_pdp_cohort_submission(path: Path, n_rows: int = 500) -> None:
    """500 rows × 35 columns — spaced headers, coded values."""
    print(f"  Generating {path.name} ({n_rows} rows, {len(COHORT_SUBMISSION_COLUMNS)} columns)...")
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COHORT_SUBMISSION_COLUMNS)
        writer.writeheader()
        for i in range(1, n_rows + 1):
            writer.writerow(make_cohort_submission_row(i))
    print(f"    -> {path}")


def generate_course_ar(path: Path, n_rows: int = 5000) -> None:
    """5000 rows × 39 columns — de-identified with Student_GUID."""
    print(f"  Generating {path.name} ({n_rows} rows, {len(COURSE_AR_COLUMNS)} columns)...")
    # Build a pool of ~500 students; each gets multiple course rows
    n_students = 500
    student_guids = [make_student_guid(i) for i in range(1, n_students + 1)]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COURSE_AR_COLUMNS)
        writer.writeheader()
        for i in range(1, n_rows + 1):
            stu_idx = (i - 1) % n_students
            writer.writerow(make_course_ar_row(i, student_guids[stu_idx], stu_idx + 1))
    print(f"    -> {path}")


def generate_ml_predictions(path: Path, n_students: int = 500) -> None:
    """500 students × 5 prediction types = 2500 rows."""
    n_rows = n_students * len(PREDICTION_TYPES)
    print(f"  Generating {path.name} ({n_rows} rows)...")
    columns = [
        "id", "Student_GUID", "Institution_ID", "Cohort", "Cohort_Term",
        "Prediction_Type", "Prediction_Value", "Prediction_Label",
        "Confidence_Score", "Model_Version", "Created_At",
    ]
    row_id = 1
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for stu_idx in range(1, n_students + 1):
            for ptype in PREDICTION_TYPES:
                writer.writerow(make_ml_prediction_row(stu_idx, ptype, row_id))
                row_id += 1
    print(f"    -> {path}")


def generate_bad_headers(path: Path, n_rows: int = 100) -> None:
    """100 rows with random/nonsense column names (low-confidence detection test)."""
    print(f"  Generating {path.name} ({n_rows} rows, random headers)...")
    # Generate 25 random column names
    random.seed(99)
    n_cols = 25
    col_names = []
    for _ in range(n_cols):
        length = random.randint(4, 12)
        name = "".join(random.choices(string.ascii_lowercase + "_", k=length)).strip("_")
        col_names.append(name)

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=col_names)
        writer.writeheader()
        for _ in range(n_rows):
            row = {}
            for col in col_names:
                choice = random.randint(0, 2)
                if choice == 0:
                    row[col] = round(random.uniform(0, 100), 2)
                elif choice == 1:
                    row[col] = "".join(random.choices(string.ascii_letters, k=random.randint(3, 8)))
                else:
                    row[col] = random.randint(0, 9999)
            writer.writerow(row)
    print(f"    -> {path}")


def generate_mixed_casing(path: Path, n_rows: int = 200) -> None:
    """200 rows — PDP AR columns in mixed case (STUDENT_GUID, cohort, COHORT_TERM)."""
    print(f"  Generating {path.name} ({n_rows} rows, mixed-case headers)...")
    # Take a subset of cohort AR columns but vary their casing
    base_cols = [
        "id", "Institution_ID", "Cohort", "Student_GUID", "Cohort_Term",
        "Student_Age", "Enrollment_Type", "Enrollment_Intensity_First_Term",
        "Math_Placement", "English_Placement", "Reading_Placement",
        "Race", "Ethnicity", "Gender", "First_Gen", "Pell_Status_First_Year",
        "GPA_Group_Term_1", "GPA_Group_Year_1", "Retention", "Persistence",
    ]
    # Apply specific mixed-case transformations as described in the task
    mixed_cols = []
    for col in base_cols:
        if col == "Student_GUID":
            mixed_cols.append("STUDENT_GUID")
        elif col == "Cohort":
            mixed_cols.append("cohort")
        elif col == "Cohort_Term":
            mixed_cols.append("COHORT_TERM")
        elif col == "Institution_ID":
            mixed_cols.append("institution_id")
        elif col == "Enrollment_Type":
            mixed_cols.append("ENROLLMENT_TYPE")
        elif col == "Math_Placement":
            mixed_cols.append("math_placement")
        else:
            mixed_cols.append(col)

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=mixed_cols)
        writer.writeheader()
        for i in range(1, n_rows + 1):
            # Generate a real row then remap keys to the mixed-case names
            real_row = make_cohort_ar_row(i)
            col_map = dict(zip(base_cols, mixed_cols))
            mixed_row = {col_map[k]: real_row[k] for k in base_cols}
            writer.writerow(mixed_row)
    print(f"    -> {path}")


def generate_oversized(path: Path, target_mb: int = 62) -> None:
    """~60MB file for testing 50MB upload rejection."""
    print(f"  Generating {path.name} (~{target_mb}MB file)...")
    target_bytes = target_mb * 1024 * 1024

    # Use cohort AR columns for a realistic-looking oversized file
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COHORT_AR_COLUMNS)
        writer.writeheader()
        row_idx = 1
        written = f.tell()
        while written < target_bytes:
            writer.writerow(make_cohort_ar_row(row_idx))
            row_idx += 1
            # Check file size periodically
            if row_idx % 500 == 0:
                written = path.stat().st_size
    final_mb = path.stat().st_size / (1024 * 1024)
    print(f"    -> {path} ({final_mb:.1f}MB)")


# ── .gitignore update ─────────────────────────────────────────────────────────

def update_gitignore(gitignore_path: Path) -> None:
    """Add data/test_uploads/ to .gitignore if not already present."""
    entry = "data/test_uploads/"
    text = gitignore_path.read_text() if gitignore_path.exists() else ""
    if entry in text:
        print(f"  .gitignore already contains '{entry}'")
        return
    with open(gitignore_path, "a") as f:
        f.write(f"\n# Test upload fixtures (generated — do not commit)\n{entry}\n")
    print(f"  Added '{entry}' to .gitignore")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("Bishop State — Test Data Generator")
    print("=" * 60)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {OUTPUT_DIR}\n")

    # Update .gitignore
    gitignore = ROOT / ".gitignore"
    update_gitignore(gitignore)
    print()

    # Generate all files
    generate_pdp_cohort_ar(OUTPUT_DIR / "test_pdp_cohort_ar.csv", n_rows=500)
    generate_pdp_cohort_submission(OUTPUT_DIR / "test_pdp_cohort_submission.csv", n_rows=500)
    generate_course_ar(OUTPUT_DIR / "test_course_ar.csv", n_rows=5000)
    generate_ml_predictions(OUTPUT_DIR / "test_ml_predictions.csv", n_students=500)
    generate_bad_headers(OUTPUT_DIR / "test_bad_headers.csv", n_rows=100)
    generate_mixed_casing(OUTPUT_DIR / "test_mixed_casing.csv", n_rows=200)
    generate_oversized(OUTPUT_DIR / "test_oversized.csv", target_mb=62)

    print("\nDone! All test files written to data/test_uploads/")
    print("=" * 60)


if __name__ == "__main__":
    main()
