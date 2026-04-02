# Fine-Tuning Feasibility Report: Bishop State Student Success Dashboard

**Date:** 2026-04-01
**Based on:** D4BL AI Agent fine-tuning experiments (Qwen 2.5-3B → Qwen 3.5-4B)

---

## Executive Summary

Fine-tuning a small language model (Qwen 3.5-4B) for the Bishop State dashboard is **feasible and cost-effective**. The D4BL project proved the approach across 5 experiments at a total cost of ~$51. The codebenders dashboard already has Ollama integration built into `model-client.ts`, making deployment straightforward. The primary benefit is eliminating per-request OpenAI API costs and enabling air-gapped deployment; the primary risk is the narrow margin for error on SQL generation accuracy.

**The highest-value application is improved explainability.** The current system produces predictions (retention probability, risk categories) but offers only templated, rule-based explanations for *why* a student is at risk. Combining per-student SHAP feature attribution with a fine-tuned explainer model would give advisors mechanistically grounded, institution-aware narratives — transforming "High Risk" labels into actionable intervention guidance.

---

## 1. Current AI Usage in Bishop State Dashboard

The dashboard currently calls **OpenAI GPT-4o-mini** for three tasks:

| Task | Endpoint | What It Does | Complexity |
|------|----------|-------------|------------|
| **Query Analyzer** | `/api/analyze` | Natural language → SQL + viz plan | HIGH — must produce valid PostgreSQL with exact column quoting |
| **Query Summarizer** | `/api/query-summary` | Data results → plain-English summary | LOW — straightforward text generation |
| **Course Explainer** | `/api/courses/explain-pairing` | Co-enrollment stats → advisor insight | MEDIUM — data interpretation + recommendation |

**Current cost estimate:** At GPT-4o-mini pricing ($0.15/$0.60 per 1M input/output tokens), each query analyzer call uses ~1,500 input tokens and ~200 output tokens. At 100 queries/day:
- ~$0.75/month for summarizer + explainer
- ~$2.25/month for query analyzer
- **Total: ~$3/month** at current usage levels

---

## 2. D4BL Fine-Tuning Approach (What Was Proven)

### Architecture: Three-Phase Pipeline

```
Phase 1: Domain Adaptation     → Teach equity/social-justice vocabulary
Phase 2: Task-Specific LoRA    → Train parser, explainer, evaluator adapters
Phase 3: GGUF Export           → Quantize to q4_k_m (~2.7 GB per model)
```

### Key Technical Choices

| Decision | D4BL Choice | Rationale |
|----------|-------------|-----------|
| Base model | Qwen 3.5-4B | Best quality-to-size ratio for structured output |
| Fine-tuning method | LoRA (rank 8-16) | Parameter-efficient, trains on single GPU |
| Quantization | 4-bit (q4_k_m) | 2.7 GB per model, runs on CPU |
| Training framework | Unsloth + HF TRL | 2-10x faster than vanilla HF |
| Hardware | Google Colab A100 | $2-4/hour, sufficient for all phases |
| Inference runtime | Ollama | Simple deployment, HTTP API |
| Data generation | Claude API distillation | High-quality synthetic training pairs |

### Experiment Results Summary

| Experiment | Model | Key Result | Cost |
|-----------|-------|------------|------|
| 1 (baseline) | Qwen 2.5-3B | 3/11 tests passing — JSON output broken | $19 |
| 2 (JSON fix) | Qwen 2.5-3B | **11/11 tests passing** — chat template fix | $19 |
| 3 (upgrade) | Qwen 3.5-4B | Base model upgrade, maintained quality | $4 |
| 4 (v3 docs) | Qwen 3.5-4B | Parser entity F1: 72.66%, Evaluator: 84% accuracy | $4.59 |
| 5 (v3.1 expand) | Qwen 3.5-4B | **FAILED** — domain re-adaptation broke adapters | $4.59 |
| **Total** | | | **~$51** |

### Critical Lessons Learned

