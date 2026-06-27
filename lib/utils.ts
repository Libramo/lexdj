import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert ALL CAPS ministry names to Title Case
// Handles French prepositions (de, du, des, la, le, les, et, au, aux)
const LOWERCASE_WORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "au",
  "aux",
  "en",
  "à",
  "l",
  "d",
  "un",
  "une",
  "sur",
  "par",
  "pour",
  "ler",
  "er",
]);

export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      const clean = word.replace(/['']/g, "'");
      if (i === 0) return clean.charAt(0).toUpperCase() + clean.slice(1);
      if (LOWERCASE_WORDS.has(clean)) return clean;
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join(" ");
}

// Splits "Le Président de la République,Chef du GouvernementISMAÏL OMAR GUELLEH"
// into title lines and name
export function parseSignedBy(raw: string): { titles: string[]; name: string } {
  // Name is the last all-caps word sequence (uppercase letters, spaces, hyphens, accents)
  const nameMatch = raw.match(
    /([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇŒÆ][A-ZÀÂÉÈÊËÎÏÔÙÛÜÇŒÆ\s\-\']+)$/,
  );
  if (!nameMatch) return { titles: [], name: raw };

  const name = nameMatch[1].trim();
  const titlePart = raw.slice(0, raw.lastIndexOf(name)).trim();

  // Split titles on comma or known separators
  const titles = titlePart
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { titles, name };
}

export function parseVisas(raw: string): string[] {
  return (
    raw
      // French semicolon + clause keywords
      .replace(
        /\s*;\s*(?=(Vu\b|VU\b|Sur\b|SUR\b|Considérant|Rappelant|Soulignant|A\s+adopt|Le\s+Conseil))/gi,
        "\n",
      )
      // Inline VU after period or end of sentence
      .replace(/\.\s+(?=(VU\b|Vu\b))/g, ".\n")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | "article"
  | "roman_section"
  | "numbered_item"
  | "bullet"
  | "clause"
  | "preamble_header"
  | "signature"
  | "paragraph"
  | "table";

export interface Block {
  type: BlockType;
  label?: string;
  content: string;
  headers?: string[];
  rows?: string[][];
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────
// Single-pass: insert \n markers before known structural tokens

export function tokenize(text: string): string[] {
  // extract tables first — replace them with placeholders so other regex don't touch them
  const tables: string[] = [];
  const textWithPlaceholders = text.replace(
    /((?:\|[^\n]+\|\n?)+)/g,
    (match) => {
      tables.push(match.trim());
      return `\n__TABLE_${tables.length - 1}__\n`;
    },
  );
  return (
    textWithPlaceholders
      // PREAMBULE header
      .replace(/^(PREAMBULE)\s+/i, "PREAMBULE\n")

      // CHAPITRE marker
      .replace(/(?=\bCHAPITRE\s+[IVX\d]+)/gi, "\n")
      .replace(/(?=\bDISPOSITION[S]?\s+[A-Z]{2,})/g, "\n")

      // Roman section after ": " or ". " — e.g. "suit : I. Des questions" or ". II. Mise"
      .replace(
        /(?<=[:.]\s{0,3})(?=[IVX]{1,4}\.\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-záàâéèêëîïôùûü])/g,
        "\n",
      )
      // Article markers — handles "Article 1er :", "Article 2 :"
      // uses full word "Article" to avoid matching "articles" mid-sentence
      .replace(/(?=\bArticle\s+(?:[1lI]er|\d+\w*|[IVX]+)\s*[.:—\-])/gi, "\n")

      .replace(/([A-ZÀÂÉÈÊËÎÏÔÙÛÜ]{4,})\s*(?=Article\s)/g, "$1\n")

      // Numbered items glued: ";2. Texte"
      .replace(/;\s*(?=\d+\.\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ])/g, "\n")

      // Bullets glued: ";– " or ".– " or ":– " or ", – "
      .replace(/[;.,:]\s*(?=–\s)/g, "\n")

      // Clause keywords after semicolon (handles French " ;" spacing)
      .replace(
        /\s*;\s*(?=(Conscients?|Considérant|Soucieux|Rappelant|Soulignant|Reconnaissant|Profondément|Vu\b|VU\b|Sur\b|SUR\b|Le\s+Conseil|A\s+adopt))/gi,
        "\n",
      )

      // Signature
      .replace(/\s(?=Fait\s+à\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ])/i, "\n")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      // restore table placeholders as their own tokens
      .map((token) => {
        const match = token.match(/^__TABLE_(\d+)__$/);
        return match ? tables[parseInt(match[1])] : token;
      })
  );
}

// ─── Classify each token ──────────────────────────────────────────────────────

export function classify(token: string): Block[] {
  const t = token.trim();

  // markdown table
  if (t.startsWith("|")) {
    const lines = t.split("\n").filter(Boolean);
    const dataLines = lines.filter((l) => !/^\|\s*[-:]+[\s|:-]*\|$/.test(l));
    const parseRow = (line: string) =>
      line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
    const headers = dataLines[0] ? parseRow(dataLines[0]) : [];
    const rows = dataLines.slice(1).map(parseRow);
    return [{ type: "table", content: t, headers, rows }];
  }

  // PRÉAMBULE header — standalone
  if (/^PREAMBULE$/i.test(t)) {
    return [{ type: "preamble_header", content: "PRÉAMBULE" }];
  }

  // Roman section: "I. Title" or "II. Title : body" or "III. Title body"
  // Title ends at first ":" or at a sentence boundary before body prose
  const romanMatch = t.match(/^([IVX]{1,4})\.\s+(.+)/);
  if (romanMatch) {
    const label = romanMatch[1] + ".";
    const rest = romanMatch[2].trim();

    // Title ends at: ":", numbered item, bullet, or a capitalized word followed by lowercase prose
    // Strategy: find first transition from "Title Words" to "body sentence starts here"
    const stopMatch = rest.match(
      /(?=\s*[:\s]\s*–)|(?=\s\d+\.\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ])|(?<=\w)\s+(?=[A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-záàâéèêëîïôùûü]{2,}\s+[a-záàâéèêëîïôùûü])/,
    );
    // Cap title at 10 words regardless
    const rawTitleEnd = stopMatch?.index ?? rest.length;
    const wordCap = rest.split(/\s+/).slice(0, 10).join(" ").length;
    const titleEnd = Math.min(rawTitleEnd, wordCap);
    const title = rest.slice(0, titleEnd).trim();
    const body = rest
      .slice(titleEnd)
      .replace(/^\s*:?\s*/, "")
      .trim();

    const blocks: Block[] = [{ type: "roman_section", label, content: title }];
    if (body) {
      // Body may contain bullets
      if (/–\s/.test(body)) {
        blocks.push(...parseBulletsFromText(body));
      } else {
        blocks.push({ type: "paragraph", content: body });
      }
    }
    return blocks;
  }

  // Article: "Article 1er : body"
  const articleMatch = t.match(
    /^(Art(?:icles?)?\s*\.?\s*(?:[1lI]er|\d+\w*|[IVX]+))\s*[.:—\-]+\s*(.*)/i,
  );
  if (articleMatch) {
    return [
      {
        type: "article",
        label: articleMatch[1],
        content: articleMatch[2].trim(),
      },
    ];
  }

  // Numbered item: "1. body"
  const numMatch = t.match(/^(\d+)\.\s+(.+)/);
  if (numMatch) {
    return [
      {
        type: "numbered_item",
        label: numMatch[1] + ".",
        content: numMatch[2].trim(),
      },
    ];
  }

  // Bullet: "– body"
  if (/^[–\-]\s+/.test(t)) {
    return [{ type: "bullet", content: t.replace(/^[–\-]\s+/, "").trim() }];
  }

  // Clause keyword
  const clauseMatch = t.match(
    /^(VU|Vu|SUR|Sur|Conscients?|Considérant|Soucieux|Rappelant|Soulignant|Reconnaissant|Profondément\s+\S+|Le\s+Conseil[^,]*)\s+(.*)/i,
  );

  if (clauseMatch) {
    return [
      {
        type: "clause",
        label: clauseMatch[1].trim(),
        content: clauseMatch[2].trim(),
      },
    ];
  }

  // Signature
  if (/^Fait\s+à\s+/i.test(t)) {
    return [{ type: "signature", content: t }];
  }

  // Default
  return [{ type: "paragraph", content: t }];
}

export function parseBulletsFromText(text: string): Block[] {
  return text
    .split(/(?=–\s)/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("–"))
    .map((s) => ({
      type: "bullet" as BlockType,
      content: s.replace(/^–\s*/, "").trim(),
    }));
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseText(text: string): Block[] {
  if (!text?.trim()) return [];
  return tokenize(text).flatMap(classify);
}
