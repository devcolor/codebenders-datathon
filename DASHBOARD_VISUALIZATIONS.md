# Dashboard Visualizations Guide
## KCTCS Student Success Analytics & Predictive Models

**Dataset**: `kctcs_student_level_with_predictions.csv`  
**Students**: 32,800  
**Date**: October 28, 2025  
**Purpose**: Comprehensive visualization guide for retention, graduation, and student success metrics

---

## 📊 EXECUTIVE DASHBOARD - KPI CARDS (Top Row)

### 1. Key Metrics Scorecard

Display as large, prominent cards at the top of dashboard:

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Overall         │ Avg Predicted   │ Students at     │ Avg Course      │
│ Retention Rate  │ Retention Prob  │ High/Critical   │ Completion Rate │
│    XX.X%        │     XX.X%       │  Risk: XXX      │     XX.X%       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Data Fields**:
- `Retention` (actual retention rate)
- `retention_probability` (predicted retention)
- `retention_risk_category` (count of High + Critical)
- `course_completion_rate` (average)

**Purpose**: At-a-glance institutional health metrics

---

## 🚨 RISK & EARLY WARNING VISUALIZATIONS

### 2. Risk Alert Distribution
**Chart Type**: Donut Chart or Pie Chart

**Data Field**: `at_risk_alert`

**Categories**:
- 🟢 **LOW**: 4,146 students (12.6%)
- 🟡 **MODERATE**: 19,823 students (60.4%)
- 🟠 **HIGH**: 8,344 students (25.4%)
- 🔴 **URGENT**: 487 students (1.5%)

**Display**: Show both percentages and counts

**Insight**: Immediate view of how many students need intervention

---

### 3. Retention Risk Funnel
**Chart Type**: Horizontal Bar Chart

**Data Field**: `retention_risk_category`

**Categories** (ordered by severity):
1. Critical Risk (242 students - 0.7%)
2. High Risk (15,755 students - 48.0%)
3. Moderate Risk (15,202 students - 46.3%)
4. Low Risk (1,601 students - 4.9%)

**Color Scheme**: Red → Orange → Yellow → Green

**Insight**: Retention risk pipeline visualization

---

### 4. Risk Score Distribution
**Chart Type**: Histogram with color gradient

**Data Field**: `risk_score` (0-100)

**Bins**: 
- 0-25 (Green)
- 25-50 (Yellow)
- 50-75 (Orange)
- 75-100 (Red)

**Insight**: Shows concentration of risk across student population

---

### 5. At-Risk Students by Program
**Chart Type**: Horizontal Bar Chart (Top 10)

**Data Fields**: 
- `Program_of_Study_Year_1` (x-axis)
- Count of students where `at_risk_alert` = 'HIGH' or 'URGENT' (y-axis)

**Sort**: Descending by count

**Insight**: Identifies programs needing most support resources

---

## 🎓 ACADEMIC PERFORMANCE VISUALIZATIONS

### 6. Retention Rate by Cohort
**Chart Type**: Line Chart with dual lines

**Data Fields**:
- X-axis: `Cohort` (2019-20, 2020-21, etc.)
- Y-axis: Average retention rate
- Line 1: Actual `Retention`
- Line 2: `retention_probability` (predicted)

**Insight**: Year-over-year retention trends and prediction accuracy

---

### 7. GPA Performance Distribution
**Chart Type**: Box Plot or Violin Plot

**Data Fields**:
- Groups: `gpa_performance` (On Track / Above Expected / Below Expected)
- Values: `average_grade`

**Insight**: Grade distribution across performance categories

---

### 8. Course Completion Rate vs Retention
**Chart Type**: Scatter Plot with trendline

**Data Fields**:
- X-axis: `course_completion_rate`
- Y-axis: `retention_probability`
- Color: `at_risk_alert` (LOW/MODERATE/HIGH/URGENT)
- Size: Optional - `total_courses_enrolled`

**Add**: Linear regression trendline

**Insight**: Relationship between completing courses and staying enrolled