1. **Chat template alignment is everything.** The #1 cause of failure was mismatched token sequences between training and inference. `tokenizer.apply_chat_template()` must be used during training, and Ollama Modelfiles must use explicit `TEMPLATE` directives.

2. **LoRA adapters are co-adapted with their base.** Re-running Phase 1 (domain adaptation) on even slightly different data breaks all Phase 2 adapters. All task adapters must be retrained together.

3. **Small models need exact prompt matching.** A 4B model trained on subtask-specific system prompts produces 0% accuracy when given a generic prompt at inference. Each task needs its own Modelfile with the matching system prompt.

4. **400+ examples minimum for structured output.** JSON generation requires significant training data to be reliable.

---

## 3. Adapting This Approach for Bishop State

### Tasks to Fine-Tune

| Task | Training Difficulty | Data Source | Estimated Pairs Needed |
|------|-------------------|-------------|----------------------|
| **Query Analyzer** (NL → SQL) | **HARD** | Seed queries + schema variations | 800-1,200 |
| **Summarizer** (data → English) | **EASY** | Synthetic query+result pairs | 400-600 |
| **Course Explainer** (stats → insight) | **MEDIUM** | Co-enrollment scenarios | 400-600 |

### Domain Corpus for Phase 1

The Bishop State project has rich domain data for vocabulary adaptation:

| Source | Records | Content |
|--------|---------|---------|
| `student_level_with_predictions` | ~4,000 | Student demographics, academic metrics, ML predictions |
| `course_enrollments` | ~100,000 | Course grades, delivery methods, instructor types |
| `data/*.csv` | ~520,000 | Raw CSV data (students + courses) |
| Column descriptions (30+ columns) | — | Schema documentation with domain vocabulary |

