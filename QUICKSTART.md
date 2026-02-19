# 🚀 Quick Start Guide

Get up and running with the Bishop State Student Success Prediction project in 5 minutes!

## ⚡ Fast Track

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the ML pipeline
cd ai_model
python complete_ml_pipeline.py

# 3. Check results
# - Console output shows model performance
# - ML_PIPELINE_REPORT.txt has detailed summary
# - Predictions saved in ../data/ folder
```

## 📂 What's Where?

```
codebenders-datathon/
├── ai_model/              # ML scripts - START HERE
│   ├── complete_ml_pipeline.py    # Main script (run this!)
│   ├── merge_bishop_state_data.py # Data merging (optional)
│   └── generate_bishop_state_data.py  # Synthetic data generation
│
├── data/                  # All CSV files and predictions
│   ├── bishop_state_*_with_zip.csv       # Input data files
│   ├── bishop_state_*_with_predictions.csv  # Output predictions
│   └── README.md                         # Data documentation
│
├── codebenders-dashboard/ # Next.js web dashboard
├── README.md              # Full project documentation
├── DATA_DICTIONARY.md     # Field descriptions
└── ML_MODELS_GUIDE.md     # Model details
```

## 🎯 What You Get

Running the pipeline generates predictions for **all students**:

### 5 Prediction Models

1. **Retention** - Will they return? (53% AUC)
2. **Early Warning** - Are they at risk? (4-level alert system)
3. **Time-to-Credential** - When will they graduate?
4. **Credential Type** - What will they earn?
5. **Course Success** - What will their GPA be?

### Output Files

- `bishop_state_student_level_with_predictions.csv` - One row per student (~4,000)
- `bishop_state_merged_with_predictions.csv` - One row per course (~99,559)
- `ML_PIPELINE_REPORT.txt` - Performance summary

## ⏱️ Runtime

- **Total**: ~10-15 minutes
- Data loading: ~30 seconds
- Model training: ~5-10 minutes
- Predictions: ~1 minute

## 🔍 Key Prediction Columns

| Column | What It Tells You |
|--------|-------------------|
| `retention_probability` | Chance of returning (0-1) |
| `retention_risk_category` | Risk level (Critical/High/Moderate/Low) |
| `at_risk_alert` | Alert level (URGENT/HIGH/MODERATE/LOW) |
| `risk_score` | Comprehensive risk (0-100) |
| `predicted_time_to_credential` | Years to graduation |
| `predicted_credential_label` | Expected credential type |
| `predicted_gpa` | Expected GPA (0-4) |

## 💡 Common Use Cases

### Find At-Risk Students
```python
import pandas as pd
df = pd.read_csv('data/bishop_state_student_level_with_predictions.csv')

# Students needing urgent intervention
urgent = df[df['at_risk_alert'] == 'URGENT']
print(f"Urgent cases: {len(urgent)}")

# High-risk students with low retention probability
high_risk = df[(df['retention_probability'] < 0.3) &
               (df['risk_score'] > 70)]
```

### Identify Overperformers
```python
# Students doing better than expected
overperformers = df[df['gpa_performance'] == 'Above Expected']
```

### Predict Graduation Timeline
```python
# Students likely to graduate in 2-3 years
on_track = df[(df['predicted_time_to_credential'] >= 2) &
              (df['predicted_time_to_credential'] <= 3)]
```

## 🐛 Troubleshooting

### "File not found" error
Make sure you're in the `ai_model/` directory:
```bash
cd ai_model
python complete_ml_pipeline.py
```

### Memory error
Reduce model complexity in `complete_ml_pipeline.py`:
```python
# Change n_estimators from 200 to 100
n_estimators=100
```

### Slow performance
Enable parallel processing (already set for Random Forest):
```python
n_jobs=-1  # Use all CPU cores
```

## 📚 Learn More

- **[README.md](README.md)** - Full documentation
- **[data/README.md](data/README.md)** - Data documentation
- **[DATA_DICTIONARY.md](DATA_DICTIONARY.md)** - Field descriptions
- **[ML_MODELS_GUIDE.md](ML_MODELS_GUIDE.md)** - Model guide
- **[codebenders-dashboard/README.md](codebenders-dashboard/README.md)** - Dashboard docs

## 🎓 Next Steps

1. ✅ Run the pipeline
2. 📊 Review `ML_PIPELINE_REPORT.txt`
3. 🔍 Explore prediction files
4. 📈 Analyze results for your use case
5. 🎯 Identify students for intervention
6. 🔧 Customize models (optional)

## 💬 Need Help?

- Check the README files in each folder
- Review the DATA_DICTIONARY.md for field meanings
- Open an issue on GitHub

---

**Ready to predict student success? Run the pipeline now!** 🚀
