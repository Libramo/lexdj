/**
 * scripts/meilisearch-delta-index.ts
 *
 * Run with:
 *   npx tsx scripts/meilisearch-delta-index.ts --since 2026-05-14
 *   npx tsx scripts/meilisearch-delta-index.ts --since "2026-05-14T10:00:00"
 */

import "dotenv/config";
import { db } from "../drizzle/src";
import { sql } from "drizzle-orm";
import { meiliClient } from "../lib/meilisearch";
import { LAWS_INDEX, rowToDocument } from "../lib/meilisearch-schema";

const BATCH_SIZE = 250;

async function main() {
  console.log("=== Meilisearch Delta Indexer ===\n");

  // parse --since argument
  const sinceArg = process.argv.find(
    (_, i) => process.argv[i - 1] === "--since",
  );
  if (!sinceArg) {
    console.error(
      "Usage: npx tsx scripts/meilisearch-delta-index.ts --since YYYY-MM-DD",
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
  let indexedBatches = 0;
  let indexedDocs = 0;
  let failedBatches = 0;
  let failedDocs = 0;

  const index = meiliClient.index(LAWS_INDEX);

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE).map(rowToDocument);

    // See scripts/meilisearch-index.ts for why this is wrapped in try/catch —
    // waitTask() can throw a timeout error without the task actually having
    // failed server-side, and this script runs unattended via weekly cron
    // (deploy/scrape-and-reindex.sh), so one slow batch must not abort the
    // whole run.
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

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n\n✓ Done. Indexed: ${indexedBatches} batches (${indexedDocs} docs) | Failed: ${failedBatches} batches (${failedDocs} docs)`,
  );
  console.log(`Total time: ${elapsed}s`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Delta indexer error:", err);
  process.exit(1);
});
