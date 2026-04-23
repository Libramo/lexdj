"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

interface FilterOption {
  value: string;
  count: number;
}

interface Props {
  docTypes: FilterOption[];
  ministries: FilterOption[];
  currentQ: string;
  currentType: string;
  currentMinistry: string;
  currentEra: string;
  currentSort: string;
}

const ERAS = [
  { value: "colonial", label: "Période coloniale", sub: "avant 1977" },
  { value: "independence", label: "Post-indépendance", sub: "1977–1990" },
  { value: "modern", label: "Période moderne", sub: "après 1990" },
];

const DOC_TYPE_PREVIEW = 6;

function DocTypeFilter({
  docTypes,
  currentType,
  onSelect,
}: {
  docTypes: FilterOption[];
  currentType: string;
  onSelect: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? docTypes : docTypes.slice(0, DOC_TYPE_PREVIEW);
  const hidden = docTypes.length - DOC_TYPE_PREVIEW;

  return (
    <div>
      <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-3">
        Type de texte
      </p>
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onSelect("")}
          className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
            !currentType
              ? "bg-[#1A3A5C] text-white font-medium"
              : "text-[#444] hover:bg-black/[0.04]"
          }`}
        >
          Tous
        </button>
        {visible.map((t) => (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between gap-2 ${
              currentType === t.value
                ? "bg-[#1A3A5C] text-white font-medium"
                : "text-[#444] hover:bg-black/[0.04]"
            }`}
          >
            <span className="truncate">{t.value}</span>
            <span
              className={`text-[11px] shrink-0 ${currentType === t.value ? "text-white/60" : "text-[#CCC]"}`}
            >
              {t.count.toLocaleString("fr-FR")}
            </span>
          </button>
        ))}
        {docTypes.length > DOC_TYPE_PREVIEW && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left text-xs text-[#1A3A5C] px-3 py-1 hover:underline"
          >
            {expanded ? "Voir moins ↑" : `+${hidden} autres`}
          </button>
        )}
      </div>
    </div>
  );
}

export function SearchFilters({
  docTypes,
  ministries,
  currentQ,
  currentType,
  currentMinistry,
  currentEra,
  currentSort,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(
    !!(currentType || currentMinistry || currentEra),
  );
  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = !!(currentType || currentMinistry || currentEra);

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="mb-5">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? "border-[#1A3A5C]/30 text-[#1A3A5C] bg-[#EEF3F8]"
            : "border-black/[0.08] text-[#666] bg-white hover:bg-black/[0.02]"
        }`}
      >
        <SlidersHorizontal size={13} />
        Filtres avancés
        {hasActiveFilters && (
          <span className="w-4 h-4 rounded-full bg-[#1A3A5C] text-white text-[9px] font-bold flex items-center justify-center">
            {[currentType, currentMinistry, currentEra].filter(Boolean).length}
          </span>
        )}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 bg-white border border-black/[0.07] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Era filter */}
          <div>
            <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-3">
              Période historique
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => push({ era: "" })}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  !currentEra
                    ? "bg-[#1A3A5C] text-white"
                    : "text-[#444] hover:bg-black/[0.04]"
                }`}
              >
                Toutes les périodes
              </button>
              {ERAS.map((era) => (
                <button
                  key={era.value}
                  onClick={() => push({ era: era.value })}
                  className={`text-left px-3 py-2 rounded-lg transition-colors ${
                    currentEra === era.value
                      ? "bg-[#1A3A5C] text-white"
                      : "text-[#444] hover:bg-black/[0.04]"
                  }`}
                >
                  <span className="text-sm block">{era.label}</span>
                  <span
                    className={`text-[11px] ${currentEra === era.value ? "text-white/60" : "text-[#AAA]"}`}
                  >
                    {era.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Doc type */}
          <DocTypeFilter
            docTypes={docTypes}
            currentType={currentType}
            onSelect={(t) => push({ type: t })}
          />

          {/* Ministry */}
          <div>
            <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-3">
              Ministère
            </p>
            <select
              value={currentMinistry}
              onChange={(e) => push({ ministry: e.target.value })}
              className="w-full text-sm border border-black/[0.1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1A3A5C]/40 mb-3"
            >
              <option value="">Tous les ministères</option>
              {ministries.map((m) => (
                <option key={m.value} value={m.value}>
                  {toTitleCase(m.value)} ({m.count.toLocaleString("fr-FR")})
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => push({ type: "", ministry: "", era: "" })}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:underline mt-2"
              >
                <X size={11} /> Effacer tous les filtres
              </button>
            )}

            {isPending && (
              <p className="text-xs text-[#AAA] animate-pulse mt-2">
                Chargement...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
