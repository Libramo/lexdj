// One-off import: pulls the already-scraped "Code du travail" law (real JO
// full_text, already in the corpus — no new scraper needed) from a scratch
// reference database and splits it into a Codes + CodeSections tree
// (Titre > Chapitre > Article), so testing the Codes feature doesn't
// require hand-typing 297 articles through /cms. See
// context/progress-tracker.md for how ejo_reference was built (a
// laws-table-only restore of eJO_backup.dump).
//
// This is a throwaway migration script, not app code — adapt the constants
// below to import a different code from the same corpus later (e.g. Code
// des Marchés Publics, Code des Affaires Maritimes, both already found in
// the same scraped dataset).
//
// Run with: npx payload run scripts/import-code-du-travail.ts
import { getPayload } from "payload";
import pg from "pg";
import config from "../payload.config";

// Source: locally, a scratch restore of eJO_backup.dump's `laws` table —
// NOT the local ejo_test DB Payload writes to, kept separate so this
// read-only import never risks the live dev DB. In production there is no
// such separate restore: `laws` and Payload's own tables (`codes`,
// `code_sections`) already live in the same Postgres (see
// architecture.md's Storage Model), so pass CODE_IMPORT_SOURCE_DB_URL=
// "$DATABASE_URL" (the container's own connection string) when running
// this in production instead of hand-editing the fallback below.
const SOURCE_DB_URL =
  process.env.CODE_IMPORT_SOURCE_DB_URL ??
  "postgresql://postgres:liban@localhost:5432/ejo_reference";
const SOURCE_LAW_ID = 4291; // "Loi n° 133/AN/05/5ème L portant Code du Travail."
const CODE_TITLE = "Code du travail";

// Roman numerals 1..40, longest-first, so the marker regexes below never
// truncate a multi-letter numeral (e.g. "VIII") into a shorter prefix
// match — the source text runs headings directly into numerals with no
// separator ("TITRE IDISPOSITIONS..."), so precise matching is required.
function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let res = "";
  for (const [val, sym] of table) {
    while (n >= val) {
      res += sym;
      n -= val;
    }
  }
  return res;
}
const ROMAN_PATTERN = Array.from({ length: 40 }, (_, i) => toRoman(i + 1))
  .sort((a, b) => b.length - a.length)
  .join("|");

type Marker = {
  type: "titre" | "chapitre" | "section" | "article";
  label: string;
  start: number;
  end: number;
};

