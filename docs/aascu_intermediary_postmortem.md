# AASCU Intermediary Discovery — Postmortem

**Session:** Discovery conversation with two AASCU Intermediaries (IFS)

**Participants:** Andres (IR-focused), Dr. Prateek (data-engineering-focused)

**Source materials:** `AASCU Meeting Recording.m4a` (~21 min) + typed session notes

---

## Postmortem (4L)

### Liked

- Both intermediaries showed up candid and specific — concrete examples (line-graph misuse, the $20K AR-file paywall, the retiring-IR-lead anecdote) rather than abstract complaints.
- Strong alignment between the two IFS on the *root* problem ("institutions can't trust or use PDP outputs"), even though they emphasized different layers — that means the pain is real, not idiosyncratic.
- They volunteered AI-governance concerns unprompted, which validates that data lineage and transparency aren't over-engineering — they're table stakes.
- Operational asset surfaced: AASCU has a SIS-by-institution list ready to share for datathon grouping.

### Learned

- The $20K analysis-ready file paywall is a real adoption barrier — most institutions are working off the dashboard alone.
- Submission errors at the PDP processing layer (not at the institution) are corrupting downstream numbers — institutions get blamed for problems that aren't theirs.
- Knowledge silos at institutions are *the* fragility point. One person retires and submission capability evaporates.
- IR staff are already manually re-creating PDP charts in Excel before showing them to supervisors. The "rebuild it cleaner" workflow is a daily, repeated tax.
- "Weaponizing data" is the IFS's mental model for AI risk — not technical risk, but institutional-harm risk to under-resourced campuses.
- Datathon institutions should be grouped by **shared SIS + shared goal** (e.g., advising), not SIS alone. Last year's "wildly different incomes" cohort cost most of the day to find common ground.

### Lacked

- No live screen-share or walk-through of the PDP dashboard during the call — we're working from secondhand descriptions.
- No representative from an actual institution (only intermediaries describing what institutions experience).
- No quantification — we don't know *how many* institutions are affected by each pain point or how often.
- No exposure to the AR file format itself, since neither IFS has paid for it. Our assumptions about its structure are still assumptions.

### Longed For

- A side-by-side "PDP says X, our tool says Y" comparison on the same dataset, to make the differentiation tangible.
- A direct line to one or two institutions to validate the IFS-described pain points firsthand.
- Definition cross-walks already published somewhere (state compliance ↔ IPEDS ↔ PDP) we could reuse rather than build.
- Concrete examples of the "data weaponization" cases the IFS feared — to design safeguards against real scenarios, not hypotheticals.

---

## Immediate Takeaways

### Broad strokes — what we heard

Three layers of pain, two of them addressable by our tool:

- **PDP dashboard quality** (charts, definitions, export, accuracy): partially addressable — we already cover much of this, with clear gaps to close.
- **AI/governance expectations** (lineage, transparency, sensitive populations): fully addressable — and it's now table-stakes for institutional adoption.
- **Institutional process gaps** (knowledge silos, submission inconsistency): addressable via tooling that captures and replays institutional knowledge.

### Common challenges (both IFS independently raised)

- Data accuracy / trust gap with PDP outputs
- Buried, jargon-heavy definitions that don't match IPEDS or state compliance terms
- Visualizations that aren't presentation-ready
- AI governance: full transparency, full data lineage, sensitive-population care
- Need for full automation — and skepticism that vendors deliver on it

### Unique challenges

- **Andres (IR-focused):** emphasized incorrect submission processing at PDP — the bug is in the pipeline, not the source data; and the knowledge-silo fragility (retiring IR lead).
- **Dr. Prateek (data-engineering-focused):** emphasized hands-on friction — manually copying numbers into Excel, no download path, the cost of presentation rebuilds.

### Clear problem space

The tool is positioned to be **"PDP outputs you can trust, present, and govern"** — three things institutions can't get from PDP alone today. The differentiator is provable lineage + presentation-ready outputs + AI safeguards, layered on the predictions we already produce.

---

## Flags

### Red Flags — risk / concerns

- **AI weaponization risk is real to IFS, not theoretical.** Any misstep on sensitive populations (immigrant, undocumented, public-aid students) torpedoes institutional trust permanently.
- **PDP-side data corruption is outside our control** but could be blamed on us if we don't surface it clearly. We need to make the source-of-truth boundary explicit.
- **Vendors in this space have a credibility deficit** ("vendors promise full automation; that does not happen"). We will be measured against that history.
- **FERPA-plus expectations.** FERPA alone isn't enough — institutions want assurances on AI use, storage, and lineage that go beyond statute.

### Green Flags — areas of opportunity