**Estimated domain corpus:** 15,000-25,000 passages (smaller than D4BL's 43K, but sufficient for a focused educational domain).

### Training Data Generation Strategy

**For the Query Analyzer (highest risk):**
- Start with the 40+ seed queries in `schools/bishop-state/seed_queries.yaml`
- Use Claude API to generate 800+ variations covering:
  - All column combinations (30+ columns across 2 tables)
  - Filter combinations (cohort, term, demographics, enrollment type)
  - Aggregation patterns (AVG, COUNT, GROUP BY, HAVING)
  - Edge cases (mixed-case quoting, DFWI rate computation, FERPA exclusions)
- The existing prompt in `/api/analyze/route.ts` (lines 131-230) serves as a gold-standard system prompt to distill from

**For Summarizer and Explainer:**
- Generate synthetic query results, pair with Claude-generated summaries
- Lower risk — these tasks produce free-form text, not executable SQL

---

## 4. Cost Analysis

### One-Time Training Costs

| Item | Estimated Cost | Notes |
|------|---------------|-------|
| Claude API for distillation | $3-8 | ~2,000 API calls at $0.003/call avg |
| Colab A100 compute | $15-25 | ~8-12 hours across all phases |
| Developer time | 3-5 days | Pipeline setup, evaluation, iteration |
| **Total one-time** | **$18-33** | Excluding developer time |

Subsequent training runs (iteration, data expansion) cost ~$4-5 each, as proven by D4BL experiments 3-5.

### Ongoing Inference Costs

| Deployment | Monthly Cost | Latency | Notes |
|-----------|-------------|---------|-------|
| **Ollama on Vercel/VM** | $0 (CPU) / $24-50 (GPU) | 2-13s (CPU) / 200-500ms (GPU) | Self-hosted |
| **RunPod Serverless** | $5-25 | 500ms-2s | Pay-per-request, cold starts |
| **Current (GPT-4o-mini)** | ~$3 | 500ms-1s | Per-token pricing |

### Break-Even Analysis

At current low usage (~100 queries/day, ~$3/month in OpenAI costs), fine-tuning **does not break even on cost alone**. The economics shift at scale:

| Daily Queries | OpenAI Monthly | Self-Hosted GPU Monthly | Break-Even? |
|--------------|---------------|------------------------|-------------|
| 100 | $3 | $24 | No — OpenAI is 8x cheaper |
| 1,000 | $30 | $24 | Yes — at ~800 queries/day |
| 5,000 | $150 | $24 | Yes — 6x savings |
| 10,000+ | $300+ | $24-50 | Yes — clear winner |

**Verdict:** Cost savings alone do not justify fine-tuning at current scale. The value proposition is in the non-monetary benefits below.

---

## 5. Benefits Beyond Cost

### 5.1 Data Privacy & FERPA Compliance
- Student queries currently transit to OpenAI servers
- A fine-tuned model running on Ollama keeps all data on-premises
- Critical for FERPA compliance — student GUIDs and demographic data never leave the institution's infrastructure
- The dashboard already excludes `Student_GUID` from SQL output, but query *inputs* (e.g., "show me students in nursing program") still go to OpenAI

### 5.2 Offline / Air-Gapped Deployment
- Community colleges may have restricted network environments
- A GGUF model + Ollama runs entirely offline after initial setup
- No API key management, no vendor dependency, no rate limits

### 5.3 Domain Accuracy
- GPT-4o-mini must be guided by a 4KB system prompt (lines 131-230 of `/api/analyze/route.ts`) to generate correct SQL
- A fine-tuned model internalizes the schema, quoting rules, and domain vocabulary
- D4BL saw data_source_accuracy jump from 71.6% → 98.77% after domain adaptation
- Expected improvement for Bishop State: more reliable mixed-case column quoting, correct DFWI rate computation without prompt engineering

### 5.4 Institutional Scalability
- Once the pipeline exists, adapting to a new institution (e.g., University of Akron) requires only:
  - New domain corpus extraction
  - New seed query generation
  - Re-run Phase 1 + Phase 2 (~$5 per institution)
- The `SCHEMA_INFO` object in `/api/analyze/route.ts` already supports multiple institutions

### 5.5 Latency Consistency
- OpenAI API latency varies (500ms-3s depending on load)
- Local Ollama on GPU provides consistent ~200-500ms latency
- Important for interactive query experience

---

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **SQL generation accuracy** — A 4B model may produce invalid SQL more often than GPT-4o-mini | HIGH | Validate SQL before execution (already done via `execute-sql` route). Fall back to GPT-4o-mini on parse failure. D4BL achieved 98.77% schema validity. |
| **Mixed-case column quoting** — Bishop State schema requires exact `"Cohort"` quoting | HIGH | Include 200+ quoting-focused training pairs. Test with all 30+ columns. The current prompt already documents this extensively. |
| **Adapter co-adaptation** — Changing domain data breaks task adapters | MEDIUM | Never re-run Phase 1 without retraining all Phase 2 adapters (lesson from D4BL experiment 5). Version-lock all artifacts together. |
| **Cold start latency (CPU)** — First query on Ollama CPU can take 10-15s | MEDIUM | Keep model loaded in memory with Ollama `keep_alive`. Use GPU deployment for production. |
| **Maintenance burden** — Schema changes require retraining | LOW | Schema changes are rare (~1-2 per semester). Retraining costs ~$5 and takes 2 hours. |
| **Model size on student machines** — 2.7 GB per GGUF model | LOW | Only needed on server, not client devices. |

---

## 7. Recommended Approach

### Phase 1: Validate with Summarizer (Low Risk, 1-2 days)

Fine-tune the **summarizer** task first — it's the simplest (free-form text output, no SQL), and the `model-client.ts` adapter already supports routing to Ollama.

1. Extract domain corpus from `student_level_with_predictions` and `course_enrollments`
2. Generate 500 summary training pairs via Claude distillation
3. Train on Colab A100 (~2 hours, ~$4)
4. Deploy GGUF to Ollama, set `MODEL_BACKEND=ollama`
5. Compare output quality against GPT-4o-mini baseline

### Phase 2: Course Explainer (Medium Risk, 1-2 days)

Fine-tune the **explainer** — similar to summarizer but with data interpretation. Reuse Phase 1 domain adaptation checkpoint.

### Phase 3: Query Analyzer (High Risk, 3-5 days)

Fine-tune the **query analyzer** last — this is the hardest task (structured SQL output with strict schema requirements). By this point, the pipeline is proven and domain adaptation is stable.

1. Generate 1,000+ NL→SQL training pairs covering all schema patterns
2. Train with higher LoRA rank (r=16) and more epochs (7-10)
3. Evaluate against seed queries + edge cases
4. Implement fallback: try fine-tuned model first, fall back to GPT-4o-mini on SQL validation failure

### Estimated Total Timeline & Cost

| Phase | Time | Compute Cost |
|-------|------|-------------|
| Phase 1 (Summarizer) | 1-2 days | $5-8 |
| Phase 2 (Explainer) | 1-2 days | $4-5 |
| Phase 3 (Query Analyzer) | 3-5 days | $8-15 |
| **Total** | **5-9 days** | **$17-28** |

---

## 8. Conclusion

| Factor | Assessment |
|--------|-----------|
| **Technical feasibility** | **HIGH** — D4BL proved the exact pipeline works. Infrastructure (Ollama adapter) already exists in codebenders. |
| **Cost feasibility** | **HIGH** — Training costs ~$20-30 total. Does not save money at current scale, but saves significantly at 800+ queries/day. |
| **Quality feasibility** | **MEDIUM-HIGH** — Summarizer and explainer are straightforward. Query analyzer is harder but D4BL achieved 98.77% schema validity on a similar task. |
| **Strategic value** | **HIGH** — FERPA compliance, offline deployment, institutional scalability, and vendor independence are strong non-monetary drivers. |

**Recommendation:** Proceed with fine-tuning, starting with SHAP integration + explainer (highest value) before tackling SQL generation.

---

## 9. Explainability: The Highest-Value Application

### 9.1 Current Explainability Gap

The ML pipeline trains 7 models (retention, early warning, time-to-credential, credential type, gateway math, gateway English, low GPA) using XGBoost and Random Forest. Each produces predictions stored in `student_level_with_predictions`. However, **no per-student explanation is generated during training**.

The explainability stack today:

| Layer | File | Output | Limitation |
|-------|------|--------|-----------|
| **XGBoost feature importances** | `complete_ml_pipeline.py:432-440` | Global top-10 features printed to console | Not computed per-student; not stored in DB |
| **Rule engine rationale** | `generate_readiness_scores.py:388-411` | Templated sentence: "Readiness score of 0.38 (low) based on..." | Identical structure for every student; no model-specific attribution |
| **Rule engine risk factors** | `generate_readiness_scores.py:314-353` | List of if/then triggered strings | Binary triggers (e.g., "GPA < 2.0"), no magnitude or relative importance |
| **Rule engine actions** | `generate_readiness_scores.py:356-385` | Keyword-mapped suggestions | Same action for every student matching a keyword; not personalized |
| **LLM enrichment** (optional) | `generate_readiness_scores.py:450-523` | GPT-4o-mini rewrites rationale | Better prose, but no access to actual model internals (SHAP values); generic domain knowledge |

**What advisors actually need:** "Why is *this* student at 28% retention probability, and what specifically could change that number?"

### 9.2 SHAP + Fine-Tuned Explainer Architecture

The proposed approach has two independent layers that compose:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: SHAP Values (Mechanistic Ground Truth)     │
│                                                     │
│  XGBoost models → per-student feature contributions │
│  Stored in DB alongside predictions                 │
│  No LLM needed — pure computation                   │
└──────────────────────┬──────────────────────────────┘
                       │ feeds into
┌──────────────────────▼──────────────────────────────┐
│ Layer 2: Fine-Tuned Explainer (Narrative Layer)     │
│                                                     │
│  SHAP values + student profile → advisor narrative  │
│  Institution-aware: knows Bishop State programs,    │
│  gateway sequences, credit milestones               │
│  Runs on Ollama via existing model-client.ts        │
└─────────────────────────────────────────────────────┘
```

**Layer 1 (SHAP)** ensures explanations are *faithful* to what the model actually learned — not hallucinated post-hoc reasoning. **Layer 2 (fine-tuned explainer)** translates raw attribution numbers into advisor-friendly language with institutional context.

### 9.3 What SHAP Enables (Per Model)

| Model | SHAP Would Tell Advisors | Example |
|-------|--------------------------|---------|
| **Retention** (XGBoost) | Which factors most push this student toward/away from retention | "Part-time enrollment is the #1 factor reducing your predicted retention (-0.18). Your GPA of 2.8 is actually protective (+0.12)." |
| **Gateway Math** (XGBoost) | What predicts math gateway success for this student | "Math placement level (remedial) accounts for 40% of the predicted difficulty. English placement is a secondary factor." |
| **Gateway English** (XGBoost) | Same for English pathway | "Reading placement is the strongest predictor for this student's English gateway risk." |
| **Low GPA** (XGBoost) | Pre-enrollment risk factors for academic probation | "Enrollment intensity (part-time) and math placement (remedial) together account for 60% of the GPA risk signal." |
| **Credential Type** (Random Forest) | Why the model predicts Associate's vs Certificate | "Credit trajectory and program of study are driving the Associate's prediction over Certificate." |

### 9.4 Example: Current vs. Enhanced Explanation

**Current (rule engine):**
> Readiness score of 0.38 (low) based on: academic performance (GPA 1.4/4.0, 55% course completion), engagement (Part-Time enrollment, 4 courses), and ML risk assessment (HIGH alert, 28% predicted retention).

**Enhanced (SHAP + fine-tuned explainer):**
> This part-time nursing student's 28% retention probability is primarily driven by three factors: (1) not completing gateway math in Year 1, which alone shifts the prediction by 18 percentage points; (2) part-time enrollment intensity, contributing a 12-point reduction vs. full-time peers; and (3) a 1.4 first-year GPA, though this is partially offset by completing 4 courses and attempting 12 credits. Students with similar profiles who completed MAT 100 the following term and increased to full-time showed an average 34-point improvement in retention probability. **Recommended:** Priority enrollment in MAT 100 next term with full-time status and tutoring support.

### 9.5 Training Data for the Explainer

| Source | Records | Use |
|--------|---------|-----|
| Existing `llm_recommendations` | ~4,000 | Seed data — rule-based rationale to improve upon |
| SHAP values (once computed) | ~4,000 | Structured input for distillation |
| Student profiles (FERPA-safe) | ~4,000 | Already stored in `input_features` JSONB column |

**Distillation strategy:** For each student, feed Claude the SHAP values + profile + rule-engine rationale, and ask it to generate an improved narrative. This produces 4,000 training pairs at ~$2-4 in API costs.

### 9.6 Feasibility Summary for Explainability

| Component | Effort | Cost | Risk |
|-----------|--------|------|------|
| **SHAP integration** (Layer 1) | 1-2 days | $0 (just `pip install shap`) | LOW — XGBoost has native SHAP support |
| **DB schema for SHAP** | 0.5 day | $0 | LOW — add JSONB column to `student_level_with_predictions` or `llm_recommendations` |
| **Distillation pairs** | 0.5 day | $2-4 | LOW — Claude generates from structured data |
| **Fine-tune explainer** | 1-2 days | $5-8 | LOW — text generation, no strict schema |
| **Dashboard integration** | 1-2 days | $0 | MEDIUM — new UI component for SHAP waterfall |
| **Total** | **4-7 days** | **$7-12** | **LOW-MEDIUM** |

### 9.7 Recommended Explainability Roadmap

**Phase 0 (Immediate, no fine-tuning needed):** Add SHAP computation to the ML pipeline. Store per-student SHAP values alongside predictions. This alone is a major explainability improvement — advisors see which features drive each prediction.

**Phase 1 (Fine-tune explainer):** Train a Qwen 3.5-4B explainer that takes SHAP values + profile → advisor narrative. Deploy via Ollama using the existing `model-client.ts` adapter and `enrich_with_llm` path.

**Phase 2 (Counterfactual):** Use the trained ML models to compute "what-if" scenarios (modify one feature, re-predict) and have the explainer narrate the delta. This gives advisors specific, quantified intervention guidance.
