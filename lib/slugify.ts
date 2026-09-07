import type { CollectionSlug, Payload, Where } from "payload";

// Diacritic-stripping, lowercase, hyphenated slug. Shared by the Codes and
// CodeSections Payload collections' auto-slug hooks — kept out of
// lib/utils.ts, which is a Protected File tuned for an unrelated purpose
// (scraped-JO OCR text parsing).
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Appends -2, -3, ... until `base` doesn't collide with an existing
// document's slug in `collection` (excluding `excludeId`, for the update
// case where a doc's own current slug shouldn't count as a collision with
// itself). Real headings repeat across a large hierarchical document (two
// chapters both titled "Dispositions générales" is common), so the
// auto-slug hooks need this rather than assuming `code` + title is always
// enough — hit for real importing the actual Code du travail text.
export async function uniqueSlug(
  payload: Payload,
  collection: CollectionSlug,
  base: string,
  excludeId?: number | string,
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const clauses: Where[] = [{ slug: { equals: candidate } }];
    if (excludeId) clauses.push({ id: { not_equals: excludeId } });
    const existing = await payload.find({
      collection,
      where: { and: clauses },
      limit: 1,
      depth: 0,
    });
    if (existing.docs.length === 0) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}
