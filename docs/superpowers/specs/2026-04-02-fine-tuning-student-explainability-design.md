# Design Spec: Fine-Tuning for Student Explainability

**Date:** 2026-04-02 (updated 2026-04-03)
**Epic label:** `fine-tuning: student-explainability`
**Epic branch:** `fine-tuning/student-explainability`
**Status:** Draft

---

## 1. Goal

Fine-tune a small language model on Bishop State domain data to replace GPT-4o-mini for three inference tasks in the dashboard. Two candidate models will be evaluated head-to-head: **Qwen 3.5-4B** (proven by D4BL) and **Gemma 4 E4B** (native structured JSON output). The primary value is improved explainability: advisors get SHAP-grounded, institution-aware narratives instead of templated rule-engine output. Secondary benefits include FERPA compliance (all inference on-premises), offline deployment, and institutional scalability.

### Tasks to Fine-Tune

| Task | Input | Output | Priority |
|------|-------|--------|----------|
| **SHAP Narrator** | SHAP values + student profile + risk factors | Grounded advisor narrative + interventions | Highest (new) |
| **Summarizer** | Query results + original question | Plain-English summary for advisors | Medium (exists) |
| **Explainer** | Course pairing stats (DFWI, delivery, instructor) | Data-driven analysis + recommendation | Medium (exists) |

### Out of Scope

- Query Analyzer (NL → SQL) — high risk, deferred to future epic
- Model serving infrastructure (RunPod, dedicated GPU hosting) — use local Ollama for now

### Model Selection: Qwen 3.5-4B vs Gemma 4 E4B

Two candidate models will be trained and evaluated. The winner is selected based on ship criteria metrics.

| | **Qwen 3.5-4B** | **Gemma 4 E4B** |
|---|---|---|
| Effective params | 4B | 4.5B (8B with embeddings) |
| GGUF size (q4_k_m) | ~2.7 GB | ~5 GB |
| Context window | 32K | 128K |
| Native JSON output | No | Yes — built-in structured function calling |
| Ollama support | Text-only (vision mmproj broken) | Full support |
| Unsloth LoRA | Yes, but QLoRA discouraged — use bf16 LoRA | Yes, bf16 LoRA recommended |
| VRAM for training (bf16) | 10 GB | ~10 GB |
| License | Apache 2.0 | Apache 2.0 |
| D4BL proven | Yes (5 experiments, 98.77% schema validity) | No (new model) |

**Why these two:**
- Qwen 3.5-4B is the known quantity — D4BL proved the full pipeline (distill → train → GGUF → Ollama) with 5 experiments and achieved 98.77% schema validity on structured output tasks.
- Gemma 4 E4B has native structured JSON output before fine-tuning, 128K context (headroom for SHAP-heavy narrator prompts), and full Ollama GGUF support without the mmproj workaround.

**Why not others:**
- Qwen 3.5-9B: 22 GB VRAM for training, larger GGUF (~5.5 GB), marginal quality gain over 4B for our task complexity.
- Qwen 3-4B: #1 fine-tuning benchmark, but lacks 3.5's architecture improvements.
- Llama 3.2-3B: Best tunability gain, but Meta's community license (700M MAU limit) is restrictive for educational institutions.
- Phi-4-mini: Strong on math, but less proven for structured output and limited Unsloth support.

**Training note:** Unsloth explicitly discourages QLoRA (4-bit) on Qwen 3.5 due to quantization artifacts. Both models will use bf16 LoRA on A100 (40 GB VRAM is sufficient for either).

## 2. Prerequisites

Before the epic branch is created:

1. **Merge `feature/distillation-pipeline` → `main`** — brings in `training/` pipeline modules, `schools/bishop-state/config.yaml`, seed queries, `model-client.ts`
2. **Merge `feature/shap-explainability` → `main`** — brings in per-student SHAP computation (Step 10b), SHAP-aware `enrich_with_llm()`, student API SHAP exposure, feasibility report

## 3. Epic Structure

### Branching

- **Epic branch:** `fine-tuning/student-explainability` (from `main` after prereq merges)
- **Feature branches:** `fine-tuning/issue-N-description` → PR into epic branch
- **Final PR:** epic branch → `main`

