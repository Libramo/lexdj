# Deployment — cron-based auto-deploy and scrape/reindex

There is no CI/CD pipeline (no GitHub Actions, no webhook) — the VPS
polls `origin/main` for new commits on a timer instead. Two scripts,
each installed as its own cron job on the VPS.

## What each script does

- **`auto-deploy.sh`** — runs every N minutes. If `origin/main` has
  commits the VPS doesn't have yet: `git reset --hard origin/main`,
  then `docker compose up -d --build --remove-orphans`, then a basic
  HTTP health check against `http://localhost:3000/`. Does nothing
  (silently) if there's nothing new — keeps the log quiet.
- **`scrape-and-reindex.sh`** — runs weekly. Runs the scraper
  (`scraper/main.ts`) and then a Meilisearch delta reindex
  (`scripts/meilisearch-delta-index.ts --since <8 days ago>`) inside the
  already-running `nextjs` container, so both use the container's
  correct internal `DATABASE_URL`/`MEILI_HOST` — no SSH tunnel needed
  on the VPS itself.

Both scripts:
- Use `flock` so a second run started while the first is still going
  just skips instead of overlapping.
- Log timestamped lines to `deploy/logs/` (gitignored — VPS-local
  runtime output, not source).
- Exit non-zero on failure so cron's own mail-on-error (if configured)
  or a `grep FAILED deploy/logs/*.log` check can catch it — neither
  script auto-rolls-back a failed deploy. Worth adding later if a bad
  deploy actually happens and manual recovery proves painful; not
  built preemptively without a real incident to design against.

## One-time setup on the VPS

```bash
cd /path/to/ejo-djib
chmod +x deploy/auto-deploy.sh deploy/scrape-and-reindex.sh
crontab -e
```

Add these two lines (adjust the repo path to match where it's actually
cloned on the VPS):

```cron
*/10 * * * * /path/to/ejo-djib/deploy/auto-deploy.sh >> /path/to/ejo-djib/deploy/logs/deploy.log 2>&1
0 3 * * 1 /path/to/ejo-djib/deploy/scrape-and-reindex.sh >> /path/to/ejo-djib/deploy/logs/scrape.log 2>&1
```

- Deploy check: every 10 minutes. Adjust the `*/10` if you want faster
  or slower pickup of new pushes — there's no strong reason it has to
  be exactly 10.
- Scrape + reindex: Monday 3am server time. Matches journalofficiel.dj's
  actual publishing cadence (roughly twice a month, mid-month and
  end-of-month) with comfortable margin — see
  `context/progress-tracker.md`'s Scraper section for the reasoning.

## Verifying it's working

```bash
tail -f deploy/logs/deploy.log    # watch the next poll cycle
tail -f deploy/logs/scrape.log    # after the next Monday 3am run
crontab -l                        # confirm both lines are actually installed
```

The very first `auto-deploy.sh` run that finds a new commit will also
apply the `--remove-orphans` cleanup for the Typesense → Meilisearch
service rename — expect to see the old `typesense` container get
removed the first time this runs after that deploy lands.

## Known limitations, not hidden

- No rollback-on-failed-health-check — a bad deploy stays up until
  someone notices the log and fixes it manually.
- No notification (Slack/email/etc.) on failure — this only writes to
  a local log file. Add one later if silent log-watching turns out to
  be insufficient in practice.
- The scraper/reindex chain has no retry — if the scraper fails
  (e.g. journalofficiel.dj is briefly down), the whole run fails and
  waits for next week's cron rather than retrying sooner.
