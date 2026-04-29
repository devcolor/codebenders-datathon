# AASCU Intermediary Feedback — Summary & Tool Gap Analysis

**Source:** AASCU Meeting Recording (~21 min) + typed notes from session
**Participants:** Two AASCU Intermediaries (IFS) — one IR-focused (Andres), one data-engineering-focused (Dr. Prateek)
**Date of analysis:** 2026-04-28

> **Context — what is an Intermediary (IFS)?**
> Intermediaries are organizations selected and funded by the Gates Foundation to support a network of institutions. They translate institutional needs into context, produce data-informed needs assessments, and connect institutions with support partners. They lean on each other as a peer cohort. Their feedback represents what *institutions they serve* are experiencing with PDP outputs.

---

## 1. Pain Points Raised

### A. Data accuracy & trust in PDP outputs
- Incorrect cohort sizes and missing institutions/campuses in dashboard dropdowns
- Numbers reported by PDP dashboard appear inaccurate; intermediaries lack confidence in the data
- PDP appears to pull from the wrong dataset intermittently
- Andres: data is being **incorrectly processed at submission time** — institution data ends up with wrong values after going through PDP's pipeline
- No cross-source verification — intermediaries and institutions have to take each other's word

### B. Definitions & terminology
- Terms like "completion rate at 3/4/5 years" and "first-to-second-year retention" are not clearly explained in-context
- Definitions are buried in external documentation
- PDP terminology differs from what institutions report for state compliance and IPEDS, creating cognitive friction

### C. Visualization & data export
- Wrong chart types (e.g., line chart used to compare independent cohorts — should be bar)
- Charts are not presentation-ready; IR staff can't show them to supervisors as-is
- **No data download from the dashboard.** Dr. Prateek had to manually copy individual numbers into Excel to build his own visualizations
- The "analysis-ready file" is a paid add-on (~$20K), so most institutions don't have programmatic access to their own data

### D. AI/governance constraints (for any new tool, including ours)
- **FERPA compliance** is table-stakes
- Beyond FERPA: concerns about "weaponizing data" via AI — broad analyses without institutional context can harm under-resourced campuses
- Sensitive student populations (immigrant, undocumented, public-aid students) need special handling — clarity on which data points are used, and why
- Need full **transparency** — homegrown vs. vendor model, what inputs are used, where data is stored
- Need full **data lineage / governance** — "where did this number come from" must be answerable end-to-end
- Vendors that promise "full automation" frequently underdeliver — so claims must be defensible

### E. Institutional/process challenges (people, not tech)
- Knowledge tends to live with **one person**; when they retire, no one else knows how the institution submits its data
- Each campus has wildly different submission processes (e.g., one campus delists and re-uploads everything every cycle)
- Institutions have very different sizes, types (university vs. junior college vs. multi-campus system), and goals — generic tools struggle to fit

### F. Datathon coordination feedback
- AASCU has a list of every institution's SIS — they can group institutions by **most common SIS** OR **most need**
- Recommendation: group by **shared institutional goals** (e.g., "advising") in addition to shared SIS — that produced the strongest cross-talk in their program

---

## 2. What the Tool Already Addresses

Mapping the pain points to what's already built or in progress in `codebenders-dashboard`:

| Pain point | Already in tool | Evidence |
|---|---|---|
| **C. No data download** | ✅ CSV export wired into the dashboard | `components/export-button.tsx`, issue #15 (closed) |
| **C. Wrong chart types** | ✅ Recharts-based, chart types chosen per metric | `retention-risk-chart.tsx`, `risk-alert-chart.tsx`, `readiness-assessment-chart.tsx` |
| **B. Buried definitions** | 🟡 Partial — info popovers exist; not yet a full glossary | `components/info-popover.tsx` |
| **D. AI transparency / methodology** | ✅ Methodology page documenting how predictions are made | `app/methodology/` |
| **D. FERPA compliance** | ✅ RBAC, audit log, student-detail FERPA-compliant identity resolution | Issues #67, #75, #77, #78 (all closed) |
| **D. Self-service & automation** | ✅ Self-service data upload (PDP, AR files, student/course data) | Issue #86 (closed), `components/upload/` |
| **D. Explainability / "why this number"** | 🟡 In progress — SHAP narrator fine-tuning | Issues #97–103 (open epic), current branch `fine-tuning/97-shap-narrator-task-type` |
| **A. Data validation on upload** | 🟡 Upload exists; validation surface area unknown | Issue #86 (need to verify what error reporting exists) |
| **C. Filtering by cohort/term/demographic** | ✅ Built | Issue #66 (closed), #81 (closed) |
| **C. Natural-language query against the data** | ✅ NLQ interface live | Issues #17, #61, #88, #90 (all closed); `lib/prompt-analyzer.ts` |
| **E. Knowledge siloed in one person** | 🟡 Self-service upload reduces dependency, but no documented submission runbook in-app |  |

