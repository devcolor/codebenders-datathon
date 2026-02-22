#!/usr/bin/env bash
# deploy.sh — Deploy Bishop State dashboard to Vercel
#
# Usage:
#   ./scripts/deploy.sh                  # deploy frontend only
#   ./scripts/deploy.sh --with-data      # re-run ML pipeline + readiness scores, then deploy
#
# Requirements:
#   - Vercel CLI installed and authenticated (vercel login)
#   - Python venv at venv/ with dependencies installed
#   - DB_PASSWORD set in environment or .env.deploy (see below)
#
# Credentials are read from environment variables. To avoid typing them each
# time, create a .env.deploy file (already in .gitignore) with:
#   export DB_PASSWORD=your-password

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD="$ROOT/codebenders-dashboard"
PYTHON="$ROOT/venv/bin/python"

# ── Database (pooler) ────────────────────────────────────────────────────────
export DB_HOST="${DB_HOST:-aws-1-us-east-1.pooler.supabase.com}"
export DB_PORT="${DB_PORT:-6543}"
export DB_USER="${DB_USER:-postgres.sdigpinxgnbeijoqgxzp}"
export DB_NAME="${DB_NAME:-postgres}"

# Load DB_PASSWORD from .env.deploy if not already set
if [[ -z "${DB_PASSWORD:-}" && -f "$ROOT/.env.deploy" ]]; then
  # shellcheck source=/dev/null
  source "$ROOT/.env.deploy"
fi

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "Error: DB_PASSWORD is not set."
  echo "Either export it or add it to .env.deploy:"
  echo "  echo 'export DB_PASSWORD=your-password' > .env.deploy"
  exit 1
fi

# ── Flags ────────────────────────────────────────────────────────────────────
WITH_DATA=false
for arg in "$@"; do
  [[ "$arg" == "--with-data" ]] && WITH_DATA=true
done

echo "================================================="
echo " Bishop State — Deploy Script"
echo " Mode: $([ "$WITH_DATA" = true ] && echo 'data + frontend' || echo 'frontend only')"
echo "================================================="

# ── Data pipeline (optional) ─────────────────────────────────────────────────
if [[ "$WITH_DATA" == true ]]; then
  echo ""
  echo "▶ Step 1/3 — ML pipeline"
  "$PYTHON" "$ROOT/ai_model/complete_ml_pipeline.py"

  echo ""
  echo "▶ Step 2/3 — Readiness scores"
  "$PYTHON" "$ROOT/ai_model/generate_readiness_scores.py"
else
  echo ""
  echo "▶ Skipping data pipeline (use --with-data to include)"
fi

# ── Vercel deploy ─────────────────────────────────────────────────────────────
echo ""
echo "▶ $([ "$WITH_DATA" = true ] && echo 'Step 3/3' || echo 'Step 1/1') — Vercel deploy"
cd "$DASHBOARD"
vercel --prod

echo ""
echo "✓ Deploy complete."
