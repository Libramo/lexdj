"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const PREVIEW_COUNT = 4;

function parseVisas(raw: string): string[] {
  return raw
    .split(/(?=\bVU\s)/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function VisasRenderer({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const parts = parseVisas(text);
  const hasPreamble = !text.trimStart().startsWith("VU");
  const preamble = hasPreamble ? parts[0] : null;
  const allItems = hasPreamble ? parts.slice(1) : parts;

  const isLong = allItems.length > PREVIEW_COUNT;
  const items =
    expanded || !isLong ? allItems : allItems.slice(0, PREVIEW_COUNT);
  const hiddenCount = allItems.length - PREVIEW_COUNT;

  return (
    <div className="space-y-3">
      {preamble && (
        <p className="text-xs font-semibold text-[#1A3A5C] uppercase tracking-wider pb-3 border-b border-black/[0.06]">
          {preamble}
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((visa, i) => {
          const body = visa.startsWith("VU") ? visa.slice(3).trim() : visa;
          return (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="shrink-0 text-[11px] font-semibold text-[#4A7FA8] bg-[#EEF3F8] rounded px-1.5 py-0.5 h-fit mt-0.5 tracking-wider">
                VU
              </span>
              <span className="text-[#444] font-light">{body}</span>
            </li>
          );
        })}
      </ul>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-[#1A3A5C] font-medium hover:underline mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp size={13} /> Réduire
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Voir {hiddenCount} visa
              {hiddenCount > 1 ? "s" : ""} de plus
            </>
          )}
        </button>
      )}
    </div>
  );
}
