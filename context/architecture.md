# Architecture Context

## Stack

| Layer         | Technology                                      | Role                                                          |
| ------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router) + TypeScript             | Public site, API routes, admin dashboard                        |
| UI            | Tailwind CSS v4 + Radix UI primitives            | Hand-assembled component library in `components/ui/`, not a full shadcn install |
| Animation     | Motion (`motion/react`)                          | Scroll/hero animation on public marketing-style sections        |
| Database      | PostgreSQL (self-hosted, Docker on a VPS) + Drizzle ORM | Source of truth for all scraped legal data — migrated off Neon (see Session Notes in `progress-tracker.md`); `docker-compose.yml`'s `postgres` service |
| Search        | Meilisearch (self-hosted, Docker on the same VPS) | Full-text/faceted search index, derived from Postgres — `docker-compose.yml`'s `meilisearch` service. Swapped from Typesense 2026-09-07 to reduce VPS Docker resource footprint (see `progress-tracker.md`); `react-instantsearch`/`typesense-instantsearch-adapter` were installed but unused pre-swap and have been removed, not replaced — the search UI is hand-built React talking to the client directly, never an InstantSearch integration |
| Rate limiting | Upstash Redis + `@upstash/ratelimit`             | Sliding-window limiter enforced in `proxy.ts` (middleware)       |
| AI            | Groq SDK                                         | Powers `/api/chat` chatbot                                       |
| PDF           | `@react-pdf/renderer`                            | Server-side PDF generation for law exports                       |
| Auth          | Single shared admin password (env var), cookie   | No end-user accounts — admin-only, all-or-nothing                |
| Scraping      | Cheerio + native `fetch`, `scraper/`             | Populates Postgres from journalofficiel.dj — run manually, not part of the app's request path |
| CMS           | Payload 3 + `@payloadcms/db-postgres`, mounted at `/cms`, `/cms-api` | Editorial layer for law corrections and Codes — owns its own tables, never the scraper's |
| Codes tree    | `@payloadcms/plugin-nested-docs`                 | Parent/breadcrumb bookkeeping for `code-sections`' hierarchy (Livre/Titre/Chapitre/Section/Article) |
| Analytics     | Umami (self-hosted, Docker on the same VPS)      | Visitor/page-view tracking for the public site — `docker-compose.yml`'s `umami` service, its own `umami` database on the shared `postgres` service. Client-side JS only, no visibility into `/api/v1/*` traffic; answers a different question than the pre-existing host-level Prometheus/Grafana/cAdvisor stack (container resource usage, not visitor analytics) — see `progress-tracker.md` |

## System Boundaries

- `app/(public)/*` — public-facing pages (homepage, search, browse, law/issue
  detail). Server components by default; `force-dynamic` to avoid stale
  prerendering of DB-backed content. `app/(public)/layout.tsx` conditionally
  renders the Umami tracking script (only when `NEXT_PUBLIC_UMAMI_*` env
  vars are set) — deliberately scoped to this layout, not the root
  `app/layout.tsx`, so admin/`(admin)` and `/cms` traffic is never tracked
  as visitor analytics.
- `app/(admin)/dashboard/*` — password-gated internal tooling (law list, OCR
  editor). Protected by `proxy.ts` checking the `admin_token` cookie.
- `app/api/v1/*` — the public, rate-limited, versioned REST API (laws,
  issues, ministries, search).
- `app/api/*` (chat, suggest, pdf, login, duplicates) — supporting/internal
  endpoints, not part of the versioned public API contract.
- `drizzle/src/db/schema.ts` — single source of truth for the Postgres
  schema (`laws`, `issues`, `scrape_logs`, `duplicate_laws`, legacy
  `laws_distinct` view).
- `lib/` — shared server logic: `db-helpers` (duplicate exclusion),
  `meilisearch`/`meilisearch-schema` (search client + index settings +
  shared `rowToDocument()` row-mapper used by both reindex scripts),
  `utils` (French legal-text parsing: `parseText`, `parseSignedBy`,
  `parseVisas`, `parseDotTable`, `toTitleCase`), `pdf-assets`, `cors`.
