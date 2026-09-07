// scraper/writer.ts
// Port of db/writer.py — reuses this repo's own Drizzle client instead of
// standing up a second DB connection layer, and uses drizzle-orm's tagged
// `sql` template throughout, which parameterizes interpolated values rather
// than string-concatenating them (see code-standards.md's note on
// app/api/v1/laws/route.ts for why that distinction matters).

import { sql } from "drizzle-orm";
import { db } from "../drizzle/src";
import type { Law, IssueCard } from "./types";
import { ddmmyyyyToIso } from "./parser";

export async function initDb(): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE period_type AS ENUM ('colonial', 'independence', 'modern');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS laws (
      id SERIAL PRIMARY KEY,
      title TEXT,
      doc_type TEXT,
      reference_number TEXT,
      ministry TEXT,
      publication_date DATE,
      mesure TEXT,
      verbe TEXT,
      period period_type,
      intro_text TEXT,
      visas_text TEXT,
      full_text TEXT,
      signed_by TEXT,
      pdf_links TEXT[],
      issue_number TEXT,
      issue_date DATE,
      source_url TEXT UNIQUE,
      scraped_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS issues (
      id SERIAL PRIMARY KEY,
      issue_number TEXT,
      issue_type TEXT,
      issue_date DATE,
      publication_date DATE,
      source_url TEXT UNIQUE,
      scraped_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS scrape_logs (
      id SERIAL PRIMARY KEY,
      url TEXT,
      level TEXT,
      status TEXT,
      title TEXT,
      issue_number TEXT,
      ministry TEXT,
      detected_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("DB initialized.");
}

export async function insertLaw(law: Law): Promise<void> {
  const publicationDate = ddmmyyyyToIso(law.publication_date ?? "");
  const issueDate = ddmmyyyyToIso(law.issue_date ?? "");
  const period = law.period || null;

  await db.execute(sql`
    INSERT INTO laws (title, doc_type, reference_number, ministry,
                      publication_date, mesure, verbe, period, intro_text, visas_text,
                      full_text, signed_by, pdf_links, issue_number,
                      issue_date, source_url, updated_at)
    VALUES (${law.title ?? ""}, ${law.doc_type ?? ""}, ${law.reference_number ?? ""}, ${law.ministry ?? ""},
            ${publicationDate}, ${law.mesure ?? ""}, ${law.verbe ?? ""}, ${period}, ${law.intro_text ?? ""}, ${law.visas_text ?? ""},
            ${law.full_text ?? ""}, ${law.signed_by ?? ""}, ${sql.param(law.pdf_links ?? [])}, ${law.issue_number ?? ""},
            ${issueDate}, ${law.url ?? ""}, NOW())
    ON CONFLICT (source_url) DO UPDATE
        SET full_text = EXCLUDED.full_text,
            updated_at = NOW()
        WHERE laws.full_text IS DISTINCT FROM EXCLUDED.full_text
  `);
}

export async function insertIssue(issue: IssueCard): Promise<void> {
  await db.execute(sql`
    INSERT INTO issues (issue_number, issue_type, issue_date, publication_date, source_url)
    VALUES (${issue.issue_number ?? ""}, ${issue.issue_type ?? ""}, ${ddmmyyyyToIso(issue.date ?? "")}, ${ddmmyyyyToIso(issue.publication_date ?? "")}, ${issue.url ?? ""})
    ON CONFLICT (source_url) DO NOTHING
  `);
}

export async function logBroken(params: {
  url: string;
  level: string;
  title?: string;
  issueNumber?: string;
  ministry?: string;
  status?: string;
}): Promise<void> {
  const { url, level, title = "", issueNumber = "", ministry = "", status = "404" } = params;
  await db.execute(sql`
    INSERT INTO scrape_logs (url, level, status, title, issue_number, ministry)
    VALUES (${url}, ${level}, ${status}, ${title}, ${issueNumber}, ${ministry})
  `);
}
