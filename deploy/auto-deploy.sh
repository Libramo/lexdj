#!/usr/bin/env bash
# deploy/auto-deploy.sh
# ======================
# Polls origin/main for new commits and redeploys via Docker Compose if
# found. Meant to run on the VPS via cron (see deploy/README.md for the
# crontab line) — not meant to be run manually except to test it.
#
# Robustness choices, and why:
#   - flock prevents two runs overlapping if a deploy takes longer than
#     the poll interval (e.g. a slow `npm run build` inside the image).
#   - `git reset --hard`, not `git pull` — a rewritten/force-pushed
#     history (which has already happened once on this repo) would leave
#     a plain `pull` conflicted; reset always converges to exactly what's
#     on origin/main.
#   - `--build` is required: the nextjs service builds from a local
#     Dockerfile and Compose only builds an image if one doesn't already
#     exist — a plain `up -d` silently reuses the old image forever.
#   - `--remove-orphans` cleans up any service removed from
#     docker-compose.yml (e.g. the Typesense -> Meilisearch swap left an
#     orphaned `typesense` container the first time this ran).
#   - The health check is logged but does not roll back automatically —
#     rollback-on-failure is a real hardening step worth adding later,
#     not implemented here to avoid guessing at a rollback strategy
#     without asking first.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_DIR/deploy/logs"
LOCK_FILE="/tmp/lexdj-deploy.lock"

mkdir -p "$LOG_DIR"
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "[$(date '+%Y-%m-%d %H:%M:%S')] Another deploy is already running — skipping."; exit 0; }

cd "$REPO_DIR"

git fetch origin main --quiet

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
  exit 0 # nothing new — stay quiet, don't spam the log every poll
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] New commits detected ($LOCAL_HEAD -> $REMOTE_HEAD). Deploying..."

git reset --hard origin/main

if docker compose up -d --build --remove-orphans; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] docker compose up succeeded."
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] docker compose up FAILED — VPS may be in a broken/half-updated state. Investigate manually." >&2
  exit 1
fi

# The container may still be warming up (npm run build baked the image,
# but Next.js's own startup + first request compilation can take a
# moment) — a short sleep before checking avoids a false-negative on a
# healthy but still-starting container.
sleep 5
if curl -sf http://localhost:3000/ > /dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check passed. Deploy complete."
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check failed after deploy — the site may not be responding. Investigate manually." >&2
  exit 1
fi
