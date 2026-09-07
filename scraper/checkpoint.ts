// scraper/checkpoint.ts
// Port of db/checkpoint.py — same JSON-file shape, so an existing Python
// checkpoint file can be copied over and resumed from directly.

import * as fs from "node:fs";
import * as path from "node:path";

const CHECKPOINT_DIR = path.resolve(process.cwd(), "scraper/data");
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, "checkpoint.json");

export interface Checkpoint {
  scraped_urls: string[];
  scraped_issues: string[];
}

export function loadCheckpoint(): Checkpoint {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
    if (!("scraped_issues" in data)) data.scraped_issues = [];
    return data;
  }
  return { scraped_urls: [], scraped_issues: [] };
}

export function saveCheckpoint(scrapedUrls: string[], scrapedIssues: string[]): void {
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ scraped_urls: scrapedUrls, scraped_issues: scrapedIssues }));
}

export function isScraped(url: string, scrapedList: string[]): boolean {
  return scrapedList.includes(url);
}
