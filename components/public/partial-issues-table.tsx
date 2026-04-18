"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Issue {
  issue_number: string;
  issue_date: string;
  available: number;
  missing: number;
  pct_complete: number;
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

function CoverageBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-1.5 bg-black/[0.06] rounded-full overflow-hidden shrink-0">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-[#888] w-8">{pct}%</span>
    </div>
  );
}

export function PartialIssuesTable({ issues }: { issues: Issue[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? issues : issues.slice(0, PREVIEW_COUNT);
  const hidden = issues.length - PREVIEW_COUNT;

  return (
    <div className="bg-white border border-black/[0.07] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_80px_180px] gap-4 px-5 py-3 bg-black/[0.02] border-b border-black/[0.06]">
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">
          Numéro
        </span>
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider text-right">
          Disponibles
        </span>
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider text-right">
          Manquants
        </span>
        <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">
          Complétude
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-black/[0.05]">
        {visible.map((issue) => (
          <div
            key={issue.issue_number}
            className="grid grid-cols-[1fr_80px_80px_180px] gap-4 px-5 py-3 items-center hover:bg-[#FAFAF8] transition-colors"
          >
            <div className="min-w-0">
              <Link
                href={`/journal/${issue.issue_number.split("/").map(encodeURIComponent).join("/")}`}
                className="text-sm font-medium text-[#1A3A5C] hover:underline no-underline block truncate"
              >
                {issue.issue_number}
              </Link>
              <span className="text-xs text-[#AAA]">
                {formatDate(issue.issue_date)}
              </span>
            </div>
            <span className="text-sm tabular-nums text-emerald-700 font-medium text-right">
              {issue.available.toLocaleString("fr-FR")}
            </span>
            <span className="text-sm tabular-nums text-red-500 font-medium text-right">
              {issue.missing.toLocaleString("fr-FR")}
            </span>
            <CoverageBar pct={issue.pct_complete} />
          </div>
        ))}
      </div>

      {/* Expand / collapse footer */}
      {issues.length > PREVIEW_COUNT && (
        <div className="border-t border-black/[0.06] px-5 py-3 flex items-center justify-between bg-black/[0.01]">
          <span className="text-xs text-[#AAA]">
            {expanded
              ? `${issues.length} numéros affichés`
              : `${PREVIEW_COUNT} sur ${issues.length} numéros`}
          </span>
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
                <ChevronDown size={13} /> Voir {hidden} numéros de plus
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
