// scraper/rescrape.ts
// Port of rescraper-v2.py's three retry/backfill modes. All three reuse the
// same fetch/parse functions as the main scrape — see main.ts.
//
// Run with:
//   npx tsx scraper/rescrape.ts

import { sql } from "drizzle-orm";
import { db } from "../drizzle/src";
import { loadCheckpoint, saveCheckpoint, isScraped } from "./checkpoint";
import { insertLaw, logBroken } from "./writer";
import { fetchLawPage, fetchIssuePage } from "./fetcher";
import { parseLawPage, parseIssuePage } from "./parser";
import { createMultiBar, ProgressBar } from "./progress";
import type { IssueCard, LawStub } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry individual law URLs that failed during the main scrape.
 * Only retries URLs with a real slug (filters out slugless base_url entries).
 * Updates status to 'recovered' on success — does not delete from scrape_logs
 * so the audit trail is preserved.
 */
export async function rescrapeLaws(): Promise<void> {
  const result = await db.execute(sql`
    SELECT url, title, ministry, issue_number
    FROM scrape_logs
    WHERE status = '404'
    AND level = 'law'
    AND (
        url ~ '.*/texte-juridique/.+'
        OR url ~ '.*/journal-officiel/.+'
    )
  `);
  const rows = result.rows as { url: string; title: string; ministry: string; issue_number: string }[];

  console.log(`\nRetrying ${rows.length} broken laws...`);
  let recovered = 0;
  let stillBroken = 0;

  const multibar = createMultiBar();
  const bar = new ProgressBar(multibar, "Laws", rows.length);

  for (const row of rows) {
    const stub: LawStub = { title: row.title, url: row.url, ministry: row.ministry };
    const issue: IssueCard = { issue_number: row.issue_number, issue_type: "", date: "", url: "", publication_date: "" };

    const lawSoup = await fetchLawPage(row.url);
    if (!lawSoup) {
      stillBroken += 1;
      bar.tick(`Recovered: ${recovered} | Still broken: ${stillBroken}`);
      continue;
    }

    const law = parseLawPage(lawSoup, stub, issue);
    if (law) {
      await insertLaw(law);
      await db.execute(sql`UPDATE scrape_logs SET status = 'recovered' WHERE url = ${row.url}`);
      recovered += 1;
    }

    bar.tick(`Recovered: ${recovered} | Still broken: ${stillBroken}`);
    await sleep(2000);
  }

  multibar.stop();
  console.log(`Laws — Recovered: ${recovered} | Still broken: ${stillBroken}`);
}

/** Retry issue pages that failed during the main scrape and scrape all their laws. */
export async function rescrapeIssues(): Promise<void> {
  const checkpoint = loadCheckpoint();
  const scrapedUrls = checkpoint.scraped_urls;
  const scrapedIssues = checkpoint.scraped_issues;
  console.log(`\nCheckpoint: ${scrapedUrls.length} laws | ${scrapedIssues.length} issues already scraped`);

  const result = await db.execute(sql`
    SELECT url, title, issue_number
    FROM scrape_logs
    WHERE level = 'issue' AND status = '404'
  `);
  const rows = result.rows as { url: string; title: string; issue_number: string }[];

  console.log(`Retrying ${rows.length} broken issues...`);

  const multibar = createMultiBar();

  for (const row of rows) {
    console.log(`\n  Issue: ${row.issue_number} — ${row.url}`);

    const issue: IssueCard = { issue_number: row.issue_number, issue_type: "", date: "", url: row.url, publication_date: "" };

    const issueSoup = await fetchIssuePage(row.url);
    if (!issueSoup) {
      console.log("  Still 404 — skipping");
      continue;
    }

    const { stubs, broken } = parseIssuePage(issueSoup, issue);
    console.log(`  Found ${stubs.length} laws`);

    for (const b of broken) {
      await logBroken({ url: b.url, level: "law_listing", title: b.title, issueNumber: row.issue_number, ministry: b.ministry });
    }

    // No outer bar here — matches the Python original, which only wraps
    // the inner laws loop in tqdm(leave=False) for this mode.
    const lawsBar = new ProgressBar(multibar, "  Laws", stubs.length);

    for (const stub of stubs) {
      if (isScraped(stub.url, scrapedUrls)) {
        lawsBar.tick();
        continue;
      }

      const lawSoup = await fetchLawPage(stub.url);
      if (!lawSoup) {
        await logBroken({ url: stub.url, level: "law", title: stub.title, issueNumber: row.issue_number, ministry: stub.ministry });
        lawsBar.tick();
        continue;
      }

      const law = parseLawPage(lawSoup, stub, issue);
      if (law) {
        await insertLaw(law);
        scrapedUrls.push(stub.url);
        saveCheckpoint(scrapedUrls, scrapedIssues);
        console.log(`  Inserted: ${law.title.slice(0, 60)}`);
      }

      lawsBar.tick();
      await sleep(1000);
    }

    lawsBar.remove();

    await db.execute(sql`UPDATE scrape_logs SET status = 'recovered' WHERE url = ${row.url}`);

    scrapedIssues.push(row.url);
    saveCheckpoint(scrapedUrls, scrapedIssues);
    await sleep(2000);
  }

  multibar.stop();
  console.log("\nIssues done.");
}

