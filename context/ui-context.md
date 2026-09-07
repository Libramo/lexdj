# UI Context

> **Status: implemented**, last substantially updated 2026-09-05. This
> describes the current public-site design system, not a future target —
> the redesign shipped, then was substantially revised mid-flight (see the
> note at the end of Colors); the Codes feature (2026-09-04–09-05) then
> extended it to a second content type. Treat this as the live spec: new
> UI work should match it, and any further change here should be made in
> the code first, then reflected back into this file.

## Reference

Design direction is adapted from the institutional design system at
`gouv-dj/packages/ui` and `gouv-dj/apps/ministeres` (a real Djibouti
government portal monorepo) — both its restraint (no motion tropes, one
real semantic color system, sharp/near-zero radii, uppercase structural
headings) and, per an explicit later decision, its actual national
identity mark and exact color tokens. LexDJ stays "archive non officielle"
in its own copy/disclaimers, but the header now carries the real `GovMark`
(flag + emblem + "RÉPUBLIQUE DE DJIBOUTI" + motto) and the exact palette
gouv-dj uses — see Colors below for why, and `progress-tracker.md`'s
Architecture Decisions for the full reasoning trail (this reverses an
earlier "no GovMark" call made the same week).

## Theme

Light only, no dark mode. The design language is a sober institutional
archive: closer to a national gazette or law library than a product.

- No floating gradient orbs, no animated grid backgrounds, no glassmorphism.
- No pulsing status badges, no animated count-up stats — numbers render
  immediately as static text.
- At most one subtle fade-in on initial hero load (see `Hero` in
  `animated-hero.tsx`); no scroll-triggered fade/stagger anywhere else.
  Hover states change color/border only — no `-translate-y` lift, no
  shadow pop.
- **Backgrounds are white/light everywhere.** `primary` and `secondary`
  are accents only — text, borders, buttons, small icon-chip washes
  (`bg-primary/10`) — never a large solid fill (no colored hero section,
  no colored CTA band, no solid-color icon chips). This was a real bug
  found and fixed this session: swapping in gouv-dj's exact token
  *values* onto patterns designed for the old navy palette produced a
  solid bright-blue hero and solid-green icon chips. The fix was changing
  *where* primary/secondary get used, not the token values — see Colors.
- The `GavelIcon` hover-wiggle in the nav logo is fine to keep — it's a
  single small, deliberate micro-interaction, not a pervasive pattern.

## Colors

One semantic token system, defined once in `app/globals.css`, used
everywhere via Tailwind's `bg-*`/`text-*`/`border-*` utilities — no
hardcoded hex in component classNames.

**The token values are an exact copy of `gouv-dj/apps/ministeres/app/globals.css`**
(oklch, not the hex approximation an earlier pass in this file used to
specify) — this was a deliberate, explicit user request, not an
approximation:

| Token                | Value                              |
| --------------------- | ------------------------------------- |
| `--background`       | `oklch(1 0 0)` (white)                |
| `--foreground`       | `oklch(0.145 0 0)`                    |
| `--card`              | `oklch(1 0 0)`                        |
| `--card-foreground`  | `oklch(0.145 0 0)`                    |
| `--primary`           | `oklch(0.6231 0.188 259.8145)` (blue) |
| `--primary-foreground` | `oklch(1 0 0)`                      |
| `--secondary`         | `oklch(0.48 0.196 139.616)` (green)   |
| `--secondary-foreground` | `oklch(0.985 0 0)`                 |
| `--muted`              | `oklch(0.97 0 0)`                    |
| `--muted-foreground`  | `oklch(0.556 0 0)`                    |
| `--destructive`       | `oklch(0.525 0.215 27.768)`           |
| `--border` / `--input` | `oklch(0.922 0 0)`                  |
| `--ring`               | same as `--primary`                  |
| `--radius`             | `0rem` — every derived radius step (`sm`/`md`/`lg`/`xl`) is `calc()` from this, so all resolve to 0, same formulas as gouv-dj |