- **Data lineage view** is unmet by PDP and is the single highest-leverage differentiator (see issue #107). Directly answers the trust gap.
- **Presentation-ready chart export** (issue #106) eliminates a daily manual workflow for IR staff — high frequency, high pain, low-medium build cost.
- **SHAP narrator** (in-flight, issues #97-103) maps almost word-for-word to the IFS's "AI without context" concern. Strong narrative for the datathon demo.
- **Self-service upload** (#86, shipped) already lowers the knowledge-silo barrier — one of the loudest pain points is partially solved before we walked in.
- **AASCU has the SIS list ready** — we can produce the datathon grouping artifact (#112) on a fast turnaround.

### Yellow Flags — potential challenges

- **Definitions cross-walk** (issue #105) requires authoritative IPEDS / state-compliance source data we don't have yet. Could become a research drag if the cross-walks aren't already documented somewhere.
- **Institutional fit varies wildly** — university vs. junior college vs. multi-campus systems have different use cases. A generic tool will fight the same "wildly different incomes" problem the last datathon hit.
- **Scope creep risk on lineage view (#107).** Done well it's a differentiator; done shallowly it's a feature flag. Needs a clear scope cut for datathon.
- **No first-party institution voice yet.** All feedback is via intermediaries. There may be sub-pain-points or different priorities at the institution level we haven't surfaced.

### Prep — what needs to be true / what we need to find out

- Confirm with AASCU whether IPEDS / state-compliance ↔ PDP cross-walks already exist anywhere we can reuse.
- Get the SIS-by-institution list from AASCU and overlay institutional goals to draft datathon groupings (issue #112).
- Identify 1-2 institutions willing to do a 30-min validation call before the datathon to confirm the IFS-described pain points firsthand.
- Decide whether to scope a "lineage view MVP" (e.g., one metric only) for the datathon vs. building it post-event.
- Get clarity on which AI provider and data-flow story we'll commit to publicly (input for #108 AI Transparency Page).
- Verify the FERPA/RBAC implementation (#75) covers sensitive-population audit-log requirements (#109), or scope the gap.

---

## Post Work — per IFS

### Andres (IR-focused intermediary)

**Completed template (discovery meeting):**

- Role: IR-focused IFS, working with multiple institutions on submission and dashboard interpretation
- Primary pain: data accuracy at submission/processing layer + knowledge silos
- Top quote: *"Maybe the dashboard will sometimes pull from the wrong set"* and *"a lot of the knowledge tends to live with one person"*
- Asks of our tool: provable accuracy, transparency on data flow, FERPA-plus governance

**Ideation session — finalized problem space (Andres):**

- "PDP outputs you can prove and audit." Center the data-lineage view (#107) and AI Transparency Page (#108) for his use cases.
- Adjacent: upload validation report (#110) addresses his "submission processing is corrupting data" concern by catching anomalies institutions can act on.

**Immediate follow-up questions for Andres:**

1. Can you share examples (sanitized) of the "wrong dataset" PDP pulls — so we can model what verification looks like?
2. Of the institutions you support, which 1-2 would you prioritize for a 30-min validation call before the fall datathon?
3. Has AASCU already documented IPEDS ↔ PDP definition cross-walks anywhere we can reuse?
4. What's the typical IR team size at your institutions, and how does that change what "self-serve" means in practice?

**Concerns / flags (Andres):**

- Strong skepticism of vendor over-promising — we should under-promise and demo working features, not slideware.
- The "person retired" example suggests our submission runbook generator (#111) lands on real, recurring pain.

**Datathon ideas + skills needed (Andres):**

- Data-engineering / pipeline-focused track: ingestion, validation, lineage tracking
- Skills: SQL, data modeling, audit-log design, Python/pandas for pipeline work

### Dr. Prateek (data-engineering-focused intermediary)

**Completed template (discovery meeting):**

- Role: data-engineering-focused IFS, hands-on with PDP outputs and visualization rebuilds
- Primary pain: friction in extracting, presenting, and trusting data
- Top quote: *"I just went by each data point and then I had to copy that number ... into the Excel spreadsheet"*
- Asks of our tool: easy export, clean visuals, careful AI handling of sensitive populations

**Ideation session — finalized problem space (Dr. Prateek):**

- "PDP outputs you can present and reuse." Center the presentation-ready chart export (#106), definitions glossary (#105), and sensitive-population safeguards (#109) for his use cases.
- Adjacent: data-lineage view (#107) supports his "is this number right?" reflex.

**Immediate follow-up questions for Dr. Prateek:**

1. Walk us through your last "rebuild it in Excel" cycle — what did you have to do, step by step? (To scope #106 well.)
2. Which sensitive-population categories should we make first-class in our exclusion lists? (Input for #109.)
3. What chart types do you wish PDP offered that it doesn't?
4. When you talk to your supervisors, what one or two charts do they actually care about? (To prioritize export polish.)

**Concerns / flags (Dr. Prateek):**

- AI sensitivity around immigrant/undocumented/public-aid students is paramount. We must demo our safeguards, not just claim them.
- "Data is very sensitive" — implies he'll scrutinize our data-flow disclosures hard. The AI Transparency Page (#108) needs to be airtight.

**Datathon ideas + skills needed (Dr. Prateek):**

- Front-end / visualization / UX track: chart export, glossary tooltips, presentation polish
- Skills: React, Recharts/D3, design sensibility, technical writing for definitions content

---

## What's next (mechanical)

- 8 GitHub issues filed (#105-#112, see `docs/aascu_intermediary_feedback_summary.md` section 3)
- Validation calls to schedule with 1-2 institutions
- IPEDS / state-compliance cross-walk research before #105 (glossary) starts
- AASCU SIS list + goals overlay to drive #112 (datathon grouping)
