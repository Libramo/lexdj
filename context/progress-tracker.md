# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Live (lexdj.dj), post-launch. The 2026-09-01–09-03 session did four
  substantial, mostly-independent things: backfilled the context docs,
  redesigned the public site's visual identity (implemented, then
  revised), ported the scraper to TypeScript (installed + bug-fixed +
  verified against a real local DB), and started a Payload CMS editorial
  layer (step 1 only).
- The 2026-09-04–09-05 session shipped a second content type end to end:
  broadened LexDJ's public positioning from "archive of the JO" to
  "archive du droit et de la législation," then built **Codes** on top of
  that — Payload schema, a real imported code (Code du travail, 297
  articles), a full public reading experience (`/codes/*`), several
  rendering-fidelity passes on that same import, a richer `/cms` editor,
  and a site-wide full-bleed horizontal-scrollbar fix. See Completed →
  Codes Feature for the full detail.
- The 2026-09-07 session did four more substantial things: **migrated
  the entire public site's UI to the current token system** (six
  increments, one page/unit at a time — see Completed → UI Redesign
  entries), **found and fixed 3 real SQL injection vulnerabilities**
  during that same work (a full `sql.raw()` sweep, see Completed →
  Security), **swapped Typesense for Meilisearch** (see Completed →
  Typesense → Meilisearch Swap) via a written, user-approved plan, and
  **built cron-based auto-deploy + scrape/reindex scripts** (see
  Completed → Cron-Based Deploy and Scrape/Reindex), since none of that
  was previously automated or even documented. Also added
  `context/security.md` (an OWASP-Top-10-style tracker, new this
  session) and a matching generic template at
  `C:\Users\Liban\Documents\Projects\webProjects\templates\context\security.md`.
  **All of this is now committed and pushed** to `origin/main` on GitHub
  (`Libramo/lexdj`) as 5 logical commits (`60d1ae2`..`c49c7be` — the
  first 4 were rewritten in place after the fact, see below, so these
  are the final hashes, not the originals) — this
  had never been committed before (the last real commit, `4fa2f9f`,
  predates even the Codes feature). One untracked file, `draft.txt`,
  was deliberately left alone — not created by the assistant, unknown
  purpose, not committed. **Also fixed same session**: the first 4
  commits had accidentally included a `Co-Authored-By: Claude` trailer
  (a default the assistant followed without flagging it as optional) —
  the user explicitly does not want this, ever; the 4 commit messages
  were rewritten (`git filter-branch --msg-filter`, content verified
  byte-identical before force-pushing) and the 5th commit correctly
  omits it. See the `feedback_no_coauthor_trailer` memory — this applies
  to every future commit, any project, not just this fix.
