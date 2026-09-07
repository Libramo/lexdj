# Security Context

> A checklist/tracker against the most well-known web application
> vulnerability classes (OWASP Top 10), assessed for LexDJ specifically.
> Update the relevant row whenever a change affects that category, or a
> new finding surfaces. Status values: `Protected` / `Partial` /
> `Vulnerable` / `N/A`.

## A01 — Broken Access Control

- **Status**: Protected
- Public site + `/api/v1/*` have no access control by design — it's a
  read-only public archive, intentionally unauthenticated (see
  `architecture.md` Invariant 4).
- `/dashboard/*` (admin) is gated by `proxy.ts` middleware checking the
  `admin_token` cookie (httpOnly, secure, `sameSite=strict`, set only by
  `/api/login` after verifying `ADMIN_PASSWORD`). No per-user roles to
  misconfigure since there's only one privilege level — admin or nothing.
- `/cms` (Payload) has its own independent auth via `collections/Users.ts`.
- Known gap: admin is all-or-nothing by design (Invariant 6) — acceptable
  today given a single-operator project, but would need real roles before
  adding a second admin user.

## A02 — Cryptographic Failures

- **Status**: Partial
- No end-user PII, payment data, or private content exists in this app
  — the underlying data is already-public government legal text (see
  `security.md`'s Data Protection reasoning, folded in below). The only
  sensitive values are the admin password and a handful of API keys.
- `admin_token` cookie is httpOnly/secure/sameSite=strict — reasonable.
- **Gap, not yet evaluated**: no TLS termination is defined inside this
  repo's `docker-compose.yml` — whatever fronts the public domain
  (nginx/Caddy/platform LB) lives outside this codebase and wasn't
  verified this session. Confirm HTTPS is actually enforced end-to-end
  in production before calling this fully protected.
- Secrets at rest: plain values in `.env` (gitignored, not committed) —
  no secrets manager, no encryption of the file itself. Acceptable for a
  single-operator project, would not scale to a team without a real
  secrets manager.
- **Found 2026-09-07 (follow-up session)**: production's `.env` never
  had `PAYLOAD_SECRET` set at all — Payload has never actually run in
  production before, so nothing had needed it until `npx payload
  migrate` was attempted there for the first time and failed with
  `Error: missing secret key`. Fix given (generate via `openssl rand
  -hex 32`, same pattern as `MEILI_MASTER_KEY`), not yet confirmed
  applied — see `progress-tracker.md`'s Current Goal and the Findings
  Log below.

## A03 — Injection (SQL, command, etc.)

- **Status**: Protected (as of 2026-09-07 — was Vulnerable before this
  session)
- Rule: all SQL uses Drizzle's parameterized tagged `sql` template, never
  `sql.raw()` with string-interpolated request input (`code-standards.md`,
  `architecture.md` Invariant 7).
- **Real, confirmed findings, not hypothetical**: a live, unescaped SQL
  injection existed in `app/(public)/journal/page.tsx`'s `?q=` search
  (`sql.raw()`, zero escaping) — exploitable on a public, unauthenticated
  route. A related gap (manual `.replace(/'/g, "''")` escaping instead of
  real parameterization) existed in `app/api/v1/laws/route.ts`,
  `app/api/v1/issues/route.ts`, and `app/api/v1/ministries/route.ts`. All
  four found and fixed same day via a full-repo `sql.raw()` sweep — see
  Findings Log below.
- Verified safe and left as `sql.raw()`: `app/api/v1/laws/[id]/route.ts`
  interpolates `numId`, which is `parseInt()`'d and `isNaN`-checked
  first — always a clean integer, no injection surface.
- No shell/command execution driven by user input anywhere in the app
  (the scraper and reindex scripts are operator-run, not request-triggered).
- No user-generated HTML rendering surface exists (no comments/posts);
  the one `dangerouslySetInnerHTML` use (`ExcerptHighlight` in
  `recherche/page.tsx`) renders search-engine `<mark>` output over
  already-public law text, not arbitrary user input.

## A04 — Insecure Design

- **Status**: Partial
- Rate limiting exists on `/api/v1/*` and `/dashboard/*` (60 req/min/IP,
  Upstash Redis + `@upstash/ratelimit`, enforced in `proxy.ts`).
- Fail-closed default on admin auth: no cookie → redirect to `/login`,
  not a silent pass-through.
- **Gap**: `/api/chat` (Groq-backed chatbot) and `/api/suggest`
  (autocomplete) have **no rate limiting** — both are unauthenticated and
  cheap to hammer; `/api/chat` in particular calls an external paid LLM
  API per request, so unbounded traffic there has a real cost/abuse
  surface beyond just server load. Worth adding the same `proxy.ts`
  limiter to both if abuse is ever observed.

## A05 — Security Misconfiguration

- **Status**: Protected
- Postgres and Meilisearch are both bound to `127.0.0.1` only in
  `docker-compose.yml` — not reachable from outside the VPS host, even
  though their own auth (a plain password / a single API key) would be
  weak on its own. Network isolation is the actual control here, not the
  credentials.
- `MEILI_MASTER_KEY` is a freshly-generated random value (not a weak
  placeholder like the old `TYPESENSE_API_KEY=liban` was) — improved
  during the 2026-09-07 search-engine swap.
- Payload's `postgresAdapter` has `push: false` enforced deliberately
  (`architecture.md` Invariant 9) — dev-mode schema push previously
  almost dropped the `laws`/`issues` tables; this is now a hard rule, not
  just a one-time fix.
- **Standing accepted risk, not a misconfiguration but worth tracking
  here**: as of 2026-09-07, local dev's `DATABASE_URL` is deliberately
  pointed at production through an SSH tunnel per explicit user request
  — every read/write from `npm run dev` hits real production data while
  this is active. See Findings Log.

## A06 — Vulnerable and Outdated Components

- **Status**: Vulnerable (untriaged)
- No CI-enforced dependency audit exists in this repo.
- `npm audit` run manually 2026-09-07 (after the Meilisearch package
  swap) reported **32 vulnerabilities: 4 low, 18 moderate, 10 high** —
  not yet triaged (which packages, direct vs. transitive, actually
  exploitable in this app's usage or not). This predates the Meilisearch
  swap itself. This is the single biggest concrete open item in this
  file right now.

## A07 — Identification and Authentication Failures

- **Status**: Partial
- Admin auth is a single shared secret, not per-user credentials — no
  password complexity/rotation policy applies because there's only one
  password and one operator (deliberate simplification, `architecture.md`
  Invariant 6).
- No brute-force lockout on `/api/login` beyond the general `/dashboard/*`
  rate limit — a determined attacker gets 60 login attempts/minute/IP
  against a single static password with no account lockout. Low
  real-world risk today (single operator, not a high-value target), but
  a real gap if this project ever adds real user accounts.
- `admin_token` cookie: httpOnly/secure/sameSite=strict, 7-day expiry —
  reasonable for what it protects.

## A08 — Software and Data Integrity Failures

- **Status**: Protected
- All dependencies come from npm's public registry via a committed
  `package-lock.json` — no unpinned `:latest`-style installs found.
- Docker images are pinned to exact tags (`postgres:16-alpine`,
  `getmeili/meilisearch:v1.53.2` — confirmed the real current tag via
  Docker Hub's API during the 2026-09-07 swap rather than guessing).
- No CI/CD pipeline exists in this repo to have an integrity gap in —
  deploys are manual (the user runs `docker compose` on the VPS
  themselves).

## A09 — Security Logging and Monitoring Failures

- **Status**: Vulnerable
- API routes generally `console.error()` on failure (e.g.
  `app/api/v1/search/route.ts`, `app/api/v1/laws/route.ts`) — this goes
  to stdout/container logs, not a queryable log store or alerting
  system.
- `scrape_logs` table exists but tracks scraper run outcomes
  (404s, duplicates), not security-relevant events (failed logins, rate
  limit hits, admin actions).
- No monitoring/alerting on repeated failed `/api/login` attempts, unusual
  `/api/v1/*` traffic patterns, or anything else that would signal an
  attack in progress. Acceptable given the project's current low-stakes
  threat model (public-data archive, single operator), but worth revisiting
  if the admin dashboard or Payload CMS ever holds anything more sensitive.

## A10 — Server-Side Request Forgery (SSRF)

- **Status**: N/A
- No code path fetches a URL derived from user-controlled input. The
  scraper fetches from a single hardcoded `BASE_URL` (`journalofficiel.dj`),
  not a user-supplied one. `/api/chat` calls Groq's fixed API endpoint.
  No image-proxy, webhook-fetch, or "fetch this URL for me" feature exists
  anywhere in the app.

## Findings Log

| Date | Category | Finding | Severity | Status | Fix / Notes |
| ---- | -------- | ------- | -------- | ------ | ----------- |
| 2026-09-07 | A03 | `app/(public)/journal/page.tsx`'s `?q=` search built SQL via `sql.raw()` with **zero escaping** of user input — live, exploitable SQL injection on a public unauthenticated route | Critical | Fixed | Rewritten with Drizzle's parameterized `sql` template + `sql.join`; see `progress-tracker.md`'s `/journal` UI-migration entry |
| 2026-09-07 | A03 | `app/api/v1/laws/route.ts`, `app/api/v1/issues/route.ts`, `app/api/v1/ministries/route.ts` built SQL via `sql.raw()` with manual `.replace(/'/g, "''")` escaping instead of real parameterization | Medium | Fixed | Same day, same pass — converted to parameterized `sql` template; see `progress-tracker.md`'s Security → `sql.raw()` Injection Sweep entry |
| 2026-09-07 | A06 | `npm audit` reports 32 vulnerabilities (4 low / 18 moderate / 10 high) in the dependency tree | Unknown (untriaged) | Open | Not investigated this session — needs a dedicated triage pass |
| 2026-09-07 | A05 | Local dev `DATABASE_URL` pointed at production through an SSH tunnel, no dev/prod isolation while active | Accepted risk | Open (deliberate, temporary) | Explicit user request to work against real data locally; user owns reverting `.env` to the `ejo_test` line when done — see `progress-tracker.md` Current Goal |
| 2026-09-07 | A04 | `/api/chat` and `/api/suggest` have no rate limiting, unlike `/api/v1/*` and `/dashboard/*` | Low–Medium | Open | Not fixed — `/api/chat` calls a paid external LLM API per request, so this has a real cost/abuse surface, not just server load. Revisited and explicitly deprioritized in the 2026-09-07 follow-up session — `/api/chat` is on hold pending a quality rework, `/api/suggest`'s real-world risk is low given client-side debouncing (see `progress-tracker.md`'s Rate Limiting Discussion entry) |
| 2026-09-07 | A02 | Production's `.env` never had `PAYLOAD_SECRET` set — `npx payload migrate` failed with "missing secret key" on first-ever production attempt | Medium (blocks `/codes`/`/cms` entirely, not a live exposure) | Open | Fix given (generate + add to VPS `.env`, `docker compose up -d`), not yet confirmed applied — see `progress-tracker.md` Current Goal |
