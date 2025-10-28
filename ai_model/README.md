# AI Model Directory

This directory contains all machine learning scripts and models for the KCTCS Student Success Prediction project.

## 📁 Files

### `complete_ml_pipeline.py`
**Main ML Pipeline Script**

Implements five machine learning models for student success prediction:

1. **Retention Prediction** (XGBoost Classifier)
2. **Early Warning System** (Composite Risk Score)
3. **Time-to-Credential** (XGBoost Regressor)
4. **Credential Type** (Random Forest Classifier)
5. **Course Success/GPA** (Random Forest Regressor)

**Usage**:
```bash
cd ai_model
python complete_ml_pipeline.py
```

**Runtime**: ~10-15 minutes

**Outputs**:
- `../data/kctcs_student_level_with_predictions.csv`
- `../data/kctcs_merged_with_predictions.csv`
- `ML_PIPELINE_REPORT.txt`

### `merge_kctcs_data.py`
**Data Merging Script**

Merges three source data files into a unified dataset:
- AR data (`ar_kcts_with_zip.csv`)
- Cohort data (`kctcs_cohorts_with_zip.csv`)
- Course data (`kctcs_courses.csv`)

**Usage**:
```bash
cd ai_model
python merge_kctcs_data.py
```

**Runtime**: ~1-2 minutes

**Output**:
- `../data/kctcs_merged_with_zip.csv`

### `__init__.py`
**Package Initialization**

Makes `ai_model` a Python package and provides package metadata.

## 🤖 Model Details

### Model 1: Retention Prediction

**Algorithm**: XGBoost Classifier  
**Purpose**: Predict if a student will be retained  
**Features**: 40+ demographic, academic, and performance features  
**Performance**: ~85-90% accuracy, ~0.85-0.92 AUC-ROC

**Key Outputs**:
- `retention_probability`: Probability of retention (0-1)
- `retention_prediction`: Binary prediction (0/1)
- `retention_risk_category`: Risk level (Critical/High/Moderate/Low)

### Model 2: Early Warning System

**Algorithm**: Composite Risk Score  
**Purpose**: Identify at-risk students early  
**Approach**: Combines retention probability with performance metrics

**Risk Factors**:
- Retention probability (50% weight)
- GPA performance (20% weight)
- Course completion rate (20% weight)
- Credit progress (10% weight)

**Key Outputs**:
- `risk_score`: Comprehensive risk score (0-100)
- `at_risk_alert`: Alert level (URGENT/HIGH/MODERATE/LOW)
- `at_risk_probability`: Risk probability (0-1)

### Model 3: Time-to-Credential

**Algorithm**: XGBoost Regressor  
**Purpose**: Predict years until credential completion  
**Training Set**: Students who completed credentials  
**Performance**: ~0.5-1.0 years RMSE

**Key Outputs**:
- `predicted_time_to_credential`: Years to completion
- `predicted_graduation_year`: Expected graduation year

### Model 4: Credential Type

**Algorithm**: Random Forest Classifier  
**Purpose**: Predict credential type student will earn  
**Classes**: No Credential, Certificate, Associate's, Bachelor's  
**Performance**: ~70-80% accuracy

**Key Outputs**:
- `predicted_credential_type`: Numeric code (0-3)
- `predicted_credential_label`: Text label
- `prob_no_credential`, `prob_certificate`, `prob_associate`, `prob_bachelor`: Probabilities

### Model 5: Course Success (GPA)

**Algorithm**: Random Forest Regressor  
**Purpose**: Predict student's GPA  
**Performance**: ~0.3-0.5 GPA points RMSE

**Key Outputs**:
- `predicted_gpa`: Expected GPA (0-4 scale)
- `gpa_performance`: Performance vs. expected (Above/Below/As Expected)

## 🔧 Configuration

### Adjusting Model Parameters

Edit `complete_ml_pipeline.py` to modify:

**XGBoost Models** (Retention, Time-to-Credential):
```python
model = xgb.XGBClassifier(
    n_estimators=200,      # Number of trees
    max_depth=6,           # Maximum tree depth
    learning_rate=0.1,     # Learning rate
    random_state=42
)
```

**Random Forest Models** (Credential Type, GPA):
```python
model = RandomForestClassifier(
    n_estimators=200,      # Number of trees
    max_depth=10,          # Maximum tree depth
    random_state=42,
    n_jobs=-1             # Use all CPU cores
)
```

