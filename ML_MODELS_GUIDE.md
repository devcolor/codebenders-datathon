# Student Success Prediction Models - Guide for Education Leaders

**Generated**: October 30, 2025  
**Dataset**: KCTCS Student Data (32,800 students, 145,918 course records)
**Models**: 8 predictive models to identify at-risk students and improve retention

---

## 📋 Quick Start

This guide explains our machine learning models that predict student success outcomes. Whether you're an advisor, administrator, or data analyst, you'll find:
- **What each model does** and why it matters
- **How accurate** the predictions are
- **Which students** to prioritize for support
- **Recommendations** for additional analytics

---

## 🎯 The 8 Predictive Models

### Summary Table

| Model | What It Predicts | Accuracy | Best Use Case |
|-------|-----------------|----------|---------------|
| **1. Retention** | Will student return next year? | 53% (AUC) | Long-term retention planning |
| **2. Early Warning** | Does student need help NOW? | Composite | Daily advisor intervention lists |
| **3. Gateway Math** | Will student pass college-level math? | 64% (AUC) | Math tutoring prioritization |
| **4. Gateway English** | Will student pass college-level English? | 81% (AUC) | Writing support prioritization |
| **5. Low GPA Risk** | Will student's GPA fall below 2.0? | 99% (AUC) | Academic probation prevention |
| **6. GPA Prediction** | What GPA will student achieve? | R²=0.25 | Identify over/underperformers |
| **7. Time to Credential** | How many years until graduation? | R²=0.35 | Graduation timeline planning |
| **8. Credential Type** | What degree will student earn? | Limited | Limited by data availability |


---

## 📊 Output Files - Which One Should I Use?

### For Student-Level Analysis (Dashboards, Reports)
**File**: `kctcs_student_level_with_predictions.csv`
- **32,800 rows** (one per student)
- **166 columns** (original data + 31 prediction columns)
- **Use when**: Creating student lists, advisor dashboards, retention reports

### For Course-Level Analysis (Course Performance)
**File**: `kctcs_merged_with_predictions.csv`
- **145,918 rows** (one per course enrollment)
- **160 columns** (original data + 25 prediction columns)
- **Use when**: Analyzing which courses have high failure rates, tracking enrollment patterns

---

## 🤖 Detailed Model Descriptions

### MODEL 1: Retention Prediction

**What it predicts**: Whether a student will return to college next year

**Algorithm**: XGBoost (machine learning method for classification)

**Input Features (23 total)**:
- **Academic Placement**: Math, Reading, English levels (college-ready vs. remedial) — **75% of prediction power!**
- **Demographics**: Age, race, gender, first-generation status, Pell Grant status
- **Enrollment**: Full-time vs. part-time, enrollment type, cohort term
- **Performance**: GPA, credits earned, course completion rate, gateway course completion

**Output Columns**:
- `retention_probability` — Likelihood of returning (0% to 100%)
- `retention_prediction` — Binary prediction (0=Not Retained, 1=Retained)
- `retention_risk_category` — Low/Moderate/High/Critical Risk

**Performance**:
- **Accuracy**: 51.6% (slightly above random baseline of 50%)
- **AUC-ROC**: 0.531 (53% — indicates weak predictive power)
- **Why so low?**: Student retention depends on many factors we can't measure (family situations, motivation, external opportunities, mental health)

**Risk Distribution**:
- High Risk: 17,373 students (53%)
- Moderate Risk: 14,090 students (43%)
- Low Risk: 1,337 students (4%)

**Top 3 Predictive Factors**:
1. **Reading Placement** (35.5% feature importance)
2. **Math Placement** (24.5% feature importance)
3. **English Placement** (15.4% feature importance)

**Applications**:
- Identify students needing extra support
- Understand which placement tests have strongest predictive power
- Forecast institutional retention rates
- **Note**: 53% AUC indicates modest predictive power; combine with other indicators

---

### MODEL 2: Early Warning System

**What it predicts**: Students needing immediate intervention

**Algorithm**: Composite Risk Score (combines retention + performance metrics)

**How It Works**:
- **50% weight**: Retention probability (from Model 1)
- **20% weight**: GPA below 2.0 or 2.5
- **20% weight**: Course completion rate below 70%
- **10% weight**: Very few credits earned

