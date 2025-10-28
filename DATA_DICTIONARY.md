# KCTCS Student-Level Dataset - Data Dictionary

**File**: `kctcs_student_level_with_predictions.csv`  
**Records**: 32,800 students (one row per student)  
**Features**: 156 columns (including 22 ML prediction columns)  
**Purpose**: Predictive modeling for student outcomes in education with comprehensive ML predictions

---

## 📋 FEATURE CATEGORIES

### 1. IDENTIFIERS (3 features)
| Feature | Description | Type |
|---------|-------------|------|
| `id` | Original cohort record ID | Integer |
| `Student_GUID` | Unique student identifier (PRIMARY KEY) | String |
| `ar_id` | AR data record ID | Integer |

---

### 2. DEMOGRAPHICS (10 features)
| Feature | Description | Values/Type |
|---------|-------------|-------------|
| `Student_Age` | Age category at enrollment | "20 and younger", ">20 - 24", "Older than 24" |
| `Race` | Student's race | "White", "Black or African American", "Asian", "Hispanic", etc. |
| `Ethnicity` | Hispanic/Latino ethnicity | "H" (Hispanic), "N" (Non-Hispanic) |
| `Gender` | Student's gender | "M", "F" |
| `First_Gen` | First generation student status (cohort) | "A", "B", "C", "N", "P", "UK" |
| `NASPA_First_Generation` | NASPA definition of first-gen (cohort) | -1, 0, 1, etc. |
| `ar_naspa_first_gen` | NASPA first-gen (AR data) | -1, 0, 1, etc. |
| `Incarcerated_Status` | Incarceration status | "Y", "N" |
| `Military_Status` | Military service status | 0, 1, 2, 3, etc. |
| `Disability_Status` | Disability status | "Y", "N" |

---

### 3. ENROLLMENT CHARACTERISTICS (10 features)
| Feature | Description | Values/Type |
|---------|-------------|-------------|
| `Institution_ID` | KCTCS institution identifier | Integer |
| `Cohort` | Cohort year | "2019-20", "2018-19", etc. |
| `Cohort_Term` | Initial enrollment term | "FALL", "SPRING", "SUMMER" |
| `Enrollment_Type` | Type of enrollment | "First-Time", "Transfer-In" |
| `Enrollment_Intensity_First_Term` | First term intensity | "Full-Time", "Part-Time" |
| `Dual_and_Summer_Enrollment` | Dual enrollment or summer start | "DE", "SE", etc. |
| `Pell_Status_First_Year` | Pell grant recipient | "Y", "N", "UK" |
| `Attendance_Status_Term_1` | Term 1 attendance | "First-Time Full-Time", "Transfer-In Full-Time", etc. |
| `Special_Program` | Participation in special programs | "Bridge Program", etc. |
| `Employment_Status` | Employment status | -1, 0, 1, 2, 3, 4 |

---

### 4. ACADEMIC PREPARATION (4 features)
| Feature | Description | Values/Type |
|---------|-------------|-------------|
| `Math_Placement` | Math placement level | "C" (College-level), "R" (Remedial), "N" (Not placed) |
| `English_Placement` | English placement level | "C", "R", "N" |
| `Reading_Placement` | Reading placement level | "C", "R", "N" |
| `Foreign_Language_Completion` | Foreign language completed | "Y", "N" |

---

### 5. PROGRAM INFORMATION (3 features)
| Feature | Description | Type |
|---------|-------------|------|
| `Credential_Type_Sought_Year_1` | Initial credential goal | "A" (Associate's), "B" (Bachelor's), "01" (Certificate), etc. |
| `Program_of_Study_Term_1` | CIP code for initial program | Float (e.g., 420101.0) |
| `Program_of_Study_Year_1` | CIP code for year 1 program | Float |

---

### 6. 🎯 ENGINEERED COURSE FEATURES (29 features)
**These features are aggregated from course-level data - KEY PREDICTORS**

#### Enrollment Metrics
| Feature | Description | Type | Example |
|---------|-------------|------|---------|
| `total_courses_enrolled` | Total number of courses taken | Integer | 4.4 avg |
| `unique_course_prefixes` | Number of different subject areas | Integer | e.g., ENG, MAT, HIS |

#### Credit Metrics
| Feature | Description | Type | Range |
|---------|-------------|------|-------|
| `total_credits_attempted` | All credits attempted | Float | 0-200+ |
| `total_credits_earned` | All credits earned | Float | 0-200+ |
| `avg_credits_per_course` | Average credits per course | Float | 1-6 |
| `course_completion_rate` | % of attempted credits earned | Float | 0.0-1.0 |

