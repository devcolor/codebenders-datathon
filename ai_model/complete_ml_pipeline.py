"""
Complete ML Pipeline for KCTCS Student Success Prediction
==========================================================
Models:
1. Retention Prediction (Binary Classification)
2. Early Warning System (Binary Classification)
3. Time-to-Credential Prediction (Regression)
4. Credential Type Prediction (Multi-class Classification)
5. Course Success Prediction (Regression)

Output: Predictions added to kctcs_merged_with_zip.csv
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    roc_auc_score, confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import xgboost as xgb
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("COMPLETE ML PIPELINE FOR STUDENT SUCCESS PREDICTION")
print("=" * 80)
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# ============================================================================
# STEP 1: DATA LOADING AND PREPARATION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 1: DATA LOADING")
print("=" * 80)

print("\nLoading student-level dataset...")
df = pd.read_csv('../data/kctcs_student_level_with_zip.csv')
print(f"Loaded {len(df):,} students with {len(df.columns)} features")

# ============================================================================
# STEP 2: FEATURE ENGINEERING
# ============================================================================
print("\n" + "=" * 80)
print("STEP 2: FEATURE ENGINEERING")
print("=" * 80)

# Create target variables
print("\nCreating target variables...")

# 1. Retention (already exists)
df['target_retention'] = df['Retention'].fillna(0).astype(int)

# 2. Early Warning - At Risk Flag
df['target_at_risk'] = (
    (df['Retention'] == 0) | 
    (df['Persistence'] == 0) | 
    (df['average_grade'] < 2.0) |
    (df['course_completion_rate'] < 0.6)
).astype(int)

# 3. Time to Credential - calculate from all credential fields
def calculate_time_to_credential(row):
    """
    Calculate minimum time to any credential from all fields
    Includes completions at cohort AND other institutions
    """
    times = []
    
    # Bachelor's
    bachelor_cohort = row.get('Years_to_Bachelors_at_cohort_inst_', 0)
    bachelor_other = row.get('Years_to_Bachelor_at_other_inst_', 0)
    if pd.notna(bachelor_cohort) and bachelor_cohort > 0:
        times.append(bachelor_cohort)
    if pd.notna(bachelor_other) and bachelor_other > 0:
        times.append(bachelor_other)
    
    # Associate's/Certificate
    assoc_cert_cohort = row.get('Years_to_Associates_or_Certificate_at_cohort_inst_', 0)
    assoc_cert_other = row.get('Years_to_Associates_or_Certificate_at_other_inst_', 0)
    if pd.notna(assoc_cert_cohort) and assoc_cert_cohort > 0:
        times.append(assoc_cert_cohort)
    if pd.notna(assoc_cert_other) and assoc_cert_other > 0:
        times.append(assoc_cert_other)
    
    # Return minimum time (first credential) or 99 if no credential
    return min(times) if times else 99

df['target_time_to_credential'] = df.apply(calculate_time_to_credential, axis=1)

# 4. Credential Type (multi-class)
def assign_credential_type(row):
    """
    Assign credential type based on outcome variables
    Updated logic: 0.0 means "not applicable", only values > 0 indicate completion
    """
    # Priority 1: Bachelor's degree (highest credential)
    # Check if value exists AND is > 0 (0.0 means not applicable)
    bachelor_cohort = row.get('Years_to_Bachelors_at_cohort_inst_', 0)
    bachelor_other = row.get('Years_to_Bachelor_at_other_inst_', 0)
    if (pd.notna(bachelor_cohort) and bachelor_cohort > 0) or \
       (pd.notna(bachelor_other) and bachelor_other > 0):
        return 3  # Bachelor's
    
    # Priority 2: Check specific Associate's completion
    assoc_cohort = row.get('Years_to_Latest_Associates_at_Cohort_Inst', 0)
    assoc_other = row.get('Years_to_Latest_Associates_at_Other_Inst', 0)
    if (pd.notna(assoc_cohort) and assoc_cohort > 0) or \
       (pd.notna(assoc_other) and assoc_other > 0):
        return 2  # Associate's (confirmed)
    
    # Priority 3: Check specific Certificate completion  
    cert_cohort = row.get('Years_to_Latest_Certificate_at_Cohort_Inst', 0)
    cert_other = row.get('Years_to_Latest_Certificate_at_Other_Inst', 0)
    if (pd.notna(cert_cohort) and cert_cohort > 0) or \
       (pd.notna(cert_other) and cert_other > 0):
        return 1  # Certificate (confirmed)
    
    # Priority 4: Associate's/Certificate combo field (when specific type not given)
    # Check if value > 0 (0.0 means not applicable)
    assoc_cert_cohort = row.get('Years_to_Associates_or_Certificate_at_cohort_inst_', 0)
    assoc_cert_other = row.get('Years_to_Associates_or_Certificate_at_other_inst_', 0)
    
    if (pd.notna(assoc_cert_cohort) and assoc_cert_cohort > 0) or \
       (pd.notna(assoc_cert_other) and assoc_cert_other > 0):
        # Try to infer from credential sought
        credential_sought = str(row.get('Credential_Type_Sought_Year_1', ''))
        if credential_sought in ['01', '02', '03', 'C1', 'C2']:  # Certificate codes
            return 1  # Certificate
        else:
            return 2  # Default to Associate's (most common at community colleges)
    
    # No credential completed
    return 0  # No credential

df['target_credential_type'] = df.apply(assign_credential_type, axis=1)

print(f"Created target variables:")
print(f"  - Retention: {df['target_retention'].value_counts().to_dict()}")
print(f"  - At Risk: {df['target_at_risk'].value_counts().to_dict()}")
print(f"  - Credential Type: {df['target_credential_type'].value_counts().to_dict()}")

# Define feature sets for different models
print("\nDefining feature sets...")

# Base features (always used)
demographic_features = [
    'Student_Age', 'Race', 'Ethnicity', 'Gender', 'First_Gen',
    'Pell_Status_First_Year', 'zip_code'
]

academic_prep_features = [
    'Math_Placement', 'English_Placement', 'Reading_Placement',
    'Credential_Type_Sought_Year_1'
]

enrollment_features = [
    'Enrollment_Type', 'Enrollment_Intensity_First_Term',
    'Attendance_Status_Term_1', 'Cohort_Term'
]

# Engineered course features
course_features = [
    'total_courses_enrolled', 'unique_course_prefixes',
    'total_credits_attempted', 'total_credits_earned',
    'avg_credits_per_course', 'course_completion_rate',
    'average_grade', 'passing_rate', 'failing_grades_count',
    'pct_online', 'gateway_math_courses', 'gateway_english_courses'
]

performance_features = [
    'GPA_Group_Year_1', 'Number_of_Credits_Earned_Year_1',
    'CompletedGatewayMathYear1', 'CompletedGatewayEnglishYear1'
]

# Combine for retention model
retention_features = (
    demographic_features + academic_prep_features + 
    enrollment_features + course_features + performance_features
)

print(f"Selected {len(retention_features)} features for modeling")

# ============================================================================
# STEP 3: DATA PREPROCESSING
# ============================================================================
print("\n" + "=" * 80)
print("STEP 3: DATA PREPROCESSING")
print("=" * 80)

def preprocess_features(df, feature_list):
    """Preprocess features: handle missing values and encode categoricals"""
    df_processed = df[feature_list].copy()
    
    # Handle missing values
    for col in df_processed.columns:
        if df_processed[col].dtype == 'object':
            df_processed[col] = df_processed[col].fillna('Unknown')
        else:
            df_processed[col] = df_processed[col].fillna(df_processed[col].median())
    
    # Encode categorical variables
    label_encoders = {}
    for col in df_processed.columns:
        if df_processed[col].dtype == 'object':
            le = LabelEncoder()
            df_processed[col] = le.fit_transform(df_processed[col].astype(str))
            label_encoders[col] = le
    
    return df_processed, label_encoders

print("\nPreprocessing features...")
X, label_encoders = preprocess_features(df, retention_features)
print(f"Preprocessed {X.shape[1]} features")
print(f"Encoded {len(label_encoders)} categorical variables")

# ============================================================================
# STEP 4: MODEL 1 - RETENTION PREDICTION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 4: MODEL 1 - RETENTION PREDICTION")
print("=" * 80)

y_retention = df['target_retention']

# Remove samples with missing target
valid_idx = y_retention.notna()
X_retention = X[valid_idx]
y_retention = y_retention[valid_idx]

print(f"\nDataset size: {len(X_retention):,} students")
print(f"Retention distribution: {y_retention.value_counts().to_dict()}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_retention, y_retention, test_size=0.2, random_state=42, stratify=y_retention
)
print(f"Training set: {len(X_train):,} | Test set: {len(X_test):,}")

# Train XGBoost model
print("\nTraining XGBoost classifier...")
retention_model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    random_state=42,
    eval_metric='logloss'
)
retention_model.fit(X_train, y_train)
print("Model trained")

# Predictions
y_pred = retention_model.predict(X_test)
y_pred_proba = retention_model.predict_proba(X_test)[:, 1]

# Store for summary report
retention_test_results = {
    'accuracy': accuracy_score(y_test, y_pred),
    'precision': precision_score(y_test, y_pred),
    'recall': recall_score(y_test, y_pred),
    'f1': f1_score(y_test, y_pred),
    'auc_roc': roc_auc_score(y_test, y_pred_proba),
    'y_test': y_test,
    'y_pred': y_pred,
    'y_pred_proba': y_pred_proba
}

# Evaluation
print("\n" + "-" * 80)
print("RETENTION MODEL EVALUATION")
print("-" * 80)
print(f"Accuracy:  {retention_test_results['accuracy']:.4f}")
print(f"Precision: {retention_test_results['precision']:.4f}")
print(f"Recall:    {retention_test_results['recall']:.4f}")
print(f"F1-Score:  {retention_test_results['f1']:.4f}")
print(f"AUC-ROC:   {retention_test_results['auc_roc']:.4f}")

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(f"                Predicted")
print(f"              Not Ret  Retained")
print(f"Actual Not    {cm[0,0]:6d}    {cm[0,1]:6d}")
print(f"       Ret    {cm[1,0]:6d}    {cm[1,1]:6d}")

# Feature importance
print("\nTop 10 Most Important Features:")
feature_importance = pd.DataFrame({
    'feature': retention_features,
    'importance': retention_model.feature_importances_
}).sort_values('importance', ascending=False)

for i, row in feature_importance.head(10).iterrows():
    print(f"  {row['feature']:40s} {row['importance']:.4f}")

# Generate predictions for full dataset
print("\nGenerating predictions for all students...")
X_full_retention, _ = preprocess_features(df, retention_features)
df['retention_probability'] = retention_model.predict_proba(X_full_retention)[:, 1]
df['retention_prediction'] = retention_model.predict(X_full_retention)

# Risk categories
df['retention_risk_category'] = pd.cut(
    df['retention_probability'],
    bins=[0, 0.25, 0.50, 0.75, 1.0],
    labels=['Critical Risk', 'High Risk', 'Moderate Risk', 'Low Risk']
)

print(f"Predictions generated for all {len(df):,} students")

# ============================================================================
# STEP 5: MODEL 2 - EARLY WARNING SYSTEM (ALIGNED WITH RETENTION)
# ============================================================================
print("\n" + "=" * 80)
print("STEP 5: MODEL 2 - EARLY WARNING SYSTEM (ALIGNED WITH RETENTION)")
print("=" * 80)

print("\nCalculating risk scores based on multiple factors...")
print("Note: Using retention probability + performance metrics for consistency")

def calculate_risk_score(row):
    """
    Calculate comprehensive risk score (0-100) based on multiple factors
    Ensures consistency with retention predictions
    """
    retention_prob = row['retention_probability']
    avg_grade = row.get('average_grade', np.nan)
    completion_rate = row.get('course_completion_rate', np.nan)
    credits_earned = row.get('total_credits_earned', 0)
    
    # Initialize risk score (0 = no risk, 100 = extreme risk)
    risk_score = 0
    
    # Factor 1: Retention probability (inverted - low retention = high risk)
    # This is the PRIMARY factor (50% weight)
    retention_risk = (1 - retention_prob) * 100
    risk_score += retention_risk * 0.50
    
    # Factor 2: GPA risk (20% weight)
    if pd.notna(avg_grade):
        if avg_grade < 2.0:
            risk_score += 20  # Major academic risk
        elif avg_grade < 2.5:
            risk_score += 10  # Moderate academic risk
        elif avg_grade < 3.0:
            risk_score += 3   # Minor academic risk
        # GPA >= 3.0 adds no additional risk
    
    # Factor 3: Completion rate risk (20% weight)
    if pd.notna(completion_rate):
        if completion_rate < 0.5:
            risk_score += 20  # Major completion issue
        elif completion_rate < 0.7:
            risk_score += 10  # Moderate completion issue
        elif completion_rate < 0.85:
            risk_score += 5   # Minor completion issue
    
    # Factor 4: Credit progress risk (10% weight)
    if credits_earned < 6:
        risk_score += 10  # Very low progress
    elif credits_earned < 12:
        risk_score += 5   # Low progress
    
    # Cap at 100
    risk_score = min(risk_score, 100)
    
    return risk_score

# Calculate risk scores for all students
df['risk_score'] = df.apply(calculate_risk_score, axis=1)

# Assign alert levels based on risk score
def assign_alert_level(risk_score):
    """Assign alert level based on risk score"""
    if risk_score >= 75:
        return 'URGENT'
    elif risk_score >= 50:
        return 'HIGH'
    elif risk_score >= 25:
        return 'MODERATE'
    else:
        return 'LOW'

df['at_risk_alert'] = df['risk_score'].apply(assign_alert_level)
df['at_risk_probability'] = df['risk_score'] / 100
df['at_risk_prediction'] = (df['risk_score'] >= 50).astype(int)

print("Risk scores calculated using composite approach")

# Validation - check for contradictions
print("\n" + "-" * 80)
print("VALIDATION: CHECKING FOR CONTRADICTIONS")
print("-" * 80)

# Check students with high retention but flagged as urgent
high_retention_urgent = df[(df['retention_probability'] > 0.8) & (df['at_risk_alert'] == 'URGENT')]
print(f"Students with >80% retention flagged as URGENT: {len(high_retention_urgent)} (should be very few)")

# Check students with low retention but flagged as low risk
low_retention_low_risk = df[(df['retention_probability'] < 0.3) & (df['at_risk_alert'] == 'LOW')]
print(f"Students with <30% retention flagged as LOW: {len(low_retention_low_risk)} (should be very few)")

print(f"\nEarly warning system aligned with retention predictions")
print(f"\nAlert distribution:")
print(df['at_risk_alert'].value_counts().sort_index())

# ============================================================================
# STEP 6: MODEL 3 - TIME TO CREDENTIAL PREDICTION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 6: MODEL 3 - TIME TO CREDENTIAL PREDICTION")
print("=" * 80)

# Filter to students who completed a credential
y_time = df['target_time_to_credential']
valid_idx = (y_time < 99) & (y_time > 0)  # Has credential and valid time
X_time = X[valid_idx]
y_time = y_time[valid_idx]

print(f"\nDataset size: {len(X_time):,} students with credentials")
print(f"Time to credential stats: Mean={y_time.mean():.2f}, Median={y_time.median():.2f}")

if len(X_time) > 100:  # Only train if we have enough data
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_time, y_time, test_size=0.2, random_state=42
    )
    
    # Train XGBoost regressor
    print("\nTraining XGBoost regressor...")
    time_model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=42
    )
    time_model.fit(X_train, y_train)
    print("Model trained")
    
    # Predictions
    y_pred = time_model.predict(X_test)
    
    # Evaluation
    print("\n" + "-" * 80)
    print("TIME TO CREDENTIAL MODEL EVALUATION")
    print("-" * 80)
    print(f"RMSE:      {np.sqrt(mean_squared_error(y_test, y_pred)):.4f} years")
    print(f"MAE:       {mean_absolute_error(y_test, y_pred):.4f} years")
    print(f"R² Score:  {r2_score(y_test, y_pred):.4f}")
    
    # Generate predictions for all students
    print("\nGenerating time-to-credential predictions...")
    df['predicted_time_to_credential'] = time_model.predict(X_full_retention)
    df['predicted_graduation_year'] = df['Cohort'].str[:4].astype(float) + df['predicted_time_to_credential']
    
    print(f"Time predictions generated")
else:
    print("Warning: Insufficient data for time-to-credential model")
    df['predicted_time_to_credential'] = np.nan
    df['predicted_graduation_year'] = np.nan

# ============================================================================
# STEP 7: MODEL 4 - CREDENTIAL TYPE PREDICTION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 7: MODEL 4 - CREDENTIAL TYPE PREDICTION")
print("=" * 80)

y_credential = df['target_credential_type']
valid_idx = y_credential.notna()
X_cred = X[valid_idx]
y_credential = y_credential[valid_idx]

print(f"\nDataset size: {len(X_cred):,} students")
print(f"Credential type distribution:")
cred_labels = {0: 'No Credential', 1: 'Certificate', 2: 'Associate', 3: 'Bachelor'}
for k, v in y_credential.value_counts().sort_index().items():
    print(f"  {cred_labels.get(k, k)}: {v:,} ({v/len(y_credential)*100:.1f}%)")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_cred, y_credential, test_size=0.2, random_state=42, stratify=y_credential
)

# Train Random Forest multi-class classifier
print("\nTraining Random Forest multi-class classifier...")
credential_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)
credential_model.fit(X_train, y_train)
print("Model trained")

# Predictions
y_pred = credential_model.predict(X_test)

# Evaluation
print("\n" + "-" * 80)
print("CREDENTIAL TYPE MODEL EVALUATION")
print("-" * 80)
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Macro F1:  {f1_score(y_test, y_pred, average='macro'):.4f}")

print("\nPer-Class Performance:")
for i in sorted(y_credential.unique()):
    mask = y_test == i
    if mask.sum() > 0:
        acc = accuracy_score(y_test[mask], y_pred[mask])
        print(f"  {cred_labels.get(i, i):20s} Accuracy: {acc:.4f}")

# Generate predictions for all students
print("\nGenerating credential type predictions...")
df['predicted_credential_type'] = credential_model.predict(X_full_retention)
df['predicted_credential_label'] = df['predicted_credential_type'].map(cred_labels)

# Get probabilities for each class (only for classes that exist)
proba = credential_model.predict_proba(X_full_retention)
classes = credential_model.classes_
prob_labels = ['prob_no_credential', 'prob_certificate', 'prob_associate', 'prob_bachelor']

# Initialize all probability columns with 0
for label in prob_labels:
    df[label] = 0.0

# Fill in probabilities for classes that exist
for i, class_idx in enumerate(classes):
    if class_idx < len(prob_labels):
        df[prob_labels[int(class_idx)]] = proba[:, i]

print(f"Credential type predictions generated")

# ============================================================================
# STEP 8: MODEL 5 - COURSE SUCCESS (GRADE PREDICTION)
# ============================================================================
print("\n" + "=" * 80)
print("STEP 8: MODEL 5 - COURSE SUCCESS PREDICTION")
print("=" * 80)

y_grade = df['average_grade']
valid_idx = y_grade.notna()
X_grade = X[valid_idx]
y_grade = y_grade[valid_idx]

print(f"\nDataset size: {len(X_grade):,} students with grades")
print(f"Grade stats: Mean={y_grade.mean():.2f}, Median={y_grade.median():.2f}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_grade, y_grade, test_size=0.2, random_state=42
)

# Train Random Forest regressor
print("\nTraining Random Forest regressor for grade prediction...")
grade_model = RandomForestRegressor(
    n_estimators=200,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)
grade_model.fit(X_train, y_train)
print("Model trained")

# Predictions
y_pred = grade_model.predict(X_test)

# Evaluation
print("\n" + "-" * 80)
print("COURSE SUCCESS (GRADE) MODEL EVALUATION")
print("-" * 80)
print(f"RMSE:      {np.sqrt(mean_squared_error(y_test, y_pred)):.4f} GPA points")
print(f"MAE:       {mean_absolute_error(y_test, y_pred):.4f} GPA points")
print(f"R² Score:  {r2_score(y_test, y_pred):.4f}")

# Generate predictions for all students
print("\nGenerating grade predictions...")
df['predicted_gpa'] = grade_model.predict(X_full_retention)
df['gpa_performance'] = df.apply(
    lambda row: 'Above Expected' if pd.notna(row['average_grade']) and row['average_grade'] > row['predicted_gpa'] + 0.2
                else ('Below Expected' if pd.notna(row['average_grade']) and row['average_grade'] < row['predicted_gpa'] - 0.2
                else 'As Expected'),
    axis=1
)

print(f"Grade predictions generated")

# ============================================================================
# STEP 9: SAVE PREDICTIONS TO STUDENT-LEVEL FILE
# ============================================================================
print("\n" + "=" * 80)
print("STEP 9: SAVING PREDICTIONS TO STUDENT-LEVEL FILE")
print("=" * 80)

# Select prediction columns to save
prediction_columns = [
    'Student_GUID',
    'retention_probability', 'retention_prediction', 'retention_risk_category',
    'at_risk_probability', 'at_risk_prediction', 'at_risk_alert', 'risk_score',
    'predicted_time_to_credential', 'predicted_graduation_year',
    'predicted_credential_type', 'predicted_credential_label',
    'prob_no_credential', 'prob_certificate', 'prob_associate', 'prob_bachelor',
    'predicted_gpa', 'gpa_performance'
]

predictions_df = df[prediction_columns].copy()

# Save student-level predictions
output_file = '../data/kctcs_student_level_with_predictions.csv'
df.to_csv(output_file, index=False)
print(f"Saved student-level predictions to: {output_file}")
print(f"  Records: {len(df):,}")
print(f"  Columns: {len(df.columns)} (original + {len(prediction_columns)-1} prediction columns)")

# ============================================================================
# STEP 10: MERGE PREDICTIONS WITH COURSE-LEVEL FILE
# ============================================================================
print("\n" + "=" * 80)
print("STEP 10: MERGING PREDICTIONS WITH COURSE-LEVEL FILE")
print("=" * 80)

print("\nLoading course-level merged file...")
merged_df = pd.read_csv('../data/kctcs_merged_with_zip.csv')
print(f"Loaded {len(merged_df):,} course records")

print("\nMerging predictions...")
# Merge predictions onto course-level data
merged_with_predictions = pd.merge(
    merged_df,
    predictions_df,
    on='Student_GUID',
    how='left'
)

output_file = '../data/kctcs_merged_with_predictions.csv'
merged_with_predictions.to_csv(output_file, index=False)
print(f"Saved course-level data with predictions to: {output_file}")
print(f"  Records: {len(merged_with_predictions):,}")
print(f"  Columns: {len(merged_with_predictions.columns)}")

# ============================================================================
# STEP 11: GENERATE SUMMARY REPORT
# ============================================================================
print("\n" + "=" * 80)
print("STEP 11: SUMMARY REPORT")
print("=" * 80)

summary_report = f"""
KCTCS ML PIPELINE - SUMMARY REPORT
{'=' * 80}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