- Late in the 2026-09-07 session: scoped (not yet built) **visitor/traffic
  monitoring**. User already runs Prometheus + Grafana + cAdvisor on the
  VPS alongside other app containers, but that stack only covers
  container resource usage, not HTTP traffic or visitor analytics. After
  discussion, landed on **Umami alone** (not a Prometheus/`prom-client`
  HTTP-metrics route) as the right scope for what the user actually
  wants — see Next Up for the full reasoning and the one real gap
  (Umami is a client-side JS tracker, so it can't see the public
  `/api/v1/*` REST API's traffic at all, only browser page loads).
- **2026-09-07 follow-up session** (same calendar day, separate sitting):
  finally executed the VPS-side punch list the prior session couldn't
  reach from here, and found/fixed several real bugs only visible once
  production actually had live data for the first time. In order: fixed
  `/api/v1/ministries`'s copy-paste bug (see Completed); added a
  Légifrance-inspired **hero search options panel** (field-scope +
  exact-phrase, corrected mid-session against a real Légifrance
  screenshot — see Completed → Hero Search); walked the VPS through
  installing the cron deploy setup for real, hitting and fixing two
  concrete gaps along the way — a `select-editor`/`crontab -e` detour,
  crontab lines still containing the literal `/path/to/ejo-djib`
  placeholder never substituted with the real path
  (`/var/www/webprojects/lexdj`), and `deploy/logs/` not existing since
  it's gitignored (now documented as an explicit one-time-setup step in
  `deploy/README.md`); ran the full Meilisearch reindex, which crashed
  twice on a real bug (`waitTask()`'s 5s default timeout too short for
  large batches, see Completed → Meilisearch Indexer Timeout Fix) before
  finally succeeding completely (53,845/53,845 documents) once that fix
  was actually deployed — a local `git reset --hard origin/main &&
  docker compose up -d --build` run on the dev machine by mistake
  (harmless, Docker Desktop wasn't even running) and a mangled commit
  message (fixed via amend + force-push) happened along the way but
  caused no lasting damage; found and fixed a genuine display bug only
  visible once real search results existed — a doubled "N° n°" prefix
  across 4 files, since `issue_number` already includes its own "n°"
  scraped from the source (see Completed); corrected an invented "JO"
  label to the source-accurate "JORD" (`scraper/parser.ts` strips
  exactly that literal prefix, confirming it's the real abbreviation);
  discovered `/codes` and `/cms` have never actually been reachable in
  production — Payload's migration has never been run there and
  `PAYLOAD_SECRET` was never even set in the VPS's `.env` (fix given,
  not yet confirmed executed — see Current Goal); and surveyed the
  scraped corpus for additional Code-du-travail-style code candidates,
  finding a clean list of importable ones plus confirming Code Pénal,
  Code de Procédure Pénale, and Code de la Route have **no** single
  consolidated foundational law to import from (only scattered colonial-
  era amendments back to 1948) — see Next Up. **Code Civil (`laws.id =
  1671`) was chosen as the next code to build, investigation into its
  `full_text` structure started but not completed — session ended here
  deliberately, pick up there next.**

## Current Goal

- Session ending here deliberately (2026-09-07 follow-up session). **Pick
  up next session:**
  1. ~~**Confirm the `PAYLOAD_SECRET` fix was actually applied on the VPS**
     and re-run the migration**~~ — **confirmed done (2026-09-08)**: `/cms`
     and `/codes` are both reachable in production now; `/codes` correctly
     renders empty (no Codes content imported yet — see next item), exactly
     the expected post-migration state.
     Root cause (for reference): Payload had never actually run in
     production before — neither `Dockerfile` nor `docker-compose.yml` runs
     `npx payload migrate` on deploy, and the VPS's `.env` never had
     `PAYLOAD_SECRET` set at all (only ever needed locally until now).
  2. ~~**Import the actual Code du travail content into production**~~ —
     **done (2026-09-08)**. First attempt hit a real bug, not a VPS/infra
     issue: `scripts/import-code-du-travail.ts` hardcoded its source
     connection to `postgresql://postgres:liban@localhost:5432/ejo_reference`
     (a local-dev-only scratch DB) — `ECONNREFUSED` inside the production
     container, which has no such database. Fixed by making the source
     connection overridable via `CODE_IMPORT_SOURCE_DB_URL` (falls back to
     the old local-dev scratch-DB default when unset, so local usage is
     unchanged), then re-run in production as:
     ```
     docker compose exec -T nextjs sh -c 'CODE_IMPORT_SOURCE_DB_URL="$DATABASE_URL" npx payload run scripts/import-code-du-travail.ts'
     ```
     pointing the source read at the container's own `DATABASE_URL` — safe
     in production specifically because `laws` and Payload's own tables
     (`codes`, `code_sections`) already live in the same Postgres there
     (see `architecture.md`'s Storage Model), unlike local dev where
     `ejo_test`/`ejo_reference` are deliberately kept separate. Confirmed
     working; production `/codes` now shows the real Code du travail.
  3. **Build the next code: Code Civil (`laws.id = 1671`, 2018)** — chosen
     this session from a corpus survey (see Completed → Codes Corpus
     Survey for the full candidate list and reasoning). Investigation
     into its `full_text` structure (does it use the same TITRE/CHAPITRE/
     Section/Article markers as Code du travail, or an added LIVRE level,
     which `CodeSections`' schema already supports?) was started but not
     finished — pick up there before writing
     `scripts/import-code-civil.ts`. Do **not** assume the same regex
     markers as `scripts/import-code-du-travail.ts` without verifying
     against the real text first, same discipline as the original import.
  4. ~~Retire the old `typesense_data` Docker volume on the VPS~~ — **done
     (2026-09-08)**, confirmed no Typesense volume remaining.
  5. **Manual functional verification checklist — still not exhaustively
     done**, only incidentally touched while fixing the "N° n°" bug:
     confirm era filters actually narrow results on `/recherche`/`/api/v1/search`,
     a `reference_number` containing `/` or `-` still tokenizes correctly,
     and `/api/chat` still surfaces grounded RAG context. Also worth a
     real look at this session's own hero-search options panel and the
     `/api/v1/ministries` fix now that there's real data to test against.
  6. `.env`'s `DATABASE_URL` is still deliberately pointed at production
     through the user's own SSH tunnel (confirmed still active and
     working this session — used to survey the Codes corpus), and
     `MEILI_HOST` is still the Docker-network-only value. Both remain the
     user's own call on when/whether to revert for normal local dev.
  7. DNS — unresolved from before, still needs external registrar
     confirmation, not something visible from here.
  8. LinkedIn post — still pending until the above is actually live,
     per the user's own stated ordering.
  9. Untriaged from `security.md`'s Findings Log: the 32 `npm audit`
     vulnerabilities, and no rate limiting on `/api/chat`/`/api/suggest`
     (the latter was explicitly discussed and deprioritized this session
     — see Completed → Rate Limiting Discussion — not urgent, not fixed).
  10. Three other "Numéro JO" labels (`textes/[id]/page.tsx:129`,
      `duplicates-table.tsx:44`, `law-document-pdf.tsx:632`) were found
      alongside the JORD fix but left unchanged — user hasn't confirmed
      whether to rename these to "Numéro JORD" too for consistency.
  11. `journal/[...issue]/page.tsx`'s H1 (`Numéro du {issue.slice(2)}`)
      has a pre-existing awkward leading-space/double-"du" phrasing —
      not broken, just not as clean as it could be; found while fixing
      the "N° n°" bug next to it, not fixed since it wasn't what was
      reported.
  12. ~~**Umami visitor monitoring** — still scoped, not built~~ — **wired
      up 2026-09-08, not yet live**: see Completed → Umami Visitor
      Analytics for the implementation; VPS-side setup (create the
      `umami` database, generate `UMAMI_APP_SECRET`, log in and create the
      website entry, wire the public reverse proxy) is still pending —
      that part is the user's own, not something runnable from here.

## Completed

### Umami Visitor Analytics (2026-09-08)

Implements the scoped-but-not-built item from the 2026-09-07 session (see
Current Phase). Verified the Docker image situation first rather than
guessing: unlike Meilisearch's pinned `v1.53.2`, Umami publishes no
per-version-pinned tag for the PostgreSQL-external-DB variant —
`docker.umami.is/umami-software/umami:postgresql-latest` is the only tag
the project maintains for it (confirmed against the GitHub Container
Registry and Docker Hub listings directly, not assumed); recorded as a
deliberate, documented exception to the "pin exact tags" rule rather than
a violation of it.

- **`docker-compose.yml`**: added a `umami` service. Reuses the existing
  `postgres` service (its own `umami` database) instead of a second
  Postgres container — same resource-conscious reasoning as the
  Typesense→Meilisearch swap. Bound to `127.0.0.1:3001` only, matching
  Postgres/Meilisearch's existing network-isolation pattern
  (`security.md` A05) — not publicly reachable by default.
- **`app/(public)/layout.tsx`**: renders Umami's tracking `<script>` via
  `next/script` (`strategy="afterInteractive"`), gated on
  `NEXT_PUBLIC_UMAMI_SCRIPT_URL`/`NEXT_PUBLIC_UMAMI_WEBSITE_ID` both being
  set — renders nothing when they're unset, so local dev and any
  environment without Umami configured is unaffected. Deliberately placed
  in the `(public)` route group's layout, not the root `app/layout.tsx`,
  so admin dashboard and `/cms` traffic is never counted as visitor
  analytics — matches the project's existing public/admin split
  (`ai-workflow-rules.md`).
- **`deploy/README.md`**: added a full one-time VPS setup section —
  generate `UMAMI_APP_SECRET`, manually create the `umami` database
  (Postgres's init scripts only run against an empty data directory, and
  the VPS's volume already exists, so this can't happen automatically),
  first login + website creation in the dashboard, and the two
  `NEXT_PUBLIC_UMAMI_*` env vars.
- **Real gap flagged, not solved here (out of this repo's reach)**: the
  tracking script's URL needs to be publicly reachable, but the container
  is deliberately `127.0.0.1`-only — whatever already fronts the public
  domain (nginx/Caddy, not part of this repo, same caveat already on file
  for TLS termination in `security.md`) needs a route proxying to
  `localhost:3001` before real visitors will ever load the script. Not
  something verifiable from here.
- `architecture.md` updated: Stack table (new Analytics row), Storage
  Model (the `umami` database's ownership/creation note), System
  Boundaries (`app/(public)/layout.tsx`'s conditional script).
- `npx tsc --noEmit` passes clean. **Not yet live**: the VPS-side setup
  steps above are still pending (user's own — no VPS/SSH access from
  here), so this is wired up in the codebase but not yet tracking real
  traffic.

### Scraper

- Original Python scraper → Postgres (Neon) pipeline: 54,306 laws, 2,108
  issues scraped from journalofficiel.dj (see `handoff-ejo-scraper.md`).
- **TypeScript port** (`scraper/` — fetcher, parser, checkpoint, writer,
  main, rescrape, progress, types) from the Python project at
  `../ejo-scraper`. Same retry/backoff, politeness sleeps, CSS selectors,
  table→markdown conversion, checkpoint file shape (resumable from an
  existing Python checkpoint). `writer.ts` reuses this repo's own Drizzle
  client/schema instead of a second DB layer. Two real bugs found and
  fixed during actual testing (not just review):
  1. `extractReferenceNumber`'s regex used Python's Unicode-aware `\b`
     semantics; JS's `\b` is ASCII-only, which would have silently failed
     at "word ends in an accented letter" boundaries (very common in
     French). Fixed with an explicit negative-lookahead instead of `\b`
     for that one alternative.
  2. `insertLaw`'s `pdf_links` (a Postgres array column) hit a real
     Drizzle `sql` tag gotcha: a plain JS array interpolated into a `sql`
     template gets expanded into a parenthesized comma list (for
     `IN (...)`-style clauses), not passed as one array parameter — for
     an empty array this produced literal `()`, invalid SQL. Fixed with
     `sql.param(law.pdf_links ?? [])`, which forces single-parameter
     treatment. This is a generally-applicable Drizzle gotcha, not
     LexDJ-specific — worth remembering for any future raw-`sql`-tag
     array column.
  - `ddmmyyyyToIso` uses `date-fns`'s `parse`/`isValid`/`format` (already
    a project dependency) rather than a hand-rolled regex — the hand-rolled
    version didn't validate day/month ranges (`31/02/2026` would have
    silently become `2026-02-31`); `date-fns` correctly rejects it,
    matching Python's `strptime` behavior.
  - Progress bars (`scraper/progress.ts`, `cli-progress` dependency) —
    tqdm-equivalent nested bars: persistent outer "Issues" bar with live
    ETA, per-issue "Laws" bar that disappears once that issue is done
    (`leave=False` equivalent). Wired into `main.ts` and all three
    `rescrape.ts` modes.
  - **Verified against a real local DB**: local Postgres (native Windows
    install, not Docker — see Session Notes), database `ejo_test`, ran
    `npx tsx scraper/main.ts` in test mode (`TEST_MODE=true`,
    `FULL_SCRAPE=false`, 3 issues × 5 laws) and it successfully scraped
    and inserted **7 real laws**, including correct table→markdown
    conversion of a real budget-law table and correct French text
    handling.
  - Local dev DB note: `duplicate_laws` isn't created by the scraper's
    `initDb()` (it's a downstream dedup-pass table, not part of ingestion)
    — had to be created manually (empty) for the public site's queries to
    work against the fresh local DB.
- **JO catch-up run configured (2026-09-05)**, not yet executed: checked
  the live portal directly (`journalofficiel.dj` homepage + the
  `/journaux-officiels/` archive listing) against the newest law in a
  **local restore of `eJO_backup.dump`** (`ejo_reference` DB) — newest
  scraped law there is dated 2026-04-20, newest live issue is **JORD
  n° 13 (15/07/2026)**, with issue **n° 06 (SPÉCIAL, 21/04/2026)** as the
  first missing one. Initially flagged this as unverified since production
  had since migrated off Neon to a self-hosted Postgres in Docker on the
  user's own VPS (see `architecture.md`'s Stack table and Storage Model,
  corrected this session) — the dump could have been stale relative to
  that. **Verified directly against real production** via an SSH tunnel
  (`ssh -L 5433:localhost:5432 <user>@<vps>`, then
  `postgresql://liban:liban@localhost:5433/eJO`, the VPS's actual
  in-network `DATABASE_URL` with `postgres` swapped for the tunnel's
  `localhost:5433`): newest law and total row count (54,306) matched the
  dump exactly, so the n° 06–13 gap estimate is confirmed accurate, not
  just a guess from stale data. `.env`'s `DATABASE_URL` was pointed at
  production through that tunnel (`postgresql://liban:liban@localhost:5433/eJO`
  — the VPS's real in-network `DATABASE_URL` with `postgres` swapped for
  the tunnel's `localhost:5433`), commented-out `ejo_test` line preserved
  to switch back to after. **Not run** — per standing instruction the
  assistant never starts the scraper or dev server; the user runs
  `npx tsx scraper/main.ts` themselves — directly against the VPS, not
  through the read-only SSH tunnel used for this verification.
- **First real run hit a genuine schema gap, caught immediately, zero data
  written** (2026-09-05): user ran `npx tsx scraper/main.ts` against
  production through the tunnel; it crashed on the very first insert with
  Postgres error `42P10` ("no unique or exclusion constraint matching
  ON CONFLICT"). Root cause: `writer.ts`'s `insertLaw`/`insertIssue` both
  use `ON CONFLICT (source_url)` upserts, which require a real unique
  constraint on `source_url` — declared in `writer.ts`'s own `initDb()`
  DDL (`source_url TEXT UNIQUE`), but that only applies on table
  *creation*; production's `laws`/`issues` tables pre-date this TypeScript
  port, so `CREATE TABLE IF NOT EXISTS` was a no-op and the constraint was
  never actually present. `drizzle/src/db/schema.ts` — the project's
  declared schema source of truth — didn't declare it either (a stale
  comment on `laws_distinct`'s definition claimed "`source_url` UNIQUE
  prevents duplicates", but the column itself was plain `text()`). This
  had been latent since the TypeScript port was written, only surfacing
  now because this was the first time its upsert path ran against the
  real pre-existing production tables rather than a fresh `initDb()`-built
  local one. **Crashed before any row committed** — confirmed zero rows
  written; `insertLaw`/`insertIssue` are not wrapped in a transaction, but
  each call is independent, so failing on attempt #1 left nothing behind.
  Confirmed safe to fix directly: queried production for duplicate/NULL
  `source_url` values in both tables first — zero in either (54,306+ rows
  checked) — then ran, with the user's explicit go-ahead:
  `ALTER TABLE laws ADD CONSTRAINT laws_source_url_key UNIQUE (source_url);`
  and the same for `issues`. Also added `.unique()` to both columns in
  `drizzle/src/db/schema.ts` so the declared schema now matches reality —
  confirmed no drizzle-kit migration history exists for this schema at all
  (`drizzle/` has no `.sql`/`meta/` files — `writer.ts`'s raw DDL has
  always been the only mechanism), so this ad-hoc `ALTER TABLE` matches
  how this schema has always been managed, not a process violation.
  `npx tsc --noEmit` passes clean.
- **Catch-up run completed successfully** (2026-09-05, re-run after the
  constraint fix above): `npx tsx scraper/main.ts` — 7 issues, 39 laws
  processed, **zero errors** (confirmed via `scrape_logs`: most recent
  entries were all pre-existing from 2026-04-30, nothing new logged this
  run). `laws` went **54,306 → 54,337** (+31 net new; the other 8 of the
  39 were re-touches of already-existing rows in the 3-day overlap
  window, upserted via `ON CONFLICT` rather than inserted). Newest law now
  dated 2026-08-29. Interesting source-site quirk confirmed, not a bug:
  `issues.issue_number` "n° 13 du 15/07/2026" (its nominal/legal date) has
  `publication_date = 2026-08-29` — journalofficiel.dj dates an issue one
  day but doesn't actually post it to the portal until weeks later; the
  pre-existing `date_anomaly` log entries were already flagging this
  pattern, not something introduced by this run. **Follow-up not done
  yet**: Typesense wasn't reindexed after this run, so `/recherche` won't
  surface these 31 new laws until either a manual
  `scripts/typesense-index.ts` run or the Meilisearch swap happens (user's
  call which comes first — see Next Up). `.env`'s `DATABASE_URL` is still
  pointed at production through the tunnel — must be switched back to
  `ejo_test` before resuming normal local dev work (see Current Goal).
- **Made `scraper/main.ts`'s DATE RANGE mode self-sufficient for periodic
  runs**: hand-edited `START_DATE`/`END_DATE` constants replaced with
  `computeDateRange()` — queries `MAX(publication_date)` from `laws`,
  starts `OVERLAP_BUFFER_DAYS` (3) before that, ends "today." Directly
  fixes the root cause of the 3-month drift above (stale hand-edited
  constants nobody noticed) and is what makes a cron/scheduled run safe:
  no code edit needed before each run, and checkpoint's `isScraped()` +
  `insertLaw`'s own handling make the overlap days a cheap no-op, not a
  duplicate-insert risk. `FULL_SCRAPE`/`TEST_MODE` stay hardcoded
  `false`/`false` — those are for deliberate one-off manual runs only
  (initial historical scrape, local smoke tests), not periodic use.
  `npx tsc --noEmit` passes clean.
- ~~**Periodic sync — recommended approach, not yet set up**~~ —
  **script written 2026-09-07**, see Completed → Cron-Based Deploy and
  Scrape/Reindex below (`deploy/scrape-and-reindex.sh`, weekly, chains
  the scraper + the now-shipped Meilisearch delta reindex exactly as
  recommended here). Not yet installed on the VPS crontab — see that
  entry and `deploy/README.md`.

### UI Redesign

- Reviewed `gouv-dj/packages/ui` and `gouv-dj/apps/ministeres` as a design
  reference (see `ui-context.md`).
- **First pass** (2026-09-02): rewrote the token system, `nav.tsx`,
  `animated-hero.tsx`, `hero-search.tsx`, homepage card grids, and
  `recent-issues.tsx` — dropped SaaS motion tropes (gradient orbs, pulsing
  badge, animated counters, glassmorphism), moved to one real token
  system, sharp radii. Deliberately did *not* use gouv-dj's `GovMark` or
  exact palette at this point — kept LexDJ's own navy and stayed
  explicitly non-official.
- **Second pass** (2026-09-03, explicit user request): reversed that
  call — now uses the *exact* `GovMark` component and *exact* gouv-dj
  color palette (see `ui-context.md`'s Colors section and this file's
  Architecture Decisions for the reasoning). Added `components/ui/gov-mark.tsx`,
  the flag/emblem SVG assets, switched `app/globals.css` to gouv-dj's
  exact oklch tokens and `--radius: 0rem`.
  - This introduced a real bug (solid green/bright-blue fills where light
    tints belonged) — found by the user, root-caused, and fixed: the
    *values* were exact, but component-level usage patterns (solid
    `bg-secondary`/`bg-primary` fills for the hero, icon chips, CTA band)
    were designed around the old navy palette and never re-audited
    against what the new token roles actually mean. Fixed across
    `animated-hero.tsx`, `hero-search.tsx`, `recent-issues.tsx`,
    `app/(public)/page.tsx`, `app/(public)/layout.tsx`.
  - Added `components/public/site-nav.tsx`, a full-width mega-menu nav
    (adapted from gouv-dj's `SiteNav` pattern, not the `@base-ui`-dependent
    `NavDropdown`), with real data-backed groups for "Textes" (doc types +
    eras) and "Numéros" (eras) — hrefs match what `/textes` and `/journal`
    actually read from `searchParams`, not fabricated links.
  - Restructured the header into two stacked rows (identity row, nav row)
    and made row 1 responsive — `GovMark` shrinks to `size="sm"` and
    "LexDJ" stacks below it on mobile instead of staying side-by-side.
  - Fixed a dropdown/header alignment bug (dropdown content was
    `max-w-7xl`, header rows were `max-w-6xl` — edges didn't line up).
  - Widened the hero search input (`max-w-2xl` → `max-w-4xl`) per a
    Légifrance reference screenshot.
  - All of the above type-checks, lints, and builds clean (verified after
    every step, not just at the end).
  - **Horizontal scrollbar fixed (2026-09-05)**: `site-nav.tsx`'s dropdown
    panel uses `w-screen -translate-x-1/2` to break out of its `max-w-6xl`
    container to full viewport width — `100vw` includes the vertical
    scrollbar's own width, which the visible content area doesn't, so the
    panel ends up ~15px wider than the page and produces a horizontal
    scrollbar the instant a dropdown opens (it's conditionally rendered,
    so no scrollbar before that). Confirmed this is the exact same
    long-standing issue in `gouv-dj` — `apps/ministeres/app/globals.css`
    and `apps/gouv/app/globals.css` both apply `overflow-x-hidden` on
    `body` to fix it. Applying that alone here still left a visible
    scrollbar — relying on the browser's body→viewport overflow
    propagation isn't reliable — so `app/globals.css` now sets
    `overflow-x: hidden` on **both** `html` and `body`, removing any
    dependency on that propagation behavior. Not set on `<header>` itself
    — it doesn't have the height to contain the panel, and hiding
    overflow there would clip the dropdown's own content instead of just
    the horizontal overflow.

### Payload CMS

- Installed `payload`, `@payloadcms/db-postgres`, `@payloadcms/next`,
  `@payloadcms/richtext-lexical` (`^3.87.1`, matching `gouv-dj/apps/cms`'s
  proven versions), later `@payloadcms/plugin-nested-docs` (Codes work).
  Required bumping `next` 16.2.4→16.2.12 (peer dep) and adding `"type":
  "module"` to `package.json` (Payload's CLI couldn't load its own ESM
  config otherwise — confirmed safe, zero plain `.js` files in the repo
  that could break under ESM).
- Mounted inside this same Next.js app at `/cms` (admin UI) and `/cms-api`
  (Payload's REST API) — not the defaults, to avoid colliding with the
  existing `app/api/*` surface.
- `collections/Users.ts` (auth), `collections/LawCorrections.ts` (the
  editorial overlay collection — see Architecture Decisions for why this
  is deliberately *not* the `laws` table), `collections/Codes.ts` and
  `collections/CodeSections.ts` (see Codes Feature below) are defined.
- Payload's first-ever migration has run against local `ejo_test`,
  creating every table above in one shot (see Codes Feature) —
  `push: false` on `postgresAdapter` is required going forward (Invariant
  9); real migrations are the only sanctioned way to change this schema
  now.
- **Still not done** (see Next Up): the read-side merge (law detail page
  + `typesense-index.ts` checking `law-corrections` by `sourceUrl` before
  falling back to the scraped row), and retiring the old OCR
  editor/dashboard/login once that merge is proven.

### Codes Feature (2026-09-04–09-05)

A second content type, end to end — schema, real content, public
rendering — inspired by Légifrance's IA (sticky table of contents,
breadcrumbs, article-by-article navigation) but not a visual copy. See
`C:\Users\Liban\.claude\plans\stateful-splashing-badger.md` for the
original approved plan.

- **Positioning first**: LexDJ's public framing broadened from "archive of
  the Journal Officiel" to "archive du droit et de la législation" (copy
  in `app/layout.tsx` metadata, `app/(public)/layout.tsx` top bar,
  `components/public/nav.tsx` tagline — kept "LexDJ" and the "archive non
  officielle" disclaimer, only broadened the subject). Deliberately left
  unchanged: `app/api/chat/route.ts`'s system prompt (still JO-specific,
  since that's genuinely all its retrieval is grounded in — broadening the
  copy without broadening the data would make it overstate its own
  coverage) and `law-document-pdf.tsx`'s per-law PDF footer (each PDF
  really is a single JO document). Jurisprudence/doctrine as future
  content types remains explicitly undecided.
- **Schema**: `collections/Codes.ts` (flat: slug/title/description) and
  `collections/CodeSections.ts` (self-referential hierarchy — `code`,
  hand-defined `parent` with `code`-scoped + cycle-preventing
  `filterOptions`, `type` select, `title`, `articleNumber`, `content`
  richText — both gated to `type === "article"` — `slug`, `order`,
  `versions.maxPerDoc: 100`), using `@payloadcms/plugin-nested-docs` for
  the `breadcrumbs` field/cascade hooks. Payload's first-ever migration
  (`20260905_033534`) created every pending table in one shot (`users`,
  `law_corrections`, `codes`, `code_sections`, `payload_*`) — confirmed via
  the migration's own `CREATE TABLE` statements that nothing touches
  `laws`/`issues`/`scrape_logs`/`duplicate_laws` (Invariant 8 intact).
- **Auto-slug with de-duplication**: both collections auto-generate `slug`
  from `title` (CodeSections also prefixes the parent Code's own slug)
  when left blank, via `lib/slugify.ts`'s `slugify()` + `uniqueSlug()`
  (appends `-2`, `-3`... on collision). Added after real confusion trying
  to hand-type slugs through `/cms`, and the de-dup specifically after a
  real collision surfaced during the bulk import below (two sections
  sharing an identical heading, common in a large legal hierarchy).
- **Real content**: the full "Code du travail" (10 Titres, 28 Chapitres, 29
  Sections, 297 Articles) imported via a one-off script
  (`scripts/import-code-du-travail.ts`, run with `npx payload run
  scripts/import-code-du-travail.ts`) rather than hand-typed — pulled from
  the law already in the 54k-row scraped corpus ("Loi n° 133/AN/05/5ème L
  portant Code du Travail", `laws.id = 4291`), read via a plain `pg`
  client against a scratch `ejo_reference` DB (a `laws`-table-only restore
  of `eJO_backup.dump`, kept separate from `ejo_test` so reading
  production-scraped text never risks the live dev DB). The source text
  runs headings directly into their numerals with no separator ("TITRE
  IDISPOSITIONS GÉNÉRALES"), so the script splits on regex markers rather
  than whitespace: TITRE (Roman I–X), CHAPITRE (Roman, except the very
  first chapter in the whole document, "CHAPITRE 1er" — confirmed against
  the actual text, not assumed), Section (Arabic, the only level with a
  colon separator, which conveniently excludes inline prose references
  like "voir Section 3"), Article (Arabic + optional "er"). Each article's
  `content` is split into one paragraph per structural chunk —
  `splitIntoParagraphs()` detects embedded enumerated sub-items ("a)
  ...;b) ...", "1. ...;2. ...", requiring the marker to follow ";", ":",
  or the start of text, and at least 2 hits before treating it as a real
  list) and gives each its own paragraph, keeping the *original* label
  (Article 2's a/b/c/d/e are real paragraphs again, still labeled a–e).
  Deliberately NOT converted into a native Lexical ordered list — French
  legal citation refers to "l'alinéa a)" by that literal letter, and a
  real `<ol>` would renumber everything as 1, 2, 3, breaking citation
  accuracy for a cosmetic win. Each sub-item paragraph also gets Lexical's
  `indent: 1` (intro paragraphs stay `0`) — the *default* paragraph
  converter silently ignores that field entirely, so
  `components/public/code-content.tsx` overrides just the `paragraph`
  converter (spreading `defaultConverters` for everything else — bold,
  italic, links, lists, headings all still come free, including for
  anything hand-formatted later via `/cms`'s Lexical editor) to turn
  `indent` into real `padding-inline-start`.
  - **Titre/Chapitre/Section titles now carry their real numeral**: the
    marker (roman numeral, "1er", arabic number) was only ever used
    transiently during parsing and never stored, so nothing on the public
    site could show "Titre I" vs. just its bare heading text — fixed with
    `formatHeading()`, producing e.g. "Titre I — Dispositions générales",
    matching how the source document itself literally labels these
    ("TITRE I" appears verbatim in the raw scraped text).
  - **Real bug found and fixed**: `npx payload run <script>` calls `await
    import(scriptPath)` then *unconditionally* calls `process.exit(0)` the
    instant that resolves (`node_modules/payload/dist/bin/index.js`) — a
    fire-and-forget `main().catch(...)` (no top-level `await`) let the
    import resolve before any of `main()`'s work ran, exiting silently
    with code 0 and zero output. Fixed with a real top-level `await
    main()`. Worth remembering for any future `payload run` script.
- **Near-miss caught, not just an import detail**: running `npm run dev`
  and opening `/cms` triggered Payload's dev-mode schema push, which
  prompted to **delete `laws` (7 rows) and `issues` (3 rows)** — it
  reconciles against every table in the shared DB, not just Payload's own,
  and didn't recognize the scraper's tables. Declined the prompt;
  root-caused and fixed with `push: false` on `postgresAdapter` in
  `payload.config.ts` (Payload schema changes now only ever happen via
  real migrations). Recorded as `architecture.md` Invariant 9 — must never
  be re-enabled given the shared-DB setup.
- **Public rendering**: `lib/codes.ts` (one query per code fetches every
  section, builds the parent→children tree + lookups in memory —
  `getCodeBySlug`, `getCodeTree`, `findNode`, `flattenArticles`), three
  routes (`app/(public)/codes/page.tsx`,
  `app/(public)/codes/[codeSlug]/page.tsx`,
  `app/(public)/codes/[codeSlug]/[nodeSlug]/page.tsx` — flat slug rather
  than a deep breadcrumb-path URL, deliberately not copying Légifrance's
  own opaque-ID scheme since that's built for a much larger corpus), and
  four new components: `code-toc.tsx` (client, sticky, recursive
  collapsible tree, current node highlighted with `bg-primary/10`),
  `code-content.tsx` (server, wraps `@payloadcms/richtext-lexical/react`'s
  `RichText` — a deliberately separate pipeline from `LawTextRenderer`'s
  `parseText()`, since Codes content is hand-authored Lexical JSON, never
  scraped OCR text), `code-breadcrumbs.tsx`, `code-node-list.tsx` (shared
  "list this node's children" block, used by both the Code landing page
  and a container node's own page). Built on the *current* token system
  (`bg-primary/10`, `border-border`, `rounded-sm`) rather than
  `/textes/[id]`'s pre-migration hardcoded hex — see the UI consistency
  note in Next Up. `npm run build` passes clean, all three routes compile.
  Added a "Codes" link to `nav.tsx`.
- **Rendering-fidelity fixes, found via actual manual testing in `/cms`**:
  - Lists/links/headings/blockquotes were completely unstyled on the
    public page — Tailwind's preflight strips all default browser styling
    from `ul`/`ol`/`li`/`a`/`h1-h3`/`blockquote`. `code-content.tsx`'s
    `CONTENT_CLASSNAME` now styles all of them explicitly; reuse/extend
    it rather than re-deriving rich-text styles elsewhere (see
    `ui-context.md`).
  - Manually adding a real Lexical ordered list in `/cms` to preserve
    "a)/b)/c)" citation letters **can't work** — Lexical only supports
    `bullet`/`number`/`check` list types, no "alpha" type, so a native
    list can only ever render as 1, 2, 3 regardless of what the editor's
    toolbar visually showed while editing. Confirmed this by inspecting
    the actual stored `listType` directly in Postgres, not by guessing
    from the rendered page. This is exactly why the import script uses
    plain indented paragraphs instead (see above) — the only way to
    guarantee the literal original letter displays correctly. Guidance
    for future manual edits: type sub-items as plain paragraphs starting
    with the literal marker (`a) ...`) and use the editor's **Indent**
    button, not the List button — that sets the same `indent` field
    `code-content.tsx` already renders.
  - `/cms`'s Lexical editor only shipped `InlineToolbarFeature`
    (selection-triggered popup) — `FixedToolbarFeature` (a persistent bar)
    is a separate, opt-in feature, not a default. Added it to
    `payload.config.ts` on top of (not instead of) the existing defaults.
    Requires an actual `npm run dev` restart (`payload.config.ts` loads
    once at server startup, unlike component/CSS edits).
  - `EXPERIMENTAL_TableFeature` exists but is explicitly named
    "EXPERIMENTAL" by Payload — deliberately not added given this is
    legal-reference content where a stored-format change later would be
    costly; revisit only if a real tabular code section shows up.
  - **Site-wide horizontal scrollbar, unrelated to Codes specifically**:
    `site-nav.tsx`'s dropdown panel (`w-screen -translate-x-1/2`) always
    overflowed the page by the scrollbar's own width the moment a dropdown
    opened (it's conditionally rendered, so invisible until then).
    Confirmed via `gouv-dj/apps/ministeres/app/globals.css` — same
    long-standing bug there, fixed there with `overflow-x-hidden` on
    `body` alone. That alone wasn't enough here (browser's body→viewport
    overflow propagation isn't reliable) — `app/globals.css` now sets it
    on **both** `html` and `body`. See `ui-context.md`'s new "Full-bleed
    elements" note — any future `w-screen`-breakout element is already
    covered by this, no need to re-solve it per-component.

### UI Redesign — Token Migration, `/recherche` (2026-09-07)

Migrated `app/(public)/recherche/page.tsx`, `components/public/search-input.tsx`,
and `components/public/search-filters.tsx` off the pre-redesign hardcoded
hex/pill styling onto the current token system (see `ui-context.md`), as
the first increment of the "UI redesign remaining scope" backlog item —
one unit at a time, rest of `/textes`/`/journal`/`/ministeres`/etc. still
pending (see Next Up).

- Backgrounds: `bg-[#FAFAF8]`/`bg-white` → `bg-background`; borders
  `border-black/*` → `border-border`.
- Text: `text-[#111]`/`text-[#444]` → `text-foreground`;
  `text-[#888]`/`text-[#AAA]`/`text-[#CCC]`/`text-[#666]` all consolidated
  to `text-muted-foreground` (the token system has one semantic gray, not
  several hand-picked shades).
- Brand color: `#1A3A5C` (old navy) → `bg-primary`/`text-primary` (or
  `/10` washes for tints, `-foreground` variants for on-primary text),
  matching the "small elements only" rule in `ui-context.md` — filter
  pills/badges/buttons are exactly the kind of small solid-fill element
  that rule allows.
- Radius: `rounded-full`/`rounded-xl`/`rounded-2xl`/`rounded-lg`/`rounded-md`
  → `rounded-sm` everywhere (matches `--radius: 0rem`, no pill CTAs per
  the design system).
- H1 (`font-['Libre_Baskerville'] font-normal`) → `font-sans uppercase
  font-bold tracking-tight`, matching the homepage's H2 structural-heading
  convention (serif stays reserved for rendered legal document text only).
- `text-red-500` (destructive links: "Effacer les filtres") → `text-destructive`,
  using the token already defined in `globals.css` instead of a raw
  Tailwind color name.
- Result-card doc-type badges now reuse the same `DOC_TYPE_COLORS`
  pattern as `hero-search.tsx` (Loi gets `bg-primary/10 text-primary`,
  every other type shares one neutral `bg-muted` tone) instead of a
  uniform primary wash for all types — makes the two doc-type tag
  treatments on the site consistent with each other.
- **Real violation of the Theme rule found and fixed**: result cards had
  `hover:shadow-sm` alongside `hover:border-[#1A3A5C]/25` — `ui-context.md`
  explicitly says hover states change color/border only, no shadow pop.
  Dropped the shadow, kept the border-color hover.
- `npx tsc --noEmit` passes clean. Not yet manually verified in a running
  browser (assistant doesn't start the dev server — user's own
  `npm run dev` needed to visually confirm).

### UI Redesign — Token Migration, `/textes` (2026-09-07)

Second increment of the "UI redesign remaining scope" backlog item (see
`/recherche` entry above for the first). Migrated
`app/(public)/textes/page.tsx` and `components/public/text-filters.tsx`.

- Same class-level conversions as `/recherche` (`bg-[#FAFAF8]`/`bg-white` →
  `bg-background`, `border-black/*` → `border-border`, the `#888`/`#AAA`/
  `#CCC`/`#BBB`/`#999`/`#DDD` gray ladder → `text-muted-foreground`,
  `#1A3A5C` → `primary` token variants, all radii → `rounded-sm`,
  `text-red-500` → `text-destructive`).
- **Real Theme-rule violation, larger than `/recherche`'s**: the page
  header was a **solid navy fill** (`bg-[#1A3A5C] text-white`) — exactly
  the "colored hero section" pattern `ui-context.md`'s Theme section
  explicitly bans ("Backgrounds are white/light everywhere... never a
  large solid fill"). Rebuilt as a white `bg-background` header matching
  the homepage `Hero`'s actual pattern (`animated-hero.tsx`): muted-foreground
  eyebrow, uppercase black H1 (two-tone — main word `text-foreground`,
  qualifier `text-muted-foreground` — mirroring the homepage H1/H2 split),
  muted-foreground subtext. The quick doc-type/era filter pills (previously
  white-on-navy) now use the same active/inactive pattern as
  `text-filters.tsx`'s `TypeFilter` (`bg-primary`/`text-primary-foreground`
  when active, bordered muted otherwise) instead of a bespoke navy/white
  scheme.
- Also dropped `hover:shadow-sm` on result-card hover (same violation
  found and fixed on `/recherche`).
- **Consolidated the doc-type badge palette**: this page had its own
  bespoke `DOC_TYPE_COLORS` mapping seven types to seven different pastel
  Tailwind hues (blue/violet/amber/rose/cyan/emerald/orange) — this
  directly contradicted `ui-context.md`'s explicit rule ("every other type
  shares one neutral `bg-muted` tone rather than a rainbow of pastel
  hues") and was a stricter case of the same gap already flagged for
  `hero-search.tsx`. Replaced with the same `DOC_TYPE_COLORS` shape used
  in `hero-search.tsx`/`recherche/page.tsx` (`Loi` → `bg-primary/10
  text-primary`, everything else → `bg-muted text-muted-foreground`).
  This resolves the "Known Gaps" doc-type-tag-color item in
  `ui-context.md` by adopting the simplification the design system itself
  already specifies, rather than picking new desaturated hex values —
  worth updating `ui-context.md`'s Known Gaps note to reflect this is now
  decided, not still TODO.
  - Left the small inline era tags (`getEraTag`'s "Colonial"/"Post-indép."
    labels, `text-amber-600`/`text-violet-600`) unchanged — these are
    small text labels, not fills, and aren't the doc-type rainbow the
    rule targets.
- `npx tsc --noEmit` passes clean. Not yet manually verified in a running
  browser (assistant doesn't start the dev server).

### UI Redesign — Token Migration, `/textes/[id]` (2026-09-07)

Third increment of the "UI redesign remaining scope" backlog item.
Migrated `app/(public)/textes/[id]/page.tsx`, `components/public/law-text-renderer.tsx`,
`components/public/visas-renderer.tsx`, and `components/public/expandable-text.tsx`
(the latter imported on this page but currently unused/dead — migrated
anyway since it's one of the explicitly tracked remaining-hex files and
cheap to do alongside its importing page).

- Same class-level conversions as the previous two increments
  (backgrounds/borders/grays/red→destructive/radii — see `/recherche` and
  `/textes` entries above).
- **Real gap found and fixed, not just a color swap**: `ui-context.md`'s
  Typography table says rendered legal document text (law detail page:
  articles, visas, clauses, signature) should be serif — `code-content.tsx`
  (Codes reading UI) already does this correctly (`font-serif` on its
  content wrapper), but `law-text-renderer.tsx` and `visas-renderer.tsx`
  had **no `font-serif` anywhere** — the actual law body text was
  rendering in the default sans font despite the documented rule. Added
  `font-serif` to the actual prose elements (`ArticleBlock`/`ParagraphBlock`/
  `NumberedItemBlock`/`BulletBlock`/`ClauseBlock` content, `VisasRenderer`'s
  visa body text, `SignatureBlock` and `SignedBy` in the page itself) while
  deliberately leaving structural labels/badges/headings
  (`RomanSectionBlock`'s h3, article-number badges, VU/Considérant tags,
  the preamble label) in the default sans — mirrors `code-content.tsx`'s
  own h1–h3-stay-sans-within-serif-content pattern. Table cell text
  (`TableBlock`) was deliberately left sans — dense tabular/numeric data,
  not continuous prose, and `ui-context.md`'s rule doesn't call out tables.
- The page's own H1 (the law's title) switched from the ad hoc
  `font-['Libre_Baskerville'] font-normal` string to the project's real
  `font-serif` utility (already correctly wired to the `--font-libre-baskerville`
  variable via `next/font`, same mechanism `code-content.tsx` already
  relies on) — kept serif, since a law's own title is exactly the
  "you are reading a historical/legal document" content this rule exists
  for, just fixed the hacky font declaration.
- `ClauseBlock`'s VU/non-VU distinction (`text-[#4A7FA8] bg-[#EEF3F8]` vs.
  `text-[#8B6F47] bg-[#F5EFE6]`, a bespoke two-color tan/blue scheme) was
  consolidated to the same `primary`-tint/neutral pattern as the doc-type
  badge simplification on `/textes` and `/recherche` — `bg-primary/10
  text-primary` for VU (the citation to an actual legal basis), `bg-muted
  text-muted-foreground` for everything else.
- Genuinely circular decorative elements (`NumberedItemBlock`'s numeral
  circle, `BulletBlock`'s/`VisasRenderer`'s bullet dots) correctly kept
  `rounded-full` — that Tailwind class always resolves to a true circle
  regardless of the `--radius: 0rem` token, so it isn't the "no pill CTAs"
  violation the rest of the migration is fixing; only pill-shaped tag/badge
  elements (`rounded-full` used as a stretched pill) were converted to
  `rounded-sm`.
- Incidental cleanup: removed two leftover `console.log` debug statements
  in the page component (`Parsed`/`ROW law :`) — unrelated to styling,
  found while rewriting the file, harmless one-line removal.
- `npx tsc --noEmit` passes clean. Not yet manually verified in a running
  browser.

### UI Redesign — Token Migration, `/journal` (2026-09-07)

Fourth increment of the "UI redesign remaining scope" backlog item.
Migrated `app/(public)/journal/page.tsx`, `journal/[...issue]/page.tsx`,
and `components/public/inaccessibles-section.tsx`.

- Same class-level conversions as the previous increments, plus the same
  "solid navy header → white `bg-background` header matching the homepage
  `Hero` pattern" fix already applied to `/textes` (this page had the
  identical anti-pattern: `bg-[#1A3A5C] text-white` full-width header).
- Same `hover:-translate-y-0.5 hover:shadow-md` violation as before, worse
  than `/textes`'s (both the lift *and* the shadow this time) — removed,
  left `hover:border-primary/40` only, per the Theme rule.
- Era badges (`getEra`'s 4-way colonial/independence/1990s/moderne
  amber/violet/cyan/emerald scheme) were deliberately **left unchanged** —
  this is a different categorical dimension than the doc-type rainbow
  `ui-context.md` explicitly bans, and matches the precedent already set
  on `/textes` (`getEraTag`'s amber/violet era labels, also left alone).
  Only the pill *shape* (`rounded-full` → `rounded-sm`, since these are
  stretched label pills, not circles) was fixed for consistency with the
  rest of the radius migration; the small round dot inside each badge
  correctly kept `rounded-full` (a true circle, not the zero-radius
  token).
- Issue-number headings (`/journal`'s grid cards, the issue detail page's
  H1) switched from `font-['Libre_Baskerville']` to the real `font-serif`
  utility, same reasoning as the law title on `/textes/[id]` — these are
  document-identity headings ("Numéro du..."), not structural UI chrome.
- **Real security bug found and fixed, not a styling issue**:
  `/journal/page.tsx`'s search (`?q=`) was built with `sql.raw()` and
  **unescaped string interpolation** of the user-controlled `q` param
  directly into the SQL text (`ILIKE '%${q}%'`) — a live, exploitable SQL
  injection on a public, unauthenticated route, worse than the *manual*
  quote-escaping gap already flagged for `app/api/v1/laws/route.ts` in
  `code-standards.md`/`architecture.md` Invariant 7 (this had no escaping
  at all). Fixed by rebuilding the query with Drizzle's parameterized
  tagged `sql` template (`sql.join` combining per-filter `sql` fragments)
  instead of `sql.raw` + string concatenation — `q` is now bound as a real
  query parameter, never inlined into the SQL text. Found incidentally
  while doing the styling pass on this exact query-building code, not
  from a dedicated security review — worth a proper audit of the rest of
  `app/(public)/**` and `app/api/**` for the same `sql.raw()` pattern
  before assuming this was the only instance.
- Incidental cleanup: removed leftover `console.log` debug statements in
  both page files (`"q:", q`, `"Issue : ", issue`, and a bare
  `console.log(issueUrl)`), same as the `/textes/[id]` pass.
- `npx tsc --noEmit` passes clean (this also confirms `sql.join` type-checks
  against the installed Drizzle version). Not yet manually verified in a
  running browser.

### UI Redesign — Token Migration, `/ministeres` (2026-09-07)

Fifth increment of the "UI redesign remaining scope" backlog item.
Migrated `app/(public)/ministeres/page.tsx` and `ministeres/[slug]/page.tsx`.
No `sql.raw()`/injection issue here — both files already used Drizzle's
parameterized tagged `sql` template correctly (`` sql`ministry = ${ministry}...` ``),
unlike `/journal`.

- Same header-fill and hover-lift/shadow violations as `/textes`/`/journal`,
  fixed the same way (white `bg-background` header, `hover:border-primary/40`
  only).
- **Two more rainbow-palette consolidations**, same reasoning as the
  doc-type badge fixes on `/recherche`/`/textes`/`/textes/[id]`:
  - The ministries breakdown bar's 3-color scheme (`#9DC4E0`/`#4A7FA8`/
    `white/40`, designed to read against the old navy header) → decreasing
    `primary` opacity steps (`bg-primary`/`bg-primary/60`/`bg-primary/30`)
    now that the header is white.
  - The "all ministries" list's 6-hue `ACCENTS` array (blue/amber/emerald/
    rose/violet/cyan, cycled per row purely for scannability, no semantic
    meaning) → a single consistent `bg-primary/50` dot and `bg-primary/40`
    bar for every row, matching "one semantic color system" in
    `ui-context.md`'s Colors section rather than decorative per-row
    variety.
  - Added the standard `DOC_TYPE_COLORS` map (Loi tint, others neutral) to
    `[slug]/page.tsx`'s law-list badges, which previously used one static
    tint regardless of doc type — now consistent with every other listing
    page.
- Ministry names (page H1s, list items) stayed **sans uppercase**, not
  serif — unlike a law's own title (`/textes/[id]`) or a JO issue number
  (`/journal`), a ministry name is an organizational/category label, not
  rendered legal document text, so it follows the same structural-heading
  treatment as topic/doc-type/era labels elsewhere rather than the
  document-identity serif treatment.
- The top-3 hero cards' decorative giant background rank numeral
  (`1`/`2`/`3`) kept its serif flourish (`font-['Libre_Baskerville']` →
  `font-serif`) as a stylistic echo of the gazette aesthetic, just fixed
  the font-declaration mechanism and opacity token (`text-black/3` →
  `text-muted-foreground/10`).
- `npx tsc --noEmit` passes clean. Not yet manually verified in a running
  browser.

### Security — `sql.raw()` Injection Sweep (2026-09-07)

Follow-up to the SQL injection found incidentally during the `/journal` UI
pass (see that entry above). Swept every `sql.raw(` call site in the repo
(`grep -r "sql\.raw("`) rather than assuming `/journal` was the only
instance.

- **Fixed — same unescaped-interpolation bug as `/journal`, but these three
  had already been *attempting* manual escaping** (`.replace(/'/g, "''")`),
  the "known gap" already flagged in `code-standards.md`/`architecture.md`
  Invariant 7 and tracked in Open Questions below. Converted all three from
  `sql.raw()` + string concatenation to Drizzle's parameterized tagged
  `sql` template (`sql.join` combining per-filter `sql` fragments, same
  pattern used to fix `/journal`) — no behavior change, same response
  shapes, just real parameter binding instead of string escaping:
  - `app/api/v1/laws/route.ts` (`type`, `ministry` filters)
  - `app/api/v1/issues/route.ts` (`q` filter)
  - `app/api/v1/ministries/route.ts` (`q` filter — see functional-bug note
    below)
- **Verified safe, left unchanged**: `app/api/v1/laws/[id]/route.ts`'s
  `sql.raw()` interpolates `numId`, which is `parseInt`'d and `isNaN`-checked
  before use — always a clean integer, never attacker-controlled text, so
  no injection surface despite using `sql.raw()`.
- This resolves the "Open Questions" item about `app/api/v1/laws/route.ts`'s
  manual quote-escaping — it's now genuinely parameterized, not just
  better-escaped.
- **Separate, pre-existing functional bug found while doing this sweep, NOT
  fixed here**: `app/api/v1/ministries/route.ts` is (and was, before this
  fix) a byte-for-byte duplicate of `app/api/v1/issues/route.ts` — it
  groups by `issue_number`/`issue_date` and returns `{ issue_number,
  issue_date, text_count }` rows, but `app/(public)/api/page.tsx`'s own
  documented contract for this endpoint says it should group by ministry
  and return `{ ministry, text_count }` rows (example: `q=finance` →
  ministry names). The public `/api/v1/ministries` endpoint has apparently
  never actually returned ministries data. Flagged for the user to decide
  whether to fix now (straightforward — mirror `app/(public)/ministeres/page.tsx`'s
  grouping query) or handle separately; left as-is here since correcting
  the query logic is a functional change, not a security fix, and wasn't
  what this pass was scoped to do.
- `npx tsc --noEmit` passes clean after all three fixes.

### `/api/v1/ministries` Fix (2026-09-07, follow-up session)

Fixed the functional bug flagged (not fixed) in the Security sweep entry
above: `app/api/v1/ministries/route.ts` was a byte-for-byte copy of
`app/api/v1/issues/route.ts`, grouping by `issue_number`/`issue_date`
instead of by ministry.

- Rewrote the query to group by `ministry` (mirroring
  `app/(public)/ministeres/page.tsx`'s `GROUP BY laws.ministry` query),
  now returning `{ ministry, text_count }` rows matching the documented
  contract in `app/(public)/api/page.tsx`.
- Dropped `page`/`limit`/`era` — never part of this endpoint's documented
  contract (only `q` is), so they were dead copy-paste params from
  `issues/route.ts` that happened to no-op since nothing else used them.
  `meta` is now just `{ total }`, matching the docs exactly.
- Still parameterized via Drizzle's tagged `sql` template (`ministry ILIKE
  ${q}`) — no injection surface introduced.
- `npx tsc --noEmit` passes clean. Not yet manually hit in a browser/curl
  (assistant doesn't start the dev server) — worth a quick
  `curl localhost:3000/api/v1/ministries?q=finance` check once `npm run dev`
  is running to confirm the response shape matches the docs exactly.

### Hero Search — Options Panel (2026-09-07, follow-up session)

First half of a Légifrance-inspired search upgrade, scoped as two separate
units (see this session's conversation): a focus-triggered options panel
on the homepage hero search bar (this entry, "Unit A"), and a combinable-
criteria "recherche avancée" mode on `/recherche` (deferred, "Unit B" —
bigger, needs its own design pass since Meilisearch has no native
free-text boolean query builder, only facet-attribute filter logic).

- `components/public/hero-search.tsx`: focusing the input now always opens
  a dropdown containing an options panel — **Zone de recherche** (Tous les
  champs / Titre / Texte intégral / Ministère / Référence, a `SearchScope`
  type mirroring `lib/meilisearch-schema.ts`'s `searchableAttributes`) and
  **Rechercher l'expression exacte** (a toggle). **Corrected mid-session**
  after checking real Légifrance behavior (the user's screenshot showed it
  live): the panel does NOT get replaced by suggestions once you type —
  it stays pinned above them. Suggestions render below it once there's a
  2+ character query (own "Suggestions" heading), and a two-link footer
  ("Recherche avancée" / "Tous les résultats") appears once there's any
  non-empty query, regardless of whether suggestions were found — so a
  zero-result query still leaves the panel and footer usable instead of
  the whole dropdown disappearing. `open` is now a pure visibility flag
  (focus/outside-click/Escape/submit) decoupled from whether suggestions
  happen to exist, whereas the first pass conflated the two.
- "Recherche avancée" (the footer link) navigates to today's `/recherche`
  blank, not carrying the current query — deliberate: `/recherche` is
  where Unit B's combinable-groups builder will eventually live, so this
  link becomes the real advanced-search entry point once that ships,
  with no further change needed here. "Tous les résultats" runs the
  typed query normally (same as pressing Enter/the main button).
- On submit, non-default choices are appended to the `/recherche` URL as
  `champ`/`exact` params (e.g. `?q=...&champ=title&exact=1`); defaults
  (all fields, non-exact) add nothing, keeping existing plain-`q` links
  unchanged.
- `app/(public)/recherche/page.tsx` reads both params: `exact=1` wraps the
  query in double quotes (Meilisearch's own phrase-match syntax) before
  calling `.search()`; `champ` is passed as `attributesToSearchOn` **only
  after validating it against a `SEARCH_SCOPES` whitelist** — an
  unrecognized value falls back to searching all fields rather than being
  forwarded to Meilisearch unchecked, since it's user-controlled URL
  input. `SEARCH_SCOPES` is a small duplicate of `hero-search.tsx`'s
  `SCOPE_OPTIONS` labels rather than a cross-import, since that file is
  `"use client"` and this stays a server component — not worth a shared
  module for four label strings.
- Both params are threaded through `pageUrl()` (pagination) and the sort
  links so paging/sorting doesn't silently drop the active scope/exact
  choice; new chips ("Dans : Titre", "Expression exacte") show alongside
  the existing type/ministry/era/topic chips when active, and "Effacer
  les filtres" now also appears (and clears) when only these two are set,
  not just the original four.
- **Found, not fixed** (pre-existing, unrelated to this change): the sort
  links' `sp` builder was already missing `topicFilter` before this edit
  (clicking a sort option silently dropped an active topic filter) — left
  as-is since it predates this session's change and wasn't the reported
  bug; worth a follow-up if the user cares.
- `npx tsc --noEmit` and `npm run build` both pass clean. Not yet manually
  verified in a running browser (assistant doesn't start the dev server).

### Meilisearch Indexer Timeout Fix (2026-09-07, follow-up session)

The user ran `npx tsx scripts/meilisearch-index.ts` on the VPS for the
first time (Current Goal item #1) and it crashed at 15000/53845 laws
with `MeilisearchTaskTimeOutError: timeout of 5000ms has exceeded on
task 63`.

- **Root cause**: the installed `meilisearch` SDK's `.waitTask()`
  defaults to a 5-second client-side wait (confirmed directly in
  `node_modules/meilisearch/src/task.ts`: `defaultWaitOptions?.timeout ??
  5_000`) — a batch of 250 documents (including full `full_text`, and
  some laws' text is very large — budget-law tables, lengthy décrets) can
  genuinely take longer than 5s for Meilisearch to finish indexing on a
  real (resource-modest) VPS, even though the task keeps running and
  almost certainly still succeeds server-side. The script had no
  try/catch around the `waitTask()` call, so this thrown error propagated
  all the way to `main().catch()` and aborted the entire run instead of
  being handled like the already-existing "batch failed" branch.
- **Fix, one place**: `lib/meilisearch.ts`'s shared `meiliClient` now sets
  `defaultWaitOptions: { timeout: 120_000 }` (2 minutes) — confirmed via
  `grep -rn "waitTask|waitForTask"` that only
  `scripts/meilisearch-index.ts` and `scripts/meilisearch-delta-index.ts`
  ever call `.waitTask()`/`.waitForTask()` anywhere in the repo, so this
  has zero effect on any public request path (search/suggest/chat never
  wait on a task, only scripts that write documents do).
- **Also fixed in both scripts**: wrapped the per-batch
  `addDocuments(batch).waitTask()` call in try/catch, converting a thrown
  timeout (or any other error) into the same failed-batch accounting
  already used for a Meilisearch-*reported* failure — so one slow batch
  now logs a warning and continues instead of aborting a 53k-document
  run. Matters doubly for `meilisearch-delta-index.ts`, which
  `deploy/scrape-and-reindex.sh` runs unattended every week — an
  unhandled timeout there would have silently failed the whole weekly
  cron job.
- `npx tsc --noEmit` and `npm run build` both pass clean.
- **Resolved**: after fixing an unrelated deploy gap first (crontab still
  had literal `/path/to/ejo-djib` placeholders never substituted with the
  real VPS path `/var/www/webprojects/lexdj`, and `deploy/logs/` didn't
  exist — both fixed, see the Deploy Setup Gap entry below), the VPS was
  confirmed on `18d00cd` and the full reindex re-run succeeded completely:
  **53,845/53,845 laws indexed, 0 failed batches, 957.8s total**. The
  Meilisearch index now has real production data for the first time since
  the Typesense swap — `/recherche`, `/api/suggest`, `/api/v1/search`,
  and the chatbot's RAG path are all live rather than returning empty
  results. `scripts/meilisearch-delta-index.ts --since 2026-08-01` was
  also run as a real test (not just the full indexer) and passed cleanly:
  31 laws found, 1 batch, 0 failures, ~1s — confirms the same timeout fix
  and the delta/upsert path both work correctly against production, not
  just the full-rebuild path. Next: the manual functional-verification
  checklist above (era filters, highlighting, tokenization, chatbot RAG,
  plus this session's own hero-search/ministries additions) is now
  actually testable for the first time — not yet done.

### Deploy Setup Gap — Missing `deploy/logs/` Directory (2026-09-07, follow-up session)

Found while actually installing the cron setup on the VPS for the first
time (Current Goal item #1): `tail -f deploy/logs/deploy.log` failed with
"No such file or directory" — no cron tick had ever successfully logged
anything. Root cause: `deploy/logs/` is gitignored, so a fresh clone/reset
never has it; the crontab lines redirect with `>> deploy/logs/....log`,
and bash needs that directory to already exist to open the file for
appending — `auto-deploy.sh`'s own `mkdir -p "$LOG_DIR"` runs too late,
since cron sets up the redirect before the script starts executing at
all. `deploy/README.md`'s one-time setup steps never mentioned creating
it. Fixed by adding `mkdir -p deploy/logs` as an explicit one-time setup
step in `deploy/README.md`, with the reasoning inlined so it's not
silently dropped again.

### "N° n°" Duplicate Prefix Fix (2026-09-07, follow-up session)

Found by the user immediately after the reindex finally made real
search results visible for the first time: `/recherche` (and others)
displayed "N° n° 04 du 05/04/2026" — doubled prefix.

- **Root cause**: `laws.issue_number` (and `issues.issue_number`) is
  stored as scraped verbatim from journalofficiel.dj, already including
  its own "n° " prefix (schema comment: `// Journal edition number e.g.
  n° 24`; API docs example: `"n° 5 du 06/04/2026"`). Four separate
  display sites additionally prepended their own "N° "/"JO N° " on top
  of that, producing the double prefix — each written independently
  without checking whether the underlying value already had one.
- **Evidence this was a known-but-inconsistent problem, not a total
  blind spot**: `app/(public)/journal/[...issue]/page.tsx`'s own H1
  (`Numéro du {issue.slice(2)}`) already manually strips the leading 2
  characters to work around the exact same issue — just in one spot,
  awkwardly (leaves a stray leading space, and the label "Numéro du"
  plus the value's own embedded "du DATE" reads a little redundant) —
  while three other files plus that same file's own breadcrumb line
  right above it did not.
- **Fixed** (dropped the redundant added prefix, since the stored value
  already reads correctly on its own): `app/(public)/recherche/page.tsx`,
  `app/(public)/ministeres/[slug]/page.tsx`,
  `app/(public)/journal/[...issue]/page.tsx`'s breadcrumb. In
  `app/(public)/textes/[id]/page.tsx` the invented `JO` prefix was kept
  (not redundant with the value) but then itself corrected to `JORD` —
  see the next entry.
- **Found, not fixed** (pre-existing, same file, not what was reported):
  `journal/[...issue]/page.tsx`'s H1 `Numéro du {issue.slice(2)}` still
  has the awkward leading-space/double-"du" phrasing described above —
  works, not broken, just not as clean as it could be. Worth revisiting
  if the user wants that specific line polished too.
- Only visible now because the Meilisearch reindex (see above) finally
  put real documents in front of these components for the first time
  since the engine swap — this bug likely existed before the swap too,
  just never observed.
- `npx tsc --noEmit` and `npm run build` both pass clean.

### "JO" → "JORD" Label Correction (2026-09-07, follow-up session)

Immediately after the "N° n°" fix above, the user flagged that the `JO`
prefix just written into `app/(public)/textes/[id]/page.tsx` should read
`JORD`. Confirmed via `scraper/parser.ts:75`
(`rawTitle.replace("JORD", "").trim()`) that the source site titles every
issue as `"JORD n° X du DATE"` and the scraper strips exactly that
literal `"JORD"` prefix when storing `issue_number` — so `JORD`
("Journal Officiel de la République de Djibouti") is the real,
source-accurate abbreviation, not an invented one. Fixed that one line.
Three other spots still say "Numéro JO" (`textes/[id]/page.tsx:129`,
`components/public/duplicates-table.tsx:44`,
`components/public/law-document-pdf.tsx:632`) — left unchanged since the
user only flagged the one instance; see Current Goal for the open
consistency question. `npx tsc --noEmit` passes clean.

### Production Gap Found: Payload Never Migrated, `/codes`+`/cms` Unreachable (2026-09-07, follow-up session)

The user asked why `/codes` and `/cms` weren't reachable now that the
rest of the site was working post-reindex. Root-caused, not yet fixed:

- Neither `Dockerfile` (`CMD ["npm", "start"]`, just `next start`) nor
  `docker-compose.yml` ever runs `npx payload migrate` on deploy.
  Payload's tables (`users`, `law_corrections`, `codes`, `code_sections`,
  `payload_*`) have only ever been created via migration against the
  **local** `ejo_test` database (see Completed → Codes Feature) — they
  have likely never existed on production's Postgres at all, since
  Payload has never actually run there before. The rest of the site
  (built entirely on `laws`/`issues`) works fine because it never
  touches Payload's tables; `/codes` and `/cms` fail because they do.
- Attempting `docker compose exec -T nextjs npx payload migrate` on the
  VPS confirmed this further and surfaced a second, compounding gap:
  it failed immediately with `Error: missing secret key` — production's
  `.env` has never had `PAYLOAD_SECRET` set at all, since nothing there
  had ever needed it before this attempt.
- **Fix given, not yet confirmed executed** (see Current Goal item #1):
  add a real `PAYLOAD_SECRET` to the VPS's `.env` (`openssl rand -hex
  32`, same pattern as `MEILI_MASTER_KEY`'s generation), `docker compose
  up -d` to pick it up, then re-run `npx payload migrate`. Even once
  migrated, `/codes` will be reachable but **empty** — the actual Code
  du travail content was only ever imported into local `ejo_test` (see
  Current Goal item #2 for the production import step).

### Rate Limiting Discussion: `/api/chat`/`/api/suggest` (2026-09-07, follow-up session)

Revisited the open `security.md` gap (no rate limiting on either
endpoint) as a candidate unit of work. Two decisions came out of the
conversation, neither resulting in a code change:

- **`/api/chat` (the chatbot) is on hold entirely** — the user says its
  answer quality isn't satisfying yet and it'll be reworked later, so
  polishing/rate-limiting it now would be wasted effort. Left untouched.
- **`/api/suggest` (homepage autocomplete) was walked through in detail**
  (what it does, why an unthrottled endpoint is a real but low-severity
  gap, what would actually change for a normal visitor — effectively
  nothing, since `hero-search.tsx` already debounces to ~1 request per
  250ms pause, nowhere near a 60/min limit) but ultimately deprioritized
  as the lowest-value item on the table that session. Still open in
  `security.md`'s Findings Log, not fixed.
- One real design note surfaced if this is revisited later: `proxy.ts`'s
  existing limiter keys on IP only, not IP+route, so naively adding
  `/api/suggest` to its matcher would share one 60/min bucket with
  `/api/v1/*` and `/dashboard/*` — worth giving it a separate budget/
  prefix rather than reusing the same one, if/when this gets built.

### Codes Corpus Survey (2026-09-07, follow-up session)

The user asked "and all the other codes?" after learning only Code du
travail exists so far. Queried the scraped `laws` table directly (via
the SSH-tunneled production `DATABASE_URL`, confirmed still active) for
titles matching code-law patterns, rather than guessing what's available.

- **Clean, single-law foundations — importable via the same
  Code-du-travail-style one-off script pattern**: Code Civil (`id 1671`,
  2018, amended by 1401/1428), Code de Procédure Civile (`id 1672`,
  2018), Code de Commerce (`id 2929`, 2012, "portant adoption du Code de
  Commerce de Djibouti," amended by 1876/1673/1225), Code de la Famille
  (`id 5001`, 2002, amended by 2484), Code Minier (`id 2057`, 2016,
  supersedes an older `id 5985` from 1994), Code de l'Environnement
  (`id 3641`, 2009), Code Pétrolier (`id 4379`, 2005), Code des Zones
  Franches (`id 4583`, 2004), Code des Pêches (`id 4875`, 2002, plus an
  implementing décret `id 4121`), Code de l'Eau (`id 5826`, 1996, plus
  implementing décrets 5370/5371/5372), Code de l'Aviation Civile
  (`id 3041`, 2011, amended by 1008), Code Pénitentiaire (`id 8153`,
  1980, amended by 7142), Code Numérique (`id 127`, 2025 — very recent),
  Code de Déontologie des Agents Publics (`id 1636`, 2018). Code de la
  Nationalité Djiboutienne has two candidates (`id 4522` from 2004 vs.
  `id 7957` from 1981) — not yet determined whether 2004 is a full
  re-enactment or just an amendment; needs checking before picking one.
- **Not cleanly importable — no single consolidated law exists in the
  corpus**: Code Pénal and Code de Procédure Pénale (Djibouti appears to
  still operate on the inherited French colonial penal code — the
  corpus only has ~35 scattered amendment laws going back to **1948**,
  e.g. "modifiant l'article 247 du Code pénal," never a single
  Djiboutian "Loi portant Code Pénal"), and Code de la Route (a tangle
  of colonial-era "Territoire Français des Afars et des Issas"
  deliberations amending each other, same problem). Building these would
  mean assembling text from a base that may not even be in the scraped
  corpus, not a straightforward adaptation of the existing import
  script — a materially different, harder problem, not attempted.
- **Code Civil chosen as the next code to build** (user delegated the
  choice) — see Current Goal item #3 for where this was left off.

### UI Redesign — Token Migration, `/couverture` + `/api` docs (2026-09-07)

Sixth and final increment of the "UI redesign remaining scope" backlog
item. Migrated `app/(public)/couverture/page.tsx`, `app/(public)/api/page.tsx`,
`components/public/coverage-chart.tsx`, `components/public/duplicates-table.tsx`,
and `components/public/partial-issues-table.tsx`. No `sql.raw()` in any of
these — `couverture/page.tsx`'s queries already use Drizzle's parameterized
tagged `sql` template throughout, no injection concern.

- Same header-fill/hover-lift/radius/gray-consolidation fixes as every
  prior increment.
- **`TimelineSpark`'s SVG chart needed a real redesign, not just a color
  swap**: it was drawn for the old solid-navy header — white line/area
  strokes and `white/30` year-label text that would be invisible against
  the new white `bg-background` header. Rebuilt using `currentColor` bound
  to a `text-primary` wrapper (so the line/area fill stay token-driven
  rather than hardcoded), the 1977 "Indépendance" marker moved from a
  hardcoded gold hex (`#FCD34D`) to Tailwind's `stroke-amber-500`/
  `fill-amber-600` utilities, and year labels to `text-muted-foreground`.
- KPI/status colors (emerald=available, amber=missing/warning,
  violet=duplicates, red=missing-count) were deliberately left as their
  existing Tailwind named colors — these are genuine semantic
  good/warning/bad indicators, not a decorative rainbow like the doc-type
  badges fixed earlier, so they don't fall under the "one semantic color
  system" consolidation. Only the one raw hex in this set
  (`bg-[#1A3A5C]` for the "Couverture" overall-rate KPI) was converted to
  `bg-primary`.
- The API docs page's dark code blocks (request/response examples) were
  kept dark deliberately — `ui-context.md`'s Typography table already
  treats "Code/reference numbers, API snippets" as their own JetBrains
  Mono category distinct from the rest of the page, and a dark
  terminal-style code block is a standard, purposeful convention (GitHub,
  most API docs) rather than the "colored hero/CTA" anti-pattern the
  Theme rule targets. Still swapped the raw hex (`#0D1117`, `#E6EDF3`) for
  Tailwind's neutral scale (`bg-neutral-900`, `text-neutral-100`) so
  nothing in the file is a hardcoded hex string anymore, per
  `code-standards.md`'s "no hardcoded hex in component classNames" rule.
- **Full-tree verification**: `grep -rE "#[0-9A-Fa-f]{6}|font-\['Libre_Baskerville'\]"`
  across `app/(public)/**` and `components/public/**` now returns zero
  matches — the entire public site is on the current token system. The
  only remaining hits repo-wide are `components/public/law-document-pdf.tsx`
  (deliberately excluded — `@react-pdf/renderer` styling, not Tailwind)
  and the admin dashboard (`app/login/page.tsx`,
  `app/(admin)/dashboard/**`, `components/admin/ocr-editor.tsx` —
  deliberately excluded, its own separate unit per the public/admin split
  rule in `ai-workflow-rules.md`, not touched this session).
- `npx tsc --noEmit` passes clean. Not yet manually verified in a running
  browser.

### Typesense → Meilisearch Swap (2026-09-07)

Full search-engine swap, per a real plan (`C:\Users\Liban\.claude\plans\lively-jingling-dusk.md`)
approved by the user before implementation. Motivation: reduce the
self-hosted VPS's Docker resource footprint (Meilisearch is Rust-based,
generally lighter than Typesense). Confirmed during planning that
`react-instantsearch`/`typesense-instantsearch-adapter` were installed
but imported nowhere in the repo — the real search UI is hand-built React
Server Components calling the search client directly or via internal API
routes, not a client-side InstantSearch integration, so this was a
server-side client swap, not a frontend library migration.

**Decided approach (confirmed with the user before writing code):**
hard cutover (no parallel-run/fallback window — the index is a pure
rebuildable derivative, so there's little real risk), fold in two
opportunistic cleanups while already rewriting these exact files (added
`topics` to `/recherche`'s facet request, de-duplicated the
`rowToDocument()` row-mapper shared by both reindex scripts into
`lib/meilisearch-schema.ts`), and accept one unified `searchableAttributes`
order (`title > reference_number > intro_text > full_text > ministry`)
across all 3 search consumers since Meilisearch has no per-request field
weighting like Typesense's `query_by_weights`.

**A real, not-just-cosmetic bug surfaced during planning**: the existing
Typesense era filters (`publication_date:<1977-06-27` etc.) ran
inequality operators against a `string`-typed field — Typesense's (and
Meilisearch's) comparison operators only work on numeric fields, so this
was very likely already silently broken/undefined in production, not
just something to port as-is. Fixed by adding a proper numeric
`publication_date_ts` field (`YYYYMMDD` as an integer, computed at index
time in `rowToDocument()`, `null` — never `0` — for missing/invalid
dates) specifically for era range filtering; `publication_date` (string)
stays for display only. New filters:
`publication_date_ts < 19770627` / `>= 19770627 AND < 19900101` / `>= 19900101`.

**Files replaced**: `lib/typesense.ts` → `lib/meilisearch.ts`,
`lib/typesense-schema.ts` → `lib/meilisearch-schema.ts` (also now home to
the shared `rowToDocument()`/`parseYear()` helpers), `scripts/typesense-index.ts`
→ `scripts/meilisearch-index.ts`, `scripts/typesense-delta-index.ts` →
`scripts/meilisearch-delta-index.ts` — old files deleted, not kept
alongside (hard cutover). **Files rewritten in place**: `lib/search-laws.ts`
(chatbot RAG helper — also fixed a pre-existing inconsistency where it
hardcoded the string `"laws"` instead of importing the collection/index
constant), `app/api/v1/search/route.ts`, `app/api/suggest/route.ts`,
`app/(public)/recherche/page.tsx`. **Infra**: `docker-compose.yml`'s
`typesense` service → `meilisearch` service (`getmeili/meilisearch:v1.53.2`,
confirmed as the actual current tag via the Docker Hub API rather than
guessed — pin exact versions, never `:latest`, same loopback-only
`127.0.0.1:7700:7700` binding as before), `.env`'s four `TYPESENSE_*`
vars collapsed into `MEILI_HOST=http://meilisearch:7700` (single URL —
Meilisearch's client takes one host string, not separate host/port/protocol
like Typesense) and a freshly-generated `MEILI_MASTER_KEY` (`openssl rand
-hex 32` — generating a new random secret directly is fine, fabricating a
*fake* one pretending to be something else would not be). `package.json`:
removed `typesense`, `react-instantsearch`, `typesense-instantsearch-adapter`;
added `meilisearch@^0.60.0` (confirmed current version via `npm view`).

**API surface note for future maintenance**: the installed `meilisearch`
JS SDK (v0.60) is a notably different shape than older Meilisearch client
versions floating around in older docs/tutorials — `addDocuments()`/
`createIndex()`/`updateSettings()`/`deleteIndex()` all return an
`EnqueuedTaskPromise` (a `Promise` with an extra `.waitTask()` method),
not a plain task object you pass to a separate `client.waitForTask(uid)`
call. Verified this directly against `node_modules/meilisearch/dist/*.d.ts`
rather than assuming from general Meilisearch knowledge — worth
re-checking installed type definitions again if the SDK is ever upgraded,
since this shape has apparently changed across versions.

**Verified by the assistant**: `npx tsc --noEmit` passes clean;
`grep -i typesense` across `.ts/.tsx/.yml/.env`/`package.json` returns
zero real code references (only explanatory comments mentioning the
migration rationale); every Meilisearch param/method name used
(`hitsPerPage`, `attributesToSearchOn`, `matchingStrategy`, `attributesToCrop`,
`cropLength`, `highlightPreTag`/`highlightPostTag`, `attributesToHighlight`,
`attributesToRetrieve`, `totalHits`, `totalPages`, `facetDistribution`,
`search(query, options)` signature) was cross-checked against the actual
installed SDK's `.d.ts` files, not assumed from memory.

**Not yet done — requires the user's manual action** (no VPS/Docker/dev-server
access from here):
1. `docker compose up -d meilisearch` (or the full stack) on the VPS,
   confirm clean startup on `127.0.0.1:7700`.
2. Run `npx tsx scripts/meilisearch-index.ts` against production, confirm
   the final `getStats()` document count roughly matches the
   non-duplicate `laws` row count.
3. Manually verify: `/api/v1/search?type=Loi&era=colonial`,
   `/api/suggest?q=arret`, `/recherche?q=...&type=...&era=...` — in
   particular, **confirm era filters actually narrow results now**,
   since this is a genuine new correctness check (era filtering may
   never have worked correctly on Typesense either, per the bug above),
   plus highlight rendering, facet counts, and pagination at boundary
   pages.
4. Search a known `reference_number` containing `/` or `-` (e.g.
   `2024/015`) to confirm tokenization still matches — Meilisearch's
   default tokenizer already splits on standard punctuation, so no
   explicit separator config was added, but this is worth eyeballing
   once live rather than just trusting documented defaults.
5. Run `npx tsx scripts/meilisearch-delta-index.ts --since <date>` against
   a DB with a recently-updated row, confirm upsert-only behavior.
6. Exercise the chatbot (`/api/chat` → `searchLaws()`) with a query that
   should surface a specific law, confirm RAG context still populates.
7. Once confident: retire the `typesense_data` Docker volume on the VPS
   (the compose file no longer references it, but the volume itself
   isn't auto-deleted).

### Cron-Based Deploy and Scrape/Reindex (2026-09-07)

Prompted by the user asking how VPS deployment actually works — checked
and confirmed **nothing documented it and nothing automated it**: no
`.github/workflows`, no deploy script existed anywhere in the repo
before this. `docker-compose.yml`'s `nextjs` service builds from a local
`Dockerfile` with no image tag, meaning a plain `docker compose up -d`
after a `git pull` silently reuses the old image — `--build` is required
and wasn't documented anywhere either.

Built the most robust option the user asked for: **cron-based polling
deploy**, not push-triggered CI/CD (no GitHub Actions runner/webhook
exists or was requested) —

- **`deploy/auto-deploy.sh`**: polls `origin/main` (`git fetch` +
  compare `rev-parse HEAD` vs `origin/main`) every N minutes via cron;
  on a new commit, `git reset --hard origin/main` (deliberately not
  `pull` — safe against a rewritten/force-pushed history, which this
  repo has already had happen once this session), then
  `docker compose up -d --build --remove-orphans`, then a `curl`
  health check against `http://localhost:3000/`. Does nothing (no log
  spam) when there's nothing new.
- **`deploy/scrape-and-reindex.sh`**: weekly cron, runs
  `scraper/main.ts` then `scripts/meilisearch-delta-index.ts --since
  <8 days ago>` — both via `docker compose exec -T nextjs ...`,
  i.e. *inside* the already-running container so they use its correct
  internal `DATABASE_URL`/`MEILI_HOST` (Docker service-name DNS), no
  SSH tunnel needed on the VPS itself. This is exactly the chained
  scraper+reindex cron already recommended (but not built) in this
  file's Scraper section — now actually shipped, not just proposed.
- Both scripts: `flock`-based locking (no overlapping runs), timestamped
  logs to `deploy/logs/` (gitignored — VPS-local runtime output, not
  source), non-zero exit on failure (no auto-rollback — logged, not
  self-healing; deliberately not built without a real incident to design
  a rollback strategy against).
- `deploy/README.md` documents the exact crontab lines, one-time setup
  (`chmod +x`, `crontab -e`), how to verify it's working, and known
  limitations stated explicitly (no rollback, no failure notifications,
  no scraper retry) rather than silently omitted.
- **Real correctness check performed, not just written and assumed**:
  both scripts were syntax-checked (`bash -n`) and the actual committed
  git blob content was inspected byte-for-byte (`git show :path | xxd`)
  to confirm LF line endings survived Windows' `core.autocrlf`
  conversion — a CRLF shebang line would break the script with a "bad
  interpreter" error the moment it ran on the Linux VPS, and this was
  verified directly rather than assumed safe.
- Added `.gitignore` entries for `/deploy/logs/` (new) alongside the
  existing `/scraper/data/` entry from earlier this session.
- **Not yet installed on the VPS** — see Current Goal. `architecture.md`
  now has a Deployment section describing this mechanism, closing the
  documentation gap that prompted this work.

### Nav Restructuring (2026-09-05)

`components/public/nav.tsx`'s desktop mega-menu (`navItems`) and mobile flat
list (`navLinks`) regrouped from flat top-level items (Textes, Codes,
Recherche, Ministères, Numéros, Couverture) into content-shaped groups, per
explicit user direction:

- **Législation nationale** (dropdown) — Codes folded in as its own group,
  "Par période" now only offers `era=independence`/`era=modern` (colonial
  moved out, see next), doc-type filters unchanged, and Ministères folded
  in under a "Parcourir" group rather than staying a top-level item.
- **Textes coloniaux** — promoted from a sub-item inside the old "Textes"
  dropdown to its own top-level link (`/textes?era=colonial`), no dropdown
  of its own (single well-defined slice).
- **Publications officielles** — renames "Numéros"; same `/journal` era
  sub-links, this is where the eJO lives. Room left for future sibling
  publications (Conseil des ministres reports etc. — see Next Up), not
  added yet since none of that content exists.
- **Recherche** and **Couverture** unchanged, still top-level — explicit
  constraint carried over from the original discussion: search stays a
  separate, complementary tool, not folded into browsing.
- **"Accueil" deliberately omitted** — redundant with the logo link, per
  the same reasoning already recorded before this session.
- **"Législation régionale et internationale"** (conventions Djibouti has
  signed, UA charters, etc.) — user proposed this as a 4th top-level group,
  but it has zero backing content (journalofficiel.dj is domestic-only, so
  nothing in the scraped corpus covers it). Deliberately left out of the
  nav rather than added as a dead link — see Next Up. This is a new
  content-scope decision (likely another manually-curated Payload
  collection, same pattern as Codes), not a nav change.
- No page/route/schema changes — this was purely `nav.tsx`'s two arrays.
  `npx tsc --noEmit` passes clean.
- Known follow-on gap: `/textes`'s `era` param takes exactly one value
  (`ERA_CONDITIONS[eraFilter]`, `app/(public)/textes/page.tsx:93`), so
  "Législation nationale" can't offer one combined "all non-colonial"
  link — it offers "Après l'indépendance" and "Période moderne" as two
  separate sub-links instead. A combined view would need a small page
  change (e.g. an `era=national` value merging both conditions) — not done
  here since it wasn't required to ship this restructuring.

### Everything from before this session

- Public site: homepage, `/textes`, `/journal`, `/journal/[...issue]`,
  `/ministeres`, `/ministeres/[slug]`, `/recherche`, `/couverture`, `/api`
  docs page.
- Typesense Cloud search integration with facets, era filters, autocomplete.
- Structured legal-text parsing/rendering (`lib/utils.ts` tokenizer +
  classifier) for articles, visas, clauses, tables, signatures.
- Single-law PDF export (`@react-pdf/renderer`).
- Public REST API (`/api/v1/*`) with pagination and CORS.
- Rate limiting (Upstash Redis, 60 req/min/IP) on `/api/v1/*` via
  `proxy.ts`.
- Admin dashboard with password auth and OCR correction editor.
- AI chatbot (Groq SDK) grounded in the archive.
- Topic classification (11 topics) for 12,684 non-colonial laws.
- Duplicate detection/exclusion (`duplicate_laws`, 492 rows) and
  transparency reporting on `/couverture`.
- Dockerfile + docker-compose for containerized deployment.

## Next Up

In no particular order — pick based on what's most valuable next session:

- **The Constitution** (raised 2026-09-05, checked, deferred): confirmed
  via a direct query against the `ejo_reference` restore that the original
  1992 constitutional text is **not** in the scraped corpus at all — only
  amendment/related laws are (`laws.id = 96`, "LOI N°192/AN/25/9ème L
  PORTANT RÉVISION DE LA CONSTITUTION", 2025-11-08; Conseil Constitutionnel
  organization laws; the CNDH law). Unlike Code du travail, there's no
  existing scraped law to import it from — it would need an authoritative
  external source, hand-entered, reusing the Codes schema (Titre/Chapitre/
  Article, versioned — relevant since it gets amended, as that 2025
  revision shows). User explicitly chose to defer scoping this rather than
  start now. Don't add a Constitution nav entry or route until this is
  scoped.
- **Législation régionale et internationale** (new, surfaced 2026-09-05
  during the nav restructuring): a nav group the user wants for
  conventions Djibouti has signed, AU charters, etc. — content that
  doesn't exist anywhere in the current data (journalofficiel.dj is
  domestic-only). Needs its own scoping conversation before any nav entry
  or implementation, same as the still-undecided jurisprudence/doctrine
  question — likely shape is a manually-curated Payload collection,
  mirroring the Codes pattern (own tables, no scraper dependency).
- **Publications officielles beyond eJO**: the user wants Conseil des
  Ministres reports (and possibly other official publications) alongside
  the existing `/journal` (eJO) under this nav group eventually — also no
  data/collection for this yet, same "needs scoping" caveat as above.
- **`/textes`'s `era` filter is single-value only** (see Nav Restructuring
  above) — if a combined "all non-colonial" view is ever wanted, add an
  `era=national` (or similar) value to `ERA_CONDITIONS` in
  `app/(public)/textes/page.tsx` rather than fabricating a nav link that
  doesn't match what the page reads.

- **Scraper — post catch-up follow-up**: the catch-up run itself is done
  (see Completed → Scraper, 2026-09-05 — 54,306→54,337 laws, zero errors).
  Still open: (1) reindex Typesense or do the Meilisearch swap so
  `/recherche` picks up the 31 new laws, (2) switch `.env`'s
  `DATABASE_URL` back to `ejo_test`, (3) flip DNS back once satisfied,
  (4) spot-check a sample of the newly-scraped rows against the live
  portal pages to build confidence in the TypeScript port before relying
  on it unattended (e.g. via the weekly cron proposed in the Scraper
  section above) — once confidence is high across a couple of these
  incremental runs, decide whether `../ejo-scraper` (Python) should be
  retired or kept as a reference/fallback.
- ~~**UI redesign remaining scope**~~ — **done as of 2026-09-07** (six
  increments across this session, see Completed → UI Redesign entries
  above, one per page/unit: `/recherche`, `/textes` + `[id]`, `/journal` +
  issue detail, `/ministeres` + `[slug]`, `/couverture` + `/api` docs).
  `grep -rE "#[0-9A-Fa-f]{6}|font-\['Libre_Baskerville'\]"` across
  `app/(public)/**` and `components/public/**` returns zero matches — the
  entire public site is on the current token system. `ui-context.md`'s
  Known Gaps section is now stale and should be rewritten to drop the
  "not yet migrated" framing (see Next Up's `ui-context.md` follow-up
  below). Deliberately still excluded (their own separate units, not part
  of this backlog item): `components/public/law-document-pdf.tsx`
  (`@react-pdf/renderer`, not Tailwind) and the admin dashboard
  (`app/login/page.tsx`, `app/(admin)/dashboard/**`,
  `components/admin/ocr-editor.tsx`).
- ~~`ui-context.md` needs a real update pass~~ — **done same session,
  2026-09-07**: rewrote Known Gaps to reflect the completed migration
  (dropped the stale "not yet migrated"/doc-type-hex-TODO framing), added
  a Typography note on structural labels/headings staying sans within
  serif content, added a Border Radius note on `rounded-full`'s exemption
  from the zero-radius token, and added a new "Color Usage Beyond
  Primary/Secondary" section codifying the semantic-vs-decorative
  categorical color distinction applied throughout this session's fixes.
- **Security follow-up, found during the `/journal` UI pass, not a UI
  item**: `/journal/page.tsx`'s `?q=` search had a real SQL injection
  (`sql.raw()` + unescaped string interpolation) — fixed in that same pass
  (see Completed → UI Redesign → `/journal` entry). This was found
  incidentally, not from a dedicated audit — the rest of `app/(public)/**`
  and `app/api/**` should get a real pass for the same `sql.raw()` +
  interpolation pattern before assuming it was the only instance. The
  already-known gap in `app/api/v1/laws/route.ts` (manual quote-escaping
  instead of parameterization, see Open Questions) is related but distinct
  — that one at least attempts escaping; this one didn't.
  `law-document-pdf.tsx` is deliberately excluded — it's `@react-pdf/renderer`
  styling (literal colors required, not a Tailwind gap) — and admin files
  (`ocr-editor.tsx`, `/dashboard/*`, `/login`) are their own separate unit
  per the public/admin split rule. The non-`Loi` doc-type tag color
  question is now resolved for `/recherche` and `/textes` (consolidated to
  the same `Loi`-gets-a-tint/others-neutral pattern as `hero-search.tsx` —
  see the `/textes` migration entry above); `ui-context.md`'s Known Gaps
  note about this should be updated to reflect that once the remaining
  pages are done, rather than still calling it TODO. The new `/codes/*`
  pages (built on current tokens) now sit right next to these
  pre-migration pages — building Codes didn't cause this gap but makes it
  more visually obvious; still its own separate unit of work, not bundled
  into the Codes feature.
- **`/api/v1/ministries` returns the wrong data** (found 2026-09-07 during
  the SQL injection sweep, see Completed → Security): the route file is a
  byte-for-byte copy of `app/api/v1/issues/route.ts` and returns
  issue-grouped rows (`issue_number`/`issue_date`/`text_count`), not the
  ministry-grouped rows (`ministry`/`text_count`) documented on `/api`.
  Fix is straightforward — mirror `app/(public)/ministeres/page.tsx`'s
  `GROUP BY laws.ministry` query and add the `q` filter documented for
  this endpoint — but wasn't done as part of the injection fix since it's
  a functional change, not a security one. User's call on priority.
- **Codes content beyond the first import**: Code des Marchés Publics,
  Code des Affaires Maritimes, and Code Général des Impôts are all already
  in the scraped `laws` corpus and could reuse
  `scripts/import-code-du-travail.ts`'s pattern (change `SOURCE_LAW_ID`/
  `CODE_TITLE`, re-verify the heading *and* `splitIntoParagraphs()` marker
  regexes against that document's actual formatting — don't assume either
  transfers unchanged).
- **Payload CMS — law-corrections read-side merge** (the migration itself
  is done, see Completed → Payload CMS; see `architecture.md` Invariant 8
  for the guiding constraint — scraper must never depend on Payload):
  1. Wire the read-side merge: law detail page (`/textes/[id]`) and
     anywhere `full_text`/`topics` are read should check
     `law-corrections` by `sourceUrl` first, falling back to the scraped
     `laws` row — including `scripts/typesense-index.ts` so corrected
     text is searchable.
  2. Retire `components/admin/ocr-editor.tsx`, `/dashboard`, `/api/login`,
     `ADMIN_PASSWORD`, and `proxy.ts`'s `/dashboard/*` gating once
     Payload's own admin/auth covers that workflow.
- ~~**Typesense → Meilisearch swap**~~ — **code complete 2026-09-07**, see
  Completed → Typesense → Meilisearch Swap for the full detail. Still
  open: the user's own manual steps (start the `meilisearch` Docker
  service on the VPS, run the new reindex script against production,
  manually verify search/suggest/facets/era-filtering, retire the old
  `typesense_data` volume) — none of that can be done from here.
- From `handoff-ejo-scraper.md`'s original pending list (still open):
  bulk issue PDF download, `lib/utils.ts` dedup cleanup across page
  files, user-friendly error handling, admin panel expansion, topic
  browsing page (`/themes/[topic]`), colonial-law NLP topic
  classification.

## Open Questions

- Jurisprudence/doctrine as future Codes content types remains explicitly
  undecided (see Completed → Codes Feature) — don't assume either is in
  scope without a fresh scoping conversation.
- ~~Raw SQL in `app/api/v1/laws/route.ts` builds `WHERE` clauses via string
  interpolation with manual quote-escaping instead of parameterized
  queries~~ — **resolved 2026-09-07**, see Completed → Security →
  `sql.raw()` Injection Sweep. `code-standards.md`'s note about this
  (under API Routes) is now stale and should be updated to reflect that
  `laws/route.ts`, `issues/route.ts`, and `ministries/route.ts` all use
  Drizzle's parameterized `sql` template now, not manual escaping.
- ~~Exact desaturated hex values for the Décret/Arrêté/Ordonnance/Circulaire
  tag colors~~ — **resolved 2026-09-07**: no per-type hex palette was
  introduced; consolidated to the `Loi`-tint/others-neutral pattern
  instead (see `ui-context.md`'s Known Gaps and Color Usage sections).

## Architecture Decisions

- Typesense is treated strictly as a derived index, never a source of
  truth — rebuilt from Postgres via `scripts/typesense-index.ts`. (Under
  active reconsideration — see Next Up's Meilisearch entry — but this
  derived-index *principle* would carry over to Meilisearch unchanged.)
- Duplicates are excluded via a dedicated `duplicate_laws` table and a
  `NOT IN` filter applied per-query, rather than deleting or flagging rows
  in `laws` — keeps the admin view of duplicates intact for transparency.
- Admin auth is a single shared password, not a user system — deliberate
  simplification given the small internal editor group. (Slated for
  replacement by Payload's own auth once the CMS work completes — see
  Next Up.)
- All public pages are `force-dynamic` — prioritizes data freshness over
  build-time prerendering performance.
- **Visual identity — two decisions, the second reversing part of the
  first**:
  1. (2026-09-02) Borrow gouv-dj's design *language* (restraint, one
     token system, sharp radii) but not its identity — no `GovMark`, keep
     LexDJ's own navy, stay explicitly non-official.
  2. (2026-09-03, explicit user request) Reversed the identity half of
     that: use the *exact* `GovMark` and *exact* gouv-dj color palette.
     Considered and flagged the trust/credibility tension first (an
     official-looking national seal next to "archive non officielle" text
     could read as contradictory) — user made an informed choice to
     proceed anyway. The *restraint* half of decision 1 (no motion, sharp
     radii, one token system) still stands and is what the "critical
     usage rule" in `ui-context.md` protects: exact token values are not
     license to fill large areas with solid color, which is what broke
     right after this change and had to be fixed.
- Payload CMS was deliberately scoped down from an earlier, rejected plan
  where Payload would take full ownership of the `laws` table (migrate
  all 54k rows into Payload's schema, scraper writes through Payload's
  Local API). That coupled the scraper's ingestion reliability to
  Payload's validation/API layer and required a risky one-shot migration
  of a live production table — rejected on rigor grounds (see the
  conversation's own "is this how a big company would do it" gut-check).
  Instead Payload owns a new, separate `law_corrections` collection only;
  `laws` stays exactly as the scraper has always owned it, untouched and
  undiminished in reliability. This is also a real improvement over the
  previous behavior (direct in-place `full_text` overwrite via the OCR
  editor, no history): corrections are now versioned/audited/attributable
  and never destroy the original scraped text — see `architecture.md`'s
  Storage Model and Invariant 8.

## Session Notes

- `context/*.md` were placeholder templates until 2026-09-01; that session
  filled them in from the real codebase.
- **Local dev DB, for future sessions**: this machine has a **native
  Windows Postgres install** (not Docker — Docker Desktop was checked and
  is not running/was never used for this) listening on `localhost:5432`,
  user `postgres`, password `liban` (matches the commented-out original
  line 1 of `.env`). A fresh test database `ejo_test` was created there
  via pgAdmin for scraper testing — explicitly *not* restored from any of
  the `.dump` files (user wanted a genuinely fresh scrape, not production
  data). `postgresql://postgres:liban@localhost:5432/ejo_test` is the
  correct value for this — but as of 2026-09-07, `.env`'s `DATABASE_URL`
  is deliberately NOT this value; it's pointed at production instead
  (see Current Goal) per explicit user request. Don't assume either
  value is "the" default without checking `.env` directly — this has
  flipped back and forth multiple times across sessions already.
- **Production is self-hosted, not Neon** (clarified by the user
  2026-09-05, corrected into `architecture.md`'s Stack table and Storage
  Model): production Postgres migrated off Neon to a **self-hosted
  Postgres instance running in Docker on the user's own VPS**
  (`docker-compose.yml`'s `postgres` service) — the search engine
  alongside it was Typesense, self-hosted the same way, until the
  2026-09-07 swap to Meilisearch (see Completed → Typesense → Meilisearch
  Swap; `docker-compose.yml`'s service is now `meilisearch`). `eJO_backup.dump`/
  `jo_backup.dump` and the local `ejo_reference`/`ejo_test` databases are
  all pre-migration or point-in-time exports — none of them reflect
  current production. The assistant has no direct access to the actual
  VPS database from this machine; anything freshness-sensitive (e.g. "what's
  the newest scraped law") needs the user to check the VPS directly, not
  a local restore.
- The dev server (`npm run dev`) was never actually launched by the
  assistant this session per explicit user instruction ("never start a
  server, let me do it") — all `DATABASE_URL`/connectivity verification
  was done via one-off `node -e` scripts using the `pg` client directly,
  not by running the app. Same for the scraper itself — written and
  bug-fixed by the assistant, but run by the user.
- User is a Djiboutian citizen building this as a personal/civic project
  (not affiliated with the Djiboutian government) — relevant context for
  why the GovMark/national-symbol decision in Architecture Decisions was
  worth surfacing explicitly rather than assuming.
- **First-ever git commit/push of this entire accumulated body of work**
  (2026-09-07): everything from the 2026-09-01 session onward — the
  scraper port, Payload CMS, Codes, the UI redesign, and this session's
  security fixes/Meilisearch swap — had been sitting as uncommitted
  working-tree changes the whole time. Committed as 4 logical commits and
  pushed to `origin/main` (`Libramo/lexdj` on GitHub). Two files in the
  working tree got assigned to a commit by their more-recent/dominant
  concern rather than split by hunk (`app/(public)/journal/page.tsx` →
  the security commit, `app/(public)/recherche/page.tsx` → the
  Meilisearch commit) — both files also carry earlier UI-redesign
  changes that are now bundled into those commits rather than the
  redesign commit; not incorrect, just worth knowing if `git blame`/
  `git log -p` on either file looks like it mixes concerns.
  `scraper/data/checkpoint.json` (scrape-progress runtime state, not
  source) was caught before committing and added to `.gitignore` instead
  (`/scraper/data/`). One untracked file, `draft.txt`, was deliberately
  left alone — not created by the assistant, unknown purpose/content,
  not committed; ask the user what it is before ever touching it.
- **Those first 4 commits accidentally included a `Co-Authored-By:
  Claude Sonnet 5 <noreply@anthropic.com>` trailer** — a default the
  assistant's standard git-commit instructions apply automatically,
  followed here without flagging it as optional first. This made Claude
  show up as a listed GitHub contributor, which the user explicitly does
  not want, ever, on this or any project. Fixed same session: rewrote
  all 4 commit messages (`git filter-branch --msg-filter`, over the
  range `4fa2f9f..HEAD`), verified the rewritten tree was byte-identical
  to what was already on `origin/main` (`git diff origin/main HEAD`
  returned nothing) before force-pushing (`git push --force-with-lease`).
  **This rewrite changed all 4 commit hashes** — the final, correct
  hashes (referenced everywhere else in this file) are `60d1ae2`
  (scraper), `0c6951f` (Payload/Codes), `8d048e2` (UI redesign + docs),
  `2e9ac44` (Meilisearch/security); the originals (`9c60321`, `2276b72`,
  `801bc07`, `9d587b0`) no longer exist on `origin/main` and should never
  be referenced as current. A 5th commit, `c49c7be` (the cron deploy
  scripts), was made correctly from the start with no trailer. See the
  `feedback_no_coauthor_trailer` memory — applies to every future
  commit, any project, permanently.
- The dev server and Docker were never started by the assistant this
  session either (same standing instruction) — the Meilisearch swap was
  verified via `npx tsc --noEmit`, grep sweeps, and reading the installed
  SDK's own `.d.ts` files directly (the actual `meilisearch` npm package
  v0.60 has a notably different task-handling API than older
  tutorials/docs describe — `addDocuments()`/`createIndex()`/etc. return
  an `EnqueuedTaskPromise` with a `.waitTask()` method, not a plain task
  object passed to a separate `client.waitForTask(uid)` call). The actual
  live functional verification (does search return correct results
  against real production data) has **not** happened yet — see Current
  Goal.
- **VPS already runs Prometheus + Grafana + cAdvisor** (learned
  2026-09-07, alongside this app's own containers and other apps on the
  same VPS) — covers container resource usage only (CPU/memory/disk),
  not HTTP traffic or visitor analytics. Not part of this repo's
  `docker-compose.yml` — a separate, pre-existing monitoring stack on
  the host. Relevant context for the Umami decision in Next Up: don't
  assume "no monitoring exists" on this VPS, and don't duplicate
  resource-usage monitoring that's already covered.