#### Grade/Performance Metrics
| Feature | Description | Type | Range |
|---------|-------------|------|-------|
| `courses_with_grades` | Number of graded courses | Integer | 0-50+ |
| `average_grade` | Mean GPA across all courses | Float | 0.0-4.0 |
| `min_grade` | Lowest grade received | Float | 0.0-4.0 |
| `max_grade` | Highest grade received | Float | 0.0-4.0 |
| `grade_std_dev` | Grade variability | Float | 0.0-4.0 |
| `failing_grades_count` | Number of grades < 2.0 | Integer | 0-20+ |
| `passing_rate` | % of courses passed (≥2.0) | Float | 0.0-1.0 |

#### Course Type Metrics
| Feature | Description | Type |
|---------|-------------|------|
| `core_courses_taken` | Number of core courses | Integer |
| `gateway_math_courses` | Gateway math courses taken | Integer |
| `gateway_english_courses` | Gateway English courses taken | Integer |
| `corequisite_courses` | Co-requisite courses | Integer |

#### Delivery Method
| Feature | Description | Type |
|---------|-------------|------|
| `online_courses` | Number of online courses | Integer |
| `face_to_face_courses` | Number of in-person courses | Integer |
| `hybrid_courses` | Number of hybrid courses | Integer |
| `pct_online` | Percentage of courses online | Float (0-100) |

#### Temporal Patterns
| Feature | Description | Type |
|---------|-------------|------|
| `unique_academic_years` | Years of enrollment | Integer |
| `unique_academic_terms` | Terms of enrollment | Integer |
| `fall_courses` | Courses taken in Fall | Integer |
| `spring_courses` | Courses taken in Spring | Integer |
| `summer_courses` | Courses taken in Summer | Integer |

#### Instructor Metrics
| Feature | Description | Type |
|---------|-------------|------|
| `courses_with_fulltime_instructors` | Courses with full-time faculty | Integer |
| `courses_with_parttime_instructors` | Courses with part-time faculty | Integer |

#### Other Institutions
| Feature | Description | Type |
|---------|-------------|------|
| `enrolled_other_institutions` | Concurrent enrollment count | Integer |

---

### 7. COHORT PERFORMANCE METRICS (10 features)
| Feature | Description | Type |
|---------|-------------|------|
| `GPA_Group_Term_1` | GPA category for term 1 | Float |
| `GPA_Group_Year_1` | GPA category for year 1 | Float |
| `Number_of_Credits_Attempted_Year_1` | Year 1 credits attempted | Float |
| `Number_of_Credits_Earned_Year_1` | Year 1 credits earned | Float |
| `Number_of_Credits_Attempted_Year_2` | Year 2 credits attempted | Float |
| `Number_of_Credits_Earned_Year_2` | Year 2 credits earned | Float |
| `Number_of_Credits_Attempted_Year_3` | Year 3 credits attempted | Float |
| `Number_of_Credits_Earned_Year_3` | Year 3 credits earned | Float |
| `Number_of_Credits_Attempted_Year_4` | Year 4 credits attempted | Float |
| `Number_of_Credits_Earned_Year_4` | Year 4 credits earned | Float |

---

### 8. GATEWAY COURSE COMPLETION (12 features)
| Feature | Description | Values |
|---------|-------------|--------|
| `Gateway_Math_Status` | Math gateway status | "C" (Completed), "R" (Required), "N" (Not required) |
| `Gateway_English_Status` | English gateway status | "C", "R", "N" |
| `AttemptedGatewayMathYear1` | Attempted gateway math Y1 | "Y", "N" |
| `AttemptedGatewayEnglishYear1` | Attempted gateway English Y1 | "Y", "N" |
| `CompletedGatewayMathYear1` | Completed gateway math Y1 | "C", "D", "F", "UK" |
| `CompletedGatewayEnglishYear1` | Completed gateway English Y1 | "C", "D", "F", "UK" |
| `GatewayMathGradeY1` | Gateway math grade Y1 | Float (0.0-4.0) |
| `GatewayEnglishGradeY1` | Gateway English grade Y1 | Float (0.0-4.0) |
| `AttemptedDevMathY1` | Attempted developmental math Y1 | "Y", "N" |
| `AttemptedDevEnglishY1` | Attempted developmental English Y1 | "Y", "N" |
| `CompletedDevMathY1` | Completed developmental math Y1 | "C", "D", "N" |
| `CompletedDevEnglishY1` | Completed developmental English Y1 | "C", "D", "N" |

---

