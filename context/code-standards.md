# Code Standards

## General

- Keep modules small and single-purpose — page files render, `lib/`
  functions transform/query, components render UI. Don't mix scraping-style
  text parsing into route handlers or vice versa.
- Fix root causes in the parser/schema rather than patching individual bad
  records — the corpus is scraped/OCR'd, so edge cases belong in
  `lib/utils.ts` (`tokenize`/`classify`) or the admin OCR editor, not
  one-off conditionals in page components.
- Don't mix unrelated concerns in one component or route — e.g. keep
  Meilisearch querying out of Drizzle-backed API routes and vice versa.
- Codes content (`collections/CodeSections.ts`'s `content` field) renders
  via `@payloadcms/richtext-lexical/react`'s `RichText` serializer
  (`components/public/code-content.tsx`) — a deliberately separate
  pipeline from `LawTextRenderer`'s `parseText()`/`tokenize`/`classify`.
  Codes content is hand-authored Lexical JSON via `/cms`, never scraped
  OCR plain text, so it must never be routed through the JO tokenizer, and
  `lib/utils.ts`'s parser must never be adapted to understand Lexical JSON.
- Never use a native Lexical ordered list to represent a lettered legal
  enumeration ("a)", "b)", "c)" sub-items). Lexical only supports
  `bullet`/`number`/`check` list types — no "alpha" type — so a real
  `<ol>` can only ever render 1, 2, 3, silently breaking citation accuracy
  ("l'alinéa a)" must say "a)", not a renumbered "1."). Use plain
  paragraphs that keep the original marker as literal text instead, with
  Lexical's `indent` field for visual indent — see
  `scripts/import-code-du-travail.ts`'s `splitIntoParagraphs()` and
  `components/public/code-content.tsx`'s custom `paragraph` converter
  (the default one silently ignores `indent` entirely).

## TypeScript

- `strict` mode is on (`tsconfig.json`) — keep it that way.
- Avoid `any`; where raw SQL results need casting (see
  `app/api/v1/laws/route.ts`), keep the cast narrow and localized rather
  than widening the surrounding function's types.
- Validate/sanitize unknown external input (query params, request bodies)
  before it reaches SQL or the response — see Data and Storage below on raw
  SQL specifically.

## Next.js

- Server components by default; add `"use client"` only when the component
  needs browser interactivity (state, effects, event handlers) — see
  `components/public/hero-search.tsx`, `nav.tsx` for the pattern.
- Every public, data-backed page sets `export const dynamic =
"force-dynamic"` to avoid stale prerendered data (see
  `context/architecture.md` invariant 3).
- Route handlers under `app/api/` do one thing — a single resource or
  action per route file. Pagination/filtering logic stays in the route,
  query building stays close to it (see `app/api/v1/laws/route.ts` as the
  reference shape: parse params → build query → run → shape response).
- `/api/v1/*` routes attach CORS via `lib/cors.ts` (`withCors`,
  `corsJson`, `handleOptions`) — reuse these rather than setting headers
  ad hoc.

## Styling

- Tailwind CSS v4, utility-first. `cn()` (`lib/utils.ts`, clsx + tailwind-
  merge) is the standard way to compose conditional class names — use it
  instead of manual string concatenation.
- `components/ui/*` primitives use `class-variance-authority` (`cva`) for
  variant/size props — follow that pattern (see `button.tsx`) when adding
  new primitives rather than inventing a new variant mechanism.
- Color and typography tokens are defined in `app/globals.css` — see
  `context/ui-context.md` for the exact values and, critically, the rule
  on what `primary`/`secondary` may be used for (accents only, never a
  large fill — see that file's "Critical usage rule").
- **Tailwind needs literal class strings to find them** — a template
  string like `` `lg:grid-cols-${n}` `` won't be picked up by its scanner.
  When a class needs to vary by a runtime value, use a lookup object of
  fully-written-out class names instead (see `GRID_COLS_LG` in
  `components/public/site-nav.tsx`).

## API Routes

- Parse and validate request input (pagination, filters) before building
  any query — clamp `page`/`limit` the way `app/api/v1/laws/route.ts` does.
- `/api/v1/*` is intentionally unauthenticated but rate-limited at the
  middleware layer (`proxy.ts`) — don't add per-route rate limiting or auth
  without updating `context/architecture.md`.
- Return consistent response shapes: list endpoints return
  `{ data, meta: { page, limit, total, total_pages, has_next, has_prev } }`;
  errors return `{ error: string }` with an appropriate status code.
- When building SQL manually, never interpolate request input directly
  into a `sql.raw()` string — use Drizzle's parameterized tagged `sql`
  template (`sql\`...${value}...\``) or the query builder instead, so
  values are bound as real parameters. `app/api/v1/laws/route.ts`,
  `app/api/v1/issues/route.ts`, and `app/api/v1/ministries/route.ts` all
  follow this now (fixed 2026-09-07 — they previously used manual
  `replace(/'/g, "''")` escaping, and `app/(public)/journal/page.tsx` had
  no escaping at all, a real SQL injection; see `progress-tracker.md`'s
  Security entry for the full writeup) — treat any new `sql.raw()` +
  string-interpolation you find elsewhere as a bug to fix the same way,
  not an existing pattern to copy.

## Data and Storage

- Postgres is the only place law/issue data is written or corrected
  (including OCR fixes via the admin editor) — Meilisearch is rebuilt from
  it, never edited directly.
- Large text (`full_text`, `full_text_structured`) lives in Postgres
  columns; there is no separate blob store, and PDFs are generated on
  demand rather than persisted as files.
- Duplicate exclusion (`WHERE id NOT IN (SELECT id FROM duplicate_laws)`)
  must be applied to every new public query — use `excludeDuplicates` from
  `lib/db-helpers.ts` when writing Drizzle queries.
- **Drizzle's tagged `sql` template auto-expands a plain JS array into a
  parenthesized comma list** (`($1, $2, $3)` — meant for `IN (...)`-style
  clauses), not a single bound array parameter. For an array-typed column
  (e.g. `pdf_links text[]`), this silently breaks — an empty array becomes
  literal `()`, invalid SQL, and a non-empty one becomes multiple scalar
  params instead of one array param. Wrap the value in `sql.param(value)`
  to force single-parameter treatment (see `scraper/writer.ts`'s
  `insertLaw`). Found as a real bug during scraper testing, not caught by
  type-checking — `sql` accepts arrays as valid interpolations by design.

## File Organization

- `app/(public)/` — public pages, one folder per route, `force-dynamic`.
- `app/(admin)/dashboard/` — password-gated internal pages.
- `app/api/v1/` — versioned public REST API.
- `app/api/` (root) — supporting/internal endpoints (chat, suggest, pdf,
  login, duplicates) — not part of the public API contract.
- `components/public/` — public-page components.
- `components/admin/` — admin-only components.
- `components/ui/` — low-level, reusable primitives (Radix + cva based).
- `lib/` — server-side shared logic (db helpers, search, text parsing,
  PDF assets, CORS) — no React/UI code here.
- `drizzle/src/db/` — schema and DB client — the schema is the single
  source of truth for table shape.