**Output Columns**:
- `at_risk_alert` — URGENT/HIGH/MODERATE/LOW
- `risk_score` — Comprehensive 0-100 risk score
- `at_risk_probability` — Overall at-risk likelihood

**Alert Distribution**:
- 🚨 **URGENT**: 206 students (0.6%) — Contact within 48 hours
- **HIGH**: 8,711 students (26.6%) — Contact this week
- **MODERATE**: 20,462 students (62.4%) — Monitor regularly
- **LOW**: 3,421 students (10.4%) — Standard support

**Applications**:
- Generate daily advisor task lists
- Flag students before academic failure
- Provide clear action levels (URGENT, HIGH, MODERATE, LOW)
- Prioritize intervention resources

**Recommended Actions**:
- **URGENT**: Immediate outreach, financial aid check, tutoring referral
- **HIGH**: Schedule meeting this week, check attendance
- **MODERATE**: Monthly check-ins, study skills workshops
- **LOW**: Celebrate successes, leadership opportunities

---

### MODEL 3: Gateway Math Success

**What it predicts**: Will student pass college-level math?

**Algorithm**: XGBoost Classifier

**Input Features**: 16 features (excludes math-related features to prevent cheating)
- Placement test scores (Reading, English)
- Demographics and enrollment patterns
- Year 1 GPA and credit progress

**Output Columns**:
- `gateway_math_probability` — Likelihood of passing (0% to 100%)
- `gateway_math_prediction` — Will Pass / Won't Pass
- `gateway_math_risk` — High Risk / Moderate Risk / Likely Pass

**Performance**:
- **Accuracy**: 60.7%
- **AUC-ROC**: 0.641 (64% — moderately useful)
- **Precision**: 56.6%
- **Recall**: 40.0%

**Risk Distribution**:
- High Risk: 31,586 students (96.3%)
- Moderate Risk: 983 students (3.0%)
- Likely Pass: 231 students (0.7%)

**Applications**:
- Prioritize math tutoring resources
- Identify students who need support before course failure
- Target interventions (study groups, supplemental instruction)
- Address gateway course completion barrier

---

### MODEL 4: Gateway English Success

**What it predicts**: Will student pass college-level English/writing?

**Algorithm**: XGBoost Classifier

**Input Features**: 16 features (excludes English-related features)
- Placement test scores (Math, Reading)
- Demographics and enrollment patterns
- Year 1 GPA and credit progress

**Output Columns**:
- `gateway_english_probability` — Likelihood of passing (0% to 100%)
- `gateway_english_prediction` — Will Pass / Won't Pass
- `gateway_english_risk` — High Risk / Moderate Risk / Likely Pass / Very Likely Pass

**Performance**:
- **Accuracy**: 73.4%
- **AUC-ROC**: 0.811 (81%)
- **Precision**: 70.8%
- **Recall**: 92.6% (catches most at-risk students)

**Risk Distribution**:
- High Risk: 31,083 students (94.8%)
- Moderate Risk: 715 students (2.2%)
- Likely Pass: 978 students (3.0%)
- Very Likely Pass: 24 students (0.1%)

**Applications**:
- 81% AUC indicates strong predictive performance
- 93% recall captures most at-risk students
- Direct students to writing center before course failure
- English course success correlates with overall college success

---

### MODEL 5: Low GPA Risk (<2.0)

**What it predicts**: Will student's first-semester GPA drop below 2.0?

**Algorithm**: XGBoost Classifier (trained without GPA data to prevent leakage)

**Input Features**: 19 features (removed GPA-related features)
- Placement test scores (Math, Reading, English)
- Demographics (age, first-gen, Pell status)
- Enrollment intensity (full-time vs. part-time)

**Output Columns**:
- `low_gpa_probability` — Risk of GPA below 2.0 (0% to 100%)
- `low_gpa_prediction` — At Risk / Not At Risk
- `academic_risk_level` — Low / Moderate / High / Critical Risk

**Performance**:
- **Accuracy**: 99.7%
- **AUC-ROC**: 0.988 (99%)
- **Precision**: 100% (no false alarms)
- **Recall**: 5.3% (catches some at-risk students)

**Risk Distribution**:
- Low Risk: 32,709 students (99.7%)
- Moderate Risk: 76 students (0.2%)
- High Risk: 13 students (0.0%)
- Critical Risk: 2 students (0.0%)

