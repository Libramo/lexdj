"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { Search, X } from "lucide-react";

const TYPE_PREVIEW = 5;

function TypeFilter({
  docTypes,
  currentType,
  onSelect,
}: {
  docTypes: string[];
  currentType: string;
  onSelect: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? docTypes : docTypes.slice(0, TYPE_PREVIEW);
  const hiddenCount = docTypes.length - TYPE_PREVIEW;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onSelect("")}
        className={`text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
          !currentType
            ? "bg-[#1A3A5C] text-white font-medium"
            : "text-[#444] hover:bg-black/4"
        }`}
      >
        Tous
      </button>
      {visible.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className={`text-left text-sm px-3 py-1.5 rounded-md transition-colors truncate ${
            currentType === t
              ? "bg-[#1A3A5C] text-white font-medium"
              : "text-[#444] hover:bg-black/[0.04]"
          }`}
        >
          {t}
        </button>
      ))}
      {docTypes.length > TYPE_PREVIEW && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-left text-xs text-[#1A3A5C] px-3 py-1 hover:underline"
        >
          {expanded ? "Voir moins ↑" : `+${hiddenCount} autres`}
        </button>
      )}
    </div>
  );
}

interface Props {
  docTypes: string[];
  ministries: string[];
  currentQ: string;
  currentType: string;
  currentMinistry: string;
  mobile?: boolean;
}

export function TextesFilters({
  docTypes,
  ministries,
  currentQ,
  currentType,
  currentMinistry,
  mobile = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(currentQ);

  const hasFilters = !!(currentQ || currentType || currentMinistry);

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  if (mobile) {
    return (
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && push({ q })}
            placeholder="Titre..."
            className="pl-8 pr-3 py-1.5 text-sm border border-black/[0.1] rounded-lg bg-white focus:outline-none focus:border-[#1A3A5C]/40 w-48"
          />
        </div>
        <select
          value={currentType}
          onChange={(e) => push({ type: e.target.value })}
          className="text-sm border border-black/[0.1] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#1A3A5C]/40"
        >
          <option value="">Tous types</option>
          {docTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setQ("");
              push({ q: "", type: "", ministry: "" });
            }}
            className="flex items-center gap-1 text-xs text-red-500 hover:underline"
          >
            <X size={11} /> Effacer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="text-[11px] font-medium text-[#888] uppercase tracking-wider block mb-2">
          Recherche
        </label>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAA]"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && push({ q })}
            placeholder="Titre du texte..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-black/[0.1] rounded-lg bg-white focus:outline-none focus:border-[#1A3A5C]/40 transition-colors"
          />
          {q && q !== currentQ && (
            <button
              onClick={() => push({ q })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#1A3A5C] font-medium"
            >
              OK
            </button>
          )}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="text-[11px] font-medium text-[#888] uppercase tracking-wider block mb-2">
          Type
        </label>
        <TypeFilter
          docTypes={docTypes}
          currentType={currentType}
          onSelect={(t) => push({ type: t })}
        />
      </div>

      {/* Ministry */}
      <div>
        <label className="text-[11px] font-medium text-[#888] uppercase tracking-wider block mb-2">
          Ministère
        </label>
        <select
          value={currentMinistry}
          onChange={(e) => push({ ministry: e.target.value })}
          className="w-full text-sm border border-black/[0.1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1A3A5C]/40"
        >
          <option value="">Tous</option>
          {ministries.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            push({ q: "", type: "", ministry: "" });
          }}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:underline w-full"
        >
          <X size={11} />
          Effacer tous les filtres
        </button>
      )}

      {isPending && (
        <p className="text-xs text-[#AAA] animate-pulse">Chargement...</p>
      )}
    </div>
  );
}
