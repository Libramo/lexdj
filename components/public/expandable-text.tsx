"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  text: string;
  previewLength?: number;
}

export function ExpandableText({ text, previewLength = 300 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > previewLength;
  const display =
    expanded || !isLong ? text : text.slice(0, previewLength) + "…";

  return (
    <div>
      <p className="text-sm leading-relaxed text-[#555] font-light whitespace-pre-wrap">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-xs text-[#1A3A5C] font-medium hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp size={13} /> Réduire
            </>
          ) : (
            <>
              <ChevronDown size={13} /> Afficher tout
            </>
          )}
        </button>
      )}
    </div>
  );
}