DATASET OVERVIEW
{'-' * 80}
Total Students: {len(df):,}
Total Course Records: {len(merged_with_predictions):,}

MODEL PERFORMANCE SUMMARY
{'-' * 80}

1. RETENTION PREDICTION MODEL
   Algorithm: XGBoost Classifier
   Features Used: {len(retention_features)}
   Test Set Performance:
     - Accuracy: {retention_test_results['accuracy']:.4f}
     - AUC-ROC: {retention_test_results['auc_roc']:.4f}
   
   Risk Distribution:
"""

for cat in ['Critical Risk', 'High Risk', 'Moderate Risk', 'Low Risk']:
    count = (df['retention_risk_category'] == cat).sum()
    pct = count / len(df) * 100
    summary_report += f"     {cat:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
2. EARLY WARNING SYSTEM
   Algorithm: Composite Risk Score (Retention + Performance Metrics)
   Approach: Aligned with retention predictions to eliminate contradictions
   Alert Distribution:
"""

for alert in ['URGENT', 'HIGH', 'MODERATE', 'LOW']:
    count = (df['at_risk_alert'] == alert).sum()
    pct = count / len(df) * 100
    summary_report += f"     {alert:10s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
3. TIME TO CREDENTIAL PREDICTION
   Algorithm: XGBoost Regressor
   Mean Predicted Time: {df['predicted_time_to_credential'].mean():.2f} years
   Median Predicted Time: {df['predicted_time_to_credential'].median():.2f} years

