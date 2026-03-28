# Config-Driven Distillation Pipeline for Per-School Fine-Tuned Models

**Date:** 2026-03-27
**Status:** Draft
**Goal:** Replace OpenAI API dependency for explanation and summarization endpoints with locally-served, per-school fine-tuned models via a repeatable, config-driven training pipeline.

---

## 1. Problem

The dashboard currently calls OpenAI GPT-4o-mini in two explanation/summarization endpoints:

- `/api/courses/explain-pairing` — course pairing explanations
- `/api/query-summary` — query result summaries

This creates per-call API costs, latency, and a dependency on an external service. The explanations are also generic — they lack institutional context about each school's programs, challenges, demographics, and interventions.

## 2. Solution

A config-driven distillation pipeline that:

1. Takes a per-school YAML config describing the school's schema, domain knowledge, and context
2. Uses a teacher model (Claude Sonnet or Qwen 3.5 locally) to generate high-quality training pairs
3. Fine-tunes a small open-source model (Qwen 3.5 4B or 9B) via MLX on Apple Silicon
4. Evaluates the model against ship criteria
5. Exports to Ollama for local serving

New school = new config file + run the pipeline. No code changes needed.

## 3. Architecture

### Directory Structure

```
schools/
  bishop-state/
    config.yaml              # Schema, domain knowledge, explanation style
    seed_queries.yaml        # Example questions users ask at this school
  akron/
    config.yaml
    seed_queries.yaml

training/
  distill.py                 # Step 1: Generate training pairs via teacher model
  prepare.py                 # Step 2: Filter, dedup, split (80/10/10)
  finetune.py                # Step 3: Fine-tune via MLX (Qwen 3.5)
  eval.py                    # Step 4: Evaluate model quality
  export.py                  # Step 5: Package for Ollama
  config.py                  # Shared constants
  prompts.py                 # Teacher prompts (school-agnostic templates)

training_data/
  bishop-state/
    pairs/                   # Raw distilled pairs (explainer.jsonl, summarizer.jsonl)
    final/                   # Train/val/test splits per adapter
    models/                  # Fine-tuned LoRA adapters
      qwen3.5-9b/
        explainer/
          adapter_config.json
          adapter_model.safetensors
        summarizer/
          adapter_config.json
          adapter_model.safetensors
```

### CLI

```bash
python -m training.distill  --school bishop-state [--local]    # Generate pairs
python -m training.prepare  --school bishop-state               # Filter/split
python -m training.finetune --school bishop-state --model 9b    # Train
python -m training.eval     --school bishop-state               # Evaluate
python -m training.export   --school bishop-state               # Deploy to Ollama
```

## 4. School Config Format

Each school gets a `config.yaml` capturing everything the pipeline needs. Sections:

### Core Identity

```yaml
school:
  name: "Bishop State Community College"
  code: "bscc"
  type: "community_college"
  designation: ["hbcu", "minority_serving"]
  accreditation: "SACSCOC"
  founded: 1927
```

### Location and Setting

```yaml
  location:
    address: "351 North Broad Street"
    city: "Mobile"
    state: "Alabama"
    zip: "36603"
    county: "Mobile County"
    region: "Gulf Coast"
    setting: "urban"
    climate_zone: "subtropical"
```

### Enrollment Profile

```yaml
  enrollment:
    total_headcount: 4200
    fte: 2800
    undergraduate_only: true
    residential: false
    percent_full_time: 0.42
    percent_part_time: 0.58
    percent_online: 0.35
    open_admission: true
```

### Demographics

```yaml
  demographics:
    percent_black: 0.72
    percent_white: 0.18
    percent_hispanic: 0.05
    percent_other: 0.05
    percent_pell_eligible: 0.68
    percent_first_gen: 0.55
    percent_adult_learners: 0.40
    median_household_income_area: 42000
```

### Database Schema