---

### 9. Credits Earned Progress
**Chart Type**: Stacked Bar Chart

**Data Fields**:
- `Number_of_Credits_Earned_Year_1`
- `Number_of_Credits_Earned_Year_2`
- `Number_of_Credits_Earned_Year_3`
- `Number_of_Credits_Earned_Year_4`

**Group by**: `Cohort` or `Program_of_Study_Year_1`

**Insight**: Academic progress tracking over time

---

### 10. Gateway Course Completion Impact
**Chart Type**: Grouped Bar Chart

**Data Fields**:
- Group 1: `CompletedGatewayMathYear1` (Yes/No)
- Group 2: `CompletedGatewayEnglishYear1` (Yes/No)
- Y-axis: Average `retention_probability`

**Why Important**: Gateway courses are critical milestones

**Insight**: Impact of completing foundational courses on retention

---

## 👥 DEMOGRAPHIC & EQUITY ANALYSIS

### 11. Retention by Demographics
**Chart Type**: Multiple Grouped Bar Charts (one for each demographic)

**Create separate charts for**:
- **Race**: Average retention by racial group
- **Gender**: Male vs Female vs Other
- **First_Gen**: First-generation vs continuing-generation
- **Pell_Status_First_Year**: Pell-eligible vs not
- **Student_Age**: Age group brackets

**Data Fields**:
- Demographic field (x-axis)
- Average `Retention` (actual)
- Average `retention_probability` (predicted)

**Insight**: Equity gaps and support needs across populations

---

### 12. First-Gen Students Risk Profile
**Chart Type**: Stacked Bar Chart

**Data Fields**:
- X-axis: `First_Gen` (Yes/No)
- Y-axis: Count of students
- Stacks: `at_risk_alert` levels (LOW/MODERATE/HIGH/URGENT)

**Insight**: Disproportionate risk in first-generation population

---

### 13. Math Placement vs Retention
**Chart Type**: Grouped Bar Chart or Heatmap

**Data Fields**:
- X-axis: `Math_Placement` levels (Below Transfer, Transfer Ready, etc.)
- Y-axis: Average `retention_probability`

**Why Important**: Math placement is the #1 predictor (35.1% feature importance)

**Insight**: Placement test scores strongly predict outcomes

---

## 🔮 PREDICTIVE ANALYTICS VISUALIZATIONS

### 14. Predicted vs Actual Retention
**Chart Type**: Confusion Matrix Heatmap

**Data Fields**:
- Rows: Actual `Retention` (0 = Not Retained, 1 = Retained)
- Columns: `retention_prediction` (0/1)
- Cell values: Count of students

**Color**: Blue gradient (darker = more students)

**Insight**: Model accuracy visualization

---

### 15. Time to Credential Distribution
**Chart Type**: Histogram with overlay

**Data Fields**:
- Primary: `predicted_time_to_credential` (histogram)
- Overlay: Actual `Time_to_Credential` for students who completed

**X-axis**: Years (1, 2, 3, 4, 5+)

**Insight**: Graduation timeline forecasting

---

### 16. Predicted Graduation Year
**Chart Type**: Area Chart or Vertical Bar Chart

**Data Field**: `predicted_graduation_year`

**X-axis**: Academic year (2023-24, 2024-25, 2025-26, etc.)  
**Y-axis**: Count of expected graduates

**Insight**: Institutional planning for future cohorts

---

### 17. Credential Type Predictions
**Chart Type**: Stacked 100% Bar Chart or Stacked Area Chart

**Data Fields** (probabilities):
- `prob_no_credential`
- `prob_certificate`
- `prob_associate`
- `prob_bachelor`

**Group by**: `Cohort` or `Program_of_Study_Year_1`

**Insight**: Expected credential outcomes by program

---

### 18. Predicted GPA Performance
**Chart Type**: Donut Chart

**Data Field**: `gpa_performance`

**Categories**:
- On Track
- Above Expected
- Below Expected

**Insight**: Academic performance forecast across student body

---

