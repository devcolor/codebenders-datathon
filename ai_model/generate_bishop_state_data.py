#!/usr/bin/env python3
"""
Generate synthetic PDP-compliant student data for Bishop State Community College.

Creates three CSV files matching the exact schema of existing KCTCS data:
  1. data/bishop_state_cohorts_with_zip.csv  (~4,000 students)
  2. data/ar_bscc_with_zip.csv              (~4,000 AR records)
  3. data/bishop_state_courses.csv           (~100,000 course records)
"""

import csv
import os
import random
import sys

import numpy as np

# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

NUM_STUDENTS = 4000
NUM_COURSES = 100000

# ---------------------------------------------------------------------------
# Read existing headers
# ---------------------------------------------------------------------------

def read_header(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        reader = csv.reader(f)
        return next(reader)


COHORT_HEADER = read_header("kctcs_cohorts_with_zip.csv")
AR_HEADER = read_header("ar_kcts_with_zip.csv")
COURSE_HEADER = read_header("kctcs_courses.csv")

print(f"Cohort columns: {len(COHORT_HEADER)}")
print(f"AR columns:     {len(AR_HEADER)}")
print(f"Course columns: {len(COURSE_HEADER)}")

# ---------------------------------------------------------------------------
# Helper: weighted choice
# ---------------------------------------------------------------------------

def wchoice(options, weights, size=None):
    """Weighted random choice.  options/weights are parallel lists."""
    p = np.array(weights, dtype=float)
    p /= p.sum()
    return np.random.choice(options, size=size, p=p)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

INSTITUTION_ID = 102030
SCHOOL = "BSCC"
DATASET_TYPE = "S"
CREATED_AT = "2025-10-27 08:08:18"

COHORTS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24"]
COHORT_TERMS = ["FALL", "SPRING", "SUMMER"]
COHORT_TERM_W = [0.70, 0.20, 0.10]

AGE_GROUPS = ["20 and younger", ">20 - 24", "Older than 24"]
AGE_W = [0.50, 0.26, 0.24]

RACES = [
    "Black or African American", "White", "Two or More Races",
    "Hispanic", "Asian", "American Indian or Alaska Native",
    "Native Hawaiian or Other Pacific Islander",
]
RACE_W = [0.59, 0.28, 0.047, 0.029, 0.023, 0.012, 0.001]

ETHNICITY_VALS = ["N", "H"]
ETHNICITY_W = [0.97, 0.03]

GENDERS = ["F", "M"]
GENDER_W = [0.63, 0.37]

ENROLLMENT_TYPES = ["First-Time", "Transfer-In"]
ENROLLMENT_TYPE_W = [0.65, 0.35]

INTENSITY = ["Full-Time", "Part-Time"]
INTENSITY_W = [0.32, 0.68]

FIRST_GEN_VALS = ["A", "B", "C", "N", "P", "UK"]
FIRST_GEN_W = [0.15, 0.15, 0.15, 0.20, 0.15, 0.20]

PELL_VALS = ["Y", "N", "UK"]
PELL_W = [0.60, 0.25, 0.15]

PLACEMENT_VALS = ["C", "R", "N"]
PLACEMENT_W = [0.45, 0.30, 0.25]

DUAL_VALS = ["", "DE", "SE", "DS", "UK"]
DUAL_W = [0.60, 0.15, 0.10, 0.05, 0.10]

CIP_CODES = [
    "510000.0", "520101.0", "110101.0", "240101.0", "480508.0",
    "120401.0", "430104.0", "150000.0", "460000.0",
]
CIP_W = [0.25, 0.15, 0.10, 0.20, 0.10, 0.05, 0.05, 0.05, 0.05]

CREDENTIAL_TYPES = ["A", "B", "C1", "C2", "01", "02", "03"]
CREDENTIAL_W = [0.30, 0.10, 0.15, 0.15, 0.10, 0.10, 0.10]

SPECIAL_PROGRAMS = ["", "Bridge Program", "First Year Success", "STEM Scholars 2019"]
SPECIAL_W = [0.70, 0.10, 0.10, 0.10]

SOUTHEAST_STATES = ["AL", "MS", "FL", "GA", "TN"]
CARNEGIE_VALS = ["Associate's Colleges", "Master's Colleges and Universities",
                  "Baccalaureate Colleges", "Doctoral Universities"]
LOCALE_VALS = ["Urban", "Suburb", "Town/Rural"]

# Mobile AL area zip codes
MOBILE_ZIPS = [str(z) for z in range(36601, 36696)]
WASHINGTON_ZIPS = ["36524", "36525", "36540", "36545", "36560", "36571", "36587"]
ALL_ZIPS = MOBILE_ZIPS + WASHINGTON_ZIPS

# Course prefixes mapped to CIP codes
COURSE_MAP = {
    "ENG": ("230101.0", "English Composition"),
    "MAT": ("270101.0", "Mathematics"),
    "BIO": ("260101.0", "Biology"),
    "HIS": ("540101.0", "History"),
    "PSY": ("420101.0", "Psychology"),
    "CIS": ("110101.0", "Computer Information Systems"),
    "WLD": ("480508.0", "Welding Technology"),
    "COS": ("120401.0", "Cosmetology"),
    "CRJ": ("430104.0", "Criminal Justice"),
    "PHY": ("400801.0", "Physics"),
    "NUR": ("513801.0", "Nursing"),
    "BUS": ("520101.0", "Business"),
    "ART": ("500701.0", "Art"),
    "SPH": ("231304.0", "Speech"),
    "SOC": ("451101.0", "Sociology"),
}

COURSE_NAMES = {
    "ENG": ["English Composition I", "English Composition II", "Developmental English",
             "Technical Writing", "American Literature"],
    "MAT": ["College Algebra", "Calculus I", "Statistics", "Developmental Math",
             "Trigonometry"],
    "BIO": ["General Biology I", "General Biology II", "Anatomy & Physiology",
             "Microbiology", "Environmental Science"],
    "HIS": ["US History I", "US History II", "World Civilization I",
             "World Civilization II", "African American History"],
    "PSY": ["Introduction to Psychology", "Developmental Psychology",
             "Abnormal Psychology", "Social Psychology"],
    "CIS": ["Intro to Computer Science", "Programming Fundamentals",
             "Database Management", "Networking Fundamentals"],
    "WLD": ["Intro to Welding", "Shielded Metal Arc Welding",
             "Gas Metal Arc Welding", "Welding Inspection"],
    "COS": ["Intro to Cosmetology", "Hair Design", "Nail Technology",
             "Salon Management"],
    "CRJ": ["Intro to Criminal Justice", "Criminal Law",
             "Criminology", "Corrections"],
    "PHY": ["College Physics I", "College Physics II"],
    "NUR": ["Fundamentals of Nursing", "Medical-Surgical Nursing",
             "Pediatric Nursing", "Pharmacology"],
    "BUS": ["Intro to Business", "Financial Accounting",
             "Principles of Management", "Business Law"],
    "ART": ["Art Appreciation", "Drawing I", "Art History"],
    "SPH": ["Public Speaking", "Interpersonal Communication"],
    "SOC": ["Intro to Sociology", "Social Problems"],
}

COURSE_NUMBERS = {
    "ENG": [101, 102, 95, 201, 250],
    "MAT": [100, 110, 115, 120, 201],
    "BIO": [101, 102, 201, 220, 103],
    "HIS": [101, 102, 121, 122, 206],
    "PSY": [200, 210, 230, 250],
    "CIS": [100, 130, 200, 215],
    "WLD": [101, 110, 120, 201],
    "COS": [100, 111, 120, 200],
    "CRJ": [100, 110, 200, 210],
    "PHY": [201, 202],
    "NUR": [101, 102, 201, 210],
    "BUS": [100, 241, 271, 261],
    "ART": [100, 113, 203],
    "SPH": [107, 116],
    "SOC": [200, 210],
}

DELIVERY_METHODS = ["F", "O", "H"]  # Face-to-face, Online, Hybrid
DELIVERY_W = [0.50, 0.35, 0.15]

GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F", "W", "I"]
GRADE_W = [0.15, 0.05, 0.08, 0.14, 0.05, 0.06, 0.12, 0.04, 0.06, 0.10, 0.12, 0.03]

CORE_COURSE_TYPES = [
    "Communications", "Social Sciences", "Physical Education",
    "Mathematics", "Natural Sciences", "Fine Arts", "Humanities",
]

INSTRUCTOR_EMPLOYMENT = ["FT", "PT"]
INSTRUCTOR_EMPLOYMENT_W = [0.40, 0.60]

INSTRUCTOR_RANKS = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]
INSTRUCTOR_RANK_W = [0.10, 0.15, 0.20, 0.20, 0.15, 0.10, 0.10]