4. CREDENTIAL TYPE PREDICTION
   Algorithm: Random Forest Classifier
   Predicted Distribution:
"""

for cred_type in df['predicted_credential_label'].value_counts().items():
    count = cred_type[1]
    pct = count / len(df) * 100
    summary_report += f"     {cred_type[0]:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
5. COURSE SUCCESS (GPA) PREDICTION
   Algorithm: Random Forest Regressor
   Mean Predicted GPA: {df['predicted_gpa'].mean():.2f}
   
   Performance vs. Expected:
"""

for perf in df['gpa_performance'].value_counts().items():
    count = perf[1]
    pct = count / len(df) * 100
    summary_report += f"     {perf[0]:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
OUTPUT FILES
{'-' * 80}
1. kctcs_student_level_with_predictions.csv
   - Student-level data with all predictions
   - {len(df):,} students
   - {len(df.columns)} columns

2. kctcs_merged_with_predictions.csv
   - Course-level data with predictions
   - {len(merged_with_predictions):,} records
   - {len(merged_with_predictions.columns)} columns

PREDICTION COLUMNS ADDED
{'-' * 80}
Retention:
  - retention_probability (0-1 scale)
  - retention_prediction (0=Not Retained, 1=Retained)
  - retention_risk_category (Critical/High/Moderate/Low Risk)

Early Warning:
  - at_risk_probability (0-1 scale)
  - at_risk_prediction (0=Not At Risk, 1=At Risk)
  - at_risk_alert (URGENT/HIGH/MODERATE/LOW)
  - risk_score (0-100 comprehensive risk score)

Time to Credential:
  - predicted_time_to_credential (years)
  - predicted_graduation_year (year)

Credential Type:
  - predicted_credential_type (0-3 numeric)
  - predicted_credential_label (text label)
  - prob_no_credential, prob_certificate, prob_associate, prob_bachelor

Course Success:
  - predicted_gpa (0-4 scale)
  - gpa_performance (Above/Below/As Expected)

{'=' * 80}
PIPELINE COMPLETE!
{'=' * 80}
"""

print(summary_report)

# Save report to file
report_file = 'ML_PIPELINE_REPORT.txt'
with open(report_file, 'w') as f:
    f.write(summary_report)
print(f"\nDetailed report saved to: {report_file}")

print("\n" + "=" * 80)
print("ALL MODELS TRAINED AND PREDICTIONS GENERATED!")
print("=" * 80)
print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nReady for analysis and deployment!")
print("=" * 80)

