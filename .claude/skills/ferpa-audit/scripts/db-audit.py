#!/usr/bin/env python3
"""
Layer B — Postgres FERPA-oriented audit + Layer C markdown report.
Merge with Layer A JSON from static-audit.ts (--static-json).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None  # type: ignore

# Regulatory hooks — keep literals identical to historical reports.
REG_LEI = "§99.31(a)(1)(i) — legitimate educational interest"
REG_DISCLOSURES = "§99.32 — record of disclosures"
REG_SMALL_N = "§99.35 — disclosure for research / statistical purposes"
REG_ED_RECORDS = "§99.3 — education records"

SCHEMA_COLUMNS_SQL = """
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = %s
    ORDER BY table_name, ordinal_position
"""

RLS_GAP_SQL = """
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = %s
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = %s
          AND col.table_name = c.relname
          AND (
            col.column_name ILIKE '%%guid%%'
            OR col.column_name ILIKE '%%ssn%%'
            OR col.column_name ILIKE '%%student%%'
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = %s AND p.tablename = c.relname
      )
"""

AUDIT_TABLE_EXISTS_SQL = """
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %s AND table_name = %s
    ) AS ok
"""


def load_db_config(repo_root: Path) -> dict:
    sys.path.insert(0, str(repo_root))
    try:
        from operations import db_config as dc

        return {
            "host": dc.DB_CONFIG["host"],
            "port": dc.DB_CONFIG["port"],
            "user": dc.DB_CONFIG["user"],
            "password": dc.DB_CONFIG["password"],
            "database": dc.DB_CONFIG["database"],
        }
    except Exception:
        return {
            "host": os.environ.get("DB_HOST", "127.0.0.1"),
            "port": int(os.environ.get("DB_PORT", "54332")),
            "user": os.environ.get("DB_USER", "postgres"),
            "password": os.environ.get("DB_PASSWORD", "postgres"),
            "database": os.environ.get("DB_NAME", "postgres"),
        }


def append_finding(
    findings: list[dict],
    *,
    severity: str,
    category: str,
    file: str,
    regulation: str,
    title: str,
    description: str,
    remediation: str,
) -> None:
    findings.append(
        {
            "severity": severity,
            "category": category,
            "file": file,
            "regulation": regulation,
            "title": title,
            "description": description,
            "remediation": remediation,
        }
    )


def finding_block(f: dict) -> list[str]:
    line = f.get("line")
    loc = f["file"]
    if line:
        loc = f"{loc}:{line}"
    return [
        f"### {f['severity']}: {f['title']}",
        "",
        f"- **Location:** `{loc}`",
        f"- **Regulatory hook:** {f['regulation']}",
        f"- **What we saw:** {f['description']}",
        f"- **Remediation:** {f['remediation']}",
        "",
    ]


def run_db_checks(conn, ferpa: dict) -> tuple[list[dict], str]:
    findings: list[dict] = []
    schema = ferpa["database"]["schema"]
    table = ferpa["database"]["predictions_table"]
    n_min = int(ferpa["subpopulation_minimum_n"])
    dims = ferpa["database"]["small_n_dimensions"]

    snapshot_lines: list[str] = []
    snap_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(SCHEMA_COLUMNS_SQL, (schema,))
        rows = cur.fetchall()
        for r in rows[:500]:
            snapshot_lines.append(
                f"| {r['table_name']} | {r['column_name']} | {r['data_type']} |"
            )

        cur.execute(RLS_GAP_SQL, (schema, schema, schema))
        for r in cur.fetchall()[:15]:
            append_finding(
                findings,
                severity="Warning",
                category="rls_gap",
                file=f"postgres:{schema}.{r['table_name']}",
                regulation=REG_LEI,
                title="Table with likely student identifiers has no Postgres RLS policy",
                description=(
                    "Row-level security is one technical control institutions use to ensure "
                    "database sessions cannot read beyond an authorized scope. This table appears "
                    "to hold student-linked columns but has no RLS policy in Postgres — reliance "
                    "may be entirely on the application tier."
                ),
                remediation=(
                    "Evaluate RLS or equivalent database-session scoping with your data steward; "
                    "document compensating controls if the app layer alone enforces access."
                ),
            )

        audit_table = ferpa.get("audit_log", {}).get("table_name")
        if audit_table:
            cur.execute(AUDIT_TABLE_EXISTS_SQL, (schema, audit_table))
            if not cur.fetchone()["ok"]:
                append_finding(
                    findings,
                    severity="Note",
                    category="audit_log_missing",
                    file="ferpa-config.yaml",
                    regulation=REG_DISCLOSURES,
                    title="Configured audit log table not found in database",
                    description=(
                        "Institutional FERPA programs often require a retained record of certain "
                        "access or disclosures. The configured audit table is absent in this schema."
                    ),
                    remediation="Ship or attach the audit schema (#67) or clear the audit_log.table_name setting until available.",
                )
        else:
            append_finding(
                findings,
                severity="Note",
                category="audit_log_not_configured",
                file="ferpa-config.yaml",
                regulation=REG_DISCLOSURES,
                title="Database audit-log cross-check skipped (not configured)",
                description=(
                    "Layer B did not verify an institutional audit trail table. Read-time analytics "
                    "still benefit from logging who accessed which student-level exports."
                ),
                remediation="When #67 lands, set audit_log.table_name and re-run this audit.",
            )

        try:
            dim_sql = ", ".join(dims)
            small_n_sql = f"""
            SELECT {dim_sql}, COUNT(*) AS n
            FROM {schema}.{table}
            GROUP BY {dim_sql}
            HAVING COUNT(*) < %s
            ORDER BY n ASC
            LIMIT 50
            """
            cur.execute(small_n_sql, (n_min,))
            for row in cur.fetchall():
                append_finding(
                    findings,
                    severity="Note",
                    category="small_n_cell",
                    file=f"postgres:{schema}.{table}",
                    regulation=REG_SMALL_N,
                    title="Small subgroup cell in predictions table",
                    description=(
                        f"A demographic × cohort cell contains fewer than {n_min} rows "
                        f"({dict(row)}). Publishing or exporting such cells can increase "
                        "re-identification risk for students in minority subgroups."
                    ),
                    remediation=(
                        "Apply suppression, rounding, or aggregation thresholds (#109) before "
                        "display or export."
                    ),
                )
        except Exception as e:
            append_finding(
                findings,
                severity="Note",
                category="small_n_skipped",
                file=f"postgres:{schema}.{table}",
                regulation=REG_SMALL_N,
                title="Small-N cohort query could not run",
                description=f"The predictions table or columns may differ in this environment: {e}",
                remediation="Align ferpa-config.yaml database.predictions_table and small_n_dimensions with the live schema.",
            )

    header = "| Table | Column | Type |\n|------|--------|------|\n"
    snapshot_md = header + "\n".join(snapshot_lines[:200])
    if len(snapshot_lines) > 200:
        snapshot_md += f"\n\n_(truncated; {len(snapshot_lines)} total columns)_\n"

    appendix_schema = f"**Snapshot time (UTC):** {snap_ts}\n\n{snapshot_md}"
    return findings, appendix_schema


def merge_static_and_db(
    repo_root: Path,
    ferpa: dict,
    static: dict,
    skip_db: bool,
) -> tuple[list[dict], str]:
    all_findings: list[dict] = list(static.get("findings", []))
    appendix_db = ""

    if skip_db:
        return all_findings, appendix_db

    if not psycopg2:
        append_finding(
            all_findings,
            severity="Note",
            category="db_driver_missing",
            file="requirements.txt",
            regulation=REG_ED_RECORDS,
            title="psycopg2 not installed; Layer B skipped",
            description="Install project Python requirements in venv to enable Postgres checks.",
            remediation="./venv/bin/pip install -r requirements.txt",
        )
        return all_findings, appendix_db

    cfg = load_db_config(repo_root)
    try:
        conn = psycopg2.connect(**cfg)
        try:
            db_findings, appendix_db = run_db_checks(conn, ferpa)
            all_findings.extend(db_findings)
        finally:
            conn.close()
    except Exception as e:
        append_finding(
            all_findings,
            severity="Note",
            category="db_unreachable",
            file="operations/db_config.py",
            regulation=REG_ED_RECORDS,
            title="Layer B database checks skipped (connection failed)",
            description=f"Could not connect for live schema audit: {e}",
            remediation="Run with DB_* env vars set, or use --skip-db for static-only reports.",
        )

    return all_findings, appendix_db


def render_report(static: dict, all_findings: list[dict], appendix_db: str, date_s: str) -> str:
    by_sev: dict[str, list[dict]] = {"Critical": [], "Warning": [], "Note": []}
    for f in all_findings:
        by_sev.setdefault(f["severity"], []).append(f)

    lines: list[str] = [
        "# FERPA read-time audit report",
        "",
        f"**Report date (UTC):** {date_s}",
        "",
        "## Executive summary",
        "",
        "This report documents **read-time** risks: places student education records or personally identifiable information could be exposed through application code, logs, vendor calls, or database configuration. It is intended for CIO, compliance, and legal review alongside engineering.",
        "",
        f"- **Critical findings:** {len(by_sev['Critical'])}",
        f"- **Warnings:** {len(by_sev['Warning'])}",
        f"- **Notes:** {len(by_sev['Note'])}",
        "",
        f"**Configuration fingerprint:** `{static.get('configHash', 'n/a')}` (`{static.get('configPath', 'ferpa-config.yaml')}`)",
        "",
        "---",
        "",
    ]

    for sev in ("Critical", "Warning", "Note"):
        lines.append(f"## {sev} findings")
        lines.append("")
        if not by_sev[sev]:
            lines.append("_None._")
            lines.append("")
            continue
        for f in by_sev[sev]:
            lines.extend(finding_block(f))

    lines.extend(
        [
            "---",
            "",
            "## Appendix",
            "",
            f"- **Skill:** `.claude/skills/ferpa-audit/`",
            f"- **Regulatory index:** `.claude/skills/ferpa-audit/references/regulatory-citations.md`",
            f"- **Layer A generated:** {static.get('generatedAt', '')}",
            "",
            "### Database schema snapshot (Layer B)",
            "",
            appendix_db or "_Layer B not run or no snapshot._",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", required=True)
    ap.add_argument("--static-json", required=True)
    ap.add_argument("--out", default="")
    ap.add_argument("--skip-db", action="store_true")
    args = ap.parse_args()

    repo_root = Path(args.repo_root).resolve()
    static_path = Path(args.static_json).resolve()
    with open(static_path, encoding="utf8") as f:
        static = json.load(f)

    with open(repo_root / "ferpa-config.yaml", encoding="utf8") as f:
        ferpa = yaml.safe_load(f)

    all_findings, appendix_db = merge_static_and_db(repo_root, ferpa, static, args.skip_db)

    date_s = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out = Path(args.out) if args.out else repo_root / "docs" / f"ferpa-audit-{date_s}.md"

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_report(static, all_findings, appendix_db, date_s), encoding="utf8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