```yaml
database:
  main_table: "student_level_with_predictions"
  course_table: "course_enrollments"
  connection_env: "DATABASE_URL"

schema:
  student_columns:
    Cohort: "Cohort year (numeric: 2019, 2020, etc.)"
    Race: "Student race/ethnicity"
    Gender: "Student gender"
    Retention: "Retention indicator (0 or 1)"
    GPA_Group_Year_1: "GPA in year 1"
    # ... full column list from route.ts SCHEMA_INFO
  course_columns:
    course_prefix: "Course dept code (MAT, ENG, NUR, etc.)"
    grade: "Student grade (A, B, C, D, F, W, I)"
    # ... full column list
```

### Domain Knowledge

```yaml
domain:
  programs:
    - name: "Nursing (ADN)"
      cip: "51.3801"
      gateway_courses: ["BIO 201", "MAT 110"]
    - name: "Welding Technology"
      cip: "48.0508"
      gateway_courses: ["WDT 108", "WDT 109"]
  key_metrics: ["retention_rate", "dfwi_rate", "gateway_pass_rate"]
  terminology:
    credential: "associate degree or certificate"
    at_risk: "students flagged by early warning system"
```

### Workforce and Outcomes

```yaml
  workforce:
    top_employers: ["Austal USA", "Mobile Infirmary", "AM/NS Calvert"]
    high_demand_fields: ["healthcare", "advanced_manufacturing", "maritime"]

  outcomes:
    job_placement_rate_6mo: 0.78
    median_salary_after_credential:
      associate: 34000
      certificate: 29000
    licensure_pass_rates:
      nursing_nclex: 0.89
      welding_aws: 0.92
```

### Peer Context

```yaml
  peers:
    ipeds_id: "101505"
    carnegie_class: "Associate's—High Transfer-High Traditional"
    peer_institutions: ["Lawson State CC", "Shelton State CC"]
    state_system: "Alabama Community College System"
```

### Financial Context

```yaml
  financial:
    in_state_tuition: 4800
    avg_financial_aid_package: 5200
    percent_receiving_aid: 0.82
    percent_student_loans: 0.25
    cost_of_living_index: 87.3
    emergency_aid_fund: true
```

### Completion Context

```yaml
  completion:
    ipeds_graduation_rate: 0.18
    adjusted_completion_rate: 0.42
    avg_time_to_credential: 3.2
    percent_transfer_out: 0.24
    percent_stop_out_return: 0.15
    top_completion_barriers:
      - "developmental_math_sequences"
      - "financial_emergencies"
      - "work_schedule_conflicts"
```

### Faculty and Instruction

```yaml
  instruction:
    student_faculty_ratio: 18
    percent_full_time_faculty: 0.45
    percent_adjunct: 0.55
    developmental_ed_model: "corequisite"
```

### Student Pipeline

```yaml
  pipeline:
    feeder_high_schools:
      - name: "Williamson High School"
        percent_of_enrollment: 0.12
        avg_readiness: "below_college_level"
    percent_ged: 0.11
    percent_veterans: 0.07
    percent_career_changers: 0.14
    primary_recruitment_radius_miles: 35
```

### Digital Access

```yaml
  technology:
    percent_students_with_reliable_wifi: 0.71
    percent_students_with_personal_laptop: 0.64
    campus_device_lending: true
    broadband_desert_overlap: true
```

### Transportation and Access

```yaml
  access:
    campus_count: 4
    campuses:
      - name: "Main Campus"
        public_transit_accessible: true
      - name: "Southwest Campus"
        public_transit_accessible: false
    percent_students_commute_30_plus_min: 0.35
    evening_weekend_classes: true
```

### Equity Gaps and Initiatives

```yaml
  equity:
    known_gaps:
      - metric: "gateway_math_pass_rate"
        group_a: { name: "Black male students", value: 0.41 }
        group_b: { name: "Overall", value: 0.58 }
        initiative: "Male Student Success mentoring program"
    minority_male_initiative: "Brother 2 Brother"
```

### Active Interventions

```yaml
  interventions:
    active:
      - name: "Starfish Early Alert"
        type: "early_warning"
        target: "all students"
        trigger: "missed 2+ classes or below C at midterm"
        effectiveness: "12% retention lift in pilot cohorts"
      - name: "Emergency Micro-Grants"
        type: "financial"
        max_award: 500
        effectiveness: "78% of recipients re-enrolled next term"
```

