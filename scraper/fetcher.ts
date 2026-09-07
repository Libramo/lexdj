// scraper/fetcher.ts
// Port of the Python scraper's scraper/fetcher.py — same retry/backoff
// shape, same headers, same pagination-follow loop. journalofficiel.dj
// serves plain UTF-8 (verified via `curl -I`), so no chardet-style
// encoding-sniffing fallback is needed here the way requests.apparent_encoding
// was used on the Python side.

import "dotenv/config";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { parsePagination } from "./parser";

// Base URL loaded from .env — e.g. https://www.journalofficiel.dj/
export const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  throw new Error("BASE_URL is not set — add it to .env (see the Python scraper's .env for the value).");
}

// Browser-like headers to avoid being blocked by the portal.
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9",
  Referer: BASE_URL,
  Connection: "keep-alive",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core fetch function used by all other fetchers.
 * Retries up to `retries` times on network errors.
 * Returns null immediately on 404 — no point retrying a missing page.
 */
export async function fetchHtml(
  url: string,
  retries = 3,
  delayMs = 2000,
): Promise<CheerioAPI | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });

      // 404 means the page genuinely doesn't exist — skip immediately.
      if (response.status === 404) {
        console.log(`  404 Not Found: ${url} — skipping`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return cheerio.load(html);
    } catch (err) {
      console.log(`[attempt ${attempt + 1}/${retries}] Error fetching ${url}: ${err}`);
      if (attempt < retries - 1) {
        await sleep(delayMs);
      }
    }
  }

  return null;
}

/**
 * Fetch a paginated listing page filtered by date range.
 * Dates should be in DD/MM/YYYY format e.g. '01/01/2020'.
 * Page 1 has no /page/N/ segment in the URL (WordPress convention).
 */
export async function fetchListingPage(
  startDate: string,
  endDate: string,
  page = 1,
): Promise<CheerioAPI | null> {
  // WordPress expects dates with dashes, not slashes.
  const start = startDate.replaceAll("/", "-");
  const end = endDate.replaceAll("/", "-");

  // WordPress pagination: page 1 has no /page/N/ segment.
  const path = page === 1 ? `${BASE_URL}/journaux-officiels/` : `${BASE_URL}/journaux-officiels/page/${page}/`;
  const url = `${path}?${new URLSearchParams({ startDate: start, endDate: end })}`;

  const retries = 3;
  const delayMs = 2000;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      return cheerio.load(html);
    } catch (err) {
      console.log(`[attempt ${attempt + 1}/${retries}] Error fetching listing page ${page}: ${err}`);
      if (attempt < retries - 1) {
        await sleep(delayMs);
      }
    }
  }

  return null;
}

/** Fetch a single journal issue page (the <ol> with h4 ministry headers and li law links). */
export function fetchIssuePage(issueUrl: string): Promise<CheerioAPI | null> {
  return fetchHtml(issueUrl);
}

/** Fetch a single law detail page. */
export function fetchLawPage(lawUrl: string): Promise<CheerioAPI | null> {
  return fetchHtml(lawUrl);
}

/**
 * Fetches all paginated listing pages for a given date range.
 * Keeps fetching until there is no next page.
 */
export async function fetchAllListingPages(startDate: string, endDate: string): Promise<CheerioAPI[]> {
  const pages: CheerioAPI[] = [];
  let page = 1;

  while (true) {
    console.log(`  Fetching listing page ${page}...`);
    const $ = await fetchListingPage(startDate, endDate, page);

    if (!$) {
      console.log(`  Failed to fetch listing page ${page} — stopping pagination`);
      break;
    }

    pages.push($);

    const pagination = parsePagination($);
    console.log(`  Page ${pagination.current} of ${pagination.total}`);

    if (!pagination.has_next) break;

    page += 1;
    await sleep(1000); // be polite to the portal
  }

  return pages;
}