# ---------------------------------------------------------------------------
# Generate cohort data
# ---------------------------------------------------------------------------

def generate_cohort_data():
    print("Generating cohort data ...")
    rows = []
    for i in range(NUM_STUDENTS):
        student_id = f"BSCC_STU{i:05d}"
        cohort = random.choice(COHORTS)
        cohort_term = wchoice(COHORT_TERMS, COHORT_TERM_W)
        age = wchoice(AGE_GROUPS, AGE_W)
        race = wchoice(RACES, RACE_W)
        ethnicity = wchoice(ETHNICITY_VALS, ETHNICITY_W)
        gender = wchoice(GENDERS, GENDER_W)
        enroll_type = wchoice(ENROLLMENT_TYPES, ENROLLMENT_TYPE_W)
        intensity = wchoice(INTENSITY, INTENSITY_W)
        first_gen = wchoice(FIRST_GEN_VALS, FIRST_GEN_W)
        pell = wchoice(PELL_VALS, PELL_W)
        math_pl = wchoice(PLACEMENT_VALS, PLACEMENT_W)
        eng_pl = wchoice(PLACEMENT_VALS, PLACEMENT_W)
        read_pl = wchoice(PLACEMENT_VALS, PLACEMENT_W)
        dual = wchoice(DUAL_VALS, DUAL_W)
        cip = wchoice(CIP_CODES, CIP_W)
        cred_type = wchoice(CREDENTIAL_TYPES, CREDENTIAL_W)
        zip_code = random.choice(ALL_ZIPS)

        attendance = f"{enroll_type} {intensity}"

        # GPA generation (correlated with outcomes)
        base_gpa = np.clip(np.random.normal(2.8, 0.7), 0.5, 4.0)
        gpa_term1 = round(base_gpa + np.random.normal(0, 0.2), 2)
        gpa_term1 = np.clip(gpa_term1, 0.5, 4.0)
        gpa_year1 = round(base_gpa + np.random.normal(0, 0.15), 2)
        gpa_year1 = np.clip(gpa_year1, 0.5, 4.0)

        # Credits - full-time ~12-18, part-time ~3-11
        if intensity == "Full-Time":
            cred_att_y1 = round(float(np.random.randint(12, 19)))
        else:
            cred_att_y1 = round(float(np.random.randint(3, 12)))

        # Earned credits based on GPA (higher GPA → more earned)
        earn_rate = min(1.0, 0.5 + base_gpa / 6.0)
        cred_earn_y1 = round(cred_att_y1 * earn_rate)

        # Year 2-4 credits (decreasing likelihood of enrollment)
        cred_att_y2 = round(float(np.random.randint(0, 35))) if random.random() < 0.65 else 0.0
        cred_earn_y2 = round(cred_att_y2 * earn_rate) if cred_att_y2 > 0 else 0.0
        cred_att_y3 = round(float(np.random.randint(0, 30))) if random.random() < 0.35 else 0.0
        cred_earn_y3 = round(cred_att_y3 * earn_rate) if cred_att_y3 > 0 else 0.0
        cred_att_y4 = round(float(np.random.randint(0, 28))) if random.random() < 0.15 else 0.0
        cred_earn_y4 = round(cred_att_y4 * earn_rate) if cred_att_y4 > 0 else 0.0

        # Gateway course statuses
        gw_math_status = wchoice(["N", "R", "UK"], [0.50, 0.30, 0.20])
        gw_eng_status = wchoice(["N", "R", "UK"], [0.50, 0.30, 0.20])

        # Gateway attempts and completions
        att_gw_math = "Y" if random.random() < 0.55 else "N"
        att_gw_eng = "Y" if random.random() < 0.60 else "N"
        comp_gw_math = "Y" if att_gw_math == "Y" and base_gpa > 2.0 and random.random() < 0.7 else "N"
        comp_gw_eng = "Y" if att_gw_eng == "Y" and base_gpa > 2.0 and random.random() < 0.75 else "N"

        gw_math_grade = ""
        gw_eng_grade = ""
        if comp_gw_math == "Y":
            gw_math_grade = str(round(np.clip(np.random.normal(2.8, 0.8), 0.5, 4.0), 2))
        elif att_gw_math == "Y":
            gw_math_grade = str(round(np.clip(np.random.normal(1.5, 0.7), 0.0, 4.0), 2))

        if comp_gw_eng == "Y":
            gw_eng_grade = str(round(np.clip(np.random.normal(3.0, 0.7), 0.5, 4.0), 2))
        elif att_gw_eng == "Y":
            gw_eng_grade = str(round(np.clip(np.random.normal(1.5, 0.7), 0.0, 4.0), 2))

        # Dev math/english
        att_dev_math = "Y" if math_pl == "R" and random.random() < 0.7 else "N"
        att_dev_eng = "Y" if eng_pl == "R" and random.random() < 0.7 else "N"
        comp_dev_math = "Y" if att_dev_math == "Y" and random.random() < 0.6 else "N"
        comp_dev_eng = "Y" if att_dev_eng == "Y" and random.random() < 0.65 else "N"

        # Retention and persistence (correlated with GPA)
        retention_prob = min(0.9, 0.3 + base_gpa * 0.15)
        retention = 1 if random.random() < retention_prob else 0
        persistence = 1 if retention == 1 and random.random() < 0.7 else 0

        # Credential / transfer outcomes
        total_credits = cred_earn_y1 + cred_earn_y2 + cred_earn_y3 + cred_earn_y4
        got_credential = base_gpa >= 2.0 and total_credits >= 30 and random.random() < 0.45

        # Years to various credentials
        yrs_bach_cohort = 0.0
        yrs_bach_other = 0.0
        first_yr_bach_cohort = 0.0
        first_yr_bach_other = 0.0
        yrs_assoc_cert_cohort = 0.0
        first_yr_assoc_cert_cohort = 0.0
        yrs_latest_assoc_cohort = 0.0
        yrs_latest_cert_cohort = 0.0
        first_yr_assoc_cohort = 0.0
        first_yr_cert_cohort = 0.0
        yrs_assoc_cert_other = 0.0
        first_yr_assoc_cert_other = 0.0
        yrs_latest_assoc_other = 0.0
        yrs_latest_cert_other = 0.0
        first_yr_assoc_other = 0.0
        first_yr_cert_other = 0.0
        yrs_last_enroll_cohort = 0.0
        yrs_last_enroll_other = 0.0
        time_to_credential = ""

        if got_credential:
            ttc = float(np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.30, 0.35, 0.20, 0.10]))
            time_to_credential = str(ttc)
            if random.random() < 0.7:
                yrs_assoc_cert_cohort = ttc
                first_yr_assoc_cert_cohort = ttc
                yrs_latest_assoc_cohort = ttc
                first_yr_assoc_cohort = ttc
            else:
                yrs_assoc_cert_other = ttc
                first_yr_assoc_cert_other = ttc
                yrs_latest_assoc_other = ttc
                first_yr_assoc_other = ttc

        # Transfer to bachelor's
        if got_credential and random.random() < 0.20:
            bach_yrs = float(np.random.choice([3, 4, 5], p=[0.2, 0.5, 0.3]))
            yrs_bach_other = bach_yrs
            first_yr_bach_other = bach_yrs

        yrs_last_enroll_cohort = max(1.0, float(np.random.choice([1, 2, 3, 4, 5],
                                     p=[0.25, 0.25, 0.20, 0.15, 0.15])))
        if random.random() < 0.25:
            yrs_last_enroll_other = float(np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2]))

        special_prog = wchoice(SPECIAL_PROGRAMS, SPECIAL_W)
        naspa_first_gen = wchoice([0.0, 1.0, -1.0], [0.40, 0.25, 0.35])
        incarcerated = "N"
        military = wchoice(["0.0", "1.0", "2.0", "3.0", "4.0"], [0.80, 0.05, 0.05, 0.05, 0.05])
        employment = wchoice(["N", "Y"], [0.60, 0.40])
        disability = "N"
        foreign_lang = wchoice(["N", "Y"], [0.85, 0.15])
        fall_term = ""
        if retention == 1 and random.random() < 0.5:
            cohort_year = int(cohort.split("-")[0])
            fall_term = f"Fall {cohort_year + 1}"
        elif persistence == 1 and random.random() < 0.3:
            cohort_year = int(cohort.split("-")[0])
            fall_term = f"Spring {cohort_year + 1}"

        # Transfer institution fields
        bach_other_state = ""
        assoc_cert_other_state = ""
        last_enroll_other_state = ""
        first_bach_other_state = ""
        first_assoc_cert_other_state = ""
        bach_other_carnegie = ""
        assoc_cert_other_carnegie = ""
        last_enroll_other_carnegie = ""
        first_bach_other_carnegie = ""
        first_assoc_cert_other_carnegie = ""
        bach_other_locale = ""
        assoc_cert_other_locale = ""
        last_enroll_other_locale = ""
        first_bach_other_locale = ""
        first_assoc_cert_other_locale = ""

        if yrs_bach_other > 0:
            st = random.choice(SOUTHEAST_STATES)
            bach_other_state = st
            first_bach_other_state = st
            c = random.choice(CARNEGIE_VALS)
            bach_other_carnegie = c
            first_bach_other_carnegie = c
            l = random.choice(LOCALE_VALS)
            bach_other_locale = l
            first_bach_other_locale = l

        if yrs_assoc_cert_other > 0:
            st = random.choice(SOUTHEAST_STATES)
            assoc_cert_other_state = st
            first_assoc_cert_other_state = st
            c = random.choice(CARNEGIE_VALS[:2])
            assoc_cert_other_carnegie = c
            first_assoc_cert_other_carnegie = c
            l = random.choice(LOCALE_VALS)
            assoc_cert_other_locale = l
            first_assoc_cert_other_locale = l

        if yrs_last_enroll_other > 0:
            last_enroll_other_state = random.choice(SOUTHEAST_STATES)
            last_enroll_other_carnegie = random.choice(CARNEGIE_VALS[:2])
            last_enroll_other_locale = random.choice(LOCALE_VALS)

        # Build row dict matching COHORT_HEADER order
        row = {
            "id": i + 1,
            "Institution_ID": INSTITUTION_ID,
            "Cohort": cohort,
            "Student_GUID": student_id,
            "Cohort_Term": cohort_term,
            "Student_Age": age,
            "Enrollment_Type": enroll_type,
            "Enrollment_Intensity_First_Term": intensity,
            "Math_Placement": math_pl,
            "English_Placement": eng_pl,
            "Reading_Placement": read_pl,
            "Dual_and_Summer_Enrollment": dual,
            "Race": race,
            "Ethnicity": ethnicity,
            "Gender": gender,
            "First_Gen": first_gen,
            "Pell_Status_First_Year": pell,
            "Attendance_Status_Term_1": attendance,
            "Credential_Type_Sought_Year_1": cred_type,
            "Program_of_Study_Term_1": cip,
            "GPA_Group_Term_1": round(gpa_term1, 2),
            "GPA_Group_Year_1": round(gpa_year1, 2),
            "Number_of_Credits_Attempted_Year_1": float(cred_att_y1),
            "Number_of_Credits_Earned_Year_1": float(cred_earn_y1),
            "Number_of_Credits_Attempted_Year_2": float(cred_att_y2),
            "Number_of_Credits_Earned_Year_2": float(cred_earn_y2),
            "Number_of_Credits_Attempted_Year_3": float(cred_att_y3),
            "Number_of_Credits_Earned_Year_3": float(cred_earn_y3),
            "Number_of_Credits_Attempted_Year_4": float(cred_att_y4),
            "Number_of_Credits_Earned_Year_4": float(cred_earn_y4),
            "Gateway_Math_Status": gw_math_status,
            "Gateway_English_Status": gw_eng_status,
            "AttemptedGatewayMathYear1": att_gw_math if att_gw_math == "Y" else "",
            "AttemptedGatewayEnglishYear1": att_gw_eng if att_gw_eng == "Y" else "",
            "CompletedGatewayMathYear1": comp_gw_math if att_gw_math == "Y" else "",
            "CompletedGatewayEnglishYear1": comp_gw_eng if att_gw_eng == "Y" else "",
            "GatewayMathGradeY1": gw_math_grade,
            "GatewayEnglishGradeY1": gw_eng_grade,
            "AttemptedDevMathY1": att_dev_math if att_dev_math == "Y" else "",
            "AttemptedDevEnglishY1": att_dev_eng if att_dev_eng == "Y" else "",
            "CompletedDevMathY1": comp_dev_math if att_dev_math == "Y" else "",
            "CompletedDevEnglishY1": comp_dev_eng if att_dev_eng == "Y" else "",
            "Retention": retention,
            "Persistence": persistence,
            "Years_to_Bachelors_at_cohort_inst_": yrs_bach_cohort,
            "Years_to_Bachelor_at_other_inst_": yrs_bach_other,
            "First_Year_to_Bachelors_at_cohort_inst_": first_yr_bach_cohort,
            "First_Year_to_Bachelor_at_other_inst_": first_yr_bach_other,
            "Years_to_Associates_or_Certificate_at_cohort_inst_": yrs_assoc_cert_cohort,
            "First_Year_to_Associates_or_Certificate_at_cohort_inst_": first_yr_assoc_cert_cohort,
            "Years_to_Latest_Associates_at_Cohort_Inst": yrs_latest_assoc_cohort,
            "Years_to_Latest_Certificate_at_Cohort_Inst": yrs_latest_cert_cohort,
            "First_Year_to_Associates_at_Cohort_Inst": first_yr_assoc_cohort,
            "First_Year_to_Certificate_at_Cohort_Inst": first_yr_cert_cohort,
            "Years_to_Associates_or_Certificate_at_other_inst_": yrs_assoc_cert_other,
            "First_Year_to_Associates_or_Certificate_at_other_inst_": first_yr_assoc_cert_other,
            "Years_to_Latest_Associates_at_Other_Inst": yrs_latest_assoc_other,
            "Years_to_Latest_Certificate_at_Other_Inst": yrs_latest_cert_other,
            "First_Year_to_Associates_at_Other_Inst": first_yr_assoc_other,
            "First_Year_to_Certificate_at_Other_Inst": first_yr_cert_other,
            "Years_of_Last_Enrollment_at_cohort_institution": yrs_last_enroll_cohort,
            "Years_of_Last_Enrollment_at_other_institution": yrs_last_enroll_other,
            "Time_to_Credential": time_to_credential,
            "Special_Program": special_prog,
            "NASPA_First_Generation": naspa_first_gen,
            "Incarcerated_Status": incarcerated,
            "Military_Status": military,
            "Employment_Status": employment,
            "Disability_Status": disability,
            "Foreign_Language_Completion": foreign_lang,
            "Program_of_Study_Year_1": cip,
            "Most_Recent_Bachelors_at_Other_Institution_STATE": bach_other_state,
            "Most_Recent_Associates_or_Certificate_at_Other_Ins_dccdad65": assoc_cert_other_state,
            "Most_Recent_Last_Enrollment_at_Other_institution_STATE": last_enroll_other_state,
            "First_Bachelors_at_Other_Institution_STATE": first_bach_other_state,
            "First_Associates_or_Certificate_at_Other_Institution_STATE": first_assoc_cert_other_state,
            "Most_Recent_Bachelors_at_Other_Institution_CARNEGIE": bach_other_carnegie,
            "Most_Recent_Associates_or_Certificate_at_Other_Ins_5a42b456": assoc_cert_other_carnegie,
            "Most_Recent_Last_Enrollment_at_Other_institution_CARNEGIE": last_enroll_other_carnegie,
            "First_Bachelors_at_Other_Institution_CARNEGIE": first_bach_other_carnegie,
            "First_Associates_or_Certificate_at_Other_Instituti_9c09d367": first_assoc_cert_other_carnegie,
            "Most_Recent_Bachelors_at_Other_Institution_LOCALE": bach_other_locale,
            "Most_Recent_Associates_or_Certificate_at_Other_Ins_9cc1796c": assoc_cert_other_locale,
            "Most_Recent_Last_Enrollment_at_Other_institution_LOCALE": last_enroll_other_locale,
            "First_Bachelors_at_Other_Institution_LOCALE": first_bach_other_locale,
            "First_Associates_or_Certificate_at_Other_Institution_LOCALE": first_assoc_cert_other_locale,
            "school": SCHOOL,
            "dataset_type": DATASET_TYPE,
            "created_at": CREATED_AT,
            "zip_code": zip_code,
        }
        rows.append(row)

        if (i + 1) % 1000 == 0:
            print(f"  Cohort: {i + 1}/{NUM_STUDENTS} students generated")

    return rows


