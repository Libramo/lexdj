import {
  pgTable,
  serial,
  text,
  date,
  timestamp,
  index,
  pgView,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── LAWS ────────────────────────────────────────────────────────────────────
// Main table — one row per legal text scraped from journalofficiel.dj
export const laws = pgTable(
  "laws",
  {
    id: serial("id").primaryKey(),
    title: text("title"),
    doc_type: text("doc_type"), // Loi, Décret, Arrêté, Décision...
    reference_number: text("reference_number"), // e.g. n° 111/AN/20/8ème L
    ministry: text("ministry"), // Issuing ministry or institution
    ministry_normalized: text("ministry_normalized"),
    publication_date: date("publication_date"),
    mesure: text("mesure"), // Générale or Individuelle
    verbe: text("verbe"), // ARRÊTE, DÉCRÈTE, ORDONNE...
    period: text("period"), // colonial | independence | modern
    intro_text: text("intro_text"), // Header e.g. LE PRÉSIDENT DE LA RÉPUBLIQUE...
    visas_text: text("visas_text"), // VU references (legal basis)
    full_text: text("full_text"), // All articles, tables converted to text
    full_text_structured: jsonb("full_text_structured").$type<
      Array<{
        type: string;
        content?: string;
        headers?: string[];
        rows?: string[][];
      }>
    >(),
    signed_by: text("signed_by"), // Signature block
    pdf_links: text("pdf_links").array(), // Attached PDF URLs
    issue_number: text("issue_number"), // Journal edition number e.g. n° 24
    issue_date: date("issue_date"), // Journal edition date
    source_url: text("source_url").unique(), // Original portal URL — unique identifier
    scraped_at: timestamp("scraped_at"), // When this law was scraped
    updated_at: timestamp("updated_at"),
    ocr_corrected: boolean("ocr_corrected").default(false), // True if manually OCR-corrected in admin
    topics: text("topics").array().default([]),
  },
  (table) => [
    // Indexes for common filter/sort operations in the dashboard
    index("laws_ministry_idx").on(table.ministry),
    index("laws_doc_type_idx").on(table.doc_type),
    index("laws_pub_date_idx").on(table.publication_date),
    index("laws_issue_number_idx").on(table.issue_number),
  ],
);

// ─── ISSUES ──────────────────────────────────────────────────────────────────
// One row per journal edition (issue) scraped from the portal.
// source_url is the real URL saved directly from the portal — no more guessing.
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  issue_number: text("issue_number"), // e.g. n° 24
  issue_type: text("issue_type"), // NORMAL or SPECIAL
  issue_date: date("issue_date"), // Date of the journal edition
  publication_date: date("publication_date"), // "Date de Publication" from inside issue page
  source_url: text("source_url").unique(), // Real URL from portal — used for direct linking
  scraped_at: timestamp("scraped_at"), // When this issue was scraped
});

// ─── SCRAPE LOGS ─────────────────────────────────────────────────────────────
// Audit log of all broken URLs encountered during scraping.
// status values:
//   '404'          — failed to fetch, may be retried
//   'recovered'    — successfully retried and inserted
//   'base_url'     — slugless URL e.g. /texte-juridique/ — unrecoverable
//   '404_confirmed'— retried and still 404
//   'date_anomaly' — publication_date is before issue_date
export const scrape_logs = pgTable("scrape_logs", {
  id: serial("id").primaryKey(),
  url: text("url"),
  level: text("level"), // listing | issue | law | law_listing
  status: text("status"), // see status values above
  title: text("title"), // Law or issue title if known
  issue_number: text("issue_number"),
  ministry: text("ministry"),
  detected_at: timestamp("detected_at").defaultNow(), // matches DB column name
});

export const duplicateLaws = pgTable("duplicate_laws", {
  id: serial("id"),
  title: text("title"),
  reference_number: text("reference_number"),
  issue_number: text("issue_number"),
  source_url: text("source_url"),
  publication_date: date("publication_date"),
});

// ─── VIEWS ───────────────────────────────────────────────────────────────────
// laws_distinct — legacy deduplication view from old Neon DB.
// No longer needed after fresh scrape (source_url UNIQUE prevents duplicates)
// but kept here until the view is explicitly dropped on Neon.
export const lawsDistinct = pgView("laws_distinct", {
  id: serial("id"),
  title: text("title"),
  doc_type: text("doc_type"),
  reference_number: text("reference_number"),
  ministry: text("ministry"),
  publication_date: text("publication_date"),
  mesure: text("mesure"),
  issue_number: text("issue_number"),
  intro_text: text("intro_text"),
  full_text: text("full_text"),
  visas_text: text("visas_text"),
  signed_by: text("signed_by"),
  verbe: text("verbe"),
  period: text("period"),
  pdf_links: text("pdf_links").array(),
  issue_date: text("issue_date"),
  source_url: text("source_url"),
  ocr_corrected: boolean("ocr_corrected"),
}).existing();

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type Law = typeof laws.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type ScrapLog = typeof scrape_logs.$inferSelect;
export type DuplicateLaw = typeof duplicateLaws.$inferSelect;