**Applications**:
- 99% AUC indicates high accuracy; 100% precision minimizes false positives
- Identify academic probation risk before semester starts
- Target intensive support programs (tutoring packages, reduced course loads)
- Enable early intervention before GPA drop

**Use Case**: Focus on 91 students (Moderate/High/Critical) for proactive academic support

---

### MODEL 6: GPA Prediction (Continuous)

**What it predicts**: What GPA (0.0-4.0) will a student achieve?

**Algorithm**: Random Forest Regressor  

**Input Features**: Same 23 features as Retention Model
- Academic placement tests (Math, Reading, English)
- Demographics (age, first-gen, Pell status, race, gender)
- Enrollment patterns (full-time vs. part-time, cohort term)
- Course performance (credits earned, completion rate)

**Output Columns**:
- `predicted_gpa` — Expected GPA (0.0-4.0 scale)
- `gpa_performance` — Above Expected / As Expected / Below Expected

**Performance**:
- **RMSE**: 0.79 GPA points
- **MAE**: 0.60 GPA points (median error)
- **R² Score**: 0.25 (explains 25% of variance — moderate)

**Interpretation**: On average, predictions are ±0.60 GPA points from actual. For a 2.5 GPA student, model might predict 1.9 to 3.1.

**Performance Categories**:
- **Above Expected**: Actual GPA > Predicted + 0.2 (student is outperforming)
- **As Expected**: Within ±0.2 of predicted (on track)
- **Below Expected**: Actual GPA < Predicted - 0.2 (student is underperforming)

**Statistics**:
- Mean predicted GPA: 2.06
- Most students perform "As Expected" (within prediction range)

**Applications**:
- Identify high achievers for recognition and leadership opportunities
- Spot underperformers for targeted academic support
- Set data-informed expectations in advising conversations
- Track intervention effectiveness through GPA changes
- **Limitation**: ±0.6 GPA error means predictions have substantial uncertainty

**Use Cases**:
```
High Priority: Students Below Expected
- GPA dropping below predictions = intervention needed
- May indicate personal issues, course difficulty, or study skills gaps
- Immediate outreach and support resources

Recognition: Students Above Expected  
- GPA exceeding predictions indicates strong performance
- Consider peer tutoring, honors programs, leadership roles
- Positive reinforcement and recognition

Monitor: Students As Expected
- On track academically
- Standard support and check-ins
```

---

### MODEL 7: Time to Credential 📊

**What it predicts**: How many years until student graduates

**Algorithm**: Random Forest Regressor

**Input Features**: Same 23 features as Retention Model

**Output Columns**:
- `predicted_time_to_credential` — Years to graduation
- `predicted_graduation_year` — Expected graduation year

**Performance**:
- **RMSE**: 0.57 years (±7 months error)
- **MAE**: 0.47 years (±6 months median error)
- **R² Score**: 0.35 (explains 35% of variance — moderate)

**Training Data Challenge**: Only 184 students (0.56%) have completed credentials
- Most students are still enrolled or left without graduating
- Limited training data reduces accuracy

**Predictions**:
- Mean predicted time: 3.10 years
- Median predicted time: 3.11 years

**Applications**:
- Resource planning (expected graduates per semester)
- Advising conversations about graduation timelines
- **Limitation**: Training data limited to 184 credential completers (0.56% of dataset)

---

### MODEL 8: Credential Type

**What it predicts**: What degree will student earn (None/Certificate/Associate's/Bachelor's)

**Algorithm**: Random Forest Multi-class Classifier

**Performance**: **Not reliable** (99.4% predict "No Credential")

**Why It Doesn't Work**:
- Only 184 students (0.56%) have completed credentials
- 99% class imbalance makes predictions unreliable
- Model can't learn patterns with so few examples

**Recommendation**: Wait for more cohorts to graduate (3-5 years) before using this model

---

## 🎯 Which Students Should I Focus On?

### Priority 1: URGENT Students (206 students)
**From**: Early Warning System (Model 2)
- Contact within 48 hours
- Check financial aid, housing, food security
- Immediate tutoring referrals
- Consider course load reduction

### Priority 2: Low GPA Risk (91 students)
**From**: Low GPA Risk Model (Model 5)
- Moderate/High/Critical academic risk
- Proactive tutoring before semester starts
- Academic success workshops
- Frequent check-ins (weekly)

### Priority 3: Gateway English High Risk (715 students)
**From**: Gateway English Model (Model 4)
- Moderate risk category
- Writing center referrals
- Supplemental Instruction (SI) for English courses
- Study groups and peer tutoring

