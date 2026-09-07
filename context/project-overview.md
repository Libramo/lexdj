# LexDJ

## Overview

LexDJ (lexdj.dj) is positioned as an unofficial digital archive of
**Djiboutian law and legislation** ("archive du droit et de la
législation"), not narrowly an archive of the *Journal Officiel de la
République de Djibouti* — the JO is its foundation and, as of 2026-09-04,
its only populated content, not its ceiling. Today it republishes ~54,000
laws, decrees, orders, and other legal texts scraped from journalofficiel.dj
(1904–2026), making them searchable, filterable, and exportable as PDF. It
exists for researchers, lawyers, journalists, and citizens who need to find
a specific legal text without digging through the official portal's
unstructured archive.

**Scope growth, now built** (decided 2026-09-04, shipped 2026-09-05):
consolidated legal **codes** (e.g. Code du travail) are a second content
type, added manually via the Payload CMS editorial layer as their own
collection (`collections/Codes.ts`, `collections/CodeSections.ts`) — the
same own-tables-not-touching-`laws` pattern as `law_corrections` (see
`architecture.md` Invariant 8) — rather than a new scraper source. Public
routes live at `/codes`, `/codes/[codeSlug]`, `/codes/[codeSlug]/[nodeSlug]`
with a Légifrance-inspired reading experience (sticky table of contents,
breadcrumbs, article-by-article navigation) — inspiration only, not a
visual copy. The first real code, "Code du travail" (297 articles), was
imported from the law already in the scraped corpus (`laws.id = 4291`) via
a one-off script rather than hand-typed — see `progress-tracker.md`.
Whether jurisprudence (case law) or doctrine (legal commentary) get added
later is explicitly undecided; don't build toward either without a fresh
scoping conversation.

## Goals

1. Make the full historical record of Djiboutian law (1904–present)
   searchable in seconds via full-text and faceted search.
2. Preserve and structure legal texts that otherwise exist only as scanned,
   OCR'd government PDFs — turning them into readable, linkable documents.
3. Provide programmatic access (a public REST API) so the data can be reused
   in other research or civic tools.
4. Offer an AI chatbot that answers plain-language legal questions, grounded
   in the archive rather than a generic model.

## Core User Flow

1. User lands on the homepage — hero search plus stats (laws indexed,
   ministries, issues, years covered).
2. User searches a term (autocomplete suggestions appear as they type) or
   browses by topic, document type, ministry, or journal issue.
3. User opens a law's detail page — reads the structured text (articles,
   visas, signature block) and optionally downloads a formatted PDF.
4. User can ask the chatbot a legal question and get an answer grounded in
   retrieved laws from the archive.
5. An internal editor logs into the admin dashboard to review and correct
   OCR errors in scraped text.

## Features

### Search & Browse

- Meilisearch-powered full-text search with facets (doc type, ministry,
  topic, era) — `/recherche`
- Autocomplete suggestions on the homepage hero search — `/api/suggest`
- Filterable law listing — `/textes`
- Browse by journal issue — `/journal`, `/journal/[...issue]`
- Browse by ministry — `/ministeres`, `/ministeres/[slug]`
- Browse by one of 11 curated topics (assigned via ministry mapping +
  keyword matching)
- Era filters: colonial (pre-1977-06-27), independence (1977–1990), modern
  (post-1990)

### Document Access

- Law detail page with parsed, structured text rendering (articles, visas,
  clauses, signature, tables)
- Single-law PDF export via `@react-pdf/renderer` — `/api/pdf/law/[id]`
- Coverage/transparency page — duplicate report, partial/inaccessible
  issues — `/couverture`

### AI Chatbot

- Chat widget (Groq SDK) that answers legal questions grounded in laws
  retrieved from the archive

### Public API

- REST endpoints for laws, issues, ministries, search — `/api/v1/*`
- Rate-limited (Upstash Redis, 60 req/min/IP), documented at `/api`

### Admin

- Password-gated dashboard — `/dashboard/laws`
- OCR correction editor for fixing scraped text errors —
  `components/admin/ocr-editor.tsx`
- A Payload CMS editorial layer (`/cms`) is being introduced alongside
  this — not a replacement yet (see `context/progress-tracker.md`). It
  will hold versioned, attributable law-text corrections as a separate
  overlay, not edit the scraped `laws` table in place.

## Scope

### In Scope

- Read-only public access to the historical legal archive
- Search, browse, filter, and PDF export of existing scraped data
- Admin correction of OCR/text errors on existing records
- A public, rate-limited REST API for programmatic access
- Read-only public access to consolidated legal codes (`/codes`), a
  manually-curated Payload collection (see Overview above) — one real code
  populated so far, more added by hand via `/cms` or the same one-off
  import-script pattern for codes already in the scraped corpus.

### Out of Scope

- Public user accounts or sign-in (only a single shared admin password)
- Public submission or editing of laws
- Jurisprudence and doctrine as content types — explicitly undecided, not a
  quiet yes (see Overview above)
- Real-time sync with journalofficiel.dj — data is scraped in batches, not
  live-mirrored
- Legal advice — the site and chatbot are explicitly a reference tool, "not
  a substitute for the official portal"

## Success Criteria

1. A user can find a specific law by keyword, reference number, or ministry
   in under a few seconds via `/recherche`.
2. A user can read a law's full structured text and download a correctly
   formatted PDF.
3. Duplicate or broken records are transparently reported, not silently
   hidden, via `/couverture`.
4. The public API returns paginated, documented, rate-limited data without
   requiring authentication.
