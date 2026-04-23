import { db } from "@/drizzle/src";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const duplicates = await db.execute(sql`
    SELECT
      l1.title,
      l1.publication_date,
      l1.issue_number,
      l1.doc_type,
      COUNT(*)::int                    AS copies,
      MIN(l1.id)::int                  AS canonical_id,
      MIN(l1.source_url)               AS canonical_url,
      array_agg(l1.source_url ORDER BY l1.id) AS all_urls
    FROM laws l1
    GROUP BY l1.title, l1.publication_date, l1.issue_number, l1.doc_type
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  const rows = duplicates.rows as {
    title: string;
    publication_date: string;
    issue_number: string;
    doc_type: string;
    copies: number;
    canonical_id: number;
    canonical_url: string;
    all_urls: string[];
  }[];

  // Build CSV
  const headers = [
    "title",
    "publication_date",
    "issue_number",
    "doc_type",
    "copies",
    "canonical_id",
    "canonical_url",
    "duplicate_urls",
  ];

  const escape = (v: string | null) =>
    v ? `"${String(v).replace(/"/g, '""')}"` : '""';

  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escape(r.title),
        escape(r.publication_date),
        escape(r.issue_number),
        escape(r.doc_type),
        r.copies,
        r.canonical_id,
        escape(r.canonical_url),
        escape(r.all_urls.filter((u) => u !== r.canonical_url).join(" | ")),
      ].join(","),
    ),
  ];

  // BOM prefix forces Excel to read as UTF-8
  const csv = "\uFEFF" + csvLines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lexdj-duplicates-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
