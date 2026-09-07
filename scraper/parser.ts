// scraper/parser.ts
// Port of the Python scraper's scraper/parser.py. Selectors, field
// extraction, and the table→markdown conversion are ported 1:1 against the
// same WordPress theme markup. See getText()'s comment for the one place
// this deliberately diverges from a naive `.text()` call, and
// extractReferenceNumber()'s comment for the one regex fix required by a
// real JS/Python engine difference (not a behavior change).

import { hasChildren, isText } from "domhandler";
import type { AnyNode } from "domhandler";
import type { Cheerio, CheerioAPI } from "cheerio";
import { parse as parseDate, isValid, format } from "date-fns";
import type { BrokenEntry, IssueCard, Law, LawStub, Pagination } from "./types";

const INDEPENDENCE_DATE = "1977-06-27";

/**
 * Mirrors BeautifulSoup's `.get_text(strip=True)`: walks every descendant
 * text node, trims each fragment individually, drops empties, and joins
 * with no separator. A plain `.text().trim()` only trims the ends of the
 * whole concatenation — for content with inline tags (e.g. "Article
 * 1<strong>er</strong> :") that leaves stray run-together words wherever a
 * tag boundary used to have leading/trailing whitespace. This keeps newly
 * scraped rows textually consistent with the ~54k rows already produced by
 * the Python scraper's identical algorithm.
 */
function getText(node: AnyNode | AnyNode[] | undefined): string {
  const parts: string[] = [];
  function walk(n: AnyNode) {
    if (isText(n)) {
      const t = n.data.trim();
      if (t) parts.push(t);
    } else if (hasChildren(n)) {
      for (const child of n.children) walk(child);
    }
  }
  if (Array.isArray(node)) {
    node.forEach(walk);
  } else if (node) {
    walk(node);
  }
  return parts.join("");
}

function textOf($el: Cheerio<AnyNode>): string {
  return getText($el.toArray());
}

function rstripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

// ── Listing page ────────────────────────────────────────────────────────────

export function parseListingPage($: CheerioAPI): { cards: IssueCard[]; broken: BrokenEntry[] } {
  const cards: IssueCard[] = [];
  const broken: BrokenEntry[] = [];

  $("div.card").each((_, cardEl) => {
    try {
      const $card = $(cardEl);

      const issueTypeTag = $card.find("button.label-primary").first();
      const issueType = issueTypeTag.length ? textOf(issueTypeTag) : "";

      const titleTag = $card.find("h4.card-title a").first();
      if (titleTag.length === 0) return;

      const rawTitle = textOf(titleTag);
      const url = (titleTag.attr("href") ?? "").trim();

      const dateTag = $card.find("small.text-muted.cat").first();
      const date = dateTag.length ? textOf(dateTag).replaceAll("\n", "").trim() : "";

      const issueNumber = rawTitle.replace("JORD", "").trim();

      if (!url || rstripSlash(url).endsWith("/journal-officiel") || rstripSlash(url).endsWith("/texte-juridique")) {
        broken.push({ title: rawTitle, url, issue_number: issueNumber, reason: "broken_url_in_listing" });
        return;
      }

      cards.push({
        issue_number: issueNumber,
        issue_type: issueType,
        date,
        url,
        publication_date: "",
      });
    } catch (err) {
      console.log(`Error parsing card: ${err}`);
    }
  });

  return { cards, broken };
}

// ── Issue page ──────────────────────────────────────────────────────────────

export function parseIssuePage(
  $: CheerioAPI,
  issue: IssueCard,
): { stubs: LawStub[]; broken: BrokenEntry[] } {
  const stubs: LawStub[] = [];
  const broken: BrokenEntry[] = [];
  let currentMinistry = "Unknown";

  const timeTag = $("li[itemprop='datePublished'] time").first();
  issue.publication_date = timeTag.length ? textOf(timeTag) : "";

  const ol = $("ol").first();
  if (ol.length === 0) {
    console.log(`No <ol> found for issue ${issue.issue_number}`);
    return { stubs, broken };
  }

  ol.children().each((_, el) => {
    if (el.type !== "tag") return;

    if (el.tagName === "h4") {
      currentMinistry = textOf($(el));
    } else if (el.tagName === "li") {
      const $li = $(el);
      const aTag = $li.find("a").first();
      if (aTag.length === 0) return;

      const title = textOf(aTag);
      const url = (aTag.attr("href") ?? "").trim();

      // Uses endsWith() rather than an exact match against `${BASE_URL}/...` —
      // BASE_URL has a trailing slash, and an exact-match comparison there
      // produced a double-slash path that never matched any real URL. Same
      // fix already applied on the Python side (see its own comment).
      if (!url || rstripSlash(url).endsWith("/texte-juridique") || rstripSlash(url).endsWith("/journal-officiel")) {
        broken.push({
          title,
          ministry: currentMinistry,
          url,
          issue_number: issue.issue_number,
          reason: "broken_url_in_issue",
        });
        return;
      }

      stubs.push({ title, url, ministry: currentMinistry });
    }
  });

  return { stubs, broken };
}

// ── Law page ──────────────────────────────────────────────────────────────

