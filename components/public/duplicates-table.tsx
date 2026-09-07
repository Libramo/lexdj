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
    <div className="bg-background border border-border rounded-sm overflow-hidden">
      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-[1fr_140px_80px] gap-4 px-5 py-3 bg-muted border-b border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Titre
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Numéro JO
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
          Copies
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {visible.map((d, i) => (
          <div
            key={i}
            className="px-5 py-3 hover:bg-muted transition-colors"
          >
            {/* Desktop row */}
            <div className="hidden md:grid grid-cols-[1fr_140px_80px] gap-4 items-center">
              <div className="min-w-0">
                <Link
                  href={`/textes/${d.canonical_id}`}
                  className="text-sm font-medium text-primary hover:underline no-underline block truncate"
                >
                  {d.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatDate(d.publication_date)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {d.issue_number ?? "—"}
              </span>
              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-sm px-2.5 py-0.5 tabular-nums">
                  <Copy size={10} />×{d.occurrences}
                </span>
              </div>
            </div>

            {/* Mobile row */}
            <div className="md:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/textes/${d.canonical_id}`}
                    className="text-sm font-medium text-primary hover:underline no-underline block truncate"
                  >
                    {d.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(d.publication_date)}
                    {d.issue_number && <> · {d.issue_number}</>}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-sm px-2.5 py-0.5 tabular-nums shrink-0">
                  <Copy size={10} />×{d.occurrences}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-muted">
        <span className="text-xs text-muted-foreground">
          {expanded
            ? `${duplicates.length} groupes · ${totalExtra} entrées en trop`
            : `${PREVIEW_COUNT} sur ${duplicates.length} groupes · ${totalExtra} entrées en trop au total`}
        </span>
        {duplicates.length > PREVIEW_COUNT && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
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