### 9. 🎯 OUTCOME VARIABLES (29 features) - PREDICTION TARGETS

#### Primary Outcomes
| Feature | Description | Values | Use Case |
|---------|-------------|--------|----------|
| `Retention` | Retained at institution | 0, 1 | **Binary classification** |
| `Persistence` | Continued enrollment | 0, 1 | **Binary classification** |
| `Time_to_Credential` | Years to any credential | Float | **Regression** |

#### Bachelor's Degree Outcomes
| Feature | Description | Type |
|---------|-------------|------|
| `Years_to_Bachelors_at_cohort_inst_` | Years to bachelor's at cohort institution | Float |
| `Years_to_Bachelor_at_other_inst_` | Years to bachelor's at other institution | Float |
| `First_Year_to_Bachelors_at_cohort_inst_` | First year bachelor's awarded (cohort) | Float |
| `First_Year_to_Bachelor_at_other_inst_` | First year bachelor's awarded (other) | Float |
| `ar_years_to_bachelors_cohort` | AR: Years to bachelor's (cohort) | String/Float |
| `ar_years_to_bachelor_other` | AR: Years to bachelor's (other) | String/Float |
| `ar_first_year_bachelors_cohort` | AR: First year bachelor's (cohort) | String/Float |
| `ar_first_year_bachelor_other` | AR: First year bachelor's (other) | String/Float |

#### Associate's/Certificate Outcomes
| Feature | Description | Type |
|---------|-------------|------|
| `Years_to_Associates_or_Certificate_at_cohort_inst_` | Years to associate's/cert (cohort) | Float |
| `Years_to_Associates_or_Certificate_at_other_inst_` | Years to associate's/cert (other) | Float |
| `First_Year_to_Associates_or_Certificate_at_cohort_inst_` | First year awarded (cohort) | Float |
| `First_Year_to_Associates_or_Certificate_at_other_inst_` | First year awarded (other) | Float |
| `ar_years_to_assoc_cert_cohort` | AR: Years to assoc/cert (cohort) | String |
| `ar_years_to_assoc_cert_other` | AR: Years to assoc/cert (other) | String |
| `ar_first_year_assoc_cert_cohort` | AR: First year assoc/cert (cohort) | String |
| `ar_first_year_assoc_cert_other` | AR: First year assoc/cert (other) | String |

#### Detailed Credential Tracking
| Feature | Description | Type |
|---------|-------------|------|
| `Years_to_Latest_Associates_at_Cohort_Inst` | Most recent associate's (cohort) | Float |
| `Years_to_Latest_Certificate_at_Cohort_Inst` | Most recent certificate (cohort) | Float |
| `First_Year_to_Associates_at_Cohort_Inst` | First associate's year (cohort) | Float |
| `First_Year_to_Certificate_at_Cohort_Inst` | First certificate year (cohort) | Float |
| `Years_to_Latest_Associates_at_Other_Inst` | Most recent associate's (other) | Float |
| `Years_to_Latest_Certificate_at_Other_Inst` | Most recent certificate (other) | Float |
| `First_Year_to_Associates_at_Other_Inst` | First associate's year (other) | Float |
| `First_Year_to_Certificate_at_Other_Inst` | First certificate year (other) | Float |

#### Enrollment Duration
| Feature | Description | Type |
|---------|-------------|------|
| `Years_of_Last_Enrollment_at_cohort_institution` | Last enrollment year (cohort) | Float |
| `Years_of_Last_Enrollment_at_other_institution` | Last enrollment year (other) | Float |

---

### 10. 🤖 ML PREDICTION FEATURES (22 features) - GENERATED BY MODELS
**These features are predictions generated by trained machine learning models**

#### Retention Predictions
| Feature | Description | Type | Range |
|---------|-------------|------|-------|
| `retention_probability` | Predicted probability of retention | Float | 0.0-1.0 |
| `retention_prediction` | Binary retention prediction | Integer | 0=Not Retained, 1=Retained |
| `retention_risk_category` | Risk level for retention | String | "Critical Risk", "High Risk", "Moderate Risk", "Low Risk" |

#### Early Warning System
| Feature | Description | Type | Range |
|---------|-------------|------|-------|
| `at_risk_probability` | Probability of being at-risk | Float | 0.0-1.0 |
| `at_risk_prediction` | Binary at-risk flag | Integer | 0=Not At Risk, 1=At Risk |
| `at_risk_alert` | Alert level for interventions | String | "URGENT", "HIGH", "MODERATE", "LOW" |
| `risk_score` | Comprehensive risk score | Float | 0-100 |

