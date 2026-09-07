/**
 * scripts/meilisearch-index.ts
 * ============================
 * Reads all non-duplicate laws from the local DB and indexes them to Meilisearch.
 *
 * Run with:
 *   npx tsx scripts/meilisearch-index.ts
 *
 * Make sure your .env has:
 *   DATABASE_URL
 *   MEILI_HOST
 *   MEILI_MASTER_KEY
 */

import "dotenv/config";
import { db } from "../drizzle/src";
import { sql } from "drizzle-orm";
import { meiliClient } from "../lib/meilisearch";
import { LAWS_INDEX, LAWS_SETTINGS, rowToDocument } from "../lib/meilisearch-schema";

// Number of laws sent per batch
const BATCH_SIZE = 250;

// ── Step 1: Drop existing index ──────────────────────────────────────────────
// deleteIndex() enqueues successfully even if the index doesn't exist yet —
// Meilisearch only reports "index_not_found" on the resulting *task*, not as
// a thrown error on the initial call, so we check the finished task's error.

async function dropIndexIfExists() {
  const finished = await meiliClient.deleteIndex(LAWS_INDEX).waitTask();
  if (finished.status === "succeeded") {
    console.log(`✓ Dropped existing index '${LAWS_INDEX}'`);
  } else if (finished.error?.code === "index_not_found") {
    console.log(`  Index '${LAWS_INDEX}' does not exist yet — creating fresh`);
  } else {
    throw new Error(`Failed to delete index: ${JSON.stringify(finished.error)}`);
  }
}

// ── Step 2: Create index + apply settings ────────────────────────────────────

async function createIndex() {
  const created = await meiliClient
    .createIndex(LAWS_INDEX, { primaryKey: "id" })
    .waitTask();
  if (created.status !== "succeeded") {
    throw new Error(`Failed to create index: ${JSON.stringify(created.error)}`);
  }
  console.log(`✓ Index '${LAWS_INDEX}' created`);

  const settingsTask = await meiliClient
    .index(LAWS_INDEX)
    .updateSettings(LAWS_SETTINGS as any)
    .waitTask();
  if (settingsTask.status !== "succeeded") {
    throw new Error(
      `Failed to apply settings: ${JSON.stringify(settingsTask.error)}`,
    );
  }
  console.log(`✓ Settings applied`);
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

  let indexedBatches = 0;
  let indexedDocs = 0;
  let failedBatches = 0;
  let failedDocs = 0;

  const index = meiliClient.index(LAWS_INDEX);

  // Process sequentially in batches of BATCH_SIZE — each batch's task is
  // awaited before the next is enqueued. Meilisearch's failure granularity
  // is per-batch/per-task, not per-document like Typesense's old .import()
  // result array, so a failed batch has no finer breakdown to print.
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE).map(rowToDocument);

    // waitTask() can throw (e.g. MeilisearchTaskTimeOutError if a batch
    // takes longer than defaultWaitOptions.timeout to resolve) as well as
    // resolve with a failed status — both are treated as one failed batch
    // so a single slow/timed-out batch doesn't abort the entire run. A
    // timeout specifically doesn't mean the task actually failed server-
    // side (it likely still completes) — just that indexing continues
    // without waiting to confirm it.
    try {
      const finished = await index.addDocuments(batch).waitTask();
      if (finished.status === "succeeded") {
        indexedBatches += 1;
        indexedDocs += batch.length;
        process.stdout.write(
          `\r  ✓ Indexed ${indexedDocs}/${allRows.length} laws...`,
        );
      } else {
        failedBatches += 1;
        failedDocs += batch.length;
        console.warn(
          `\n  ⚠ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${JSON.stringify(finished.error)}`,
        );
      }
    } catch (err) {
      failedBatches += 1;
      failedDocs += batch.length;
      console.warn(
        `\n  ⚠ Batch ${Math.floor(i / BATCH_SIZE) + 1} errored (likely a wait timeout, task may still have succeeded): ${err}`,
      );
    }
  }

  console.log(
    `\n\n✓ Done. Indexed: ${indexedBatches} batches (${indexedDocs} docs) | Failed: ${failedBatches} batches (${failedDocs} docs)`,
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Meilisearch Indexer ===\n");

  const start = Date.now();

  await dropIndexIfExists();
  await createIndex();
  await indexLaws();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nTotal time: ${elapsed}s`);

  // Verify final count in Meilisearch
  const stats = await meiliClient.index(LAWS_INDEX).getStats();
  console.log(`Meilisearch index: ${stats.numberOfDocuments} documents`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Indexer error:", err);
  process.exit(1);
});