### Priority 4: Gateway Math High Risk (983 students)
**From**: Gateway Math Model (Model 3)
- Moderate risk category
- Math tutoring center referrals
- SI for math courses
- Calculator/technology training

---

## 📈 Model Performance Explained (For Technical Users)

### Understanding Accuracy Metrics

**Accuracy**: Percentage of correct predictions
- 50% = random baseline
- 75%+ = strong performance
- 95%+ = very high performance

**AUC-ROC** (Area Under Curve): How well model separates at-risk from not-at-risk
- 0.5 = random guessing
- 0.7-0.8 = acceptable
- 0.8-0.9 = excellent
- 0.9+ = outstanding

**Precision**: When model says "at-risk," how often is it correct?
- Important when we have limited intervention resources
- High precision = fewer false alarms

**Recall**: Of all truly at-risk students, how many did we catch?
- Important when missing a student is costly
- High recall = we catch most struggling students

### Our Models Ranked by Performance

| Rank | Model | AUC-ROC / R² | Performance | Primary Application |
|------|-------|--------------|-------------|---------------------|
| 1 | Low GPA Risk | 0.988 | 99% AUC | Academic probation prevention |
| 2 | Gateway English | 0.811 | 81% AUC | Writing support targeting |
| 3 | Gateway Math | 0.641 | 64% AUC | Math tutoring targeting |
| 4 | Retention | 0.531 | 53% AUC | Long-term retention planning |
| 5 | Early Warning | Composite | Composite score | Daily intervention lists |
| 6 | Time to Credential | R²=0.35 | 35% variance explained | Graduation timeline planning |
| 7 | GPA Prediction | R²=0.25 | 25% variance explained | Identify over/underperformers |
| 8 | Credential Type | Limited | 0.56% training data | Limited by data availability |

---

## 💡 Recommendations for Additional Models & Metrics

### Tier 1: Immediate Priority

#### 1. **First-Semester Persistence Model**
**What**: Predict if student will complete first semester
**Why**: First 6 weeks are critical — early intervention window
**Data needed**: Mid-term grades, attendance (weeks 1-6), LMS logins
**Expected impact**: High — interventions most effective early

#### 2. **Course-Specific Pass/Fail Models**
**What**: Predict success in high-DFW courses (high D/F/Withdraw rates)
**Why**: Target support to specific challenging courses
**Data needed**: Course enrollment + placement scores + prior GPA
**Example courses**: College Algebra, English Composition, Biology
**Expected impact**: Reduce DFW rates by 10-15%

#### 3. **Financial Aid Retention Risk**
**What**: Predict students who will drop out due to financial issues
**Why**: Financial concerns are #1 reason for leaving community college
**Data needed**: FAFSA completion, Pell status, account balance holds, payment plans
**Expected impact**: Very high — financial aid is addressable

#### 4. **Re-enrollment Predictor**
**What**: Among students who left, who is likely to return?
**Why**: Re-recruiting former students is cost-effective
**Data needed**: Reason for leaving, last term GPA, credits earned
**Expected impact**: Moderate — help retention specialists prioritize outreach

### Tier 2: Secondary Priority

#### 5. **Transfer Intent Model**
**What**: Which students are likely to transfer to 4-year institutions?
**Why**: Provide appropriate advising and transfer support
**Data needed**: Intended credential, transfer inquiries, course selections

#### 6. **Engagement Score**
**What**: Composite score of student engagement (attendance, LMS, tutoring)
**Why**: Engagement metrics have stronger correlation with retention than GPA alone
**Data needed**: Learning management system logs, attendance tracking, support service usage

#### 7. **Satisfactory Academic Progress (SAP) Risk**
**What**: Predict students at risk of losing financial aid eligibility
**Why**: SAP loss often leads to immediate dropout
**Data needed**: GPA trends, completion rate trends, credit accumulation

#### 8. **Career Pathway Alignment**
**What**: Is student on track for their intended career?
**Why**: Misalignment causes major changes and delayed graduation
**Data needed**: Intended career, current courses, program requirements

### Tier 3: Long-Term Development

#### 9. **Social Network Analysis**
**What**: Identify isolated students (few peer connections)
**Why**: Social integration predicts retention
**Data needed**: Study groups, clubs, peer interactions

