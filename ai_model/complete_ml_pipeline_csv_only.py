"""
Complete ML Pipeline for KCTCS Student Success Prediction (CSV Output Only)
==========================================================
Models:
1. Retention Prediction (Binary Classification)
2. Early Warning System (Composite Risk Score)
3. Time-to-Credential Prediction (Regression)
4. Credential Type Prediction (Multi-class Classification)
5. Gateway Math Success Prediction (Binary Classification)
6. Gateway English Success Prediction (Binary Classification)
7. Low GPA Risk Prediction (Binary Classification)
8. GPA Prediction (Regression)

Output: Predictions saved to CSV files (no database writing)
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    roc_auc_score, confusion_matrix, mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import xgboost as xgb
from datetime import datetime
import warnings
import os
warnings.filterwarnings('ignore')

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')

print("=" * 80)
print("COMPLETE ML PIPELINE FOR STUDENT SUCCESS PREDICTION (CSV OUTPUT)")
print("=" * 80)
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
print(f"Project Root: {PROJECT_ROOT}")
print(f"Data Directory: {DATA_DIR}")
print("\nNote: This version writes all outputs to CSV files only (no database)")

# ============================================================================
# STEP 1: DATA LOADING AND PREPARATION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 1: DATA LOADING")
print("=" * 80)

print("\nLoading student-level dataset...")
student_file = os.path.join(DATA_DIR, 'kctcs_student_level_with_zip.csv')
print(f"Reading from: {student_file}")
df = pd.read_csv(student_file)
print(f"Loaded {len(df):,} students with {len(df.columns)} features")

# Convert Institution_ID to string to prevent comma formatting
if 'Institution_ID' in df.columns:
    df['Institution_ID'] = df['Institution_ID'].astype(str).str.replace(',', '').str.replace(' ', '')
    print("Converted Institution_ID to string format (no commas or spaces)")

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

print("Created target variables:")
print(f"  - Retention: {df['target_retention'].value_counts().to_dict()}")
print(f"  - At Risk: {df['target_at_risk'].value_counts().to_dict()}")
print(f"  - Credential Type: {df['target_credential_type'].value_counts().to_dict()}")

# Define feature sets for different models
print("\nDefining feature sets...")

# Base features - REDUCED SET to prevent overfitting
demographic_features = [
    'Student_Age', 'Race', 'Ethnicity', 'Gender', 'First_Gen',
    'Pell_Status_First_Year'  # Removed zip_code
]

academic_prep_features = [
    'Math_Placement', 'English_Placement', 'Reading_Placement',
    'Credential_Type_Sought_Year_1'
]

enrollment_features = [
    'Enrollment_Type', 'Enrollment_Intensity_First_Term',
    'Cohort_Term'  # Removed Attendance_Status_Term_1
]

# Most important course features only (reduced to prevent overfitting)
course_features = [
    'total_credits_attempted', 'total_credits_earned',
    'course_completion_rate', 'average_grade',
    'gateway_math_courses', 'gateway_english_courses'
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

print(f"Selected {len(retention_features)} features for modeling (reduced from 31 to prevent overfitting)")

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

# ============================================================================
# IMPROVED: Test multiple models with regularization to prevent overfitting
# ============================================================================
print("\n" + "-" * 80)
print("TESTING MULTIPLE MODELS WITH CROSS-VALIDATION")
print("-" * 80)

from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.model_selection import StratifiedKFold  # noqa: E402

models_to_test = {
    'Logistic Regression': LogisticRegression(
        max_iter=1000,
        C=0.1,  # Strong regularization
        random_state=42
    ),
    'Random Forest (Simple)': RandomForestClassifier(
        n_estimators=50,
        max_depth=4,
        min_samples_split=50,
        min_samples_leaf=20,
        random_state=42,
        n_jobs=-1
    ),
    'XGBoost (Regularized)': xgb.XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=1.0,
        reg_lambda=1.0,
        random_state=42,
        eval_metric='logloss'
    )
}

best_model = None
best_model_name = None
best_cv_score = 0
model_comparison = []

for model_name, model in models_to_test.items():
    print(f"\nTesting {model_name}...")
    
    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc')
    cv_mean = cv_scores.mean()
    cv_std = cv_scores.std()
    
    # Train on full training set
    model.fit(X_train, y_train)
    
    # Evaluate on test set
    y_test_pred_proba = model.predict_proba(X_test)[:, 1]
    test_auc = roc_auc_score(y_test, y_test_pred_proba)
    
    # Evaluate on training set
    y_train_pred_proba = model.predict_proba(X_train)[:, 1]
    train_auc = roc_auc_score(y_train, y_train_pred_proba)
    
    # Calculate overfitting gap
    gap = train_auc - test_auc
    
    print(f"  CV AUC-ROC:   {cv_mean:.4f} (± {cv_std:.4f})")
    print(f"  Train AUC:    {train_auc:.4f}")
    print(f"  Test AUC:     {test_auc:.4f}")
    print(f"  Gap:          {gap:.4f} ({gap*100:.2f}%)")
    
    if gap < 0.05:
        print("  ✓ No overfitting (gap < 5%)")
    elif gap < 0.10:
        print("  ⚠ Minimal overfitting (gap < 10%)")
    else:
        print("  ✗ Overfitting detected (gap > 10%)")
    
    model_comparison.append({
        'Model': model_name,
        'CV_AUC': cv_mean,
        'CV_Std': cv_std,
        'Train_AUC': train_auc,
        'Test_AUC': test_auc,
        'Gap': gap,
        'Gap_%': gap * 100
    })
    
    # Select model with best CV score
    if cv_mean > best_cv_score:
        best_cv_score = cv_mean
        best_model = model
        best_model_name = model_name

print("\n" + "-" * 80)
print(f"BEST MODEL SELECTED: {best_model_name}")
print(f"CV AUC-ROC: {best_cv_score:.4f}")
print("-" * 80)

# Save comparison
comparison_df = pd.DataFrame(model_comparison)
comparison_file = os.path.join(DATA_DIR, 'model_comparison_results.csv')
comparison_df.to_csv(comparison_file, index=False)
print(f"Model comparison saved to: {comparison_file}")

# Use best model for predictions
retention_model = best_model

# Final evaluation with best model
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
print("FINAL RETENTION MODEL EVALUATION (Test Set)")
print("-" * 80)
print(f"Accuracy:  {retention_test_results['accuracy']:.4f}")
print(f"Precision: {retention_test_results['precision']:.4f}")
print(f"Recall:    {retention_test_results['recall']:.4f}")
print(f"F1-Score:  {retention_test_results['f1']:.4f}")
print(f"AUC-ROC:   {retention_test_results['auc_roc']:.4f}")

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print("                Predicted")
print("              Not Ret  Retained")
print(f"Actual Not    {cm[0,0]:6d}    {cm[0,1]:6d}")
print(f"       Ret    {cm[1,0]:6d}    {cm[1,1]:6d}")

# Feature importance (if available)
if hasattr(retention_model, 'feature_importances_'):
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

print("\nEarly warning system aligned with retention predictions")
print("\nAlert distribution:")
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
    
    # Train simpler model to prevent overfitting
    print("\nTraining Random Forest regressor (simplified)...")
    time_model = RandomForestRegressor(
        n_estimators=50,
        max_depth=4,
        min_samples_split=20,
        random_state=42,
        n_jobs=-1
    )
    time_model.fit(X_train, y_train)
    print("Model trained")
    
    # Predictions
    y_pred = time_model.predict(X_test)
    
    # Evaluation
    print("\n" + "-" * 80)
    print("TIME TO CREDENTIAL MODEL EVALUATION")
    print("-" * 80)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"RMSE:      {rmse:.4f} years")
    print(f"MAE:       {mae:.4f} years")
    print(f"R² Score:  {r2:.4f}")
    
    # Generate predictions for all students
    print("\nGenerating time-to-credential predictions...")
    df['predicted_time_to_credential'] = time_model.predict(X_full_retention)
    df['predicted_graduation_year'] = df['Cohort'].str[:4].astype(float) + df['predicted_time_to_credential']
    
    print("Time predictions generated")
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
print("Credential type distribution:")
cred_labels = {0: 'No Credential', 1: 'Certificate', 2: 'Associate', 3: 'Bachelor'}
for k, v in y_credential.value_counts().sort_index().items():
    print(f"  {cred_labels.get(k, k)}: {v:,} ({v/len(y_credential)*100:.1f}%)")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_cred, y_credential, test_size=0.2, random_state=42, stratify=y_credential
)

# Train simpler Random Forest multi-class classifier
print("\nTraining Random Forest multi-class classifier (simplified)...")
credential_model = RandomForestClassifier(
    n_estimators=50,
    max_depth=5,
    min_samples_split=30,
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
cred_accuracy = accuracy_score(y_test, y_pred)
cred_f1 = f1_score(y_test, y_pred, average='macro')
print(f"Accuracy:  {cred_accuracy:.4f}")
print(f"Macro F1:  {cred_f1:.4f}")

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

print("Credential type predictions generated")

# ============================================================================
# STEP 8: MODEL 5 - GATEWAY MATH SUCCESS PREDICTION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 8: MODEL 5 - GATEWAY MATH SUCCESS PREDICTION")
print("=" * 80)

# Create clean feature set WITHOUT gateway-related features (prevent data leakage)
gateway_math_features = [
    # Demographics
    'Student_Age', 'Race', 'Ethnicity', 'Gender', 'First_Gen',
    'Pell_Status_First_Year',
    # Academic prep - MOST IMPORTANT for gateway success
    'Math_Placement', 'English_Placement', 'Reading_Placement',
    'Credential_Type_Sought_Year_1',
    # Enrollment
    'Enrollment_Type', 'Enrollment_Intensity_First_Term', 'Cohort_Term',
    # Course features - EXCLUDE gateway_math_courses (data leakage!)
    'total_credits_attempted',
    'gateway_english_courses',  # Keep English, exclude Math
    # Performance - EXCLUDE CompletedGatewayMathYear1 (target variable!)
    'Number_of_Credits_Earned_Year_1'
]

print(f"\nUsing {len(gateway_math_features)} features (excluded gateway math features to prevent leakage)")

# Preprocess with clean feature set
X_gateway_math_clean, _ = preprocess_features(df, gateway_math_features)

# Convert CompletedGatewayMathYear1 to binary (C=1, others=0)
# Only include students who attempted gateway math (not NaN)
gateway_math_raw = df['CompletedGatewayMathYear1']
valid_idx = gateway_math_raw.notna()
y_gateway_math = (gateway_math_raw[valid_idx] == 'C').astype(int)
X_gateway_math = X_gateway_math_clean[valid_idx]

print(f"\nDataset size: {len(X_gateway_math):,} students")
print(f"Gateway Math completion rate: {y_gateway_math.mean():.1%}")
print(f"Completed: {y_gateway_math.sum():,} | Not Completed: {(len(y_gateway_math) - y_gateway_math.sum()):,}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_gateway_math, y_gateway_math, test_size=0.2, random_state=42, stratify=y_gateway_math
)

# Train model
print("\nTraining XGBoost classifier for gateway math success...")
gateway_math_model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=1.0,
    reg_lambda=1.0,
    random_state=42,
    eval_metric='logloss'
)
gateway_math_model.fit(X_train, y_train)
print("Model trained")

# Predictions
y_pred = gateway_math_model.predict(X_test)
y_pred_proba = gateway_math_model.predict_proba(X_test)[:, 1]

# Evaluation
print("\n" + "-" * 80)
print("GATEWAY MATH SUCCESS MODEL EVALUATION")
print("-" * 80)
math_accuracy = accuracy_score(y_test, y_pred)
math_auc = roc_auc_score(y_test, y_pred_proba)
math_precision = precision_score(y_test, y_pred)
math_recall = recall_score(y_test, y_pred)
math_f1 = f1_score(y_test, y_pred)

print(f"Accuracy:  {math_accuracy:.4f}")
print(f"AUC-ROC:   {math_auc:.4f}")
print(f"Precision: {math_precision:.4f}")
print(f"Recall:    {math_recall:.4f}")
print(f"F1-Score:  {math_f1:.4f}")

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print("                Predicted")
print("              No Pass    Pass")
print(f"Actual No     {cm[0,0]:6d}    {cm[0,1]:6d}")
print(f"       Pass   {cm[1,0]:6d}    {cm[1,1]:6d}")

# Generate predictions for all students
print("\nGenerating gateway math predictions...")
# Use the correct feature set for gateway math predictions
X_full_gateway_math, _ = preprocess_features(df, gateway_math_features)
df['gateway_math_probability'] = gateway_math_model.predict_proba(X_full_gateway_math)[:, 1]
df['gateway_math_prediction'] = gateway_math_model.predict(X_full_gateway_math)
df['gateway_math_risk'] = pd.cut(
    df['gateway_math_probability'],
    bins=[0, 0.4, 0.6, 0.8, 1.0],
    labels=['High Risk', 'Moderate Risk', 'Likely Pass', 'Very Likely Pass']
)

print("Gateway math predictions generated")

# ============================================================================
# STEP 9: MODEL 6 - GATEWAY ENGLISH SUCCESS PREDICTION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 9: MODEL 6 - GATEWAY ENGLISH SUCCESS PREDICTION")
print("=" * 80)

# Create clean feature set WITHOUT gateway-related features (prevent data leakage)
gateway_english_features = [
    # Demographics
    'Student_Age', 'Race', 'Ethnicity', 'Gender', 'First_Gen',
    'Pell_Status_First_Year',
    # Academic prep - MOST IMPORTANT for gateway success
    'Math_Placement', 'English_Placement', 'Reading_Placement',
    'Credential_Type_Sought_Year_1',
    # Enrollment
    'Enrollment_Type', 'Enrollment_Intensity_First_Term', 'Cohort_Term',
    # Course features - EXCLUDE gateway_english_courses (data leakage!)
    'total_credits_attempted',
    'gateway_math_courses',  # Keep Math, exclude English
    # Performance - EXCLUDE CompletedGatewayEnglishYear1 (target variable!)
    'Number_of_Credits_Earned_Year_1'
]

print(f"\nUsing {len(gateway_english_features)} features (excluded gateway English features to prevent leakage)")

# Preprocess with clean feature set
X_gateway_english_clean, _ = preprocess_features(df, gateway_english_features)

# Convert CompletedGatewayEnglishYear1 to binary (C=1, others=0)
# Only include students who attempted gateway English (not NaN)
gateway_english_raw = df['CompletedGatewayEnglishYear1']
valid_idx = gateway_english_raw.notna()
y_gateway_english = (gateway_english_raw[valid_idx] == 'C').astype(int)
X_gateway_english = X_gateway_english_clean[valid_idx]

print(f"\nDataset size: {len(X_gateway_english):,} students")
print(f"Gateway English completion rate: {y_gateway_english.mean():.1%}")
print(f"Completed: {y_gateway_english.sum():,} | Not Completed: {(len(y_gateway_english) - y_gateway_english.sum()):,}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_gateway_english, y_gateway_english, test_size=0.2, random_state=42, stratify=y_gateway_english
)

# Train model
print("\nTraining XGBoost classifier for gateway English success...")
gateway_english_model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=1.0,
    reg_lambda=1.0,
    random_state=42,
    eval_metric='logloss'
)
gateway_english_model.fit(X_train, y_train)
print("Model trained")

# Predictions
y_pred = gateway_english_model.predict(X_test)
y_pred_proba = gateway_english_model.predict_proba(X_test)[:, 1]

# Evaluation
print("\n" + "-" * 80)
print("GATEWAY ENGLISH SUCCESS MODEL EVALUATION")
print("-" * 80)
english_accuracy = accuracy_score(y_test, y_pred)
english_auc = roc_auc_score(y_test, y_pred_proba)
english_precision = precision_score(y_test, y_pred)
english_recall = recall_score(y_test, y_pred)
english_f1 = f1_score(y_test, y_pred)

print(f"Accuracy:  {english_accuracy:.4f}")
print(f"AUC-ROC:   {english_auc:.4f}")
print(f"Precision: {english_precision:.4f}")
print(f"Recall:    {english_recall:.4f}")
print(f"F1-Score:  {english_f1:.4f}")

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print("                Predicted")
print("              No Pass    Pass")
print(f"Actual No     {cm[0,0]:6d}    {cm[0,1]:6d}")
print(f"       Pass   {cm[1,0]:6d}    {cm[1,1]:6d}")

# Generate predictions for all students
print("\nGenerating gateway English predictions...")
# Use the correct feature set for gateway English predictions
X_full_gateway_english, _ = preprocess_features(df, gateway_english_features)
df['gateway_english_probability'] = gateway_english_model.predict_proba(X_full_gateway_english)[:, 1]
df['gateway_english_prediction'] = gateway_english_model.predict(X_full_gateway_english)
df['gateway_english_risk'] = pd.cut(
    df['gateway_english_probability'],
    bins=[0, 0.4, 0.6, 0.8, 1.0],
    labels=['High Risk', 'Moderate Risk', 'Likely Pass', 'Very Likely Pass']
)

print("Gateway English predictions generated")

# ============================================================================
# STEP 10: MODEL 7 - FIRST-SEMESTER GPA < 2.0 PREDICTION
# ============================================================================
print("\n" + "=" * 80)
print("STEP 10: MODEL 7 - FIRST-SEMESTER GPA < 2.0 PREDICTION (NO DATA LEAKAGE)")
print("=" * 80)

# Create target: Low GPA (< 2.0 = academic probation)
df['target_low_gpa'] = (df['GPA_Group_Year_1'] < 2.0).astype(int)

# Create features WITHOUT GPA-derived variables
gpa_features = [
    # Demographics
    'Student_Age', 'Race', 'Ethnicity', 'Gender', 'First_Gen',
    'Pell_Status_First_Year',
    # Academic prep - these predict GPA!
    'Math_Placement', 'English_Placement', 'Reading_Placement',
    'Credential_Type_Sought_Year_1',
    # Enrollment
    'Enrollment_Type', 'Enrollment_Intensity_First_Term', 'Cohort_Term',
    # Course features - REMOVE GPA-derived ones
    'total_credits_attempted',
    'gateway_math_courses', 'gateway_english_courses',
    # Year 1 - REMOVE GPA-derived ones  
    'Number_of_Credits_Earned_Year_1',
    'CompletedGatewayMathYear1', 'CompletedGatewayEnglishYear1'
]

print(f"\nUsing {len(gpa_features)} features (removed GPA-derived features)")
print("Removed: average_grade, GPA_Group_Year_1, course_completion_rate, total_credits_earned")

# Preprocess with new feature set
X_gpa_clean, _ = preprocess_features(df, gpa_features)

y_low_gpa = df['target_low_gpa']
valid_idx = y_low_gpa.notna()
X_gpa = X_gpa_clean[valid_idx]
y_low_gpa = y_low_gpa[valid_idx]

print(f"\nDataset size: {len(X_gpa):,} students")
print(f"Low GPA rate (< 2.0): {y_low_gpa.mean():.1%}")
print(f"Low GPA: {y_low_gpa.sum():,} | Adequate GPA: {(1-y_low_gpa).sum():,}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_gpa, y_low_gpa, test_size=0.2, random_state=42, stratify=y_low_gpa
)

# Train model
print("\nTraining XGBoost classifier for low GPA prediction...")
low_gpa_model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=3,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=1.0,
    reg_lambda=1.0,
    random_state=42,
    eval_metric='logloss'
)
low_gpa_model.fit(X_train, y_train)
print("Model trained")

# Predictions
y_pred = low_gpa_model.predict(X_test)
y_pred_proba = low_gpa_model.predict_proba(X_test)[:, 1]

# Evaluation
print("\n" + "-" * 80)
print("LOW GPA PREDICTION MODEL EVALUATION (No Data Leakage)")
print("-" * 80)
gpa_accuracy = accuracy_score(y_test, y_pred)
gpa_auc = roc_auc_score(y_test, y_pred_proba)
gpa_precision = precision_score(y_test, y_pred)
gpa_recall = recall_score(y_test, y_pred)
gpa_f1 = f1_score(y_test, y_pred)

print(f"Accuracy:  {gpa_accuracy:.4f}")
print(f"AUC-ROC:   {gpa_auc:.4f}")
print(f"Precision: {gpa_precision:.4f}")
print(f"Recall:    {gpa_recall:.4f}")
print(f"F1-Score:  {gpa_f1:.4f}")

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print("                Predicted")
print("              GPA>=2.0  GPA<2.0")
print(f"Actual >=2.0  {cm[0,0]:6d}    {cm[0,1]:6d}")
print(f"       <2.0   {cm[1,0]:6d}    {cm[1,1]:6d}")

# Generate predictions for all students
print("\nGenerating low GPA predictions...")
df['low_gpa_probability'] = low_gpa_model.predict_proba(X_gpa_clean)[:, 1]
df['low_gpa_prediction'] = low_gpa_model.predict(X_gpa_clean)
df['academic_risk_level'] = pd.cut(
    df['low_gpa_probability'],
    bins=[0, 0.2, 0.4, 0.6, 1.0],
    labels=['Low Risk', 'Moderate Risk', 'High Risk', 'Critical Risk']
)

print("Low GPA predictions generated")

# ============================================================================
# STEP 11: MODEL 8 - GPA PREDICTION (CONTINUOUS)
# ============================================================================
print("\n" + "=" * 80)
print("STEP 11: MODEL 8 - GPA PREDICTION (CONTINUOUS)")
print("=" * 80)

# Use same features as retention model (already preprocessed)
print(f"\nUsing {len(retention_features)} features (same as retention model)")

# Target: average_grade (GPA)
# Filter students with valid GPA data and use preprocessed features
valid_gpa_mask = df['average_grade'].notna()
X_gpa = X_full_retention[valid_gpa_mask]
y_gpa = df[valid_gpa_mask]['average_grade'].copy()

print(f"\nDataset size: {len(X_gpa):,} students with grades")
print(f"GPA stats: Mean={y_gpa.mean():.2f}, Median={y_gpa.median():.2f}, Range=[{y_gpa.min():.2f}, {y_gpa.max():.2f}]")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_gpa, y_gpa, test_size=0.2, random_state=42
)

# Train Random Forest regressor (simplified to prevent overfitting)
print("\nTraining Random Forest regressor for GPA prediction...")
gpa_model = RandomForestRegressor(
    n_estimators=100,
    max_depth=8,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1
)
gpa_model.fit(X_train, y_train)
print("Model trained")

# Predictions on test set
y_pred = gpa_model.predict(X_test)

# Evaluation
print("\n" + "-" * 80)
print("GPA PREDICTION MODEL EVALUATION")
print("-" * 80)
gpa_rmse = np.sqrt(mean_squared_error(y_test, y_pred))
gpa_mae = mean_absolute_error(y_test, y_pred)
gpa_r2 = r2_score(y_test, y_pred)
print(f"RMSE:      {gpa_rmse:.4f} GPA points")
print(f"MAE:       {gpa_mae:.4f} GPA points (median error)")
print(f"R² Score:  {gpa_r2:.4f}")

# Interpretation
print(f"\nInterpretation: On average, predictions are ±{gpa_mae:.2f} GPA points from actual.")
print(f"For a 2.5 GPA student, model might predict {2.5-gpa_mae:.2f} to {2.5+gpa_mae:.2f}")

# Generate predictions for all students
print("\nGenerating GPA predictions for all students...")
df['predicted_gpa'] = gpa_model.predict(X_full_retention)

# Create performance categories (Above/As/Below Expected)
df['gpa_performance'] = df.apply(
    lambda row: 'Above Expected' if pd.notna(row['average_grade']) and row['average_grade'] > row['predicted_gpa'] + 0.2
                else ('Below Expected' if pd.notna(row['average_grade']) and row['average_grade'] < row['predicted_gpa'] - 0.2
                else 'As Expected'),
    axis=1
)

print("GPA predictions generated")
print(f"Mean predicted GPA: {df['predicted_gpa'].mean():.2f}")
print("\nPerformance Distribution:")
print(df['gpa_performance'].value_counts().to_string())

# ============================================================================
# STEP 12: SAVE PREDICTIONS TO CSV FILES
# ============================================================================
print("\n" + "=" * 80)
print("STEP 12: SAVING PREDICTIONS TO CSV FILES")
print("=" * 80)

# Save student-level predictions with all columns
output_file = os.path.join(DATA_DIR, 'kctcs_student_level_with_predictions.csv')
df.to_csv(output_file, index=False)
print("\n✓ Saved student-level predictions to CSV:")
print(f"  File: {output_file}")
print(f"  Records: {len(df):,}")
print(f"  Columns: {len(df.columns)}")

# ============================================================================
# STEP 13: MERGE PREDICTIONS WITH COURSE-LEVEL FILE
# ============================================================================
print("\n" + "=" * 80)
print("STEP 13: MERGING PREDICTIONS WITH COURSE-LEVEL FILE")
print("=" * 80)

# Select prediction columns to merge
prediction_columns = [
    'Student_GUID',
    'retention_probability', 'retention_prediction', 'retention_risk_category',
    'at_risk_probability', 'at_risk_prediction', 'at_risk_alert', 'risk_score',
    'predicted_time_to_credential', 'predicted_graduation_year',
    'predicted_credential_type', 'predicted_credential_label',
    'prob_no_credential', 'prob_certificate', 'prob_associate', 'prob_bachelor',
    'gateway_math_probability', 'gateway_math_prediction', 'gateway_math_risk',
    'gateway_english_probability', 'gateway_english_prediction', 'gateway_english_risk',
    'low_gpa_probability', 'low_gpa_prediction', 'academic_risk_level',
    'predicted_gpa', 'gpa_performance'
]

predictions_df = df[prediction_columns].copy()

print("\nLoading course-level merged file...")
merged_file = os.path.join(DATA_DIR, 'kctcs_merged_with_zip.csv')
print(f"Reading from: {merged_file}")
merged_df = pd.read_csv(merged_file)
print(f"Loaded {len(merged_df):,} course records")

# Convert Institution_ID to string to prevent comma formatting
if 'Institution_ID' in merged_df.columns:
    merged_df['Institution_ID'] = merged_df['Institution_ID'].astype(str).str.replace(',', '').str.replace(' ', '')
    print("Converted Institution_ID to string format (no commas or spaces)")

print("\nMerging predictions...")
# Merge predictions onto course-level data
merged_with_predictions = pd.merge(
    merged_df,
    predictions_df,
    on='Student_GUID',
    how='left'
)

# Save course-level predictions
output_file = os.path.join(DATA_DIR, 'kctcs_merged_with_predictions.csv')
merged_with_predictions.to_csv(output_file, index=False)
print("\n✓ Saved course-level predictions to CSV:")
print(f"  File: {output_file}")
print(f"  Records: {len(merged_with_predictions):,}")
print(f"  Columns: {len(merged_with_predictions.columns)}")

# ============================================================================
# STEP 14: GENERATE SUMMARY REPORT
# ============================================================================
print("\n" + "=" * 80)
print("STEP 14: SUMMARY REPORT")
print("=" * 80)

summary_report = f"""
KCTCS ML PIPELINE - SUMMARY REPORT (CSV OUTPUT ONLY)
{'=' * 80}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