### Feature Selection

Modify feature lists in the "Feature Engineering" section:

```python
demographic_features = [
    'Student_Age', 'Race', 'Ethnicity', 'Gender', 
    'First_Gen', 'Pell_Status_First_Year', 'zip_code'
]

academic_prep_features = [
    'Math_Placement', 'English_Placement', 
    'Reading_Placement', 'Credential_Type_Sought_Year_1'
]

# ... add or remove features as needed
```

### Risk Thresholds

Adjust alert levels in the `assign_alert_level()` function:

```python
def assign_alert_level(risk_score):
    if risk_score >= 75:      # Adjust threshold
        return 'URGENT'
    elif risk_score >= 50:    # Adjust threshold
        return 'HIGH'
    elif risk_score >= 25:    # Adjust threshold
        return 'MODERATE'
    else:
        return 'LOW'
```

## 📊 Feature Engineering

The pipeline creates 40+ features from raw data:

### Demographic Features
- Age, race, ethnicity, gender
- First-generation status
- Pell grant eligibility
- Geographic (zip code)

### Academic Preparation
- Math/English/Reading placement levels
- Credential type sought

### Enrollment Patterns
- Enrollment type and intensity
- Attendance status
- Cohort term

### Course Performance
- Total courses and credits
- Completion rates
- Average grades and GPA
- Gateway course completion
- Online course percentage

### Outcome Variables
- Retention and persistence
- Credential completion
- Time to credential
- Credential type earned

## 🧪 Model Evaluation

Each model is evaluated using appropriate metrics:

**Classification Models**:
- Accuracy
- Precision, Recall, F1-Score
- AUC-ROC
- Confusion Matrix
- Per-class performance

**Regression Models**:
- RMSE (Root Mean Squared Error)
- MAE (Mean Absolute Error)
- R² Score

Results are printed to console and saved in `ML_PIPELINE_REPORT.txt`.

## 🚀 Running the Pipeline

### Prerequisites
```bash
pip install pandas numpy scikit-learn xgboost
```

### Step 1: Merge Data (if needed)
```bash
cd ai_model
python merge_kctcs_data.py
```

### Step 2: Run ML Pipeline
```bash
python complete_ml_pipeline.py
```

### Step 3: Review Results
- Check console output for model performance
- Review `ML_PIPELINE_REPORT.txt` for detailed summary
- Analyze prediction files in `../data/` directory

## 📈 Output Files

### Student-Level Predictions
**File**: `../data/kctcs_student_level_with_predictions.csv`
- One row per student (~20K records)
- All original features + 17 prediction columns
- Use for student-level analysis and interventions

### Course-Level Predictions
**File**: `../data/kctcs_merged_with_predictions.csv`
- One row per course enrollment (~500K records)
- Predictions merged from student level
- Use for course-level analysis

### Summary Report
**File**: `ML_PIPELINE_REPORT.txt`
- Model performance metrics
- Distribution statistics
- Feature importance rankings
- Prediction summaries

## 🐛 Troubleshooting

### Memory Issues
If you encounter memory errors:
- Reduce `n_estimators` in model parameters
- Process data in chunks
- Use a machine with more RAM

### Performance Issues
To speed up training:
- Reduce `n_estimators` (trade-off: lower accuracy)
- Decrease `max_depth`
- Use fewer features
- Set `n_jobs=-1` for Random Forest models

### Data Path Issues
Ensure you run scripts from the `ai_model/` directory:
```bash
cd ai_model
python complete_ml_pipeline.py
```

File paths are relative: `../data/filename.csv`

## 📚 Additional Resources

- **[Main README](../README.md)**: Project overview
- **[DATA_DICTIONARY.md](../DATA_DICTIONARY.md)**: Data field descriptions
- **[ML_MODELS_GUIDE.md](../ML_MODELS_GUIDE.md)**: Detailed model documentation

## 🤝 Contributing

To add new models or features:

1. Follow existing code structure
2. Add comprehensive comments
3. Include evaluation metrics
4. Update documentation
5. Test thoroughly before committing

## 📝 Notes

- All models use `random_state=42` for reproducibility
- Missing values are handled automatically
- Categorical variables are label-encoded
- Models are trained on 80% of data, tested on 20%
- Cross-validation can be added for more robust evaluation

---

**Questions?** Check the main README or open an issue on GitHub.