### Student Life

```yaml
  student_life:
    percent_working_while_enrolled: 0.72
    percent_working_over_20hrs: 0.48
    percent_single_parents: 0.18
    food_insecurity_rate: 0.31
    housing_insecurity_rate: 0.14
```

### Community Health Context

```yaml
  health:
    mental_health_counselor_ratio: "1:1400"
    community_health_context:
      - "Mobile County has highest diabetes rate in Alabama"
      - "Limited mental health providers in service area"
```

### Seasonal Patterns

```yaml
  patterns:
    high_attrition_points:
      - week: 4
        reason: "Financial aid disbursement delays"
      - week: 8
        reason: "Midterm performance shock"
      - month: "October"
        reason: "Hurricane season peak"
    summer_melt_rate: 0.22
```

### Historical Trends

```yaml
  trends:
    enrollment_direction: "declining"
    enrollment_5yr_change: -0.12
    completion_direction: "improving"
    notable_changes:
      - year: 2022
        event: "Switched to corequisite math model"
      - year: 2023
        event: "Launched early alert system with ML predictions"
```

### Institutional Priorities

```yaml
  priorities:
    strategic_plan_years: "2024-2029"
    top_goals:
      - "Increase fall-to-fall retention from 42% to 55%"
      - "Launch 3 new short-term workforce certificates"
      - "Close equity gap in gateway math by 50%"
    accreditation_qep_topic: "Guided Pathways implementation"
    grant_funded_initiatives:
      - name: "Title III Strengthening Institutions"
        focus: "Student support services and advising redesign"
        end_date: "2027-09-30"
```

### Data Quality Notes

```yaml
  data_caveats:
    - "Pre-2020 cohorts lack online/hybrid delivery classification"
    - "Race/ethnicity is self-reported; 6% of records are 'Unknown'"
    - "Transfer-out data relies on NSC match — ~85% match rate"
```

### Distillation and Training Config

```yaml
distillation:
  teacher_model: "claude-sonnet-4-20250514"
  teacher_backend: "anthropic"
  local_teacher_model: "qwen3.5:27b"
  local_teacher_backend: "ollama"
  pairs_per_task: 1500

training:
  default_model: "qwen3.5:9b"
  fallback_model: "qwen3.5:4b"
  method: "qlora"
  quantization: 4
  lora_rank: 16
  lora_alpha: 32
  epochs: 3
  learning_rate: 1.0e-4
  batch_size: 4
  warmup_steps: 100
  eval_every: 50
  early_stopping_patience: 3
```

## 5. Distillation — Teacher Prompts and Pair Generation

### Two Adapters

| Adapter | Replaces | Input | Output |
|---------|----------|-------|--------|
| **Explainer** | `/api/courses/explain-pairing` | Course pairing data | Structured explanation JSON |
| **Summarizer** | `/api/query-summary` | Query + result rows | Structured summary JSON |

### Teacher Prompt Strategy

**Explainer teacher prompt:**

The teacher model receives the full institutional context from config.yaml plus the course pairing data, and generates:

```json
{
  "explanation": "2-3 sentence plain-language explanation",
  "structural_factors": ["institutional/systemic factors"],
  "student_impact": "what this means for students",
  "advisor_recommendation": "actionable next step",
  "data_limitations": ["caveats about this data"],
  "related_intervention": "existing program that addresses this, or null"
}
```

**Summarizer teacher prompt:**

The teacher receives institutional context plus the original query and SQL result rows, and generates:

```json
{
  "summary": "2-3 sentence headline finding",
  "key_insights": ["notable patterns"],
  "context": "how this connects to institutional priorities or known challenges",
  "action_items": ["what someone should do with this information"],
  "caveats": ["data limitations relevant to this query"]
}
```

**Student prompts** (what the fine-tuned model sees at inference) are minimal — just the data input. All institutional context is baked into the weights during training.

### Dual Teacher Support

- **`--local` flag:** Uses Qwen 3.5 27B via Ollama for free iteration and pipeline testing
- **Default:** Uses Claude Sonnet via Anthropic API for production-quality training data

