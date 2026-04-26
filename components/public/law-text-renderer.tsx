import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | "article"
  | "roman_section"
  | "numbered_item"
  | "bullet"
  | "clause"
  | "preamble_header"
  | "signature"
  | "paragraph";

interface Block {
  type: BlockType;
  label?: string;
  content: string;
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────
// Single-pass: insert \n markers before known structural tokens

function tokenize(text: string): string[] {
  return (
    text
      // PREAMBULE header
      .replace(/^(PREAMBULE)\s+/i, "PREAMBULE\n")

      // CHAPITRE marker
      .replace(/(?=\bCHAPITRE\s+[IVX\d]+)/gi, "\n")

      // Roman section after ": " or ". " — e.g. "suit : I. Des questions" or ". II. Mise"
      .replace(
        /(?<=[:.]\s{0,3})(?=[IVX]{1,4}\.\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-záàâéèêëîïôùûü])/g,
        "\n",
      )
      // Article markers — handles "Article 1er :", "Art. 1er. —", "Art. 2. —"
      .replace(
        /(?=\bArt(?:icles?)?\s*\.?\s*(?:[1lI]er|\d+\w*|[IVX]+)\s*[.:—\-])/gi,
        "\n",
      )

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
  );
}

// ─── Classify each token ──────────────────────────────────────────────────────

function classify(token: string): Block[] {
  const t = token.trim();

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

function parseBulletsFromText(text: string): Block[] {
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

function parseText(text: string): Block[] {
  if (!text?.trim()) return [];
  return tokenize(text).flatMap(classify);
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function ArticleBlock({ block }: { block: Block }) {
  return (
    <div className="pt-6 first:pt-0 pb-6 border-b border-black/5 last:border-0">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-semibold text-[#4A7FA8] bg-[#EEF3F8] border border-[#1A3A5C]/10 rounded-full px-2.5 py-0.5 tracking-wider uppercase shrink-0">
          {block.label}
        </span>
        <div className="flex-1 h-px bg-black/5" />
      </div>
      {block.content && (
        <p className="text-sm leading-[1.85] text-[#333] font-light">
          {block.content}
        </p>
      )}
    </div>
  );
}

function RomanSectionBlock({ block }: { block: Block }) {
  return (
    <div className="flex items-baseline gap-3 pt-8 pb-1 first:pt-0">
      <span className="text-xs font-bold text-white bg-[#1A3A5C] rounded px-2 py-0.5 shrink-0">
        {block.label}
      </span>
      <h3 className="text-sm font-semibold text-[#111] uppercase tracking-wide leading-snug">
        {block.content}
      </h3>
    </div>
  );
}

function NumberedItemBlock({ block }: { block: Block }) {
  return (
    <div className="flex gap-3 py-1.5 pl-2">
      <span className="shrink-0 w-5 h-5 rounded-full bg-[#EEF3F8] flex items-center justify-center text-[10px] font-bold text-[#1A3A5C] mt-0.5">
        {block.label?.replace(".", "")}
      </span>
      <p className="text-sm leading-relaxed text-[#333] font-light flex-1">
        {block.content}
      </p>
    </div>
  );
}

function BulletBlock({ block }: { block: Block }) {
  return (
    <div className="flex gap-3 py-1 pl-6">
      <span className="w-1.5 h-1.5 rounded-full bg-[#4A7FA8]/50 shrink-0 mt-[7px]" />
      <p className="text-sm leading-relaxed text-[#444] font-light">
        {block.content}
      </p>
    </div>
  );
}

function ClauseBlock({ block }: { block: Block }) {
  const isVu = block.label?.toUpperCase() === "VU";
  return (
    <div className="py-2.5 border-b border-black/[0.04] last:border-0">
      <span
        className={`inline-block text-[10px] font-bold rounded px-2 py-0.5 tracking-wider uppercase mb-1.5 ${
          isVu ? "text-[#4A7FA8] bg-[#EEF3F8]" : "text-[#8B6F47] bg-[#F5EFE6]"
        }`}
      >
        {block.label}
      </span>
      <p className="text-sm leading-relaxed text-[#444] font-light">
        {block.content}
      </p>
    </div>
  );
}

function PreambleHeaderBlock({ block }: { block: Block }) {
  return (
    <div className="flex items-center gap-3 pb-5 mb-2">
      <div className="flex-1 h-px bg-[#1A3A5C]/10" />
      <span className="text-[11px] font-bold text-[#1A3A5C] tracking-[0.15em] uppercase">
        {block.content}
      </span>
      <div className="flex-1 h-px bg-[#1A3A5C]/10" />
    </div>
  );
}

function SignatureBlock({ block }: { block: Block }) {
  return (
    <div className="flex flex-col items-end gap-1 pt-6 mt-4 border-t border-black/[0.06]">
      <p className="text-xs text-[#888] italic text-right leading-relaxed whitespace-pre-line">
        {block.content}
      </p>
    </div>
  );
}

function ParagraphBlock({ block }: { block: Block }) {
  return (
    <p className="text-sm leading-[1.85] text-[#333] font-light py-1">
      {block.content}
    </p>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LawTextRenderer({ text }: { text: string }) {
  if (!text?.trim()) {
    return <p className="text-sm text-[#AAA] italic">Texte non disponible.</p>;
  }

  const blocks = parseText(text);

  return (
    <div className="space-y-0.5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "article":
            return <ArticleBlock key={i} block={block} />;
          case "roman_section":
            return <RomanSectionBlock key={i} block={block} />;
          case "numbered_item":
            return <NumberedItemBlock key={i} block={block} />;
          case "bullet":
            return <BulletBlock key={i} block={block} />;
          case "clause":
            return <ClauseBlock key={i} block={block} />;
          case "preamble_header":
            return <PreambleHeaderBlock key={i} block={block} />;
          case "signature":
            return <SignatureBlock key={i} block={block} />;
          default:
            return <ParagraphBlock key={i} block={block} />;
        }
      })}
    </div>
  );
}
