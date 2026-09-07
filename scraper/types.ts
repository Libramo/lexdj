// scraper/types.ts
// Mirrors the dataclasses in the Python scraper's scraper/parser.py.

export interface IssueCard {
  issue_number: string;
  issue_type: string;
  /** Reference date from the listing title, e.g. "26/02/2026" (DD/MM/YYYY). */
  date: string;
  url: string;
  /** "Date de Publication" read from inside the issue page. */
  publication_date: string;
}

export interface LawStub {
  title: string;
  url: string;
  ministry: string;
}

export interface Law {
  title: string;
  reference_number: string;
  url: string;
  ministry: string;
  publication_date: string;
  mesure: string;
  intro_text: string;
  issue_number: string;
  issue_date: string;
  full_text: string;
  signed_by: string;
  visas_text: string;
  pdf_links: string[];
  doc_type: string;
  period: string;
  verbe: string;
}

export interface BrokenEntry {
  title: string;
  url: string;
  issue_number: string;
  ministry?: string;
  reason: string;
}

export interface Pagination {
  current: number;
  total: number;
  has_next: boolean;
}