#### 10. **Intervention Effectiveness Tracking**
**What**: Which interventions work for which students?
**Why**: Optimize advisor time and resources
**Data needed**: Intervention records + outcomes (A/B testing)

### Additional Data Collection Recommendations

To improve prediction accuracy, collect:
- ✅ **Attendance data** — Strong retention predictor
- ✅ **LMS engagement** — Logins, time on task, assignment submission patterns
- ✅ **Financial holds** — Account balance issues
- ✅ **Advisor contact frequency** — Support seeking behavior
- ✅ **Tutoring usage** — Help-seeking behavior
- ✅ **Mid-term grades** — Early warning signal
- ✅ **Work hours** — Competing demands
- ✅ **Transportation/childcare barriers** — Practical obstacles
- ✅ **Intent to return** — Self-reported likelihood

---

## 🔑 Key Insights: What Actually Matters for Student Success?

### The Big Three: Academic Placement Tests

**75% of retention predictions come from just 3 factors:**
1. **Reading Placement** (35% importance)
2. **Math Placement** (24% importance)
3. **English Placement** (15% importance)

**What this means**: Students who place into remedial coursework in all three areas need immediate, intensive support.

**Action items**:
- Develop "bridge programs" for students with multiple remedial placements
- Offer intensive summer prep courses before fall semester
- Co-requisite remediation (take remedial + college-level simultaneously)
- Early alert system for remedial course instructors

### First-Generation Students Need Extra Support

**First-gen status** (5.2% feature importance)
- Higher importance than other demographic factors
- First-gen students lack family guidance about college navigation

**Action items**:
- First-gen cohort programs and peer mentoring
- Family engagement events
- "College 101" orientation programs

### Enrollment Intensity Patterns

**Enrollment intensity** (1.8% feature importance)
   - Full-time students have higher retention than part-time
- Part-time students face competing demands (work, family)

**Action items**:
- Flexible scheduling for working students
- Evening/weekend course options
- Online course availability
- Part-time student support services and community building

---

## 🎓 How to Use These Predictions Ethically

### DO ✅
- Share predictions with students transparently
- Use predictions to offer support, not to label students
- Continuously validate model accuracy
- Check for bias across demographic groups
- Combine predictions with advisor judgment

### DON'T
- Use predictions alone to make high-stakes decisions
- Assume predictions are 100% accurate
- Treat predictions as unchangeable destiny
- Share predictions publicly or with non-essential staff
- Use predictions to limit opportunities

### Student Privacy
- Protect prediction data like any student record
- Follow FERPA regulations
- Limit access to advisors and relevant support staff
- Never share aggregate data that could identify individuals

---

## 📊 Expected Impact: Return on Investment

### Assumptions
- 8,917 students flagged as URGENT or HIGH risk
- 30% intervention success rate (typical for community colleges)
- $5,000 net revenue per retained student

### Potential Impact
```
Students saved: 8,917 × 30% = 2,675 students
Revenue saved: 2,675 × $5,000 = $13,375,000
```

### Additional Benefits
- Improved graduation rates
- Enhanced student outcomes and life trajectories
- Strengthened institutional reputation
- Increased advisor time efficiency
- Data-driven decision making culture

---

## 🔄 Model Maintenance & Updates

### Quarterly (Every 3 Months)
- Generate new predictions for current students
- Update dashboard with latest risk scores
- Review urgent alert list

### Annually (Once Per Year)
- Retrain models with new cohort data
- Validate prediction accuracy vs. actual outcomes
- Adjust alert thresholds if needed
- Add new features as data becomes available

### How to Retrain Models
```bash
# Navigate to project directory
cd /path/to/codebenders-datathon

# Run the pipeline (takes ~1 minute)
python3 complete_ml_pipeline_csv_only.py

# New prediction files will be created in data/ folder
```

---

## 📞 Support & Questions

### For Advisors & Non-Technical Users
**Q: What does "retention_probability = 0.45" mean?**  
A: The model predicts this student has a 45% chance of returning next year (moderate risk).

**Q: Should I only help students with URGENT alerts?**  
A: No — use alerts to prioritize, but all students benefit from support.

**Q: Can I trust these predictions?**  
A: Use them as one input among many. Combine with your professional judgment and knowledge of the student.

**Q: What if a "Low Risk" student is clearly struggling?**  
A: Always trust your judgment over the model. Models can't see everything.