### Seed Data Sources

1. **Database-driven (500 pairs per adapter):** Query the school's actual data for real course pairings and result sets
2. **Template-driven (500 pairs per adapter):** From `seed_queries.yaml` with school-specific examples
3. **Synthetic variation (500 pairs per adapter):** Pipeline varies dimensions (cohorts, programs, demographics) to reach 1,500 pairs per adapter

**Total per school:** 3,000 training pairs. Distillation cost via Claude Sonnet: ~$15-25.

## 6. Fine-Tuning

### Method

QLoRA via Apple MLX framework on Apple Silicon Macs.

- Base model: Qwen 3.5 9B (default) or 4B (lightweight)
- 4-bit quantized base, trainable low-rank adapters
- Two separate adapters per school (explainer + summarizer) on the same base model

### Hardware Requirements

| Model | Training | Inference |
|-------|----------|-----------|
| Qwen 3.5 9B | 24GB+ RAM (M-series Mac) | 8GB+ RAM (Q4 via Ollama) |
| Qwen 3.5 4B | 16GB+ RAM (M-series Mac) | 4GB+ RAM (Q4 via Ollama) |

### Training Time Estimates (3,000 examples, 3 epochs)

| Model | 18GB Mac (M3 Pro) | 36GB Mac (M3 Pro) |
|-------|-------------------|-------------------|
| Qwen 3.5 4B | ~2-4 hrs | ~1.5-3 hrs |
| Qwen 3.5 9B | Tight, not recommended | ~3-5 hrs |

## 7. Evaluation

### Ship Criteria

| Metric | What It Checks | Threshold |
|--------|---------------|-----------|
| JSON validity | Output parses as valid JSON | >= 95% |
| Schema adherence | All required keys present, correct types | >= 90% |
| Explanation quality | ROUGE-L against teacher outputs | >= 0.35 |
| Factual grounding | Mentions data values from input, not hallucinated | >= 85% |
| Actionability | Recommendations are non-generic | >= 80% |
| Caveat inclusion | Data limitations populated | >= 90% |

Pipeline refuses to export a model that fails any threshold.

## 8. Deployment

### Export to Ollama

```bash
python -m training.export --school bishop-state
# Registers:
#   bishop-state-explainer:9b
#   bishop-state-summarizer:9b
```

### Dashboard Integration

A thin adapter layer in `lib/model-client.ts` routes to the appropriate backend:

```
MODEL_BACKEND=ollama    → local fine-tuned model via Ollama
MODEL_BACKEND=openai    → fallback to OpenAI GPT-4o-mini
SCHOOL_CODE=bishop-state
```

Routes affected:

| Route | Current | After |
|-------|---------|-------|
| `/api/courses/explain-pairing` | OpenAI GPT-4o-mini | `bishop-state-explainer:9b` via Ollama |
| `/api/query-summary` | OpenAI GPT-4o-mini | `bishop-state-summarizer:9b` via Ollama |
| `/api/analyze` | OpenAI GPT-4o-mini | No change (future adapter) |

## 9. Onboarding a New School

1. Create `schools/{school-code}/config.yaml` — fill in institutional context
2. Create `schools/{school-code}/seed_queries.yaml` — 20-50 example questions
3. Run the pipeline:
   ```bash
   python -m training.distill  --school {school-code} [--local]
   python -m training.prepare  --school {school-code}
   python -m training.finetune --school {school-code} --model 9b
   python -m training.eval     --school {school-code}
   python -m training.export   --school {school-code}
   ```
4. Set env vars: `MODEL_BACKEND=ollama SCHOOL_CODE={school-code}`
5. Deploy dashboard

## 10. Cost Summary

| Item | Per School | One-Time |
|------|-----------|----------|
| Distillation (Claude Sonnet) | $15-25 | - |
| Distillation (local Qwen) | $0 | - |
| Fine-tuning (MLX on Mac) | $0 (electricity) | - |
| Inference (Ollama) | $0 | - |
| Base model download | - | ~6GB (cached) |

**Total cost to onboard a new school: $15-25** (or $0 with local teacher).
