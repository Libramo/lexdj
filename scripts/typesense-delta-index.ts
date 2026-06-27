/**
 * scripts/typesense-delta-index.ts
 *
 * Run with:
 *   npx tsx scripts/typesense-delta-index.ts --since 2026-05-14
 *   npx tsx scripts/typesense-delta-index.ts --since "2026-05-14T10:00:00"
 */

import "dotenv/config";
import { db } from "../drizzle/src";
import { sql } from "drizzle-orm";
import { typesenseClient } from "../lib/typesense";
import { LAWS_COLLECTION } from "../lib/typesense-schema";

const BATCH_SIZE = 250;

function parseYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const year = parseInt(dateStr.slice(0, 4), 10);
    return year >= 1800 && year <= 2100 ? year : null;
  } catch {
    return null;
  }
}

function rowToDocument(row: Record<string, any>) {
  return {
    id: String(row.id),
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
    publication_date: row.publication_date ? String(row.publication_date) : "",
    pub_year:
      parseYear(row.publication_date ? String(row.publication_date) : null) ??
      0,
    source_url: row.source_url ?? "",
  };
}

async function main() {
  console.log("=== Typesense Delta Indexer ===\n");

  // parse --since argument
  const sinceArg = process.argv.find(
    (_, i) => process.argv[i - 1] === "--since",
  );
  if (!sinceArg) {
    console.error(
      "Usage: npx tsx scripts/typesense-delta-index.ts --since YYYY-MM-DD",
    );
    process.exit(1);
  }

  const since = new Date(sinceArg);
  if (isNaN(since.getTime())) {
    console.error(`Invalid date: ${sinceArg}`);
    process.exit(1);
  }

  console.log(`Delta index — laws updated since ${since.toISOString()}`);

  const rows = await db.execute(sql`
    SELECT
      id, title, reference_number, intro_text, full_text,
      doc_type, ministry, ministry_normalized, period, mesure,
      issue_number, publication_date, source_url, topics
    FROM laws
    WHERE updated_at > ${since.toISOString()}
    AND id NOT IN (SELECT id FROM duplicate_laws)
    ORDER BY id
  `);

  const allRows = rows.rows as Record<string, any>[];

  if (allRows.length === 0) {
    console.log("Nothing to re-index.");
    process.exit(0);
  }

  console.log(`Found ${allRows.length} laws to re-index\n`);

  const start = Date.now();
  let total = 0;
  let errors = 0;

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE).map(rowToDocument);

    const results = await typesenseClient
      .collections(LAWS_COLLECTION)
      .documents()
      .import(batch, { action: "upsert" });

    const batchErrors = results.filter((r: any) => !r.success);
    errors += batchErrors.length;
    total += batch.length;

    if (batchErrors.length > 0) {
      console.warn(
        `  ⚠ ${batchErrors.length} errors in batch ${Math.floor(i / BATCH_SIZE) + 1}`,
      );
      batchErrors
        .slice(0, 3)
        .forEach((e: any) => console.warn(`    ${JSON.stringify(e)}`));
    } else {
      process.stdout.write(`\r  ✓ Indexed ${total}/${allRows.length} laws...`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n\n✓ Done. Indexed: ${total - errors} | Errors: ${errors}`);
  console.log(`Total time: ${elapsed}s`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Delta indexer error:", err);
  process.exit(1);
});