#### Time to Credential Predictions
| Feature | Description | Type | Example |
|---------|-------------|------|---------|
| `predicted_time_to_credential` | Predicted years to complete credential | Float | 2.15 years (median) |
| `predicted_graduation_year` | Predicted year of graduation | Float | 2024.5 |

#### Credential Type Predictions
| Feature | Description | Type | Values |
|---------|-------------|------|--------|
| `predicted_credential_type` | Numeric credential type code | Integer | 0-3 |
| `predicted_credential_label` | Text label for credential | String | "No Credential", "Certificate", "Associate", "Bachelor" |
| `prob_no_credential` | Probability of no credential | Float | 0.0-1.0 |
| `prob_certificate` | Probability of certificate | Float | 0.0-1.0 |
| `prob_associate` | Probability of associate's degree | Float | 0.0-1.0 |
| `prob_bachelor` | Probability of bachelor's degree | Float | 0.0-1.0 |

#### Course Success Predictions
| Feature | Description | Type | Range |
|---------|-------------|------|-------|
| `predicted_gpa` | Predicted GPA performance | Float | 0.0-4.0 |
| `gpa_performance` | Performance vs. expected | String | "Above Expected", "As Expected", "Below Expected" |

**Model Information**:
- Retention Model: XGBoost Classifier (Accuracy: 52.2%, AUC-ROC: 0.54)
- Early Warning: Composite risk scoring system
- Time to Credential: XGBoost Regressor
- Credential Type: Random Forest Classifier
- Course Success: Random Forest Regressor

---

### 11. TRANSFER INSTITUTION DATA (13 features)
Information about institutions where students transferred or earned credentials:

| Feature | Description | Type |
|---------|-------------|------|
| `Most_Recent_Bachelors_at_Other_Institution_STATE` | State of most recent bachelor's | String (e.g., "OH", "MI") |
| `Most_Recent_Associates_or_Certificate_at_Other_Ins_*` | State of most recent assoc/cert | String |
| `Most_Recent_Last_Enrollment_at_Other_institution_STATE` | State of last enrollment | String |
| `First_Bachelors_at_Other_Institution_STATE` | State of first bachelor's | String |
| `First_Associates_or_Certificate_at_Other_Institution_STATE` | State of first assoc/cert | String |
| `*_CARNEGIE` | Carnegie classification of institution | String |
| `*_LOCALE` | Geographic locale (Urban, Suburb, Town/Rural) | String |
| `ar_recent_assoc_cert_other_state` | AR: State of recent assoc/cert | String |
| `ar_recent_assoc_cert_other_carnegie` | AR: Carnegie classification | String |
| `ar_first_assoc_cert_other_carnegie` | AR: First assoc/cert Carnegie | String |
| `ar_recent_assoc_cert_other_locale` | AR: Geographic locale | String |

---

### 12. METADATA (5 features)
| Feature | Description | Type |
|---------|-------------|------|
| `school` | Institution name | "KCTCS" |
| `dataset_type` | Dataset type indicator | "S" |
| `created_at` | Record creation timestamp | DateTime |
| `ar_school` | AR data school | "KCTCS" |
| `ar_created_at` | AR record timestamp | DateTime |

---

## 🎯 AVAILABLE ML PREDICTIONS & ADDITIONAL MODELING IDEAS

### ✅ Pre-Built ML Predictions (Already Available in Dataset)

The dataset includes **22 pre-generated ML prediction columns** covering:

1. **Retention Prediction** ✅ COMPLETE
   - Available columns: `retention_probability`, `retention_prediction`, `retention_risk_category`
   - XGBoost model with 52.2% accuracy, AUC-ROC: 0.54
   - Risk categories: Critical, High, Moderate, Low

2. **Early Warning System** ✅ COMPLETE
   - Available columns: `at_risk_probability`, `at_risk_prediction`, `at_risk_alert`, `risk_score`
   - Composite risk scoring with 4 alert levels (URGENT, HIGH, MODERATE, LOW)
   - Aligned with retention predictions for consistency

3. **Time to Credential** ✅ COMPLETE
   - Available columns: `predicted_time_to_credential`, `predicted_graduation_year`
   - XGBoost regressor predicting years to completion
   - Median prediction: 2.15 years

4. **Credential Type Prediction** ✅ COMPLETE
   - Available columns: `predicted_credential_type`, `predicted_credential_label`, probability columns
   - Random Forest classifier with 4 credential categories
   - Includes probability scores for each credential type

