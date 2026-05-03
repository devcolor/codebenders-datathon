---
name: ferpa-audit
description: Run Layer A (static) + Layer B (Postgres) read-time FERPA leak detection and write docs/ferpa-audit-<date>.md. Invoke with /ferpa-audit or when auditing student-data flows for CIO/legal review.
---

# FERPA audit skill (v1 — read-time detection)

## Purpose

This skill produces a **single markdown report** institutions can share with a **CIO, compliance lead, or legal counsel** without a engineer in the room. It answers: *“Where could student education records or personally identifiable information leak at read time — in code, configuration, logs, vendor calls, or the database?”*

v1 is **detection and documentation only**: no CI gating, no retention/breach playbooks, no data-lineage graphs (see issue #107 for lineage).

## Invocation

- **Slash command:** `/ferpa-audit` (repo command: `.claude/commands/ferpa-audit.md`).
- **CLI (authoritative for Layer A+B merge):** from repository root, after configuring `ferpa-config.yaml` and (for Layer B) database env vars per `operations/db_config.py`:

```bash
./scripts/ferpa-audit.sh
```

- **Layer A only (fast):**

```bash
cd codebenders-dashboard && npx tsx ../.claude/skills/ferpa-audit/scripts/static-audit.ts --repo-root .. --out /tmp/ferpa-static.json
```

- **Merge Layer B (expects static JSON from Layer A):**

```bash
./venv/bin/python .claude/skills/ferpa-audit/scripts/db-audit.py --repo-root . --static-json /tmp/ferpa-static.json
```

Default report path: `docs/ferpa-audit-<YYYY-MM-DD>.md` (UTC date).

## Regulatory knowledge (load-bearing)

**Every finding MUST cite** a section from `references/regulatory-citations.md` in this skill folder. Do not invent citations. If nothing fits, lower severity to **Note** and still pick the closest hook, or omit the finding.

**Why this matters:** Generic “PII scanners” flag strings; FERPA audits explain **whether education records or PII could be disclosed** without a valid basis (e.g. consent, school-official/legitimate educational interest, permitted vendor relationship, statistical de-identification). The citation anchors the narrative for procurement and legal review.

### Severity rubric

| Level | Meaning | Typical examples |
|-------|---------|------------------|
| **Critical** | Plausible **uncontrolled disclosure** of identifiers or row-level education records to the wrong party, or bypass of documented safeguards. | Arbitrary SQL execution without FERPA column controls; student-level payloads to non-allowlisted external hosts when hardening is off; logging full query results client-side. |
| **Warning** | **Material gap** in access control, vendor boundary, or consistency with documented policy — exploitable or high residual risk but may depend on deployment flags or network posture. | API routes returning cohort/student analytics without role checks; optional external data API path; LLM receives result rows without institutional review of caps/redaction. |
| **Note** | **Transparency / policy alignment** issues, small-N disclosure risk, or technical debt that should be tracked with FERPA framing. | AI transparency inventory drift; schema metadata sent to vendors; planned audit-log coverage not yet implemented. |

Escalate **Critical → Warning** when the issue is **fully mitigated by documented production configuration** (e.g. `FORCE_DIRECT_DB=true`) but the **unsafe path still exists in code** — frame as “residual risk if misconfigured.”

## Layers

### Layer A — Static codebase audit (`scripts/static-audit.ts`)

Inputs: repository tree, `ferpa-config.yaml`. Output: JSON findings file consumed by Layer B.

**Checks (v1):**

1. **SELECT / response-shape exclusions** — Regex over SQL-like literals and template strings for columns in `select_exclusions` / `sensitive_demographics`; flag unless `// FERPA-OK:` appears on the same line (convention).
2. **Policy vs enforcement** — Compare `/api/analyze` FERPA column guard (`lib/sql-inspector.ts`) to other execution paths (notably `/api/execute-sql`). A documented exclusion that is **prompt-only** or **only on one route** is a **Critical** or **Warning** finding.
3. **Console / client log leakage** — Flag `console.log` / `console.debug` / `console.info` (client bundles) that log query plans, results, or other large objects that may contain student rows.
4. **External fetch / third-party hosts** — Detect `schools.syntex-ai.com` and other non-allowlisted hosts; tie to `FORCE_DIRECT_DB` / `buildExternalAnalysisReadyUrl` story (#126).
5. **RBAC coverage** — Routes listed in `ferpa-config.yaml` under `rbac.student_data_routes` must reference the configured role header (default `x-user-role`).
6. **LLM prompt / vendor disclosure** — Ensure `ferpaExcluded` in `app/api/analyze/route.ts` is the single source of truth for model-directed SQL exclusions; flag gross inconsistency if other prompts contradict.
7. **AI transparency cross-check** — Every OpenAI / Vercel AI SDK call site under `app/api/**` must be reflected in `content/ai-transparency.ts` (issue #108).

**Microsoft Presidio:** Optional enhancement. v1 does not require Presidio to pass acceptance; regex + AST + project config carry FERPA semantics. To add Presidio, install `presidio-analyzer` in the project venv and extend Layer A with a subprocess helper (documented in runbook).

### Layer B — Live Postgres audit (`scripts/db-audit.py`)

Inputs: read-only DB connection (`DB_*` env vars or `operations/db_config.py` defaults), `ferpa-config.yaml`, static JSON. Output: final markdown report.

**Checks (v1):**

1. **Schema snapshot** — Tables/columns in the configured schema(s), timestamped in the appendix.
2. **RLS** — Flag tables holding PII-class columns (per config taxonomy) with **no** row-level security policy (informational **Warning** in v1 — many institutional dashboards rely on app-layer RBAC instead).
3. **Small-N / subgroup disclosure** — For configured dimensions on the predictions table, flag cells where `COUNT(*) < subpopulation_minimum_n` (§99.35 statistical-disclosure framing).
4. **Audit-log path** — If `audit_log.table_name` is unset or table missing, emit a **Note** referencing planned institutional audit coverage (#67), not a fake pass.

### Layer C — Report

`db-audit.py` merges executive summary, findings grouped by severity, and appendix (skill path, config hash, DB snapshot time).

**Writing style:** Plain English “what we saw,” “why it matters under FERPA,” “what to do next.” Avoid library names without one-line explanations.

## Known regression targets (main branch)

When tuning scanners, these MUST appear **without manual hints**:

1. **Student_GUID / execute-sql** — Runtime guard exists on `/api/analyze` (#127) but **not** on arbitrary SQL execution — policy vs enforcement gap.
2. **schools.syntex-ai.com** — External analysis-ready API path unless `FORCE_DIRECT_DB` / direct DB mode (#126).
3. **Client console logging** — e.g. query page logging plans/results.

## Out of scope (v1)

- Lineage (#107), retention schedules, breach playbooks, write-time prevention / CI enforcement.

## Files

| File | Role |
|------|------|
| `SKILL.md` | This document |
| `references/regulatory-citations.md` | §99.x citation anchors |
| `scripts/static-audit.ts` | Layer A |
| `scripts/db-audit.py` | Layer B + report merge |
| `ferpa-config.yaml` (repository root) | Project exclusions, allowlists, thresholds |
| `../../docs/ferpa-audit-runbook.md` | Human runbook |
| `../../scripts/ferpa-audit.sh` | One-shot runner |