# ---------------------------------------------------------------------------
# Generate AR data
# ---------------------------------------------------------------------------

def generate_ar_data(cohort_rows):
    """Generate AR records matching each student from cohort data."""
    print("Generating AR data ...")
    rows = []
    for i, coh in enumerate(cohort_rows):
        row = {
            "id": i,
            "student_id": coh["Student_GUID"],
            "years_to_bachelors_cohort": coh["Years_to_Bachelors_at_cohort_inst_"],
            "years_to_bachelor_other": coh["Years_to_Bachelor_at_other_inst_"],
            "first_year_bachelors_cohort": coh["First_Year_to_Bachelors_at_cohort_inst_"],
            "first_year_bachelor_other": coh["First_Year_to_Bachelor_at_other_inst_"],
            "years_to_assoc_cert_cohort": coh["Years_to_Associates_or_Certificate_at_cohort_inst_"],
            "years_to_assoc_cert_other": coh["Years_to_Associates_or_Certificate_at_other_inst_"],
            "first_year_assoc_cert_cohort": coh["First_Year_to_Associates_or_Certificate_at_cohort_inst_"],
            "first_year_assoc_cert_other": coh["First_Year_to_Associates_or_Certificate_at_other_inst_"],
            "naspa_first_gen": coh["NASPA_First_Generation"],
            "recent_assoc_cert_other_state": coh["Most_Recent_Associates_or_Certificate_at_Other_Ins_dccdad65"],
            "recent_assoc_cert_other_carnegie": coh["Most_Recent_Associates_or_Certificate_at_Other_Ins_5a42b456"],
            "first_assoc_cert_other_carnegie": coh["First_Associates_or_Certificate_at_Other_Instituti_9c09d367"],
            "recent_assoc_cert_other_locale": coh["Most_Recent_Associates_or_Certificate_at_Other_Ins_9cc1796c"],
            "school": SCHOOL,
            "created_at": "2025-10-28 15:47:53",
            "zip_code": coh["zip_code"],
        }
        rows.append(row)

        if (i + 1) % 1000 == 0:
            print(f"  AR: {i + 1}/{NUM_STUDENTS} records generated")

    return rows