### Issue Breakdown

```
                    +---------------+
                    | #1 Prereq:    |
                    | Merge both    |
                    | branches      |
                    +-------+-------+
                            |
               +------------+------------+
               v            v            v
         +----------+ +----------+ +----------+
         | #2 SHAP  | | #3 Colab | | #4 Distill|
         | narrator | | notebook | | summarizer|
         | task type| | (Unsloth)| | + explain |
         +----+-----+ +----+-----+ +----+-----+
              |             |            |
              v             |            |
         +----------+      |            |
         | #5 Distill|     |            |
         | SHAP      |     |            |
         | narrator  |     |            |
         +----+-----+      |            |
              |             |            |
              +-------------+------------+
                            v
                      +----------+
                      | #6 Train |
                      | 4B + 9B  |
                      | evaluate |
                      +----+-----+
                           |
                      +----+-----+
                      v          v
                +----------+ +----------+
                | #7 Export | | #8 Update|
                | + wire   | | docs &   |
                | dashboard| | report   |
                +----------+ +----------+
```

| # | Title | Description | Depends | Labels |
|---|-------|------------|---------|--------|
| 1 | Merge distillation-pipeline and shap-explainability to main | Merge both feature branches, resolve conflicts, verify CI | — | `type:chore` |
| 2 | Add SHAP narrator task type to training pipeline | New prompt template, output schema, seed data generator, eval metrics | #1 | `type:feature`, `area:ai` |
| 3 | Build Colab training notebook (Unsloth + LoRA) | Single "Run All" notebook, parameterized config, 3-phase training, GGUF export. Replace `training/finetune.py` (MLX) with Unsloth wrapper. | #1 | `type:feature`, `area:ai` |
| 4 | Distill training pairs for summarizer and explainer | Run distillation for both existing tasks (~1,500 pairs each via Claude API). Prepare datasets. | #1 | `type:feature`, `area:ai` |
| 5 | Distill training pairs for SHAP narrator | Generate ~1,500 SHAP narrator pairs from student data + SHAP values. Requires SHAP data in DB. | #2 | `type:feature`, `area:ai` |
| 6 | Train and evaluate Qwen 3.5-4B + Gemma 4 E4B | Run Colab notebook for both models. Evaluate via ship criteria. Compare metrics, pick winner. | #3, #4, #5 | `type:spike`, `area:ai` |
| 7 | Export models and wire into dashboard | GGUF export, Ollama registration, wire `model-client.ts` into consumer routes, update `enrich_with_llm` model string. | #6 | `type:feature`, `area:ai`, `area:frontend` |
| 8 | Update documentation and feasibility report | Update feasibility report with actual results, update README and CLAUDE.md. | #6 | `type:documentation` |

### Parallelism

Issues #2, #3, and #4 can proceed concurrently after #1. Issue #5 waits only on #2. Issue #6 is the convergence point. Issues #7 and #8 are parallel after #6.

## 4. Colab Notebook Design

### Principles

