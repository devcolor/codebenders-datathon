# Quick Start

Get the Bishop State Student Success Analytics stack running in minutes.

## 1 — Clone

```bash
git clone https://github.com/devcolor/codebenders-datathon.git
cd codebenders-datathon
```

## 2 — ML Pipeline

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp codebenders-dashboard/env.example .env
# → Edit .env with your Supabase credentials (see README.md)

python -m operations.test_db_connection   # verify DB connection

cd ai_model
python complete_ml_pipeline.py            # ~10-15 min
```

## 3 — Dashboard

```bash
cd codebenders-dashboard
npm install

cp env.example .env.local
# → Edit .env.local with your Supabase credentials + OpenAI key

npm run dev      # → http://localhost:3000
```

## What the pipeline produces

Seven models write predictions to the `student_level_with_predictions` table in Supabase:

| Column | Description |
|--------|-------------|
| `retention_probability` | Probability of returning next year (0–1) |
| `at_risk_alert` | `URGENT` / `HIGH` / `MODERATE` / `LOW` |
| `gateway_math_probability` | Probability of passing gateway math (0–1) |
| `gateway_english_probability` | Probability of passing gateway English (0–1) |
| `low_gpa_probability` | Probability of GPA < 2.0 (0–1) |
| `predicted_time_to_credential` | Years to completion |
| `predicted_credential_label` | `Certificate` / `Associate` / `Bachelor` |

## Further reading

- **[README.md](README.md)** — Architecture diagram, full setup, all features
- **[docs/demo/DEMO.md](docs/demo/DEMO.md)** — 6-minute demo talk track
- **[DATA_DICTIONARY.md](DATA_DICTIONARY.md)** — All field definitions
- **[ML_MODELS_GUIDE.md](ML_MODELS_GUIDE.md)** — Model accuracy & feature importance