# ---------------------------------------------------------------------------
# Generate course data
# ---------------------------------------------------------------------------

def generate_course_data(cohort_rows):
    """Generate ~100,000 course records across all students."""
    print("Generating course data ...")
    prefixes = list(COURSE_MAP.keys())
    prefix_weights = [0.12, 0.12, 0.08, 0.08, 0.06, 0.10, 0.06,
                      0.04, 0.04, 0.03, 0.06, 0.08, 0.04, 0.04, 0.05]

    rows = []
    row_id = 1

    # Distribute courses across students (~25 per student average)
    courses_per_student = np.random.poisson(25, size=NUM_STUDENTS)
    # Adjust to hit ~100K total
    total = courses_per_student.sum()
    if total > 0:
        courses_per_student = np.round(courses_per_student * (NUM_COURSES / total)).astype(int)
        courses_per_student = np.maximum(courses_per_student, 1)

    for si, coh in enumerate(cohort_rows):
        n_courses = int(courses_per_student[si])
        cohort_start_year = int(coh["Cohort"].split("-")[0])

        for _ in range(n_courses):
            prefix = wchoice(prefixes, prefix_weights)
            cip_code, _ = COURSE_MAP[prefix]
            course_names = COURSE_NAMES[prefix]
            course_nums = COURSE_NUMBERS[prefix]
            idx = random.randrange(len(course_names))
            course_name = course_names[min(idx, len(course_names) - 1)]
            course_num = course_nums[min(idx, len(course_nums) - 1)]

            # Academic year: within 1-4 years of cohort start
            year_offset = np.random.choice([0, 1, 2, 3], p=[0.40, 0.30, 0.20, 0.10])
            acad_year_start = cohort_start_year + year_offset
            acad_year = f"{acad_year_start}-{str(acad_year_start + 1)[-2:]}"

            acad_term = wchoice(["FALL", "SPRING", "SUMMER"], [0.40, 0.40, 0.20])

            # Course dates
            if acad_term == "FALL":
                begin = f"{acad_year_start}0820.0"
                end = f"{acad_year_start}1215.0"
            elif acad_term == "SPRING":
                begin = f"{acad_year_start + 1}0115.0"
                end = f"{acad_year_start + 1}0515.0"
            else:
                begin = f"{acad_year_start + 1}0601.0"
                end = f"{acad_year_start + 1}0801.0"

            grade = wchoice(GRADES, GRADE_W)
            credits_att = random.choice([1, 2, 3, 3, 3, 4, 4])
            if grade in ("W", "F", "I"):
                credits_earn = 0
            else:
                credits_earn = credits_att

            delivery = wchoice(DELIVERY_METHODS, DELIVERY_W)
            instructor_emp = wchoice(INSTRUCTOR_EMPLOYMENT, INSTRUCTOR_EMPLOYMENT_W)
            instructor_rank = wchoice(
                [str(r) for r in INSTRUCTOR_RANKS],
                INSTRUCTOR_RANK_W
            )

            section_id = random.randint(100, 999)

            # Math or English gateway
            math_eng_gw = "N"
            if prefix == "MAT" and course_num >= 110:
                math_eng_gw = "M"
            elif prefix == "ENG" and course_num >= 101:
                math_eng_gw = "E"

            coreq = "Y" if prefix in ("MAT", "ENG") and course_num < 100 and random.random() < 0.3 else "N"

            # Core course
            is_core = "N"
            core_type = ""
            core_comp = "N"
            if prefix in ("ENG", "SPH"):
                is_core = "Y"
                core_type = "Communications"
            elif prefix in ("MAT",):
                is_core = "Y"
                core_type = "Mathematics"
            elif prefix in ("BIO", "PHY"):
                is_core = "Y"
                core_type = "Natural Sciences"
            elif prefix in ("HIS", "SOC"):
                is_core = "Y"
                core_type = "Social Sciences"
            elif prefix in ("ART",):
                is_core = "Y"
                core_type = "Fine Arts"
            elif prefix in ("PSY",):
                is_core = "Y"
                core_type = "Humanities"
            if is_core == "Y" and grade not in ("W", "F", "I") and random.random() < 0.8:
                core_comp = "Y"

            # Course type: CU (college-level) or CC (continuing ed / developmental)
            course_type = "CU"
            if course_num < 100:
                course_type = "CC"

            # Enrolled at other institutions
            enrolled_other = "N"
            other_states = ""
            other_carnegie = ""
            other_locale = ""

            row = {
                "id": row_id,
                "Student_GUID": coh["Student_GUID"],
                "Student_Age": coh["Student_Age"],
                "Race": coh["Race"],
                "Ethnicity": coh["Ethnicity"],
                "Gender": coh["Gender"],
                "Institution_ID": INSTITUTION_ID,
                "Cohort": coh["Cohort"],
                "Cohort_Term": coh["Cohort_Term"],
                "Academic_Year": acad_year,
                "Academic_Term": acad_term,
                "Course_Prefix": prefix,
                "Course_Number": course_num,
                "Section_ID": section_id,
                "Course_Name": course_name,
                "Course_CIP": cip_code,
                "Course_Type": course_type,
                "Math_or_English_Gateway": math_eng_gw,
                "Co_requisite_Course": coreq,
                "Core_Course": is_core,
                "Core_Course_Type": core_type,
                "Core_Competency_Completed": core_comp,
                "Course_Begin_Date": begin,
                "Course_End_Date": end,
                "Delivery_Method": delivery,
                "Grade": grade,
                "Number_of_Credits_Attempted": credits_att,
                "Number_of_Credits_Earned": credits_earn,
                "Enrolled_at_Other_Institutions": enrolled_other,
                "Enrollment_Record_at_Other_Institutions_STATEs": other_states,
                "Enrollment_Record_at_Other_Institutions_CARNEGIEs": other_carnegie,
                "Enrollment_Record_at_Other_Institutions_LOCALEs": other_locale,
                "Credential_Engine_Identifier": "",
                "Course_Instructor_Employment_Status": instructor_emp,
                "Course_Instructor_Rank": instructor_rank,
                "Term_Program_of_Study": coh["Program_of_Study_Term_1"],
                "school": SCHOOL,
                "dataset_type": DATASET_TYPE,
                "created_at": CREATED_AT,
            }
            rows.append(row)
            row_id += 1

        if (si + 1) % 500 == 0:
            print(f"  Courses: {si + 1}/{NUM_STUDENTS} students processed ({len(rows)} courses)")

    return rows


