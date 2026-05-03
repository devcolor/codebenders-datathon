---
description: Run FERPA read-time audit (Layer A static + Layer B DB) and produce docs/ferpa-audit-<date>.md
---

Follow `.claude/skills/ferpa-audit/SKILL.md` exactly.

1. Ensure `ferpa-config.yaml` at the repository root is current.
2. Run `./scripts/ferpa-audit.sh` from the repository root (or Layer A then Layer B per the skill if the shell script is unavailable).
3. Open the generated `docs/ferpa-audit-<YYYY-MM-DD>.md` and confirm Critical/Warning/Note counts match executive summary.
4. Every finding in any narrative you add MUST cite `.claude/skills/ferpa-audit/references/regulatory-citations.md`.

v1 scope: read-time detection only — do not expand into lineage, retention, breach response, or CI gating unless the user explicitly asks.
