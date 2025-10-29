
# Hackathon MVP — GitHub Issues (24‑Hour Prototype)
**Context:** Issues derived from the AI‑Powered Student Success Analytics PRD.  
**Use:** This file is machine‑parsable by Cursor and easy to convert into `gh issue create` commands.  
**Convention:** Each issue block is delimited by `---` and includes keys: `Title`, `Labels`, `Estimate`, and `Body` (GitHub‑flavored Markdown).

> Priority levels: **P0 (Must‑Have)**, **P1 (Nice‑to‑Have)**, **P2 (Stretch)**

## Quick Start (optional)
You can script creation like:
```bash
# Example: create first issue block manually
gh issue create   --title "MVP data schema & seed AR/PDP sample"   --body "$(awk '/^---/{f++} f==1{print}' hackathon_github_issues.md | sed '1,4d')"   --label "priority:P0" --label "area:data" --label "type:feature" --label "hackathon"
```
(Or let Cursor generate a script to iterate over blocks.)

---
Title: MVP data schema & seed AR/PDP sample in Supabase
Labels: ["priority:P0","area:data","type:feature","hackathon","mvp"]
Estimate: 2h
Body:
  ### Summary
  Define a minimal relational schema in **Supabase** to hold **PDP/AR-like** data (students, terms, courses, enrollments, outcomes/DFWI). Seed with a small synthetic sample for each institution.

  ### Why
  Unblocks every downstream feature (dashboards, NLQ, baseline ML). Supabase provides instant REST/GraphQL APIs.

  ### Acceptance Criteria
  - Tables created in Supabase for: `students`, `terms`, `courses`, `enrollments`, `outcomes_dfwi`.
  - Sample rows loaded for KCTCS, Bishop State, Akron.
  - README shows Supabase setup & connection details.

  ### Tasks
  - Create Supabase project and SQL migrations.
  - Write a loader script to insert sample CSVs.
  - Provide ERD diagram (exported PNG).

  ### Out of Scope
  Full PDP spec parity.

---
Title: ETL loader for CSV (local) → Supabase
Labels: ["priority:P0","area:data","type:feature","hackathon","etl"]
Estimate: 2h
Body:
  ### Summary
  Minimal Python ETL script that loads local **CSV** into Supabase from `/data/*.csv` using Supabase client library.

  ### Why
  Consistent repeatable load to refresh the prototype quickly during the hackathon.

  ### Acceptance Criteria
  - `make load` or `python scripts/load_csv.py` ingests all CSVs to Supabase.
  - Logs rows upserted per table.
  - Idempotent (can re-run without dupes).

  ### Tasks
  - Implement CSV reader + UPSERTs using Supabase Python client.
  - Store Supabase credentials in `.env`.
  - Document in README.

---
Title: PDP pre‑submission validator (lightweight)
Labels: ["priority:P0","area:data","type:tooling","hackathon"]
Estimate: 1.5h
Body:
  ### Summary
  Python validator that checks common PDP formatting issues (required columns present, types OK, no nulls in keys).

  ### Why
  Addresses PRD callout for reducing latency from PDP rejections.

  ### Acceptance Criteria
  - CLI: `python tools/pdp_validate.py path/to/file.csv` -> clear pass/fail + line counts.
  - Unit tests for 3 common error cases.

  ### Tasks
  - Define minimal rules (YAML) and validator.
  - Add sample bad file in `/fixtures`.

---
Title: Supabase API setup & custom Edge Functions
Labels: ["priority:P0","area:backend","type:feature","hackathon","api"]
Estimate: 2h
Body:
  ### Summary
  Configure Supabase auto-generated REST API and create custom Edge Functions for complex queries:
  - `/metrics/retention?term=...`
  - `/metrics/gateway_completion?course_id=...`
  - `/students/at_risk?limit=...`

  ### Why
  Supabase provides instant CRUD APIs; Edge Functions handle custom business logic for dashboard and NLQ layer.

  ### Acceptance Criteria
  - Supabase REST API configured with RLS policies.
  - Custom Edge Functions deployed for complex metrics.
  - Returns JSON from Supabase queries.

  ### Tasks
  - Configure Supabase API settings & auth.
  - Implement Edge Functions for custom metrics.
  - Test API endpoints with Postman/curl.

