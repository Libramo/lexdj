import {
  pgTable,
  serial,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const laws = pgTable(
  "laws",
  {
    id: serial("id").primaryKey(),
    title: text("title"),
    doc_type: text("doc_type"),
    reference_number: text("reference_number"),
    ministry: text("ministry"),
    publication_date: date("publication_date"),
    mesure: text("mesure"),
    verbe: text("verbe"),
    period: text("period"),
    intro_text: text("intro_text"),
    visas_text: text("visas_text"),
    full_text: text("full_text"),
    signed_by: text("signed_by"),
    pdf_links: text("pdf_links"),
    issue_number: text("issue_number"),
    issue_date: date("issue_date"),
    source_url: text("source_url"),
  },
  (table) => [
    index("laws_ministry_idx").on(table.ministry),
    index("laws_doc_type_idx").on(table.doc_type),
    index("laws_pub_date_idx").on(table.publication_date),
    index("laws_issue_number_idx").on(table.issue_number),
  ],
);

export const scrape_logs = pgTable("scrape_logs", {
  id: serial("id").primaryKey(),
  url: text("url"),
  level: text("level"),
  status: text("status"),
  title: text("title"),
  issue_number: text("issue_number"),
  ministry: text("ministry"),
  created_at: timestamp("created_at").defaultNow(),
});

export type Law = typeof laws.$inferSelect;
export type ScrapLog = typeof scrape_logs.$inferSelect;