**In short:** The tool already addresses a *substantial portion* of the pain — particularly the export/visualization gap (C), AI methodology transparency (D), and FERPA basics (D). The current SHAP narrator work (D) directly speaks to the "lack of context" risk Andres raised.

---

## 3. Gaps — Issues to Add

These are pain points the tool does **not yet** address adequately. Recommended priorities are tentative — final priorities are yours to assign.

### P0 — Differentiators that match the loudest complaints

1. **Definitions glossary + inline tooltips for every metric**
   *Pain points: B (definitions buried, terminology mismatch with IPEDS/state compliance)*
   - Every metric/KPI shows a hover tooltip with: PDP definition, IPEDS-equivalent (if any), state-compliance term (if any)
   - Centralized `/glossary` page indexed by metric
   - Source-of-truth markdown so definitions are versioned with the code

2. **Presentation-ready chart export (PNG/PDF), not just CSV**
   *Pain point: C (charts can't be shown to supervisors)*
   - "Export as PNG / PDF / PPTX-ready slide" on every chart
   - Includes title, definitions, data source, and date stamp baked into the export
   - Removes the manual "copy numbers to Excel and rebuild" workflow Dr. Prateek described

3. **Data lineage / "where did this number come from" view**
   *Pain points: A (trust gap), D (lineage requirement)*
   - Click any number → see source rows, which upload it came from, transformations applied, and timestamp
   - Critical for the AI-trust story: "we can prove every number"

### P1 — AI governance hardening (table-stakes for institutional adoption)

4. **AI Transparency Page**
   *Pain point: D (which data points used, where stored, what model)*
   - Lists every model (retention, GPA, etc.), the input features, the training data source, model lineage
   - Shows whether the model is homegrown or third-party
   - Lists the LLM provider for NLQ + SHAP narrator and where prompts/data flow

5. **Sensitive-population safeguards**
   *Pain point: D (immigrant/undocumented/public-aid students; weaponization risk)*
   - Configurable "do not use" list of demographic features per institution
   - When predictions are generated for flagged sub-populations, surface a context warning ("low sample size — interpret with care")
   - Audit-log entry for any query/export that touches flagged populations

6. **Upload validation report with human-readable error surface**
   *Pain point: A (data-processing errors at submission), E (one person knows how)*
   - After upload: show row-level errors, field coercions, deduplication decisions
   - Must be readable by a non-technical IR staffer (so the tool survives the "person retires" scenario)
   - "Diff vs. last upload" view so anomalies (e.g., dropped campuses) are caught immediately

### P2 — Process / institutional fit

7. **Submission runbook generator**
   *Pain point: E (knowledge siloed in one person)*
   - Tool records the exact upload steps + field mappings that "worked" for an institution
   - Generates a printable/PDF runbook so a successor can replicate without tribal knowledge

8. **Institution-grouping helper for shared-goal cohorts**
   *Pain point: F (datathon coordination)*
   - Operational, not a user-facing tool feature — but worth tracking as an internal issue:
   - Pull the SIS-by-institution list from AASCU
   - Cross-reference with stated institutional goals (e.g., "advising")
   - Output a candidate grouping for the fall datathon

### Out of scope (should NOT become tool issues)

- **PDP-side cohort accuracy / dropdown completeness** — that's PDP's bug to fix; we shouldn't build around it
- **The $20K analysis-ready file paywall** — pricing decision by PDP; not addressable in our tool
- **Vendor over-promising on "full automation"** — competitive-positioning concern, not a feature

---

## 4. One-paragraph summary (for your notes doc)

> Two AASCU Intermediaries described pain in three layers: (1) **PDP dashboard quality** — inaccurate cohort numbers, buried definitions, wrong chart types, no data export, forcing IR staff into manual Excel work; (2) **AI/governance requirements** — FERPA-plus expectations including data lineage, transparency on which data points are used and where stored, and explicit safeguards for sensitive student populations; and (3) **institutional process gaps** — submission knowledge typically lives with one person and varies wildly across campuses. Our tool already addresses a meaningful share of (1) — CSV export, sane chart types, NLQ, methodology page — and is in-flight on (2) via the SHAP-narrator work for explainability. The biggest unaddressed gaps are (a) a **definitions glossary with IPEDS/state-compliance cross-walks**, (b) **presentation-ready chart export** (PNG/PDF with definitions baked in), (c) a **data-lineage view** that proves where each number came from, and (d) **AI transparency + sensitive-population safeguards** as a precondition for institutional adoption. For datathon grouping, AASCU recommends pairing institutions by *shared SIS plus shared institutional goal* (e.g., advising) rather than SIS alone.

---

## 5. Suggested next step

If you confirm the priorities above, I'll draft `gh issue create` commands for each P0/P1 — matching the labeling style of the existing repo (`area:*`, `type:feature`, `priority:*`) — and show them for review before creating anything.
