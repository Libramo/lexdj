# AI Workflow Rules

## Approach

Build this project incrementally against the context files in this
directory. They define what LexDJ is (`project-overview.md`), how it's
structured (`architecture.md`), how it should look
(`ui-context.md`), how code should be written (`code-standards.md`), and
where things currently stand (`progress-tracker.md`). Implement against
these specs — don't infer or invent product behavior from scratch, and
don't assume this is a generic SaaS product: it's a public-interest legal
archive for Djibouti, with real scraped government data behind it.

## Scoping Rules

- Work on one feature unit at a time (one page, one API route, one
  component family) — don't touch the public site, the admin dashboard, and
  the scraper's expectations in the same step.
- Prefer small, verifiable increments over large speculative changes,
  especially around the `laws`/`issues` schema, which ~54k scraped rows
  already depend on.
- Do not combine unrelated system boundaries in a single implementation
  step (see `architecture.md` → System Boundaries).

## When to Split Work

Split an implementation step if it combines:

- Public site changes and admin dashboard changes
- Changes to `/api/v1/*` (the public API contract) with unrelated internal
  route changes
- Schema/migration changes with unrelated feature work
- UI/visual changes with data or query logic changes

If a change cannot be verified end to end quickly, the scope is too broad —
split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files or
  implied by existing pages/routes.
- If a requirement is ambiguous (e.g. how a new filter should combine with
  duplicate exclusion), resolve it in the relevant context file before
  implementing.
- If a requirement is missing, add it as an open question in
  `progress-tracker.md` before continuing.

## Protected Files

Do not modify the following unless explicitly instructed:

- `drizzle/src/db/schema.ts` — ~54k rows of scraped data depend on this
  shape; changes need an explicit migration plan.
- `lib/utils.ts` text parser (`tokenize`/`classify`) — tuned against real
  scraped/OCR'd legal text; changes can silently break rendering across the
  whole corpus. Verify against multiple law types (Loi, Décret, Arrêté,
  colonial-era text) before changing.
- `scraper/parser.ts` — same reasoning as `lib/utils.ts` above, tuned
  against real journalofficiel.dj markup. Verify against a real scrape
  (even a small `TEST_MODE` run) before changing, not just type-checking.
- `eJO_backup*.dump`, `jo_backup.dump` — database backups, not source code.
- `proxy.ts` auth/rate-limit logic — changes affect both admin security and
  the public API's abuse protection.
- `payload.config.ts`, `collections/*` — schema changes to a Payload
  collection need a migration plan once any real data exists in it (none
  yet as of 2026-09-03, but treat this the same as `drizzle/src/db/schema.ts`
  once it does). Never hand-edit `app/(payload)/cms/importMap.js` or
  `payload-types.ts` — regenerate via `npx payload generate:importmap` /
  `generate:types`.
- `components/ui/gov-mark.tsx` and the national identity assets
  (`public/Flag_of_Djibouti.svg`, `public/Emblem_of_Djibouti.svg`) — using
  the actual national seal on a site that also says "archive non
  officielle" was a deliberate, explicitly-flagged user decision (see
  `progress-tracker.md`'s Architecture Decisions), not a default. Don't
  extend its use to new places (e.g. a favicon, a marketing page) without
  the same kind of check-in.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries → `architecture.md`
- Storage model or schema decisions → `architecture.md`
- Auth model, injection/input-validation rules, secrets handling, or a
  new security finding → `security.md`
- Visual design, color tokens, or component conventions → `ui-context.md`
- Code conventions or standards → `code-standards.md`
- Feature scope → `project-overview.md`

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture.md` was violated.
3. `progress-tracker.md` reflects the completed work.
4. `npm run build` passes.