# ---------------------------------------------------------------------------
# Write CSV
# ---------------------------------------------------------------------------

def write_csv(filepath, header, rows):
    print(f"Writing {filepath} ({len(rows)} rows) ...")
    with open(filepath, "w", newline="\n") as f:
        writer = csv.DictWriter(f, fieldnames=header, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Done: {filepath}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Bishop State Community College - Synthetic Data Generator")
    print("=" * 60)
    print()

    cohort_rows = generate_cohort_data()
    ar_rows = generate_ar_data(cohort_rows)
    course_rows = generate_course_data(cohort_rows)

    print()
    cohort_path = os.path.join(DATA_DIR, "bishop_state_cohorts_with_zip.csv")
    ar_path = os.path.join(DATA_DIR, "ar_bscc_with_zip.csv")
    course_path = os.path.join(DATA_DIR, "bishop_state_courses.csv")

    write_csv(cohort_path, COHORT_HEADER, cohort_rows)
    write_csv(ar_path, AR_HEADER, ar_rows)
    write_csv(course_path, COURSE_HEADER, course_rows)

    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"  Cohort records:  {len(cohort_rows):,}")
    print(f"  AR records:      {len(ar_rows):,}")
    print(f"  Course records:  {len(course_rows):,}")
    print()

    # Print sample rows
    print("Sample cohort row (first student):")
    sample = cohort_rows[0]
    for k in ["Student_GUID", "Institution_ID", "Cohort", "Race", "Gender",
              "GPA_Group_Year_1", "Retention", "Time_to_Credential", "zip_code", "school"]:
        print(f"  {k}: {sample[k]}")

    print()
    print("Sample course row (first record):")
    csample = course_rows[0]
    for k in ["Student_GUID", "Course_Prefix", "Course_Name", "Grade",
              "Delivery_Method", "Academic_Year", "school"]:
        print(f"  {k}: {csample[k]}")

    print()
    print("All files generated successfully!")


if __name__ == "__main__":
    main()
