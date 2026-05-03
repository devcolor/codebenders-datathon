# Bishop State Student Success Prediction

A comprehensive machine learning pipeline for predicting student success outcomes at Bishop State Community College.

## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Models](#models)
- [Data](#data)
- [Output](#output)
- [Documentation](#documentation)
- [License](#license)

## 🎯 Overview

This project implements six machine learning models to predict various aspects of student success (authoritative names and data flows: [`codebenders-dashboard/content/ai-transparency.ts`](codebenders-dashboard/content/ai-transparency.ts)):

1. **Retention Prediction** - Will the student be retained?
2. **Time-to-Credential** - How long until credential completion?
3. **Credential Type** - What credential will they earn?
4. **Gateway Math Success** - Will the student succeed in gateway math?
5. **Gateway English Success** - Will the student succeed in gateway English?
6. **First-Semester Low-GPA Prediction** - Is the student at risk of a low first-semester GPA?

The models use demographic, academic preparation, enrollment, and course performance data to generate actionable predictions for student support services.

The Next.js dashboard adds **natural language query (NLQ)** features: three OpenAI `gpt-4o-mini` API routes (`codebenders-dashboard/app/api/analyze/route.ts`, `codebenders-dashboard/app/api/query-summary/route.ts`, `codebenders-dashboard/app/api/courses/explain-pairing/route.ts`), a **rule-based fallback** in `codebenders-dashboard/lib/prompt-analyzer.ts`, and (when not using direct database mode) an **external data API** at `schools.syntex-ai.com`. See the same `ai-transparency.ts` file for the full inventory.

## 📁 Project Structure

```
codebenders-datathon/
├── ai_model/                          # Machine learning models and scripts
│   ├── __init__.py                    # Package initialization
│   ├── complete_ml_pipeline.py        # Main ML pipeline (6 models)
│   ├── generate_bishop_state_data.py  # Synthetic data generation
│   └── merge_bishop_state_data.py     # Data merging script
│
├── data/                              # Data files (CSV and Excel)
│   ├── ar_bscc_with_zip.csv          # AR data with zip codes
│   ├── bishop_state_cohorts_with_zip.csv    # Student cohort data
│   ├── bishop_state_courses.csv             # Course enrollment data
│   ├── bishop_state_student_level_with_zip.csv              # Student-level aggregated data
│   ├── bishop_state_student_level_with_predictions.csv      # Student-level with predictions
│   ├── bishop_state_merged_with_predictions.csv             # Course-level with predictions
│   └── De-identified PDP AR Files.xlsx                      # Original Excel data
│
├── codebenders-dashboard/             # Next.js web application
├── operations/                        # Database utilities and configuration
├── DATA_DICTIONARY.md                 # Detailed data field descriptions
├── ML_MODELS_GUIDE.md                 # Machine learning models guide
├── requirements.txt                   # Python dependencies
├── LICENSE                            # MIT License
└── README.md                          # This file
```

## ✨ Features

### Prediction Capabilities

- **Retention Risk Assessment**: Retention probability and risk categories; dashboard alert views (URGENT / HIGH / MODERATE / LOW) are driven by these signals
- **Graduation Timeline**: Predict time to credential completion
- **Credential Path**: Forecast credential type (Certificate, Associate's, Bachelor's)
- **Gateway Success**: Predict gateway math and English completion outcomes
- **Early Academic Risk**: First-semester low-GPA risk prediction

### Technical Features

- **XGBoost & Random Forest**: State-of-the-art ensemble methods
- **Feature Engineering**: 40+ engineered features from raw data
- **Comprehensive Evaluation**: Multiple metrics for each model
- **Production-Ready**: Generates predictions for all students
- **Detailed Reporting**: Automated summary reports with model performance

## 🚀 Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Postgres database access via Supabase (for saving predictions)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/devcolor/codebenders-datathon.git
   cd codebenders-datathon
   ```

2. **Create and activate virtualenv**
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database** (Optional - will fallback to CSV if not configured)

   Copy `codebenders-dashboard/env.example` to `.env` and update:
   ```env
   DB_HOST=127.0.0.1
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_PORT=54332
   DB_NAME=postgres
   DB_SSL=false
   ```

5. **Start local Supabase** (for local development)
   ```bash
   supabase start
   ```

6. **Test database connection**
   ```bash
   python -m operations.test_db_connection
   ```

7. **Verify data files**
   Ensure all required CSV files are in the `data/` folder.

## 💻 Usage

### Quick Start

Run the complete ML pipeline:

```bash
cd ai_model
python complete_ml_pipeline.py
```

This will:
1. Test database connection
2. Load and preprocess data
3. Train all 6 models
4. Generate predictions for all students
5. Save results to **Postgres database** (or CSV files as fallback)
6. Save model performance metrics to database
7. Create a summary report

### Data Merging (Optional)

If you need to re-merge the source data files:

```bash
cd ai_model
python merge_bishop_state_data.py
```

### Expected Runtime

- Data loading: ~30 seconds
- Model training: ~5-10 minutes
- Prediction generation: ~1 minute
- **Total**: ~10-15 minutes

### Batch Upload to Database

The pipeline uses an efficient batch upload system to save predictions to Postgres:

**Features**:
- **Automatic batching**: Large datasets are split into manageable chunks (1,000 records per batch)
- **Progress tracking**: Real-time progress updates during upload
- **Connection pooling**: SQLAlchemy engine with connection pooling for reliability
- **Error handling**: Automatic fallback to CSV if database connection fails
- **Verification**: Automatic record count verification after upload

**Example Output**:
```
Saving 99,559 records to table 'course_predictions'...
✓ Successfully saved to 'course_predictions'
  - Records: 99,559
  - Columns: 45
  - Verified: 99,559 records in database
```

**Configuration**:
- Default batch size: 1,000 records per chunk
- Adjustable via `chunksize` parameter in `save_dataframe_to_db()`
- Located in `operations/db_utils.py`

**Tables Created**:
1. `student_predictions` - Student-level predictions (~4,000 records)
2. `course_predictions` - Course-level predictions (~99,559 records)
3. `ml_model_performance` - Model metrics and training history

For more details, see [operations/README.md](operations/README.md).

## 🤖 Models

Authoritative descriptions (inputs, algorithms, data flow): [`codebenders-dashboard/content/ai-transparency.ts`](codebenders-dashboard/content/ai-transparency.ts). The summaries below match that inventory.

### 1. Retention Prediction

**Algorithm**: XGBoost classifier (model family selected in `ai_model/complete_ml_pipeline.py`)
**Target**: Binary (Retained / Not Retained)
**Features**: Demographic, enrollment, year-one performance, and program signals

**Output** (examples):
- Retention probability and binary prediction
- Retention risk category (Critical / High / Moderate / Low)
- Dashboard risk alerts combine retention and related metrics

### 2. Time-to-Credential Prediction

**Algorithm**: Random Forest regressor
**Target**: Continuous (Years to credential)

**Output**:
- `predicted_time_to_credential`: Years to completion
- `predicted_graduation_year`: Expected graduation year

### 3. Credential Type Prediction

**Algorithm**: Random Forest multi-class classifier
**Target**: Multi-class (No Credential / Certificate / Associate's / Bachelor's)

**Output**:
- `predicted_credential_type`: Numeric code (0-3)
- `predicted_credential_label`: Text label
- `prob_no_credential`, `prob_certificate`, `prob_associate`, `prob_bachelor`: Class probabilities

### 4. Gateway Math Success Prediction

**Algorithm**: XGBoost classifier
**Target**: Binary (success in gateway math)

**Output**: Probability and prediction fields written to `student_predictions` (see data dictionary and pipeline outputs).

### 5. Gateway English Success Prediction

**Algorithm**: XGBoost classifier
**Target**: Binary (success in gateway English)

**Output**: Probability and prediction fields written to `student_predictions`.

### 6. First-Semester Low-GPA Prediction

**Algorithm**: XGBoost classifier
**Target**: Binary (low first-semester GPA risk)

**Output**: Probability and prediction fields written to `student_predictions`.

## 📊 Data

### Input Files

| File | Description | Records |
|------|-------------|---------|
| `ar_bscc_with_zip.csv` | AR data with zip codes | ~4K |
| `bishop_state_cohorts_with_zip.csv` | Student cohort information | ~4K |
| `bishop_state_courses.csv` | Course enrollment records | ~100K |
| `bishop_state_student_level_with_zip.csv` | Aggregated student-level data | ~4K |

### Feature Categories

1. **Demographics**: Age, race, ethnicity, gender, first-generation status
2. **Academic Preparation**: Math/English/Reading placement levels
3. **Enrollment**: Type, intensity, attendance status, cohort term
4. **Course Performance**: Credits, grades, completion rates, gateway courses
5. **Financial**: Pell grant status
6. **Geographic**: Zip code information

## 📈 Output

### Database Tables (Primary Output)

Predictions are saved to Postgres (Supabase):

1. **`student_predictions`** (Table)
   - Student-level data with all predictions
   - One row per student (~4,000 records)

2. **`course_predictions`** (Table)
   - Course-level data with predictions
   - One row per course enrollment (~99,559 records)

3. **`ml_model_performance`** (Table)
   - Model performance metrics for each training run

### Generated Files (Fallback)

If database connection fails, predictions are saved to CSV:

1. **`bishop_state_student_level_with_predictions.csv`**
2. **`bishop_state_merged_with_predictions.csv`**
3. **`ML_PIPELINE_REPORT.txt`**

## 📚 Documentation

- **[codebenders-dashboard/content/ai-transparency.ts](codebenders-dashboard/content/ai-transparency.ts)**: Authoritative inventory of ML models, OpenAI/NLQ routes, rule-based fallback, and external data API surfaces
- **[DATA_DICTIONARY.md](DATA_DICTIONARY.md)**: Detailed descriptions of all data fields
- **[ML_MODELS_GUIDE.md](ML_MODELS_GUIDE.md)**: In-depth guide to machine learning models
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)**: Docker Compose setup for local Postgres
- **Model Code**: Extensively commented Python scripts in `ai_model/`

## 🔧 Configuration

### Model Parameters

Edit `complete_ml_pipeline.py` to adjust:

- **XGBoost parameters**: `n_estimators`, `max_depth`, `learning_rate`
- **Random Forest parameters**: `n_estimators`, `max_depth`, `n_jobs`
- **Train-test split**: `test_size`, `random_state`
- **Risk thresholds**: Alert levels in `assign_alert_level()`

## 🤝 Contributing

This project was developed for the Bishop State Datathon. Contributions are welcome!

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**CodeBenders Team**
Bishop State Datathon 2025

## 🙏 Acknowledgments

- Bishop State Community College
- Datathon organizers and mentors
- Open-source ML community (scikit-learn, XGBoost, pandas)

## 📞 Contact

For questions or support, please open an issue on GitHub or contact the team.

---

**Built with ❤️ for student success**
