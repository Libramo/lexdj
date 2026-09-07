#!/usr/bin/env bash
# deploy/scrape-and-reindex.sh
# =============================
# Weekly cron: runs the scraper against production, then a Meilisearch
# delta reindex covering the same window — both executed *inside* the
# already-running nextjs container so they use its correct internal
# DATABASE_URL/MEILI_HOST (Docker's service-name DNS: postgres:5432,
# meilisearch:7700), no SSH tunnel needed since this runs on the VPS
# itself. Meant to run via cron (see deploy/README.md) — not meant to
# be run manually against production unless you mean to.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_DIR/deploy/logs"
LOCK_FILE="/tmp/lexdj-scrape.lock"
# One extra day of overlap beyond the weekly cadence — mirrors
# scraper/main.ts's own computeDateRange()/OVERLAP_BUFFER_DAYS
# reasoning: cheap, because insertLaw's ON CONFLICT upsert makes
# re-touching an already-current row a no-op, not a duplicate.
SINCE_DATE="$(date -d '8 days ago' +%Y-%m-%d)"

mkdir -p "$LOG_DIR"
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "[$(date '+%Y-%m-%d %H:%M:%S')] Previous scrape/reindex still running — skipping."; exit 0; }

cd "$REPO_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting scraper run..."
if ! docker compose exec -T nextjs npx tsx scraper/main.ts; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Scraper FAILED — skipping reindex, investigate before the next run." >&2
  exit 1
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Scraper finished."

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Meilisearch delta reindex (since $SINCE_DATE)..."
if ! docker compose exec -T nextjs npx tsx scripts/meilisearch-delta-index.ts --since "$SINCE_DATE"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Delta reindex FAILED — Postgres has new laws but search is now stale. Run scripts/meilisearch-delta-index.ts manually." >&2
  exit 1
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Delta reindex finished. Done."