---
Title: React dashboard (MVP) with 3 core widgets
Labels: ["priority:P0","area:frontend","type:feature","hackathon","ui"]
Estimate: 3h
Body:
  ### Summary
  A simple React (Vite) dashboard that calls the Supabase API and shows:
  1) Retention % by cohort/term
  2) Gateway course completion %
  3) DFWI by course

  ### Why
  Visual proof of value for judges; matches PRD core KPIs.

  ### Acceptance Criteria
  - Local dev: `npm run dev` works.
  - Charts render from Supabase API, not hard-coded.
  - Institution switcher (dropdown) filters data.
  - Supabase JS client integrated.

  ### Tasks
  - Set up project with Tailwind + Supabase client.
  - Charting lib (Recharts).
  - Minimal routing + error states.

---
Title: NLQ stub: natural‑language → SQL (rule‑based)
Labels: ["priority:P0","area:ai","type:feature","hackathon","nlq"]
Estimate: 2h
Body:
  ### Summary
  Implement a **rule‑based** mapper (Supabase Edge Function or Python service) for whitelisted queries (e.g., "retention last term", "DFWI for COURSE101"). Avoids full LLM dependency for MVP.

  ### Why
  Demonstrates AI‑assisted experience in 24h.

  ### Acceptance Criteria
  - Edge Function or endpoint `/nlq?q=...` returns JSON with the matched metric + underlying query used.
  - Support 5–7 canonical phrasings.
  - Leverages Supabase queries for data fetching.

  ### Tasks
  - Define patterns → Supabase query templates.
  - Reuse existing metrics queries.

  ### Out of Scope
  Free‑form arbitrary SQL generation.

---
Title: Baseline at‑risk score (heuristic)
Labels: ["priority:P0","area:ml","type:feature","hackathon","mvp"]
Estimate: 2h
Body:
  ### Summary
  Compute a naive "at‑risk" score per student using simple features: prior D/F/W/I counts, gateway completion, credits completed.

  ### Why
  Delivers predictive flavor without long model training.

  ### Acceptance Criteria
  - Supabase view or Edge Function for `/students/at_risk` returns top N with score & reasons.
  - Document formula in README.

  ### Tasks
  - Create Supabase SQL view or stored function to compute score.
  - Expose via Edge Function or direct RPC call.

---
Title: Weekly refresh job (cron) — simulated
Labels: ["priority:P0","area:platform","type:chore","hackathon","ops"]
Estimate: 1h
Body:
  ### Summary
  Add a containerized cron (or `watch`) that re-runs ETL loader on a schedule (simulate “weekly” as every 5 minutes in dev).

  ### Why
  Matches PRD “weekly refresh” expectation.

  ### Acceptance Criteria
  - Job logs visible in `docker compose logs`.
  - Re-loads CSVs without downtime.

  ### Tasks
  - Add lightweight scheduler container.
  - Document how to toggle frequency.

---
Title: Supabase Auth setup (optional for MVP)
Labels: ["priority:P1","area:security","type:feature","hackathon"]
Estimate: 1.5h
Body:
  ### Summary
  Set up basic Supabase authentication with email/password or magic link for demo purposes.

  ### Why
  Demonstrates security best practices and leverages Supabase's built-in auth.

  ### Acceptance Criteria
  - Supabase Auth configured with at least one provider.
  - Login/logout flow in React UI.
  - RLS policies protect sensitive data.

  ### Tasks
  - Enable Supabase Auth in project settings.
  - Implement login UI component.
  - Configure basic RLS policies.

---
Title: Role‑based views (very light)
Labels: ["priority:P0","area:security","type:feature","hackathon","mvp"]
Estimate: 1h
Body:
  ### Summary
  UI visibility toggles for 2 roles: **Advisor** (show at‑risk list) and **Leadership** (show ROI/retention charts). Leverage Supabase Auth user metadata for roles or use `.env ROLE=advisor|leadership` for MVP.

  ### Why
  Demonstrates accessibility angle with minimal IAM setup.

  ### Acceptance Criteria
  - Role-based widget visibility (from Supabase Auth or `.env`).
  - Document behavior.

---
Title: FERPA/PII hygiene pass (MVP)
Labels: ["priority:P0","area:compliance","type:chore","hackathon"]
Estimate: 1h
Body:
  ### Summary
  Ensure sample data is synthetic. Mask or suppress direct identifiers in UI/API by default (use internal IDs).

  ### Why
  Aligns with compliance best practices.

  ### Acceptance Criteria
  - No student names/SSNs exposed.
  - UI shows anonymized IDs only.
  - README lists data provenance.

