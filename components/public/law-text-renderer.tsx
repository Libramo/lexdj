import { Block, parseText } from "@/lib/utils";

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
      <span className="w-1.5 h-1.5 rounded-full bg-[#4A7FA8]/50 shrink-0 mt-1.75" />
      <p className="text-sm leading-relaxed text-[#444] font-light">
        {block.content}
      </p>
    </div>
  );
}

function ClauseBlock({ block }: { block: Block }) {
  const isVu = block.label?.toUpperCase() === "VU";
  return (
    <div className="py-2.5 border-b border-black/4 last:border-0">
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
    <div className="flex flex-col items-end gap-1 pt-6 mt-4 border-t border-black/6">
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

function TableBlock({ block }: { block: Block }) {
  if (!block.headers?.length) return null;
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-black/8">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#EEF3F8]">
            {block.headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#1A3A5C] uppercase tracking-wider border-b border-black/8"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows?.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFB]"}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-2.5 text-[#333] font-light border-b border-black/4 last:border-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
          case "table":
            return <TableBlock key={i} block={block} />;
          case "signature":
            return <SignatureBlock key={i} block={block} />;
          default:
            return <ParagraphBlock key={i} block={block} />;
        }
      })}
    </div>
  );
}