function findMarkers(text: string): Marker[] {
  const markers: Marker[] = [];
  const titreRe = new RegExp(
    `TITRE\\s+(${ROMAN_PATTERN})(?=[A-ZÉÈÀÂÎÔÛÇ0-9])`,
    "g",
  );
  // Almost every chapter is Roman-numbered ("CHAPITRE II"), but the very
  // first chapter in the whole document is "CHAPITRE 1er" (mirroring
  // "Article 1er") — confirmed against the actual source text, not
  // assumed.
  const chapitreRe = new RegExp(
    `CHAPITRE\\s+(1er|${ROMAN_PATTERN})(?=[A-ZÉÈÀÂÎÔÛÇ0-9])`,
    "g",
  );
  // Unlike TITRE/CHAPITRE, "Section" headings do have a colon separator in
  // the source ("Section 1 : DISPOSITIONS D'ENSEMBLE"), which also lets
  // this correctly skip inline prose references like "voir Section 3"
  // that don't have one.
  const sectionRe = /Section\s+(\d+)\s*:/g;
  const articleRe = /Article\s+(\d+)(er)?\s*:/g;

  for (const m of text.matchAll(titreRe)) {
    markers.push({
      type: "titre",
      label: m[1],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }
  for (const m of text.matchAll(chapitreRe)) {
    markers.push({
      type: "chapitre",
      label: m[1],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }
  for (const m of text.matchAll(sectionRe)) {
    markers.push({
      type: "section",
      label: m[1],
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }
  for (const m of text.matchAll(articleRe)) {
    markers.push({
      type: "article",
      label: `${m[1]}${m[2] ?? ""}`,
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }
  markers.sort((a, b) => a.start - b.start);
  return markers;
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

// The marker (roman numeral, "1er", arabic number) is only used
// transiently while parsing — without baking it into the stored title,
// nothing on the public site (TOC, node lists, page headers) has any way
// to show "Titre I" vs. just "Dispositions générales", even though the
// source document itself literally labels it "TITRE I".
function formatHeading(typeLabel: string, label: string, heading: string) {
  const numbered = `${typeLabel} ${label}`;
  return heading ? `${numbered} — ${heading}` : numbered;
}

// Detects embedded enumerated sub-items ("a) ...;b) ...;c) ...", or
// "1. ...;2. ...") within an article's body and splits them into separate
// paragraphs, each keeping its own original marker. Deliberately NOT
// converted into a native Lexical ordered list: Djiboutian legal citation
// refers to "l'alinéa a)" by its actual letter, and a real <ol> would
// renumber every item as 1, 2, 3 — losing the label the citation depends
// on. Requires the marker to immediately follow ";", ":", or the start of
// the text (matching how these items are actually punctuated in the
// source) and at least 2 hits before treating it as a real list, to avoid
// splitting on a stray one-off match elsewhere in normal prose.
type Paragraph = { text: string; indent: number };

function splitIntoParagraphs(body: string): Paragraph[] {
  const markerRe = /(?<=^|;|:)\s*([a-z]|\d{1,2})[.)](?=\s)/g;
  const matches = [...body.matchAll(markerRe)];
  if (matches.length < 2) return [{ text: body, indent: 0 }];

  const paragraphs: Paragraph[] = [];
  const intro = body.slice(0, matches[0].index!).trim();
  if (intro) paragraphs.push({ text: intro, indent: 0 });

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = matches[i + 1]?.index ?? body.length;
    const item = body.slice(start, end).trim();
    // indent: 1 marks these as sub-items — components/public/code-content.tsx's
    // custom paragraph converter turns this into a visual indent; the
    // default converter otherwise ignores Lexical's `indent` field
    // entirely.
    if (item) paragraphs.push({ text: item, indent: 1 });
  }
  return paragraphs;
}

// Matches Payload's own default empty-richText fixture shape
// (@payloadcms/richtext-lexical/dist/populateGraphQL/defaultValue.js),
// with one paragraph per entry in `paragraphs` instead of one empty
// string.
function toLexical(body: string) {
  const paragraphs = splitIntoParagraphs(body);
  return {
    root: {
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      children: paragraphs.map(({ text, indent }) => ({
        type: "paragraph",
        direction: "ltr",
        format: "",
        indent,
        version: 1,
        textFormat: 0,
        textStyle: "",
        children: [
          {
            type: "text",
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            version: 1,
          },
        ],
      })),
    },
  };
}

async function main() {
  const source = new pg.Client({ connectionString: SOURCE_DB_URL });
  await source.connect();
  const { rows } = await source.query<{ full_text: string }>(
    "SELECT full_text FROM laws WHERE id = $1",
    [SOURCE_LAW_ID],
  );
  await source.end();
  const fullText = rows[0]?.full_text;
  if (!fullText) {
    throw new Error(`Law ${SOURCE_LAW_ID} not found or has no full_text`);
  }

  const markers = findMarkers(fullText);
  console.log(
    `Found ${markers.length} markers (${
      markers.filter((m) => m.type === "titre").length
    } titres, ${
      markers.filter((m) => m.type === "chapitre").length
    } chapitres, ${
      markers.filter((m) => m.type === "section").length
    } sections, ${
      markers.filter((m) => m.type === "article").length
    } articles)`,
  );

  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: "codes",
    where: { title: { equals: CODE_TITLE } },
    limit: 1,
  });

  let codeId: number | string;
  if (existing.docs[0]) {
    codeId = existing.docs[0].id;
    const toDelete = await payload.find({
      collection: "code-sections",
      where: { code: { equals: codeId } },
      limit: 1000,
    });
    console.log(
      `Clearing ${toDelete.docs.length} existing code-sections under "${CODE_TITLE}"...`,
    );
    for (const doc of toDelete.docs) {
      await payload.delete({ collection: "code-sections", id: doc.id });
    }
  } else {
    const created = await payload.create({
      collection: "codes",
      data: { title: CODE_TITLE },
    });
    codeId = created.id;
    console.log(`Created Code "${CODE_TITLE}" (id ${codeId})`);
  }

  let titreOrder = 0;
  let currentTitreId: number | string | null = null;
  let chapitreOrder = 0;
  let currentChapitreId: number | string | null = null;
  let sectionOrder = 0;
  let currentSectionId: number | string | null = null;
  let siblingOrder = 0;

  let titreCount = 0;
  let chapitreCount = 0;
  let sectionCount = 0;
  let articleCount = 0;

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const bodyEnd = markers[i + 1]?.start ?? fullText.length;
    const body = cleanText(fullText.slice(marker.end, bodyEnd));

    if (marker.type === "titre") {
      const doc = await payload.create({
        collection: "code-sections",
        data: {
          code: codeId,
          type: "titre",
          title: formatHeading("Titre", marker.label, body),
          order: titreOrder++,
        } as never,
      });
      currentTitreId = doc.id;
      currentChapitreId = null;
      currentSectionId = null;
      chapitreOrder = 0;
      siblingOrder = 0;
      titreCount++;
    } else if (marker.type === "chapitre") {
      const doc = await payload.create({
        collection: "code-sections",
        data: {
          code: codeId,
          parent: currentTitreId,
          type: "chapitre",
          title: formatHeading("Chapitre", marker.label, body),
          order: chapitreOrder++,
        } as never,
      });
      currentChapitreId = doc.id;
      currentSectionId = null;
      sectionOrder = 0;
      siblingOrder = 0;
      chapitreCount++;
    } else if (marker.type === "section") {
      const doc = await payload.create({
        collection: "code-sections",
        data: {
          code: codeId,
          parent: currentChapitreId ?? currentTitreId,
          type: "section",
          title: formatHeading("Section", marker.label, body),
          order: sectionOrder++,
        } as never,
      });
      currentSectionId = doc.id;
      siblingOrder = 0;
      sectionCount++;
    } else {
      const parentId = currentSectionId ?? currentChapitreId ?? currentTitreId;
      await payload.create({
        collection: "code-sections",
        data: {
          code: codeId,
          parent: parentId,
          type: "article",
          title: `Article ${marker.label}`,
          articleNumber: marker.label,
          content: toLexical(body),
          order: siblingOrder++,
        } as never,
      });
      articleCount++;
    }

    const total = titreCount + chapitreCount + sectionCount + articleCount;
    if (total % 25 === 0) {
      console.log(
        `  ...${titreCount} titres, ${chapitreCount} chapitres, ${sectionCount} sections, ${articleCount} articles so far`,
      );
    }
  }

  console.log(
    `Done: ${titreCount} titres, ${chapitreCount} chapitres, ${sectionCount} sections, ${articleCount} articles created under "${CODE_TITLE}".`,
  );
  process.exit(0);
}

// payload's `run` command does `await import(scriptPath)` and then
// unconditionally calls `process.exit(0)` the instant that resolves — a
// fire-and-forget `main().catch(...)` here would let the dynamic import
// resolve before any of main()'s awaited work actually runs, so this must
// be a real top-level await for `payload run` to wait for it.
await main();
