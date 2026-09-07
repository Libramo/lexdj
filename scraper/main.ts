// scraper/main.ts
// Port of main.py — same orchestration: listing pages → issues → laws,
// checkpointed and resumable, same politeness sleeps between requests.
//
// Run with:
//   npx tsx scraper/main.ts

import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { db } from "../drizzle/src";
import { loadCheckpoint, saveCheckpoint, isScraped } from "./checkpoint";
import { initDb, insertLaw, insertIssue, logBroken } from "./writer";
import { fetchAllListingPages, fetchIssuePage, fetchLawPage } from "./fetcher";
import { parseListingPage, parseIssuePage, parseLawPage, ddmmyyyyToIso } from "./parser";
import { createMultiBar, ProgressBar } from "./progress";
import type { IssueCard } from "./types";

fs.mkdirSync("scraper/data", { recursive: true });

// Left permanently false/false — this is the config a periodic/cron run
// should always run under. FULL_SCRAPE and TEST_MODE are for one-off
// manual runs only (initial historical scrape, local smoke tests) — flip
// them back to false before returning to normal catch-up use, don't leave
// them changed the way START_DATE/END_DATE used to be left stale for
// months (see progress-tracker.md's JO catch-up note).
const FULL_SCRAPE = false;
const TEST_MODE = false;
const TEST_MAX_ISSUES = 3;
const TEST_MAX_LAWS = 5;

// Days of overlap before the newest scraped law's date, re-fetched on every
// run as a safety margin (e.g. a law whose issue was only partially scraped
// last time). Checkpoint's isScraped() + insertLaw's own conflict handling
// make re-scraping already-known laws a cheap no-op, so this costs almost
// nothing and protects against missed boundary-day laws.
const OVERLAP_BUFFER_DAYS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Computes the DATE RANGE window for a catch-up run directly from the data:
 * from a few days before the newest scraped law's publication_date, through
 * today. Replaces hand-edited START_DATE/END_DATE constants — those are
 * exactly what let the archive drift ~3 months out of sync unnoticed before
 * anyone thought to check (see progress-tracker.md). Falls back to a wider
 * 30-day window if the table is empty (shouldn't happen against production).
 */
async function computeDateRange(): Promise<{ start: string; end: string }> {
  const result = await db.execute(sql`SELECT MAX(publication_date) AS max_date FROM laws`);
  const maxDate = (result.rows[0] as { max_date: Date | string | null }).max_date;
  const start = maxDate ? subDays(new Date(maxDate), OVERLAP_BUFFER_DAYS) : subDays(new Date(), 30);
  return { start: format(start, "dd/MM/yyyy"), end: format(new Date(), "dd/MM/yyyy") };
}

async function run(): Promise<void> {
  const checkpoint = loadCheckpoint();
  const scrapedUrls = checkpoint.scraped_urls;
  const scrapedIssues = checkpoint.scraped_issues;
  console.log(`Checkpoint: ${scrapedUrls.length} laws | ${scrapedIssues.length} issues already scraped`);

  await initDb();

  console.log("\nFetching listing pages...");
  let allPages;
  if (FULL_SCRAPE) {
    console.log("Mode: FULL SCRAPE (no date filter)");
    allPages = await fetchAllListingPages("", "");
  } else {
    const { start, end } = await computeDateRange();
    console.log(`Mode: DATE RANGE (auto, from newest scraped law - ${OVERLAP_BUFFER_DAYS}d) (${start} → ${end})`);
    allPages = await fetchAllListingPages(start, end);
  }

  const allIssues: IssueCard[] = [];
  for (const $page of allPages) {
    const { cards, broken } = parseListingPage($page);
    allIssues.push(...cards);
    for (const b of broken) {
      await logBroken({ url: b.url, level: "listing", title: b.title, issueNumber: b.issue_number });
    }
  }

  console.log(`Total issues found: ${allIssues.length}`);

  const issuesToScrape = TEST_MODE ? allIssues.slice(0, TEST_MAX_ISSUES) : allIssues;
  if (TEST_MODE) {
    console.log(`Test mode: limiting to ${TEST_MAX_ISSUES} issues x ${TEST_MAX_LAWS} laws\n`);
  }

  const multibar = createMultiBar();
  const issuesBar = new ProgressBar(multibar, "Issues", issuesToScrape.length);
  let totalScraped = scrapedUrls.length;

  for (const issue of issuesToScrape) {
    if (isScraped(issue.url, scrapedIssues)) {
      issuesBar.tick(`Laws scraped: ${totalScraped}`);
      continue;
    }

    const issueSoup = await fetchIssuePage(issue.url);
    if (!issueSoup) {
      await logBroken({ url: issue.url, level: "issue", title: issue.issue_number, issueNumber: issue.issue_number });
      issuesBar.tick(`Laws scraped: ${totalScraped}`);
      continue;
    }

    const { stubs, broken: brokenLaws } = parseIssuePage(issueSoup, issue);
    for (const b of brokenLaws) {
      await logBroken({
        url: b.url,
        level: "law_listing",
        title: b.title,
        issueNumber: b.issue_number,
        ministry: b.ministry,
      });
    }

    // check date anomaly
    const issueDateIso = ddmmyyyyToIso(issue.date);
    const pubDateIso = ddmmyyyyToIso(issue.publication_date);
    if (issueDateIso && pubDateIso && pubDateIso < issueDateIso) {
      await logBroken({
        url: issue.url,
        level: "date_anomaly",
        status: "date_anomaly",
        title: issue.issue_number,
        issueNumber: issue.issue_number,
      });
    }

    const stubsToScrape = TEST_MODE ? stubs.slice(0, TEST_MAX_LAWS) : stubs;
    const lawsBar = new ProgressBar(multibar, "  Laws", stubsToScrape.length);

    for (const stub of stubsToScrape) {
      if (isScraped(stub.url, scrapedUrls)) {
        lawsBar.tick();
        continue;
      }

      const lawSoup = await fetchLawPage(stub.url);
      if (!lawSoup) {
        await logBroken({ url: stub.url, level: "law", title: stub.title, issueNumber: issue.issue_number, ministry: stub.ministry });
        lawsBar.tick();
        continue;
      }

      const law = parseLawPage(lawSoup, stub, issue);
      if (law) {
        await insertLaw(law);
        scrapedUrls.push(stub.url);
        saveCheckpoint(scrapedUrls, scrapedIssues);
        totalScraped += 1;
      }

      lawsBar.tick();
      await sleep(1000);
    }

    // `leave=False` equivalent — the per-issue laws bar disappears once its
    // issue is done, only the outer Issues bar's line persists.
    lawsBar.remove();

    await insertIssue(issue);
    scrapedIssues.push(issue.url);
    saveCheckpoint(scrapedUrls, scrapedIssues);

    issuesBar.tick(`Laws scraped: ${totalScraped}`);
    await sleep(2000);
  }

  multibar.stop();
  console.log(`\nDone. Total scraped: ${totalScraped}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Scraper error:", err);
    process.exit(1);
  });