type TablePeriod = "modern" | "colonial" | "all";

/**
 * Re-scrape laws where the portal page contains a <table> inside
 * div.content-txt. Updates only full_text in the laws table — nothing
 * else is touched.
 */
export async function rescrapeLawsWithTables(period: TablePeriod = "modern"): Promise<void> {
  const result =
    period === "all"
      ? await db.execute(sql`SELECT id, source_url, title FROM laws ORDER BY id`)
      : await db.execute(sql`SELECT id, source_url, title FROM laws WHERE period = ${period} ORDER BY id`);
  const rows = result.rows as { id: number; source_url: string; title: string }[];

  console.log(`\nChecking ${rows.length} laws (period=${period}) for tables...`);
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const multibar = createMultiBar();
  const bar = new ProgressBar(multibar, "Scanning", rows.length);
  const status = () => `Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`;

  for (const row of rows) {
    try {
      const lawSoup = await fetchLawPage(row.source_url);
      if (!lawSoup) {
        errors += 1;
        bar.tick(status());
        continue;
      }

      const contentTag = lawSoup("div.content-txt").first();
      if (contentTag.length === 0 || contentTag.find("table").length === 0) {
        skipped += 1;
        bar.tick(status());
        continue;
      }

      const metaResult = await db.execute(
        sql`SELECT ministry, issue_number, issue_date FROM laws WHERE id = ${row.id}`,
      );
      const meta = metaResult.rows[0] as { ministry: string; issue_number: string; issue_date: string | null };

      const stub: LawStub = { title: row.title, url: row.source_url, ministry: meta.ministry };
      const issue: IssueCard = {
        issue_number: meta.issue_number,
        issue_type: "",
        date: meta.issue_date ?? "",
        url: "",
        publication_date: "",
      };

      const law = parseLawPage(lawSoup, stub, issue);
      if (!law) {
        errors += 1;
        bar.tick(status());
        continue;
      }

      await db.execute(sql`UPDATE laws SET full_text = ${law.full_text}, updated_at = NOW() WHERE id = ${row.id}`);

      updated += 1;
      bar.tick(status());
      await sleep(1000);
    } catch (err) {
      console.log(`Error on ${row.source_url}: ${err}`);
      errors += 1;
      bar.tick(status());
    }
  }

  multibar.stop();
  console.log(`\nDone — Updated: ${updated} | Skipped (no table): ${skipped} | Errors: ${errors}`);
}

// ── MODES ──────────────────────────────────────────────────────────────────
// Set the mode you want to run

const MODE_RESCRAPE_BROKEN_LAWS = false; // retry 404 laws from scrape_logs
const MODE_RESCRAPE_BROKEN_ISSUES = false; // retry 404 issues from scrape_logs
const MODE_RESCRAPE_TABLES = true; // re-scrape laws that have tables

// For MODE_RESCRAPE_TABLES only:
// 'modern'   → post-1977 laws only (recommended, ~8,715 laws)
// 'colonial' → pre-1977 laws only  (~45,583 laws, slow)
// 'all'      → everything          (~54,305 laws, very slow)
const TABLE_RESCRAPE_PERIOD: TablePeriod = "modern";
// ───────────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  if (MODE_RESCRAPE_BROKEN_LAWS) await rescrapeLaws();
  if (MODE_RESCRAPE_BROKEN_ISSUES) await rescrapeIssues();
  if (MODE_RESCRAPE_TABLES) await rescrapeLawsWithTables(TABLE_RESCRAPE_PERIOD);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Rescrape error:", err);
    process.exit(1);
  });