- `components/public/*` — public page building blocks (search, hero,
  tables, text renderers, `site-nav.tsx` mega-menu).
- `components/admin/*` — admin-only components (OCR editor).
- `components/ui/*` — low-level primitives (button, input, scroll-area,
  gavel icon, `gov-mark.tsx` national identity mark) built on Radix +
  `class-variance-authority`.
- `public/Flag_of_Djibouti.svg`, `public/Emblem_of_Djibouti.svg` — national
  identity assets for `GovMark` (public-domain Wikimedia files, ported from
  `gouv-dj`'s own `public/`).
- `proxy.ts` (project root) — Next.js middleware: admin auth gate + API rate
  limiting. Matcher: `/dashboard/:path*`, `/api/v1/:path*`.
- `scraper/` — TypeScript port of the scraper (Cheerio + native `fetch`,
  replacing the original Python/BeautifulSoup project at `../ejo-scraper`).
  Same one-way batch relationship to the app as the Python version had: run
  manually via `npx tsx scraper/main.ts` (or `scraper/rescrape.ts`), never
  imported by or run from the Next.js app itself. It reuses this repo's own
  `drizzle/src` client and schema rather than a separate DB layer, so
  `laws`/`issues`/`scrape_logs` stay defined in exactly one place.
- The original Python scraper (`../ejo-scraper`, see `handoff-ejo-scraper.md`)
  is being superseded by `scraper/` above — kept for now as a reference
  until the TypeScript port is verified against the live site (see
  `progress-tracker.md`).
- `payload.config.ts` (project root) + `collections/*` — Payload CMS,
  mounted inside this same Next.js app (not a separate app/domain) at
  `/cms` (admin UI) and `/cms-api` (Payload's own REST API), deliberately
  not the defaults (`/admin`, `/api`) to avoid colliding with this app's
  own extensive `app/api/*` surface. `collections/Users.ts` is Payload's
  auth-enabled login collection; `collections/LawCorrections.ts` is the
  editorial layer described below. `collections/Codes.ts` (flat, top-level
  codes like "Code du travail") and `collections/CodeSections.ts`
  (self-referential hierarchy — Livre/Titre/Chapitre/Section/Article, via
  `@payloadcms/plugin-nested-docs`) are the manually-curated Codes content
  type — never scraped, never touching `laws`/`issues`.
- `app/(public)/codes/*` — public Codes routes: `/codes` (list),
  `/codes/[codeSlug]` (a code's landing page + table of contents),
  `/codes/[codeSlug]/[nodeSlug]` (a section or article, flat slug rather
  than a deep breadcrumb path — stable against renames). Reads via
  `lib/codes.ts`'s Local API tree-fetch (one query per code, tree built in
  memory) rather than per-request Drizzle/Meilisearch queries. Article
  content renders via `@payloadcms/richtext-lexical/react`'s `RichText`
  serializer (`components/public/code-content.tsx`) — a deliberately
  separate pipeline from `LawTextRenderer`'s `parseText()`, since Codes
  content is hand-authored Lexical JSON, never scraped OCR text (see
  `code-standards.md`).
- `app/(payload)/*` — the Next.js route-group boilerplate `@payloadcms/next`
  requires to mount Payload (layout, admin catch-all page, API catch-all
  route, generated `importMap.js`). Regenerate `importMap.js`/
  `payload-types.ts` via `npx payload generate:importmap` /
  `generate:types` after changing `payload.config.ts` or any collection —
  don't hand-edit either file.

## Storage Model

- **Postgres (self-hosted via Docker on the production VPS)**: source of
  truth for all law, issue, scrape-log, and duplicate data — including
  full text, structured JSON (`full_text_structured`), and links to
  original PDFs on journalofficiel.dj. `eJO_backup.dump`/`jo_backup.dump`
  in the repo root and the `ejo_reference`/`ejo_test` local databases are
  point-in-time restores from the Neon era or earlier exports — none of
  them are a live view of current production; verify anything
  freshness-sensitive against the actual VPS database, not these.
- **Meilisearch (self-hosted via Docker on the same VPS)**: a derived
  search index only, rebuilt from Postgres via `scripts/meilisearch-index.ts`
  (full) / `scripts/meilisearch-delta-index.ts` (incremental, `--since`).
  The app never writes to it directly at request time; Postgres is always
  authoritative. Swapped from Typesense 2026-09-07 — same derived-index
  principle carried over unchanged, only the engine changed.
- **`laws.source_url` and `issues.source_url` are UNIQUE** (Postgres
  constraint, added 2026-09-05 — production's tables pre-dated the
  TypeScript scraper port and never actually had it, despite `writer.ts`'s
  `initDb()` DDL declaring it; `drizzle/src/db/schema.ts` now declares
  `.unique()` on both, matching reality). `scraper/writer.ts`'s
  `insertLaw`/`insertIssue` upserts (`ON CONFLICT (source_url)`) depend on
  this constraint existing — don't drop or bypass it, the scraper will
  fail its very first insert without it (confirmed: Postgres error
  `42P10`).
- **No blob/file storage**: exported PDFs are generated on demand,
  server-side, from Postgres text — never persisted as files. Source PDFs
  remain external links (`pdf_links`) back to journalofficiel.dj.
- **Upstash Redis**: ephemeral rate-limit counters only — not application
  data.
- **Umami's `umami` database**: a separate database on the same shared
  `postgres` service (not a second Postgres container, and not a schema
  inside the `eJO`/main database) — fully owned and migrated by Umami's
  own container, never touched by Drizzle or Payload. Created once
  manually (`CREATE DATABASE umami`) since Postgres's own init scripts
  only run against an empty data directory and the VPS's volume already
  existed — see `deploy/README.md`'s Umami setup section.
- **Payload's own tables** (`users`, `law_corrections`, `codes`,
  `code_sections`, `payload_*`): live in the same Postgres database as
  everything else, but are fully owned and migrated by Payload — never
  hand-edited, never written to by the scraper. `law_corrections` is an
  editorial overlay keyed by `sourceUrl` (matching `laws.source_url`), not
  a copy or replacement of `laws` — see Invariant 8. `codes`/`code_sections`
  are a wholly separate, manually-curated content type with no foreign key
  into `laws` at all.

## Auth and Access Model

- Public pages and `/api/v1/*` require no authentication, but `/api/v1/*` is
  IP rate-limited (60 req/min) via `proxy.ts`.
- Admin access is a single shared secret in `ADMIN_PASSWORD`. `/api/login`
  checks it and sets an httpOnly, secure, `sameSite=strict` `admin_token`
  cookie (7-day expiry). `proxy.ts` redirects any `/dashboard/*` request
  without a matching cookie to `/login`.
- There are no per-user accounts, roles, or granular permissions — admin is
  all-or-nothing by design.
- `duplicate_laws` rows are excluded from every public query via
  `WHERE id NOT IN (SELECT id FROM duplicate_laws)`, but are intentionally
  visible in the admin dashboard.

## Deployment

- **No CI/CD** — no GitHub Actions, no webhook, no build pipeline of any
  kind. Confirmed 2026-09-07 (no `.github/workflows`, no deploy script
  existed before this). Everything runs on the VPS via Docker Compose,
  triggered by cron polling `origin/main`, not by push.
- **`deploy/auto-deploy.sh`** (installed as a VPS crontab entry, not
  committed as active until the user installs it — see
  `deploy/README.md`): polls `origin/main` every N minutes (10 by
  default); on a new commit, `git reset --hard origin/main` (not
  `pull` — safe against a rewritten/force-pushed history) then
  `docker compose up -d --build --remove-orphans` (`--build` is
  required since the `nextjs` service only builds an image if one
  doesn't already exist; `--remove-orphans` cleans up any service
  removed from `docker-compose.yml`, e.g. the Typesense → Meilisearch
  rename), then a basic HTTP health check. No automatic rollback on a
  failed deploy or failed health check — logged, not self-healing.
- **`deploy/scrape-and-reindex.sh`** (weekly VPS cron): runs
  `scraper/main.ts` then `scripts/meilisearch-delta-index.ts --since
  <8 days ago>`, both via `docker compose exec -T nextjs ...` — i.e.
  *inside* the already-running container, so they use its correct
  internal `DATABASE_URL`/`MEILI_HOST` (Docker service-name DNS), no
  SSH tunnel needed on the VPS itself.
- Both scripts use `flock` (no overlapping runs) and log to
  `deploy/logs/` (gitignored, VPS-local only).
- **Installed and confirmed working** as of the 2026-09-07 follow-up
  session — both crontab lines are live at the real VPS path
  (`/var/www/webprojects/lexdj`, not the `deploy/README.md` example's
  literal `/path/to/ejo-djib` placeholder, which was copy-pasted
  verbatim the first time and had to be corrected), `deploy/logs/` exists
  (gitignored, not created by a fresh clone — see `deploy/README.md`'s
  one-time setup), and a manual `bash deploy/auto-deploy.sh` run
  confirmed clean execution.
- **Real gap, not yet closed**: neither this deploy mechanism nor the
  `Dockerfile`/`docker-compose.yml` ever runs `npx payload migrate`.
  Payload's tables (`users`, `law_corrections`, `codes`, `code_sections`,
  `payload_*`) have only ever been created via migration against the
  **local** `ejo_test` database — production has likely never had them
  at all, since Payload has never actually run there before (confirmed
  2026-09-07: `/codes` and `/cms` are unreachable in production, and
  `npx payload migrate` run manually there failed with a missing
  `PAYLOAD_SECRET`, since nothing in the VPS's `.env` had ever needed
  it). Running the migration is currently a manual, undocumented-in-
  automation step — see `progress-tracker.md`'s Current Goal. Worth
  adding to `auto-deploy.sh` once this stabilizes, but not done
  preemptively without confirming the fix works manually first.