DATASET OVERVIEW
{'-' * 80}
Total Students: {len(df):,}
Total Course Records: {len(merged_with_predictions):,}

MODEL PERFORMANCE SUMMARY
{'-' * 80}

1. RETENTION PREDICTION MODEL
   Algorithm: {best_model_name}
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

summary_report += """
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
   Algorithm: Random Forest Regressor
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
5. GATEWAY MATH SUCCESS PREDICTION
   Algorithm: XGBoost Classifier
   Students with Gateway Math Data: {df['gateway_math_probability'].notna().sum():,}
   Average Pass Probability: {df['gateway_math_probability'].mean():.1%}
   
   Gateway Math Risk Distribution:
"""

for risk in ['High Risk', 'Moderate Risk', 'Likely Pass', 'Very Likely Pass']:
    count = (df['gateway_math_risk'] == risk).sum()
    if count > 0:
        pct = count / len(df) * 100
        summary_report += f"     {risk:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
6. GATEWAY ENGLISH SUCCESS PREDICTION
   Algorithm: XGBoost Classifier
   Students with Gateway English Data: {df['gateway_english_probability'].notna().sum():,}
   Average Pass Probability: {df['gateway_english_probability'].mean():.1%}
   
   Gateway English Risk Distribution:
"""

for risk in ['High Risk', 'Moderate Risk', 'Likely Pass', 'Very Likely Pass']:
    count = (df['gateway_english_risk'] == risk).sum()
    if count > 0:
        pct = count / len(df) * 100
        summary_report += f"     {risk:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
7. FIRST-SEMESTER LOW GPA (<2.0) PREDICTION
   Algorithm: XGBoost Classifier
   Average Low GPA Probability: {df['low_gpa_probability'].mean():.1%}
   Students Predicted Low GPA: {(df['low_gpa_prediction'] == 1).sum():,}
   
   Academic Risk Level Distribution:
"""