5. **Course Success (GPA) Prediction** ✅ COMPLETE
   - Available columns: `predicted_gpa`, `gpa_performance`
   - Random Forest regressor predicting student GPA
   - Performance categorization (Above/As/Below Expected)

### 💡 Additional Modeling Opportunities

You can still build custom models for:

1. **Persistence Prediction** (Binary Classification)
   - **Target**: `Persistence` (0/1)
   - **Use**: Predict continued enrollment (different from retention)
   - **Key Features**: `passing_rate`, `failing_grades_count`, engagement metrics

2. **First-Year Success Prediction**
   - **Target**: Create "successful first year" flag (e.g., earned 24+ credits with GPA ≥ 2.5)
   - **Use**: Early identification of trajectory
   - **Key Features**: First-term metrics, placement scores, demographics

3. **Gateway Course Completion Timing**
   - **Target**: `CompletedGatewayMathYear1`, `CompletedGatewayEnglishYear1`
   - **Use**: Predict when students will complete critical gateway courses
   - **Key Features**: Placement scores, enrollment intensity, support programs

4. **Transfer-Out Prediction**
   - **Target**: Create flag from transfer institution data
   - **Use**: Predict which students will transfer to 4-year institutions
   - **Key Features**: Credits earned, GPA, credential sought, program of study

---

## 📊 DATA QUALITY NOTES

- **Missing Values**: 
  - `average_grade`: 7.7% missing (students with no grades recorded)
  - Most demographic/enrollment fields are complete
  - Some outcome fields may be blank for students still enrolled

- **Average Statistics**:
  - Courses per student: 4.4
  - Credits earned: 12.7
  - Course completion rate: 82.3%
  - Average GPA: 2.07
  - Retention rate: Available for all 32,800 students

---

## 🔧 FEATURE ENGINEERING RECOMMENDATIONS

### Additional features you might create:
1. **Early performance indicators**:
   - First term GPA (from term 1 grade averages)
   - First term completion rate
   
2. **Momentum indicators**:
   - Credits earned in first year / 30 (on-track metric)
   - Year-over-year credit progression
   
3. **Engagement scores**:
   - Course diversity (unique prefixes / total courses)
   - Full-time status consistency
   
4. **Risk factors**:
   - Combined risk score (remedial placement + low first-gen + Pell)
   - Gateway completion timeline

---

## 📁 RELATED FILES IN DATASET

### Primary Analysis Files
1. **`kctcs_student_level_with_predictions.csv`** (32,800 students, 156 columns)
   - Student-level aggregated data with ML predictions
   - **THIS FILE** - primary dataset for analysis
   - Includes all 22 ML prediction columns

2. **`kctcs_merged_with_predictions.csv`** (145,918 course records, 151 columns)
   - Course-level data with student predictions joined
   - Each row is a single course enrollment
   - Includes same ML predictions propagated to course level

### Enhanced Data Files (with ZIP codes)
3. **`kctcs_student_level_with_zip.csv`** (32,800 students)
   - Student-level data with geographic (ZIP code) information
   - Use for geographic analysis and mapping

4. **`kctcs_merged_with_zip.csv`** (145,918 course records)
   - Course-level data with geographic information

5. **`kctcs_cohorts_with_zip.csv`** (32,800 students)
   - Original cohort data with ZIP codes added

6. **`ar_kcts_with_zip.csv`** (32,800 students)
   - AR (Academic Records) data with ZIP codes

### Original Source Files
7. **`kctcs_courses.csv`** (145,918 course records)
   - Original course-level data from API
   - Raw data before merging

8. **`De-identified PDP AR Files.xlsx`**
   - Original Excel file with AR data

### Processing Scripts
- **`merge_kctcs_data.py`** - Merges cohort, course, and AR data
- **`create_ar_kcts.py`** - Processes AR data from Excel
- **`complete_ml_pipeline.py`** - Trains all ML models and generates predictions
- **`fetch_kctcs_data.py`** - Downloads data from KCTCS API

### Documentation
- **`ML_MODELS_GUIDE.md`** - Detailed guide to ML models and their usage
- **`ML_PIPELINE_REPORT.txt`** - Model performance metrics and summary
- **`DATA_DICTIONARY.md`** - This file

---

## 📊 FILE SIZE REFERENCE
| File | Rows | Size |
|------|------|------|
| `kctcs_student_level_with_predictions.csv` | 32,800 | ~7 MB |
| `kctcs_merged_with_predictions.csv` | 145,918 | ~29 MB |
| `kctcs_courses.csv` | 145,918 | ~27 MB |

---

**Last Updated**: October 28, 2025  
**Version**: 2.0 (Updated with ML predictions)

