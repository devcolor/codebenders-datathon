# FERPA audit runbook

## When to run

- Before procurement demos, accreditation packets, or **AASCU / Gates** convening materials that reference FERPA posture.
- After changes to **query execution**, **LLM routes**, **external data APIs**, or **student list/detail** endpoints.
- Quarterly read-time review even if features are stable — config drift (`FORCE_DIRECT_DB`, allowlists) is common.

## Prerequisites

- Repository clone with `ferpa-config.yaml` at the **repository root** (hash is recorded in each report appendix).
- **Layer A:** Node.js 20+, `codebenders-dashboard` dependencies installed (`npm install` in that directory).
- **Layer B:** Python 3 from project `venv/`, `psycopg2-binary` available (see root `requirements.txt`), database reachable read-only.

Connection defaults match `operations/db_config.py` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). For Docker Compose local installs, `DB_NAME` is often `bishop_state` — set env vars before running if your instance differs from defaults.

## Run

From repository root:

```bash
./scripts/ferpa-audit.sh
```

Output: `docs/ferpa-audit-<YYYY-MM-DD>.md` (UTC date). Dated report files are gitignored by default (see repository `.gitignore`).

Skip database checks (CI or laptop without Postgres):

```bash
./venv/bin/python .claude/skills/ferpa-audit/scripts/db-audit.py \
  --repo-root . \
  --static-json /tmp/ferpa-static.json \
  --skip-db
```

(Generate `/tmp/ferpa-static.json` first with the Layer A-only command in `.claude/skills/ferpa-audit/SKILL.md`.)

## Interpreting severity

| Severity | Institutional response |
|----------|-------------------------|
| **Critical** | Treat as release / procurement blocker until remediated or explicitly accepted with signed risk decision. |
| **Warning** | Remediate in sprint; document compensating controls if deferred. |
| **Note** | Track in transparency / policy backlog; often pairs with documentation updates. |

## Escalation matrix

| Finding domain | First line | Escalate to |
|----------------|------------|-------------|
| Vendor / cloud LLM disclosure | Product owner + engineering lead | Legal / compliance |
| External student-row API (`syntex`) | DevOps / SRE | CIO + compliance |
| Missing RBAC on student endpoints | Engineering | Security + registrar / data steward |
| Small-N cohort cells | Data science | IR / research compliance |

## Optional: Presidio

Microsoft Presidio adds NLP/regex breadth for **generic** PII in prose. It does **not** replace project-specific FERPA rules in `ferpa-config.yaml`. Install in venv if desired:

```bash
./venv/bin/pip install presidio-analyzer
```

Extend Layer A with a subprocess if your institution requires Presidio-class scanning.

## Slash command

In Claude Code, `/ferpa-audit` points agents at `.claude/skills/ferpa-audit/SKILL.md` and this runbook.