for risk in ['Low Risk', 'Moderate Risk', 'High Risk', 'Critical Risk']:
    count = (df['academic_risk_level'] == risk).sum()
    if count > 0:
        pct = count / len(df) * 100
        summary_report += f"     {risk:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
8. GPA PREDICTION (CONTINUOUS)
   Algorithm: Random Forest Regressor
   Mean Predicted GPA: {df['predicted_gpa'].mean():.2f}
   Performance vs. Expected:
"""

for perf in df['gpa_performance'].value_counts().items():
    count = perf[1]
    pct = count / len(df) * 100
    summary_report += f"     {perf[0]:20s} {count:6,} ({pct:5.1f}%)\n"

summary_report += f"""
OUTPUT: CSV FILES
{'-' * 80}
1. kctcs_student_level_with_predictions.csv
   - Student-level data with all predictions
   - {len(df):,} students
   - {len(df.columns)} columns

2. kctcs_merged_with_predictions.csv
   - Course-level data with predictions
   - {len(merged_with_predictions):,} records
   - {len(merged_with_predictions.columns)} columns

3. model_comparison_results.csv
   - Model comparison metrics
   - Cross-validation results

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

Gateway Math Success:
  - gateway_math_probability (0-1 scale)
  - gateway_math_prediction (0=Won't Pass, 1=Will Pass)
  - gateway_math_risk (High Risk/Moderate Risk/Likely Pass/Very Likely Pass)

Gateway English Success:
  - gateway_english_probability (0-1 scale)
  - gateway_english_prediction (0=Won't Pass, 1=Will Pass)
  - gateway_english_risk (High Risk/Moderate Risk/Likely Pass/Very Likely Pass)

First-Semester GPA < 2.0 Risk:
  - low_gpa_probability (0-1 scale)
  - low_gpa_prediction (0=Adequate GPA, 1=Low GPA)
  - academic_risk_level (Low Risk/Moderate Risk/High Risk/Critical Risk)

GPA Prediction (Continuous):
  - predicted_gpa (0.0-4.0 scale)
  - gpa_performance (Above Expected/As Expected/Below Expected)

{'=' * 80}
PIPELINE COMPLETE!
{'=' * 80}
"""

print(summary_report)

# Save report to file
report_file = 'ML_PIPELINE_REPORT_CSV.txt'
with open(report_file, 'w') as f:
    f.write(summary_report)
print(f"\nDetailed report saved to: {report_file}")

print("\n" + "=" * 80)
print("ALL MODELS TRAINED AND PREDICTIONS SAVED TO CSV!")
print("=" * 80)
print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nOutput files:")
print(f"  1. {os.path.join(DATA_DIR, 'kctcs_student_level_with_predictions.csv')}")
print(f"  2. {os.path.join(DATA_DIR, 'kctcs_merged_with_predictions.csv')}")
print(f"  3. {os.path.join(DATA_DIR, 'model_comparison_results.csv')}")
print(f"  4. {report_file}")
print("=" * 80)