## 📍 GEOGRAPHIC & INSTITUTIONAL ANALYSIS

### 19. Retention by ZIP Code
**Chart Type**: Choropleth Map (Kentucky state map)

**Data Fields**:
- Geography: `zip_code`
- Color intensity: Average `retention_probability`

**Color Scale**: Red (low retention) → Green (high retention)

**Insight**: Geographic patterns in student success

---

### 20. At-Risk Students by Institution
**Chart Type**: Horizontal Bar Chart

**Data Fields**:
- X-axis: Count of students with `at_risk_alert` = 'HIGH' or 'URGENT'
- Y-axis: `Institution_ID`

**Sort**: Descending by count

**Insight**: Campus-level intervention prioritization

---

## 📈 TREND & COMPARATIVE ANALYSIS

### 21. Enrollment Intensity Impact
**Chart Type**: Grouped Bar Chart

**Data Field**: `Enrollment_Intensity_First_Term`

**Groups**: Full-Time vs Part-Time

**Metrics to compare**:
- Average `Retention`
- Average `course_completion_rate`
- Average `average_grade`

**Insight**: Full-time vs part-time student outcomes

---

### 22. Online vs Face-to-Face Learning
**Chart Type**: Line Chart or Bar Chart

**Data Field**: `pct_online` (bucket into ranges)

**Buckets**:
- 0-25% online
- 25-50% online
- 50-75% online
- 75-100% online

**Y-axis**: Average `retention_probability`

**Insight**: Effectiveness of different delivery modalities

---

### 23. Dual Enrollment Impact
**Chart Type**: Comparison Bar Chart

**Data Field**: `Dual_and_Summer_Enrollment` (Yes/No)

**Metrics**:
- Retention rate
- Course completion rate
- Average GPA
- Average `retention_probability`

**Insight**: Impact of early college credit on success

---

### 24. Program of Study Performance
**Chart Type**: Horizontal Bar Chart (Top 20 programs)

**Data Fields**:
- X-axis: Average `retention_probability`
- Y-axis: `Program_of_Study_Year_1`
- Optional: Bar width or annotation showing student count

**Sort**: Highest to lowest retention probability

**Insight**: Best and worst performing programs

---

## 🎯 INTERVENTION PRIORITY DASHBOARDS

### 25. High-Priority Students Table
**Chart Type**: Interactive Sortable Data Table

**Columns to Display**:
- `Student_GUID`
- `risk_score`
- `at_risk_alert`
- `retention_probability`
- `course_completion_rate`
- `average_grade`
- `Program_of_Study_Year_1`
- `Cohort`
- `Institution_ID`

**Interactive Features**:
- Sort by any column
- Filter by:
  - Alert level (URGENT/HIGH)
  - Program
  - Cohort
  - Institution
  - Demographics

**Export**: Download filtered list to CSV for advisor outreach

**Insight**: Actionable student list for immediate intervention

---

### 26. Intervention Impact Simulator
**Chart Type**: Interactive What-If Analysis Dashboard

**Input Controls** (Sliders):
- Improve course completion rate by: X%
- Improve average GPA by: X points
- Increase gateway course completion by: X students

**Calculations**:
- Current retention probability
- Adjusted retention probability (simulated)
- Net change in expected graduates
- Projected revenue impact

**Display**: Before/After comparison bars

**Insight**: ROI estimation for intervention programs

---

## 📊 RECOMMENDED DASHBOARD LAYOUTS

### **Page 1: Executive Overview**
```
┌──────────────────────────────────────────────────────────────────┐
│  KPI CARDS                                                        │
│  [Overall Retention] [Predicted Retention] [At-Risk] [Completion]│
├────────────────────────────────┬─────────────────────────────────┤
│ Risk Alert Distribution        │ Retention Rate by Cohort        │
│ (Donut Chart)                  │ (Line Chart - Actual + Predicted│
├────────────────────────────────┼─────────────────────────────────┤
│ At-Risk Students by Program    │ Predicted Graduation Year       │
│ (Horizontal Bar - Top 10)      │ (Area Chart)                    │
└────────────────────────────────┴─────────────────────────────────┘
```