**Critical usage rule, learned the hard way**: `secondary` is a *saturated
green* in this exact palette — it is not a light neutral tint the way an
earlier custom palette's `secondary` was. Never use `bg-secondary` (or
solid `bg-primary`) for a large area (a hero section, a CTA band, an icon
chip repeated across a grid). Use `bg-muted` for light neutral tint
purposes, and `bg-primary/10` (or `/15`) for a primary-tinted wash. Reserve
solid `bg-primary`/`bg-secondary` for genuinely small elements — buttons,
badges, a chat bubble — where a solid fill is the expected convention.

Document-type tags (`hero-search.tsx`'s `DOC_TYPE_COLORS`): `Loi` gets
`bg-primary/10 text-primary` (a wash, not `bg-secondary`, precisely because
of the rule above); every other type shares one neutral `bg-muted
text-muted-foreground` tone rather than a rainbow of pastel hues.

## Typography

| Role                                              | Font                          |
| --------------------------------------------------- | --------------------------------|
| UI chrome, structural headings (H1/H2, nav, cards) | Inter, uppercase + bold/black weight, tracking-tight |
| Rendered legal document text (law detail page: articles, visas, clauses, signature) | Serif (Libre Baskerville) — the one place a serif is functional, not decorative: signals "you are reading a historical/legal document" |
| Institutional accent (nav tagline, GovMark's motto lines) | Small italic serif, muted |
| Code/reference numbers, API snippets                | JetBrains Mono                 |

Loaded via `next/font` in `app/layout.tsx` (`--font-inter`,
`--font-libre-baskerville`, `--font-jetbrains-mono`), not inline
`font-['Libre_Baskerville']` strings.

**Structural elements stay sans even inside serif-rendered content.** The
serif rule applies to continuous prose (an article's own body text, a
visa's clause, a signature line) — it does not extend to labels, badges,
or headings that happen to sit inside that same content block.
`code-content.tsx`'s Lexical converter overrides `h1`–`h3` back to
`font-sans` even though the surrounding article body is serif; the JO
law/issue reading UI (`law-text-renderer.tsx`) follows the same split —
`ArticleBlock`'s body text and `VisasRenderer`'s visa text are serif, but
`RomanSectionBlock`'s heading, article-number badges, and VU/Considérant
tags stay sans, matching how doc-type/topic/era labels are treated
everywhere else on the site. Table cell text (`TableBlock`) also stays
sans — dense tabular/numeric data isn't the continuous prose this rule is
for. Page-level H1s follow the same test: a law's own title or a JO issue
number is document content and stays serif; a ministry name, a page
header like "Recherche plein texte," or a topic/category label is a
UI/structural heading and stays sans-uppercase.

## Border Radius

`--radius: 0rem` in `app/globals.css`, matching gouv-dj exactly — every
`rounded-sm`/`md`/`lg`/`xl` utility resolves to 0 site-wide. No
`rounded-xl`/`rounded-full` pill CTAs (tag/badge/filter-pill shapes use
`rounded-sm`, which resolves to a plain rectangle here).

**`rounded-full` is a different Tailwind utility and is exempt from the
above** — it always resolves to a true circle (border-radius: 9999px)
regardless of the `--radius` token, so it's the correct choice for
anything that's supposed to actually be round: a numbered-list circular
badge, a bullet-point dot, a progress-bar track/fill, a small status dot.
The "no pill CTAs" rule is about stretched pill *shapes* pretending to
have rounded corners on a rectangular element (tags, filter buttons,
badges) — it was never about literal circles.

## Color Usage Beyond Primary/Secondary

Categorical accent colors (Tailwind's named palette — amber, violet,
emerald, cyan, red, etc., not raw hex) are fine for a genuine **semantic**
dimension that repeats meaningfully across the site: era labels
(colonial/post-indépendance/moderne), KPI status (emerald = available/good,
amber = missing/warning, red = bad), or a warning/alert banner. They are
*not* fine as decorative variety with no semantic weight — cycling a list
of ministries or table rows through six unrelated hues just to help the
eye scan a long list, or giving every document type its own pastel tint
with no shared meaning between them, both got consolidated away during
the 2026-09-07 token migration (see `progress-tracker.md`) in favor of
one `Loi`-gets-a-tint/everything-else-neutral pattern for doc types, and
a single `primary`-opacity gradient instead of a rainbow for ranked lists.
The test: if removing the color palette and using one neutral tone for
everything would lose real information, keep the categorical colors: if
it would only lose visual variety, consolidate.

## Component Library

- `components/ui/button.tsx` — Radix + `cva`, unchanged shape from before
  the redesign.
- `components/ui/gov-mark.tsx` — **new.** Ported from
  `gouv-dj/packages/ui/src/components/gov-mark.tsx` (only the `cn` import
  path changed). Renders flag + emblem + country name + 3-line motto.
  Takes `size="default" | "sm"`. Assets: `public/Flag_of_Djibouti.svg`,
  `public/Emblem_of_Djibouti.svg` (public-domain Wikimedia files, same
  ones gouv-dj uses — no licensing concern).
- `components/public/site-nav.tsx` — **new.** Full-width mega-menu nav,
  adapted from gouv-dj's `SiteNav` (not `NavDropdown`, to avoid adding the
  `@base-ui/react/popover` dependency — this is a from-scratch
  reimplementation of the same full-width-panel mechanism using
  `motion/react`, which was already a dependency). Panel background
  bleeds full viewport width (`w-screen`); its *content* uses the same
  `max-w-6xl mx-auto px-8` as the header rows above it, so edges line up
  — do not widen the content container independently of the header, that
  was a bug (misaligned dropdown) found and fixed this session. Column
  count (`GRID_COLS_LG` lookup, 1–4) matches the actual number of groups
  passed in — don't hard-code 4 columns, a 2-group item left two empty
  grid tracks and looked sparse/narrow before this was fixed.
- **KeyFacts pattern** — the homepage stats row: plain, static numbers
  (no animated counters), used in `Hero`.
- **Container width**: `max-w-6xl`, used consistently by the header, hero,
  and homepage sections — deliberately narrower than gouv-dj's `max-w-360`
  (LexDJ is a reading/reference tool, not a sprawling portal). The
  `SiteNav` dropdown's content matches this exactly (see above).
- **Codes reading UI** (`components/public/code-toc.tsx`,
  `code-content.tsx`, `code-breadcrumbs.tsx`, `code-node-list.tsx`,
  2026-09-05) — built on this current token system from day one, not
  `/textes/[id]`'s pre-migration hex (see Known Gaps):
  - Sticky sidebar TOC: `w-72 shrink-0 hidden lg:block`, inner
    `sticky top-19 max-h-[calc(100vh-5rem)] overflow-y-auto` — wider than
    `/textes`' `w-56` filter sidebar since section titles run longer.
    Recursive collapsible tree, current node highlighted with
    `bg-primary/10` (the same wash used for `SiteNav`'s open-dropdown
    state — keep these consistent if either changes).
  - Child/section listing: plain `<ul>` with `divide-y divide-border
    border-t border-border`, each row a `Link` with title + trailing
    `ChevronRight`, hover `text-primary` — no card chrome, this is a dense
    list context, not a grid of cards.
  - Article content: `font-serif text-[15px] leading-relaxed`, matching
    the "rendered legal document text" typography rule below. Lists,
    links, headings (h1–h3), blockquotes get explicit styling in
    `code-content.tsx` since Tailwind's preflight strips all default
    browser styling from those tags — anything rendering Lexical/rich
    text elsewhere should reuse or extend `CONTENT_CLASSNAME` there
    rather than re-deriving list/heading styles from scratch.

## Layout Patterns

- **Header is two stacked rows** (`components/public/nav.tsx`): row 1 is
  identity (`GovMark` + "LexDJ" + tagline), its own `border-b`; row 2 is
  `SiteNav`, desktop-only (`hidden md:block`).
- **Row 1 is responsive, not just scaled**: on mobile (`md:hidden`),
  `GovMark` renders at `size="sm"` with the "LexDJ" name/tagline **stacked
  below it**, not beside it — the full-size side-by-side lockup is wider
  than a phone viewport. Desktop (`hidden md:flex`) keeps the side-by-side
  layout with default-size `GovMark`. Row 1's height is `py-3` (not a
  fixed `h-*`), so it can size itself to whichever variant is showing.
- Hero: single column, static, `bg-background` (white) — not a colored
  fill. Eyebrow (small italic serif) + uppercase headline + wide search
  input + a static stats row at the bottom.
- Search input (`hero-search.tsx`): `max-w-4xl` (widened this session, per
  a Légifrance reference screenshot — was `max-w-2xl`), solid
  high-contrast white input with a real border (not `border-transparent`
  — that only worked visually against the old dark-navy hero; it's white
  now, so the input needs its own visible border), attached solid-primary
  button.
- Cards: hover changes color/border only.
- Sections alternate `bg-background`/`bg-muted` for a light, subtle rhythm
  down the page — no per-section scroll-triggered fade-in.
- **Full-bleed elements** (anything using `w-screen` + `left-1/2
  -translate-x-1/2` to break out of a `max-w-*` container, like `SiteNav`'s
  dropdown panel): `100vw` includes the vertical scrollbar's own width,
  which the visible content area doesn't, so this pattern always overflows
  the page by the scrollbar's width and produces a horizontal scrollbar
  the moment that element mounts. `app/globals.css` sets `overflow-x:
  hidden` on **both** `html` and `body` to cover this site-wide (relying
  on `body`'s value alone to propagate up to the viewport isn't reliable
  — confirmed by testing, not just in theory). Any new full-bleed element
  built this way is already covered by that global fix; don't re-solve it
  per-component.

## Icons

Lucide React, stroke-based. Sizes: `14` for inline/meta, `16` for
standalone UI (search, nav), `20` for icon chips. `GavelIcon` stays as the
one animated icon (nav logo hover-wiggle).

## Known Gaps

- **Token migration is complete for the entire public site** (as of
  2026-09-07 — `/recherche`, `/textes` + `[id]`, `/journal` + issue
  detail, `/ministeres` + `[slug]`, `/couverture`, `/api` docs, and every
  shared component under `components/public/`; `/codes/*` was already
  built on current tokens from day one). `grep -rE
  "#[0-9A-Fa-f]{6}|font-\['Libre_Baskerville'\]"` across `app/(public)/**`
  and `components/public/**` returns zero matches — see
  `progress-tracker.md`'s six UI Redesign migration entries for the
  file-by-file detail and the judgment calls made along the way (doc-type
  badge consolidation, `rounded-full` vs. `rounded-sm`, the serif-vs-sans
  split within document content, etc. — now also captured above in
  Typography/Border Radius/Color Usage).
- The non-`Loi` doc-type tag color question is resolved, not still TODO:
  every listing page now uses the same `Loi`-gets-`bg-primary/10
  text-primary` / everything-else-`bg-muted text-muted-foreground`
  pattern first established in `hero-search.tsx` — no per-type
  desaturated hue palette was introduced, that idea was deliberately
  dropped in favor of this simpler, already-precedented convention.
- **Deliberately still excluded from the token system**, not an oversight:
  `components/public/law-document-pdf.tsx` (`@react-pdf/renderer`
  styling — a separate rendering pipeline with no Tailwind, literal
  colors are required there) and the admin dashboard (`app/login/page.tsx`,
  `app/(admin)/dashboard/**`, `components/admin/ocr-editor.tsx` — its own
  separate unit per `ai-workflow-rules.md`'s public/admin split rule, not
  in scope for the public-site redesign).
