export const LAWS_INDEX = "laws";

// Field priority is a single index-level order in Meilisearch — there is
// no per-request field weighting like Typesense's query_by_weights, so
// this one order now serves all three search consumers (recherche page,
// /api/v1/search, and the chatbot's RAG helper in lib/search-laws.ts).
export const LAWS_SETTINGS = {
  searchableAttributes: [
    "title",
    "reference_number",
    "intro_text",
    "full_text",
    "ministry",
  ],
  filterableAttributes: [
    "doc_type",
    "ministry_normalized",
    "topics",
    "publication_date_ts",
  ],
  sortableAttributes: ["pub_year"],
} as const;

/**
 * Extracts a numeric year from a YYYY-MM-DD string.
 * Returns null for null dates or Hijri dates (year < 1800 or > 2100).
 * This filters out colonial laws with incorrect Hijri dates like 1392.
 */
export function parseYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const year = parseInt(dateStr.slice(0, 4), 10);
    return year >= 1800 && year <= 2100 ? year : null;
  } catch {
    return null;
  }
}

/**
 * Converts a DB row to a Meilisearch document. Shared by the full and
 * delta reindex scripts so the mapping only exists in one place.
 *
 * publication_date_ts (YYYYMMDD as an integer) exists specifically for
 * era range filtering — Meilisearch's comparison operators (<, >=, etc.)
 * only work on numeric attributes, not date-formatted strings, so the
 * display-only `publication_date` string can't be filtered on directly.
 * Only set when parseYear() validates the date, never defaulted to 0, so
 * a bad/missing date doesn't get miscategorized into the colonial era.
 */
export function rowToDocument(row: Record<string, any>) {
  const dateStr = row.publication_date ? String(row.publication_date) : null;
  const year = parseYear(dateStr);

  return {
    id: String(row.id), // Meilisearch primary key, kept as a string
    title: row.title ?? "",
    reference_number: row.reference_number ?? "",
    intro_text: row.intro_text ?? "",
    full_text: row.full_text ?? "",
    doc_type: row.doc_type ?? "",
    ministry: row.ministry ?? "",
    ministry_normalized: row.ministry_normalized ?? "",
    period: row.period ?? "",
    mesure: row.mesure ?? "",
    topics: Array.isArray(row.topics) ? row.topics : [],
    issue_number: row.issue_number ?? "",
    publication_date: dateStr ?? "",
    publication_date_ts: year ? parseInt(dateStr!.replaceAll("-", ""), 10) : null,
    pub_year: year ?? 0,
    source_url: row.source_url ?? "",
  };
}