**Audience**: Presidents, VPs, Deans  
**Purpose**: High-level institutional health

---

### **Page 2: Academic Performance Deep Dive**
```
┌────────────────────────────────┬─────────────────────────────────┐
│ GPA Performance Distribution   │ Gateway Course Completion       │
│ (Box Plot)                     │ Impact (Grouped Bar)            │
├────────────────────────────────┼─────────────────────────────────┤
│ Course Completion vs Retention │ Credits Earned Progress         │
│ (Scatter Plot)                 │ (Stacked Bar by Year)           │
└────────────────────────────────┴─────────────────────────────────┘
```

**Audience**: Academic Affairs, Faculty  
**Purpose**: Course and curriculum effectiveness

---

### **Page 3: Equity & Demographics Analysis**
```
┌────────────────────────────────┬─────────────────────────────────┐
│ Retention by Race              │ Retention by First-Gen Status   │
│ (Grouped Bar)                  │ (Risk Profile Stacked Bar)      │
├────────────────────────────────┼─────────────────────────────────┤
│ Math Placement vs Retention    │ Retention by ZIP Code           │
│ (Bar Chart)                    │ (Kentucky Map)                  │
└────────────────────────────────┴─────────────────────────────────┘
```

**Audience**: Diversity/Equity Officers, Student Affairs  
**Purpose**: Identify and address equity gaps

---

### **Page 4: Intervention & Advisor Tools**
```
┌──────────────────────────────────────────────────────────────────┐
│ High-Priority Students Table (Sortable, Filterable)              │
│ [Show URGENT only] [Show HIGH only] [Filter by Program ▼]       │
├────────────────────────────────┬─────────────────────────────────┤
│ Risk Score Distribution        │ Predicted Credential Types      │
│ (Histogram)                    │ (Stacked Area)                  │
└────────────────────────────────┴─────────────────────────────────┘
```

**Audience**: Academic Advisors, Student Success Teams  
**Purpose**: Daily operational intervention work

---

### **Page 5: Predictive Analytics & Planning**
```
┌────────────────────────────────┬─────────────────────────────────┐
│ Predicted vs Actual Retention  │ Time to Credential Distribution │
│ (Confusion Matrix)             │ (Histogram)                     │
├────────────────────────────────┼─────────────────────────────────┤
│ Model Performance Metrics      │ Intervention Impact Simulator   │
│ (Scorecard)                    │ (Interactive Controls)          │
└────────────────────────────────┴─────────────────────────────────┘
```

**Audience**: IR/Analytics Teams, Researchers  
**Purpose**: Model validation and strategic planning

---

## 🛠️ RECOMMENDED TOOLS & PLATFORMS

### **Option 1: Tableau or Power BI** ⭐ RECOMMENDED
**Pros**:
- Professional, interactive dashboards
- Easy drag-and-drop interface
- Built-in filters and drill-downs
- Mobile-responsive
- Easy sharing with stakeholders

**Best for**: Executive and advisor-facing dashboards

---

### **Option 2: Python (Plotly Dash / Streamlit)**
**Pros**:
- Full customization
- Can integrate live ML model predictions
- Open-source and free
- Can embed complex calculations

**Best for**: Data science teams, custom analytics

**Sample Stack**:
```python
import pandas as pd
import plotly.express as px
import streamlit as st
```

---

### **Option 3: Looker / Google Data Studio**
**Pros**:
- Cloud-based
- Good for Google Workspace integration
- Free tier available (Data Studio)

**Best for**: Budget-conscious institutions

---

### **Option 4: Excel / Google Sheets (Quick Prototype)**
**Pros**:
- Universally accessible
- Quick to build
- Pivot tables and charts

**Cons**: Limited interactivity

**Best for**: Initial proof-of-concept

---

## 📦 INTERACTIVE FEATURES TO INCLUDE

