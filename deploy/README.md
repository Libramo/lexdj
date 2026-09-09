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
mkdir -p deploy/logs
chmod +x deploy/auto-deploy.sh deploy/scrape-and-reindex.sh
crontab -e
```

`deploy/logs/` is gitignored (VPS-local runtime output, not source), so a
fresh clone/reset never has it. The crontab lines below redirect output
with `>> deploy/logs/....log`, and bash needs that directory to already
exist to open the file for appending — the scripts' own `mkdir -p`
internally runs too late to help, since cron sets up the redirect before
the script starts. Skipping this step means the first cron tick fails
silently with no log file ever created.

Add these two lines — **`/path/to/ejo-djib` is a literal placeholder,
not a real path**. Run `pwd` from inside the cloned repo first and
substitute the actual result (e.g. `/var/www/webprojects/lexdj`) into
both lines below; copy-pasting the placeholder verbatim has actually
happened (2026-09-07) and silently breaks both cron jobs with no error
anywhere obvious — cron just tries to run a script at a path that
doesn't exist:

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

## Umami visitor analytics setup (one-time, on the VPS)

`docker-compose.yml`'s `umami` service reuses the existing `postgres`
service (its own `umami` database) rather than a second Postgres
container. It answers a different question than the pre-existing
Prometheus/Grafana/cAdvisor stack already running on this VPS — that
stack covers container resource usage (CPU/memory/disk); Umami covers
actual visitor/page-view traffic. It's a client-side JS tracker, so it
can only ever see browser page loads — it has no visibility into
`/api/v1/*` REST traffic.

1. Generate a secret and add it to the VPS `.env` (same pattern as
   `PAYLOAD_SECRET`/`MEILI_MASTER_KEY`):
   ```bash
   openssl rand -hex 32
   # add the result to .env as: UMAMI_APP_SECRET=<value>
   ```
2. Create the `umami` database. Postgres's own init scripts only run
   against an empty data directory, and the VPS's `postgres_data` volume
   already exists — so this is a real one-time manual step, not something
   `docker compose up` handles on its own:
   ```bash
   docker compose exec postgres psql -U ${POSTGRES_USER} -c "CREATE DATABASE umami;"
   ```
3. Start it: `docker compose up -d --build`. Umami is bound to
   `127.0.0.1:3001` only, same as Postgres/Meilisearch — not reachable
   from outside the VPS host by default.
4. Log into the dashboard once via an SSH tunnel
   (`ssh -L 3001:localhost:3001 <user>@<vps>`, then
   `http://localhost:3001`) with the default `admin`/`umami` credentials
   and **change the password immediately**.
5. Create a "website" entry for lexdj.dj in the dashboard and copy its
   website ID.
6. Add two more values to `.env` and redeploy:
   ```
   NEXT_PUBLIC_UMAMI_SCRIPT_URL=<a publicly reachable URL for Umami's script.js>
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=<the website ID from step 5>
   ```
   Both unset (the default) means `app/(public)/layout.tsx` renders no
   tracking script at all — safe for local dev.
7. **Gap outside this repo, same as the TLS-termination gap noted in
   `context/security.md`**: `NEXT_PUBLIC_UMAMI_SCRIPT_URL` must resolve
   to something publicly reachable, but the container itself is
   deliberately bound to `127.0.0.1:3001` only. Whatever already fronts
   the public domain (nginx/Caddy/etc., not part of this repo) needs a
   route proxying to `localhost:3001` — e.g. a `/stats/` path or a
   dedicated subdomain — before this script will actually load for real
   visitors.

## Known limitations, not hidden

- No rollback-on-failed-health-check — a bad deploy stays up until
  someone notices the log and fixes it manually.
- No notification (Slack/email/etc.) on failure — this only writes to
  a local log file. Add one later if silent log-watching turns out to
  be insufficient in practice.
- The scraper/reindex chain has no retry — if the scraper fails
  (e.g. journalofficiel.dj is briefly down), the whole run fails and
  waits for next week's cron rather than retrying sooner.