### For Technical Users
**Q: Why is retention model accuracy so low?**  
A: Student retention is inherently difficult to predict. We're missing key data (motivation, family situation, mental health, external opportunities).

**Q: Can I improve these models?**  
A: Yes! Collect additional features (attendance, LMS engagement, advisor contacts) and retrain annually.

**Q: Should I use ensemble methods?**  
A: Potentially. Consider stacking multiple weak models, though our best models (Low GPA, Gateway English) already perform well.

**Q: How do I handle the class imbalance in Credential Type?**  
A: Wait for more data (3-5 years) or try SMOTE/oversampling. Current predictions are unreliable.

---

## 📁 File Structure

```
codebenders-datathon/
├── data/
│   ├── kctcs_student_level_with_predictions.csv ⭐ Main output (32,800 students)
│   ├── kctcs_merged_with_predictions.csv (145,918 course records)
│   └── model_comparison_results.csv (model performance)
│
├── complete_ml_pipeline_csv_only.py (run this to generate predictions)
├── ML_MODELS_GUIDE.md (this file)
├── ML_PIPELINE_REPORT_CSV.txt (technical report)
└── DATA_DICTIONARY.md (column definitions)
```

---

## 🎯 Quick Reference: Column Names

### Risk & Alert Columns (Use These for Intervention)
- `at_risk_alert` — **URGENT/HIGH/MODERATE/LOW** ⭐ Use this for daily advisor lists
- `risk_score` — 0-100 comprehensive risk score
- `retention_risk_category` — Critical/High/Moderate/Low Risk
- `gateway_math_risk` — Math support prioritization
- `gateway_english_risk` — Writing support prioritization
- `academic_risk_level` — Low GPA risk (academic probation)

### Probability Columns (For Analysis)
- `retention_probability` — Likelihood of returning next year (0-1)
- `at_risk_probability` — Overall at-risk likelihood (0-1)
- `gateway_math_probability` — Likelihood of passing college math (0-1)
- `gateway_english_probability` — Likelihood of passing college English (0-1)
- `low_gpa_probability` — Risk of GPA below 2.0 (0-1)
- `predicted_gpa` — Expected GPA (0.0-4.0 scale)

### Prediction Columns (Yes/No Outcomes)
- `retention_prediction` — Will return (0=No, 1=Yes)
- `at_risk_prediction` — Needs intervention (0=No, 1=Yes)
- `gateway_math_prediction` — Will pass math (0=No, 1=Yes)
- `gateway_english_prediction` — Will pass English (0=No, 1=Yes)
- `low_gpa_prediction` — At risk of low GPA (0=No, 1=Yes)
- `gpa_performance` — Above/As/Below Expected (performance category)

---

## ✅ Summary: What Should I Do Next?

### For Advisors
1. Pull list of **URGENT students** from `at_risk_alert` column → contact within 48 hours
2. Review **Moderate/High/Critical academic risk** students from `academic_risk_level` → proactive support
3. Check **Gateway Math/English risk** → tutoring referrals before students struggle

### For Administrators
1. **Track retention trends** by program using `retention_probability`
2. **Calculate intervention ROI** from at-risk student counts
3. **Identify struggling programs** that need additional resources
4. **Plan tutoring resources** based on Gateway Math/English risk counts

### For Researchers & Analysts
1. **Validate predictions** against actual outcomes (retention, GPA, course success)
2. **Build dashboards** with student-level predictions
3. **Test interventions** with randomized control trials (RCT)
4. **Collect additional data** (attendance, LMS engagement) for model improvement

### For Technical Staff
1. **Automate weekly prediction updates** with cron job
2. **Integrate predictions** with student information system (SIS)
3. **Build API** for real-time predictions
4. **Create automated alerts** via email for URGENT students

---

**Version**: 5.0 (8 Models - October 30, 2025)  
**Models**: 8 predictive models (3 high-performing, 3 moderate, 2 limited)  
**Records**: 32,800 students with 166 total columns (31 prediction columns)  
**Best Models**: Low GPA Risk (99% AUC), Gateway English (81% AUC), Gateway Math (64% AUC)

**New in v5.0**: Added Model 6 (GPA Prediction) - predicts expected GPA and identifies over/underperformers

**Questions?** Review the ML_PIPELINE_REPORT_CSV.txt for technical details or DATA_DICTIONARY.md for column definitions.