### **Essential Filters** (Apply to all pages)
- ☑️ **Cohort**: 2019-20, 2020-21, 2021-22, etc.
- ☑️ **Program of Study**: Filter by major/program
- ☑️ **Institution ID**: Campus selection
- ☑️ **Risk Level**: URGENT/HIGH/MODERATE/LOW
- ☑️ **Demographics**: Race, Gender, First-Gen, Pell Status

### **Interactive Actions**
1. **Drill-downs**: Click on a risk category → see student list
2. **Hover tooltips**: Show detailed stats on hover
3. **Cross-filtering**: Select a program → all charts update
4. **Export buttons**: Download filtered data to CSV
5. **Refresh data**: Update predictions with latest data

### **Alert Features**
- 🔔 Email notifications for new URGENT students
- 📊 Weekly digest of risk category changes
- 🚨 Dashboard alerts for sudden drops in retention probability

---

## 🎯 KEY INSIGHTS TO HIGHLIGHT IN DASHBOARD

### **From Model Performance**:
1. **Math placement is the #1 predictor** (35% importance) → Show prominently
2. **Course completion rate strongly predicts retention** → Track closely
3. **Gateway courses in Year 1 are critical** → Monitor completion
4. **First-gen students face higher risk** → Equity focus area

### **Actionable Metrics**:
- **487 students** need URGENT intervention (1.5%)
- **8,344 students** at HIGH risk (25.4%)
- **Average predicted retention probability**: Calculate from data
- **Programs with lowest retention**: Identify bottom 5

### **Success Stories to Track**:
- Students who moved from HIGH to LOW risk
- Programs with improving retention trends
- Impact of interventions (before/after comparison)

---

## 📈 SAMPLE DASHBOARD METRIC CALCULATIONS

### **Overall Institutional Retention Rate**
```
Total Students Retained / Total Students * 100
```

### **Predicted Retention Rate**
```
Average(retention_probability) * 100
```

### **Intervention Success Rate** (if tracking interventions)
```
(Students who improved risk category) / (Students who received intervention) * 100
```

### **Program Risk Score**
```
Average(risk_score) by Program_of_Study_Year_1
```

### **Gateway Completion Rate**
```
(CompletedGatewayMathYear1 = Yes) / (AttemptedGatewayMathYear1 = Yes) * 100
```

---

## 🚀 IMPLEMENTATION ROADMAP

### **Phase 1: Essential Dashboard (Week 1-2)**
1. KPI cards
2. Risk alert distribution
3. Retention by cohort
4. High-priority students table

**Goal**: Get advisors using the system

---

### **Phase 2: Academic Insights (Week 3-4)**
1. GPA and completion visualizations
2. Gateway course impact
3. Program performance analysis

**Goal**: Inform curriculum decisions

---

### **Phase 3: Equity & Demographics (Week 5-6)**
1. Demographic breakdowns
2. First-gen analysis
3. Geographic mapping

**Goal**: Address equity gaps

---

### **Phase 4: Advanced Analytics (Week 7-8)**
1. Predictive model validation
2. Time to credential forecasting
3. Intervention simulator

**Goal**: Strategic planning and ROI

---

## 📚 ADDITIONAL RESOURCES

- **Model Performance Details**: See `ML_MODELS_GUIDE.md`
- **Data Dictionary**: See `DATA_DICTIONARY.md`
- **Raw Data**: `kctcs_student_level_with_predictions.csv`

---

## 💡 BEST PRACTICES

1. ✅ **Start simple**: Launch with KPIs and risk alerts first
2. ✅ **Test with advisors**: Get feedback from end users early
3. ✅ **Update regularly**: Refresh predictions monthly or quarterly
4. ✅ **Tell stories**: Use annotations to explain significant trends
5. ✅ **Make it actionable**: Every chart should suggest an action
6. ✅ **Protect privacy**: Ensure student data security and FERPA compliance

---

**Questions or need help building specific visualizations?**  
Contact the data analytics team or refer to visualization tool documentation.

**Document Version**: 1.0  
**Last Updated**: October 28, 2025