---
Title: Demo script & screenshots
Labels: ["priority:P0","area:docs","type:documentation","hackathon"]
Estimate: 1h
Body:
  ### Summary
  Short script for a 5–7 minute demo + 4 screenshots of key widgets.

  ### Why
  Ensures a tight, rehearsed final presentation.

  ### Acceptance Criteria
  - `DEMO.md` with talk track + commands.
  - `/shots/*.png` added.

---
Title: One‑page ROI summary per institution
Labels: ["priority:P1","area:docs","type:documentation","hackathon"]
Estimate: 1h
Body:
  ### Summary
  Brief write‑ups mapping dashboard value to each institution (KCTCS, Bishop State, Akron) and their use cases.

  ### Acceptance Criteria
  - `docs/roi_kctcs.md`, `docs/roi_bishop_state.md`, `docs/roi_akron.md`

---
Title: Course sequence insight (DFWI by combo) — static query
Labels: ["priority:P1","area:data","type:feature","hackathon"]
Estimate: 1.5h
Body:
  ### Summary
  Provide a precomputed Supabase view for DFWI by common course combinations (top 10 combos) and expose via API.

  ### Acceptance Criteria
  - Supabase SQL view + accessible via REST API + UI table widget.

---
Title: Email export (CSV) of at‑risk list
Labels: ["priority:P1","area:frontend","type:feature","hackathon","export"]
Estimate: 1h
Body:
  ### Summary
  Button on Advisor view to export current at‑risk table as CSV.

  ### Acceptance Criteria
  - Downloads CSV reflecting current filters.

---
Title: Health & diagnostics page
Labels: ["priority:P1","area:platform","type:chore","hackathon","ops"]
Estimate: 1h
Body:
  ### Summary
  Small UI page that checks Supabase connection status and displays last ETL refresh timestamp.

  ### Acceptance Criteria
  - Green/Red indicators with timestamps.
  - Shows Supabase API connectivity status.

---
Title: LLM‑backed NLQ (behind a flag)
Labels: ["priority:P2","area:ai","type:feature","hackathon","nlq"]
Estimate: 3h
Body:
  ### Summary
  Swap the rule‑based NLQ with an LLM call if `ENABLE_LLM=1`. Keep same query whitelist.

  ### Acceptance Criteria
  - Feature flag respected.
  - Logs prompt + chosen SQL safely.

---
Title: Simple retention baseline model (logistic regression)
Labels: ["priority:P2","area:ml","type:feature","hackathon"]
Estimate: 3h
Body:
  ### Summary
  Train a fast sklearn logistic regression on sample historical features from Supabase to classify "retained next term" (for demo).

  ### Acceptance Criteria
  - Training script with saved coefficients.
  - Edge Function or batch job to compute predictions and store back in Supabase.

---
Title: PowerBI/Embedding spike (notes only)
Labels: ["priority:P2","area:integration","type:spike","hackathon"]
Estimate: 1h
Body:
  ### Summary
  Investigate feasibility of embedding Supabase API data into PowerBI/Looker equivalents; capture notes and blockers for post‑hackathon.

  ### Acceptance Criteria
  - `spikes/powerbi_embed.md` committed.
  - Document Supabase REST API → PowerBI connector options.

---
Title: Packaging & one‑command bootstrap
Labels: ["priority:P1","area:devex","type:chore","hackathon"]
Estimate: 1h
Body:
  ### Summary
  Single command (`make dev` or `./bootstrap.sh`) to set up environment and start the UI (Supabase is cloud-hosted).

  ### Acceptance Criteria
  - Works on clean machine with Node + Python preinstalled.
  - Configures `.env` with Supabase credentials.
  - README updated.

---
Title: README (root) with setup & architecture
Labels: ["priority:P0","area:docs","type:documentation","hackathon","mvp"]
Estimate: 1h
Body:
  ### Summary
  Clear, concise README: architecture diagram showing Supabase integration, services, how to run, and demo flow.

  ### Acceptance Criteria
  - Architecture diagram image (showing Supabase as backend/DB).
  - Copy‑paste commands for local run.
  - Supabase setup instructions.
  - Link to DEMO.md.

