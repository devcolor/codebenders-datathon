#!/usr/bin/env bash
# Run full FERPA audit (Layer A + Layer B). Repository root = parent of scripts/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_JSON="$(mktemp)"
cleanup() { rm -f "$TMP_JSON"; }
trap cleanup EXIT

cd "$ROOT/codebenders-dashboard"
npx tsx "$ROOT/.claude/skills/ferpa-audit/scripts/static-audit.ts" \
  --repo-root "$ROOT" \
  --out "$TMP_JSON"

PYTHON="$ROOT/venv/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="python3"
fi

"$PYTHON" "$ROOT/.claude/skills/ferpa-audit/scripts/db-audit.py" \
  --repo-root "$ROOT" \
  --static-json "$TMP_JSON"
