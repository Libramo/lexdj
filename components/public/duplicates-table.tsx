"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";

interface Duplicate {
  title: string;
  publication_date: string;
  issue_number: string;
  occurrences: number;
  canonical_id: number;
}

const PREVIEW_COUNT = 10;

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("fr-DJ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

export function DuplicatesTable({ duplicates }: { duplicates: Duplicate[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? duplicates : duplicates.slice(0, PREVIEW_COUNT);
  const hidden = duplicates.length - PREVIEW_COUNT;
  const totalExtra = duplicates.reduce((s, d) => s + d.occurrences - 1, 0);

  return (
    <div className="bg-white border border-black/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_80px] gap-4 px-5 py-3 bg-black/[0.02] border-b border-black/[0.06]">
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">
          Titre
        </span>
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">
          Numéro JO
        </span>
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider text-right">
          Copies
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-black/[0.05]">
        {visible.map((d, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_140px_80px] gap-4 px-5 py-3 items-center hover:bg-[#FAFAF8] transition-colors"
          >
            {/* Title */}
            <div className="min-w-0">
              <Link
                href={`/textes/${d.canonical_id}`}
                className="text-sm font-medium text-[#1A3A5C] hover:underline no-underline block truncate"
              >
                {d.title}
              </Link>
              <span className="text-xs text-[#AAA]">
                {formatDate(d.publication_date)}
              </span>
            </div>

            {/* Issue number */}
            <span className="text-xs text-[#888] truncate">
              {d.issue_number ?? "—"}
            </span>

            {/* Occurrences badge */}
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-0.5 tabular-nums">
                <Copy size={10} />×{d.occurrences}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-black/[0.06] px-5 py-3 flex items-center justify-between bg-black/[0.01]">
        <span className="text-xs text-[#AAA]">
          {expanded
            ? `${duplicates.length} groupes · ${totalExtra} entrées en trop`
            : `${PREVIEW_COUNT} sur ${duplicates.length} groupes · ${totalExtra} entrées en trop au total`}
        </span>
        {duplicates.length > PREVIEW_COUNT && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#1A3A5C] hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp size={13} /> Réduire
              </>
            ) : (
              <>
                <ChevronDown size={13} /> Voir {hidden} de plus
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