- **Single "Run All" execution.** No babysitting. No manual cell-by-cell.
- **Parameterized at the top.** One config cell is the only thing the user edits.
- **Checkpoint and resume.** If Colab disconnects, set `SKIP_DOMAIN_ADAPTATION=True` to resume from Phase 2.
- **Chat template alignment.** Uses `tokenizer.apply_chat_template()` throughout — never manual ChatML tokenization (D4BL's critical lesson).

### Notebook Structure

```
Cell 1: Configuration (ONLY cell the user edits)
-------------------------------------------------
SCHOOL = "bishop-state"
MODELS = [
    {"name": "qwen3.5-4b", "hf_id": "Qwen/Qwen3.5-4B"},
    {"name": "gemma4-e4b", "hf_id": "google/gemma-4-e4b-it"},
]
REPO_URL = "https://github.com/codebenders/datathon.git"
REPO_BRANCH = "fine-tuning/student-explainability"
HF_TOKEN = ""                        # or userdata.get('HF_TOKEN')
PHASE_1_EPOCHS = 1
PHASE_2_EPOCHS = 7
SKIP_DOMAIN_ADAPTATION = False       # True to reuse cached Phase 1

Cell 2+: Fully autonomous
-------------------------------------------------
- GPU detection + validation (assert A100/T4/L4)
- pip install unsloth, trl, peft
- Clone repo, load schools/{SCHOOL}/config.yaml
- For each model in MODELS:
  - Phase 1: Domain adaptation
    - Load base model via Unsloth (bf16 LoRA — no QLoRA for Qwen 3.5)
    - Train on training_data/{school}/domain.jsonl
    - LoRA rank 16, all modules, 1 epoch, lr 2e-4, effective batch 32
    - Save merged checkpoint
  - Phase 2: Task adapters (narrator, summarizer, explainer)
    - Load Phase 1 checkpoint
    - Train LoRA adapter per task
    - Eval after each task, print ship-criteria table
    - Narrator: LoRA r=16, attention+FFN, 7 epochs, lr 1e-4
    - Summarizer: LoRA r=8, attention only, 7 epochs, lr 1e-4
    - Explainer: LoRA r=16, attention+FFN, 4 epochs, lr 1e-4
  - Phase 3: GGUF export
    - Quantize each task adapter to q4_k_m
    - Upload to Google Drive (or HF Hub if HF_TOKEN provided)
- Print comparison table: Qwen 3.5-4B vs Gemma 4 E4B metrics across all tasks
- Recommend winner based on ship criteria
```

### Training Hyperparameters

Based on D4BL's proven configurations. Both models use bf16 LoRA (not QLoRA) — Unsloth discourages 4-bit QLoRA on Qwen 3.5 due to quantization artifacts, and Gemma 4 also recommends bf16 LoRA.

| Parameter | Phase 1 (Domain) | Phase 2 (Tasks) |
|-----------|------------------|-----------------|
| LoRA rank | 16 | 8-16 (task-dependent) |
| LoRA alpha | 32 | 16-32 |
| Learning rate | 2e-4 | 1e-4 |
| Batch size (per device) | 8 | 4-8 |
| Gradient accumulation | 4 | 2-4 |
| Epochs | 1 | 4-7 |
| Max sequence length | 4096 | 4096-8192 |
| Optimizer | AdamW 8-bit | AdamW 8-bit |
| Precision | bf16 (A100) | bf16 (A100) |
| Quantization during training | None (bf16 LoRA) | None (bf16 LoRA) |

### What the Notebook Does NOT Do

- Does not run distillation (that's local via `python -m training.distill`)
- Does not register Ollama models (local after downloading GGUFs)
- Does not modify the repo (read-only clone for config + training data)

## 5. SHAP Narrator Task Design

### New Task Type: `narrator`

This is the highest-value task — it transforms per-student SHAP attribution data into advisor-facing narratives that explain *why* a student is at risk and *what specifically to do about it*.

### Input Format (at inference)

```json
{
  "student_profile": {
    "enrollment_intensity": "Part-Time",
    "gpa_year1": 1.4,
    "math_placement": "R",
    "course_completion_rate": 0.55,
    "gateway_math_completed": false,
    "at_risk_alert": "HIGH",
    "retention_probability": 0.28
  },
  "readiness_score": 0.38,
  "readiness_level": "low",
  "risk_factors": [
    "Low first-year GPA (1.4 / 4.0)",
    "Gateway math not completed in Year 1"
  ],
  "shap": {
    "retention": {
      "base_value": 0.52,
      "top_positive": [
        {"feature": "total_credits_attempted", "shap_value": 0.05, "value": 12.0}
      ],
      "top_negative": [
        {"feature": "CompletedGatewayMathYear1", "shap_value": -0.18, "value": 0.0},
        {"feature": "Enrollment_Intensity_First_Term", "shap_value": -0.12, "value": 1.0}
      ]
    },
    "gateway_math": { ... },
    "low_gpa": { ... }
  }
}
```

### Output Schema

```json
{
  "narrative": "2-3 sentence explanation grounded in SHAP attribution",
  "key_drivers": [
    "Gateway math not completed (-0.18 on retention)",
    "Part-time enrollment (-0.12 on retention)"
  ],
  "recommended_actions": [
    "Priority enrollment in MAT 100 next term",
    "Explore full-time enrollment options and financial aid",
    "Connect with Math Bootcamp (2x pass rate for participants)"
  ],
  "data_limitations": [
    "Retention model trained on 2019-2023 cohorts; 2024+ patterns may differ"
  ]
}
```

### Distillation Strategy

1. Pull ~4K students from `student_level_with_predictions` joined with `llm_recommendations`
2. For each medium/low readiness student (~2K): build input from `shap_explanations` + `input_features` columns
3. Send to Claude (teacher model) with system prompt grounded in Bishop State context from `config.yaml`
4. Validate output JSON schema, deduplicate (Jaccard 1.0), split 80/10/10
5. Target: ~1,500 validated training pairs

### Eval Metrics (Ship Criteria)

| Metric | Threshold | Blocking? |
|--------|-----------|-----------|
| `json_valid_rate` | >= 95% | Yes |
| `schema_valid_rate` | >= 90% | Yes |
| `shap_grounding_rate` | >= 80% (narrative mentions >= 2 of top-3 SHAP features) | Yes |
| `action_specificity` | LLM-judged: are actions Bishop State-specific? | No |

## 6. Dashboard Integration

### Model Client as Single Adapter

`model-client.ts` becomes the sole inference routing layer. Existing routes (`explain-pairing/route.ts`, `query-summary/route.ts`) that currently instantiate their own OpenAI clients will be refactored to call `generateExplanation()` and `generateSummary()` from `model-client.ts`.

### Ollama Model Naming

```
bishop-state-narrator:{model}     # SHAP narrator
bishop-state-summarizer:{model}   # Query summary
bishop-state-explainer:{model}    # Course pairing
```

Where `{model}` is the winning model identifier (e.g., `qwen3.5-4b` or `gemma4-e4b`) based on evaluation results.

### SHAP Narrator Integration Point

`generate_readiness_scores.py` already has `--enrich-with-llm` with the SHAP-aware prompt. The only change is the model string:

```bash
# Before (OpenAI)
python ai_model/generate_readiness_scores.py --enrich-with-llm --llm-model gpt-4o-mini

# After (fine-tuned, winner TBD after evaluation)
python ai_model/generate_readiness_scores.py --enrich-with-llm --llm-model ollama/bishop-state-narrator
```

### Environment Variables

```env
MODEL_BACKEND=ollama              # or "openai" (fallback)
OLLAMA_BASE_URL=http://localhost:11434
MODEL_TAG=qwen3.5-4b             # or gemma4-e4b, set after evaluation picks winner
SCHOOL_CODE=bishop-state
```

### Fallback Behavior

The operator sets `MODEL_BACKEND` to either `ollama` or `openai`. There is no automatic failover — if Ollama is down and `MODEL_BACKEND=ollama`, the route returns an error. This is intentional: silent fallback to OpenAI would send student data to an external service without the operator's knowledge, violating the FERPA benefit.

## 7. Cost Estimate

| Item | Cost |
|------|------|
| Claude API distillation (~4,500 pairs across 3 tasks) | $5-10 |
| Colab A100 compute (~4-5 hours for 2 models, bf16 LoRA) | $8-20 |
| **Total per training run** | **$13-30** |
| Iteration runs (subsequent) | $8-20 each |

Note: bf16 LoRA (required for Qwen 3.5, recommended for Gemma 4) uses more VRAM than QLoRA but fits comfortably on A100 40GB. Training time may be slightly longer than D4BL's QLoRA runs.

## 8. Success Criteria

The epic is complete when:

1. All three tasks pass ship criteria on the winning model (Qwen 3.5-4B or Gemma 4 E4B)
2. `MODEL_BACKEND=ollama` serves all three tasks in the dashboard without OpenAI
3. SHAP narrator produces grounded narratives that cite specific feature attributions
4. Feasibility report is updated with actual metrics, model comparison, and selection rationale
5. Colab notebook is documented and reproducible (clone + Run All)
6. Model selection decision is documented with head-to-head metrics for both candidates