export function parseLawPage($: CheerioAPI, stub: LawStub, issue: IssueCard): Law | null {
  try {
    const titleTag = $("h3.custom-ejo-title").first();
    const title = titleTag.length ? textOf(titleTag) : stub.title;

    const docType = title ? title.split(/\s+/)[0] : "";
    const referenceNumber = extractReferenceNumber(title);

    const signatureTag = $("div.signature-txt").first();
    const signedBy = signatureTag.length ? textOf(signatureTag) : "";

    let mesure = "";
    for (const span of $("span.elementor-post-info__item").toArray()) {
      const text = textOf($(span));
      if (text.includes("Mesure:")) {
        mesure = text.replace("Mesure:", "").trim();
        break;
      }
    }

    const timeTag = $("li[itemprop='datePublished'] time").first();
    const publicationDate = timeTag.length ? textOf(timeTag) : "";

    let period = "";
    if (publicationDate) {
      const iso = ddmmyyyyToIso(publicationDate.trim());
      if (iso) {
        if (iso < INDEPENDENCE_DATE) period = "colonial";
        else if (iso === INDEPENDENCE_DATE) period = "independence";
        else period = "modern";
      }
    }

    const introTag = $("div.intro-txt h4").first();
    const introText = introTag.length ? textOf(introTag) : "";

    const verbeTag = $("div.verbe-txt h4").first();
    const verbe = verbeTag.length ? textOf(verbeTag) : "";

    const visasTag = $("div.visas-txt").first();
    let visasText = "";
    if (visasTag.length) {
      const rawTexts = visasTag
        .find("p")
        .toArray()
        .map((p) => textOf($(p)));
      visasText = rawTexts
        .filter((t) => t.replaceAll(" ", "") !== "")
        .map((t) => t.replaceAll(" ", " ").trim())
        .join(" ");
    }

    const contentTag = $("div.content-txt").first();
    let fullText = "";
    if (contentTag.length) {
      // Convert each <table> to a markdown-ish text block in place, same as
      // the Python side — the whole point is a flattened, searchable text
      // representation, not preserved HTML.
      for (const table of contentTag.find("table").toArray()) {
        const $table = $(table);
        const rows: string[] = [];
        const trs = $table.find("tr").toArray();
        trs.forEach((tr, i) => {
          const cells = $(tr)
            .find("td, th")
            .toArray()
            .map((td) => textOf($(td)).replaceAll(" ", " "));
          rows.push(`| ${cells.join(" | ")} |`);
          if (i === 0) {
            rows.push(`| ${cells.map(() => "---").join(" | ")} |`);
          }
        });
        const markdown = `\n${rows.join("\n")}\n`;
        $table.replaceWith(`<p>${markdown}</p>`);
      }

      const rawParas = contentTag
        .find("p")
        .toArray()
        .map((p) => textOf($(p)));
      fullText = rawParas
        .filter((t) => t.replaceAll(" ", "") !== "")
        .map((t) => t.replaceAll(" ", " ").trim())
        .join("\n");
    }

    const pdfLinks: string[] = [];
    const annexesDiv = $("div.fichier-annexes").first();
    if (annexesDiv.length) {
      annexesDiv.find("a").each((_, a) => {
        const href = ($(a).attr("href") ?? "").trim();
        if (href.endsWith(".pdf")) pdfLinks.push(href);
      });
    }

    return {
      title,
      doc_type: docType,
      reference_number: referenceNumber,
      url: stub.url,
      ministry: stub.ministry,
      publication_date: publicationDate,
      mesure,
      verbe,
      period,
      intro_text: introText,
      visas_text: visasText,
      full_text: fullText,
      signed_by: signedBy,
      pdf_links: pdfLinks,
      issue_number: issue.issue_number,
      issue_date: issue.date,
    };
  } catch (err) {
    console.log(`Error parsing law page ${stub.url}: ${err}`);
    return null;
  }
}

// ── Pagination ──────────────────────────────────────────────────────────────

export function parsePagination($: CheerioAPI): Pagination {
  const pagination = $("div.pagination ul.page-numbers").first();
  if (pagination.length === 0) {
    return { current: 1, total: 1, has_next: false };
  }

  const pageNumbers = pagination
    .find("li span.page-numbers, li a.page-numbers")
    .toArray()
    .map((li) => textOf($(li)))
    .filter((t) => /^\d+$/.test(t));

  const total = pageNumbers.length > 0 ? Math.max(...pageNumbers.map((p) => parseInt(p, 10))) : 1;

  const currentTag = pagination.find("span.page-numbers.current").first();
  const current = currentTag.length ? parseInt(textOf(currentTag), 10) : 1;

  const hasNext = pagination.find("a.next.page-numbers").length > 0;

  return { current, total, has_next: hasNext };
}

// ── Reference number ─────────────────────────────────────────────────────────

/**
 * Same regex as the Python parser, with one deliberate change: the final
 * alternative's trailing `\b` is replaced with a negative lookahead against
 * another letter. Python 3's `\b` is Unicode-aware (accented letters count
 * as word characters), but JS's `\b` is always ASCII-only — so `\b` right
 * after an accented-letter class would silently fail to match at the very
 * common "word ends in é/è/à/etc. followed by a space" boundary, which is
 * not a corner case in French legal text. The `du`/`au` alternatives are
 * pure ASCII and keep `\b` unchanged since both engines agree there.
 */
const REFERENCE_NUMBER_RE =
  /n[°º\s]+([\d][\d\-/\w èéêëàâùûîï°ème]*?)(?=\s+du\b|\s+au\b|\s+[a-zàâéèêëîïôùûüç]{3,}(?![a-zàâéèêëîïôùûüç]))/i;

export function extractReferenceNumber(title: string): string {
  const match = REFERENCE_NUMBER_RE.exec(title);
  return match ? match[0].trim() : "";
}

/**
 * "DD/MM/YYYY" → "YYYY-MM-DD", or null if unparseable/invalid — mirrors
 * Python's `datetime.strptime(s, "%d/%m/%Y")` inside a try/except, including
 * rejecting out-of-range days like "31/02/2026" or "29/02/2023" rather than
 * silently rolling them over.
 */
function ddmmyyyyToIso(dateStr: string): string | null {
  const parsed = parseDate(dateStr.trim(), "dd/MM/yyyy", new Date());
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null;
}

export { ddmmyyyyToIso };
