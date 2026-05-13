/**
 * scripts/typesense-index.ts
 * ==========================
 * Reads all non-duplicate laws from the local DB and indexes them to Typesense.
 *
 * Run with:
 *   npx tsx scripts/typesense-index.ts
 *
 * Make sure your .env has:
 *   DATABASE_URL
 *   TYPESENSE_HOST
 *   TYPESENSE_PORT
 *   TYPESENSE_PROTOCOL
 *   TYPESENSE_API_KEY
 */

import "dotenv/config";
import { db } from "../drizzle/src";
import { sql } from "drizzle-orm";
import { typesenseClient } from "../lib/typesense";
import { LAWS_COLLECTION, LAWS_SCHEMA } from "../lib/typesense-schema";

// Number of laws sent per batch — 250 is safe for Typesense
const BATCH_SIZE = 250;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts a numeric year from a YYYY-MM-DD string.
 * Returns null for null dates or Hijri dates (year < 1800 or > 2100).
 * This filters out colonial laws with incorrect Hijri dates like 1392.
 */
function parseYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const year = parseInt(dateStr.slice(0, 4), 10);
    return year >= 1800 && year <= 2100 ? year : null;
  } catch {
    return null;
  }
}

/**
 * Converts a DB row to a Typesense document.
 * Note: Typesense requires id to be a string, even though it's int32 in the schema.
 */
function rowToDocument(row: Record<string, any>) {
  return {
    id: String(row.id), // Typesense requires string id
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

// ── Step 1: Drop existing collection ─────────────────────────────────────────

async function dropCollectionIfExists() {
  try {
    await typesenseClient.collections(LAWS_COLLECTION).delete();
    console.log(`✓ Dropped existing collection '${LAWS_COLLECTION}'`);
  } catch (e: any) {
    // ObjectNotFound means collection doesn't exist yet — that's fine
    if (e?.httpStatus === 404) {
      console.log(
        `  Collection '${LAWS_COLLECTION}' does not exist yet — creating fresh`,
      );
    } else {
      throw e;
    }
  }
}

// ── Step 2: Create collection ─────────────────────────────────────────────────

async function createCollection() {
  await typesenseClient.collections().create(LAWS_SCHEMA as any);
  console.log(`✓ Collection '${LAWS_COLLECTION}' created`);
}

// ── Step 3: Index laws ────────────────────────────────────────────────────────

async function indexLaws() {
  console.log("\nFetching laws from DB...");

  // Fetch all non-duplicate laws — excludes the 492 WordPress duplicates
  const rows = await db.execute(sql`
    SELECT
      id, title, reference_number, intro_text, full_text,
      doc_type, ministry, ministry_normalized, period, mesure,
      issue_number, publication_date, source_url, topics
    FROM laws
    WHERE id NOT IN (SELECT id FROM duplicate_laws)
    ORDER BY id
  `);

  const allRows = rows.rows as Record<string, any>[];
  console.log(`  Found ${allRows.length} laws to index`);

  let total = 0;
  let errors = 0;

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE).map(rowToDocument);

    const results = await typesenseClient
      .collections(LAWS_COLLECTION)
      .documents()
      .import(batch, { action: "upsert" });

    // Each result has { success: true } or { success: false, error: "..." }
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

  console.log(`\n\n✓ Done. Indexed: ${total - errors} | Errors: ${errors}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Typesense Indexer ===\n");

  const start = Date.now();

  await dropCollectionIfExists();
  await createCollection();
  await indexLaws();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nTotal time: ${elapsed}s`);

  // Verify final count in Typesense
  const info = await typesenseClient.collections(LAWS_COLLECTION).retrieve();
  console.log(`Typesense collection: ${(info as any).num_documents} documents`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Indexer error:", err);
  process.exit(1);
});
