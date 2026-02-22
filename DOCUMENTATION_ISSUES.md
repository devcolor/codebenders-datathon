# Documentation Issues Found

**Date**: October 30, 2025  
**Status**: Issues identified, ready for fixes

## Summary

After reviewing all documentation files, I've identified several inconsistencies and outdated information that need to be addressed. This document lists all issues found.

---

## 🔴 Critical Issues

### 1. Model Performance Metrics - Major Discrepancy

**Issue**: Retention model accuracy reported inconsistently across documents.

**Location**: 
- `README.md` (lines 194-196): States "Accuracy: ~85-90%, AUC-ROC: ~0.85-0.92"
- `DATA_DICTIONARY.md` (line 266): States "Accuracy: 52.2%, AUC-ROC: 0.54"
- `ML_MODELS_GUIDE.md` (lines 25, 73-74): States "Accuracy: 51.6%, AUC-ROC: 0.531"

**Correct Value**: Based on ML_MODELS_GUIDE.md and DATA_DICTIONARY.md, the actual performance is:
- **Accuracy: ~51-52%** (slightly above random baseline)
- **AUC-ROC: ~0.53-0.54** (weak predictive power)

**Action Required**: Update `README.md` to reflect actual model performance. The 85-90% accuracy claim is incorrect and misleading.

---

### 2. Database Table Name Confusion

**Issue**: Multiple table names referenced inconsistently.

**Actual Tables in Database** (from dump):
- `student_predictions` ✅ (exists)
- `student_level_with_predictions` ✅ (exists)
- `kctcs_student_level_with_predictions` ✅ (exists)

**Documentation References**:
- Dashboard code uses: `student_predictions` ✅ (correct)
- `operations/db_config.py` maps: `'student_predictions'` → `'student_level_with_predictions'` ⚠️
- `README.md` (line 300): References `kctcs_student_level_with_predictions` ⚠️
- `operations/README.md` (line 16): Says `student_predictions` ✅

**Action Required**: 
1. Clarify which table is the primary one for dashboard queries
2. Update `README.md` to use correct table name
3. Check if `operations/db_config.py` mapping is correct or if it should be updated

---

### 3. Database Name Inconsistency

**Issue**: Dashboard documentation references wrong database name.

**Location**: 
- `codebenders-dashboard/DASHBOARD_README.md` (line 172): `DB_NAME=pdp_analytics`
- `codebenders-dashboard/env.example` (line 6): `DB_NAME=pdp_analytics`
- `env.example` (line 6): `DB_NAME=pdp_analytics`

**Actual Database Name**: `Kentucky_Community_and_Technical_College_System` (from `operations/db_config.py`)

**Action Required**: Update all dashboard documentation to use correct database name or clarify if `pdp_analytics` is a separate database.

---

## 🟡 Medium Priority Issues

### 4. Batch Size Inconsistency

**Issue**: Batch processing size documented inconsistently.

**Location**:
- `operations/README.md` (line 26): "10k records per batch"
- `operations/README.md` (line 64): "10,000 records per batch"
- `README.md` (line 174): "1,000 records per chunk"
- `operations/db_utils.py` (line 49): `chunksize=1000` (default parameter)

**Correct Value**: Default is 1,000 records (from code).

**Action Required**: Update `operations/README.md` to reflect actual default of 1,000 records, or update code if 10k is preferred.

---

### 5. Record Count Inconsistencies

**Issue**: Student count varies across documentation.

**Location**:
- `README.md` (line 179): "~20K records"
- `README.md` (line 273): "~20K" for various files
- `DATA_DICTIONARY.md` (line 4): "32,800 students"
- `ML_MODELS_GUIDE.md` (line 4): "32,800 students"
- `codebenders-dashboard/DASHBOARD_README.md` (line 94): "32,800 students"

**Correct Value**: 32,800 students (confirmed in multiple sources and DATA_DICTIONARY).

**Action Required**: Update `README.md` to use 32,800 instead of ~20K.

---

### 6. Course Record Count Inconsistency

**Issue**: Course-level record count varies.

**Location**:
- `README.md` (line 180): "~500K records" for course_predictions
- `README.md` (line 275): "~500K" for kctcs_courses.csv
- `ML_MODELS_GUIDE.md` (line 4): "145,918 course records"
- `DATA_DICTIONARY.md` (line 406): "145,918 course records"

**Correct Value**: 145,918 course records (from actual data).

**Action Required**: Update `README.md` to use correct count of ~146K or 145,918.

---

### 7. Table Name Mapping in Operations Docs

**Issue**: `operations/README.md` doesn't clarify the table name mapping.

**Location**:
- `operations/README.md` (line 16): Lists `student_predictions` as table name
- `operations/db_config.py` (line 18): Maps `'student_predictions'` → `'student_level_with_predictions'`

**Action Required**: Update `operations/README.md` to clarify that `student_predictions` is a key that maps to `student_level_with_predictions` table, or clarify the actual table structure.

---

## 🟢 Low Priority / Minor Issues

### 8. Missing API Endpoint Documentation

**Issue**: Dashboard has a readiness endpoint that's not fully documented.

**Location**: 
- `codebenders-dashboard/app/api/dashboard/readiness/route.ts` exists
- `codebenders-dashboard/DASHBOARD_README.md` doesn't list this endpoint

**Action Required**: Add readiness endpoint to API documentation section.

---

### 9. Model Count Inconsistency

**Issue**: Number of models varies in documentation.

**Location**:
- `README.md`: Lists 5 models
- `ML_MODELS_GUIDE.md`: Lists 8 models (includes Gateway Math, Gateway English, Low GPA Risk)

**Action Required**: Clarify if there are 5 core models or 8 total models. Update README.md if needed.

---

### 10. Database Connection Pooling Documentation

**Issue**: Batch size documentation says 10k but status interval is 10k.

**Location**:
- `operations/db_utils.py` (line 77): `status_interval = 10000`
- `operations/db_utils.py` (line 49): `chunksize=1000` (default)

**Note**: This is actually fine - status shows every 10k records, but processes in 1k chunks. Documentation just needs clarification.

---

## 📋 Recommended Fixes Priority

1. **HIGH**: Fix model performance metrics in README.md (Issue #1)
2. **HIGH**: Clarify database table names (Issue #2)
3. **MEDIUM**: Fix database name in dashboard docs (Issue #3)
4. **MEDIUM**: Update record counts (Issues #5, #6)
5. **MEDIUM**: Fix batch size documentation (Issue #4)
6. **LOW**: Add missing API endpoint docs (Issue #8)
7. **LOW**: Clarify model count (Issue #9)

---

## Files That Need Updates

1. `README.md` - Multiple issues (model metrics, record counts, table names)
2. `operations/README.md` - Batch size, table name clarification
3. `codebenders-dashboard/DASHBOARD_README.md` - Database name, missing API endpoint
4. `codebenders-dashboard/env.example` - Database name (if pdp_analytics is wrong)

---

## ✅ Files That Are Correct

- `DATA_DICTIONARY.md` - Accurate model metrics and record counts
- `ML_MODELS_GUIDE.md` - Accurate model performance and record counts
- `codebenders-dashboard/QUICKSTART.md` - Generally accurate

---

**Next Steps**: Review each issue and apply fixes. Most critical is fixing the model performance metrics in README.md as this could mislead users about model capabilities.