## Invariants

1. Postgres is the sole source of truth; Meilisearch is always a rebuildable
   derivative — never hand-edit the search index directly.
2. All public list/detail queries exclude `duplicate_laws`; the admin
   dashboard is the one deliberate exception.
3. No static prerendering of data-backed content — `export const dynamic =
   "force-dynamic"` is set exactly once, app-wide, in `app/layout.tsx`
   (not per-page — individual pages inherit it, they don't each declare it)
   since data changes independently of deploys.
4. `/api/v1/*` stays unauthenticated and rate-limited — it is the public
   data contract. Don't add auth to it without updating this file and the
   `/api` docs page together.
5. The scraper is a one-way, external batch process into Postgres — the
   Next.js app never writes back to journalofficiel.dj and never scrapes
   live on request.
6. Admin auth is a single shared secret, not a user system — do not build
   multi-user/role assumptions into admin routes without revisiting this
   model first.
7. Raw SQL built with `sql.raw()` (e.g. `app/api/v1/laws/route.ts`) must
   never interpolate unescaped request input — prefer Drizzle's tagged
   `sql` template or query builder so values are parameterized, not
   string-concatenated.
8. The scraper's write path (`scraper/writer.ts`) never depends on Payload
   — ingestion must keep working even if Payload/`law_corrections` is
   entirely down or misconfigured. Corrections are additive and layered on
   read (see `progress-tracker.md`'s "law_corrections merge" note); nothing
   in `collections/LawCorrections.ts` ever causes `laws` rows to be
   mutated, and nothing in `scraper/` ever imports from `payload.config.ts`
   or `collections/`.
9. `payload.config.ts`'s `postgresAdapter` must keep `push: false`. Payload's
   dev-mode schema push reconciles against *every* table it finds in the
   connected database, not just its own — since this DB is shared with
   Drizzle's scraper-owned tables rather than Payload-exclusive, push mode
   will prompt to **drop** `laws`/`issues` the moment it doesn't recognize
   them (hit for real on 2026-09-05, caught before accepting). Payload
   schema changes only ever happen through real migrations
   (`npx payload migrate:create` + `npx payload migrate`, see
   `migrations/`) — never re-enable push, and never accept a
   `payload migrate` or dev-server prompt that proposes deleting
   `laws`/`issues`/`scrape_logs`/`duplicate_laws` under any circumstance.
