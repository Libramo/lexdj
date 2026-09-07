"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

const TOPICS = [
  "Travail & Emploi",
  "Finances & Fiscalité",
  "Justice & Procédures",
  "Sécurité & Défense",
  "Transport & Logistique",
  "Éducation",
  "Commerce & Entreprise",
  "Protection Sociale",
  "Santé",
  "Immobilier & Foncier",
  "Famille & Statut Civil",
];

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
  currentTopic: string;
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
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Type de texte
      </p>
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onSelect("")}
          className={`text-left text-sm px-3 py-1.5 rounded-sm transition-colors ${
            !currentType
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-muted"
          }`}
        >
          Tous
        </button>
        {visible.map((t) => (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className={`text-left text-sm px-3 py-1.5 rounded-sm transition-colors flex items-center justify-between gap-2 ${
              currentType === t.value
                ? "bg-primary text-primary-foreground font-medium"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="truncate">{t.value}</span>
            <span
              className={`text-[11px] shrink-0 ${currentType === t.value ? "text-primary-foreground/60" : "text-muted-foreground"}`}
            >
              {t.count.toLocaleString("fr-FR")}
            </span>
          </button>
        ))}
        {docTypes.length > DOC_TYPE_PREVIEW && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left text-xs text-primary px-3 py-1 hover:underline"
          >
            {expanded ? "Voir moins ↑" : `+${hidden} autres`}
          </button>
        )}
      </div>
    </div>
  );
}

function TopicsFilter({
  currentTopic,
  onSelect,
}: {
  currentTopic: string;
  onSelect: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 4;
  const visible = expanded ? TOPICS : TOPICS.slice(0, PREVIEW);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Thème
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {expanded ? (
            <>
              Voir moins <ChevronUp size={11} />
            </>
          ) : (
            <>
              Voir tout <ChevronDown size={11} />
            </>
          )}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect("")}
          className={`text-xs font-medium rounded-sm px-3 py-1.5 border transition-colors ${
            !currentTopic
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
          }`}
        >
          Tous les thèmes
        </button>
        {visible.map((topic) => (
          <button
            key={topic}
            onClick={() => onSelect(topic)}
            className={`text-xs font-medium rounded-sm px-3 py-1.5 border transition-colors ${
              currentTopic === topic
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            {topic}
          </button>
        ))}
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
  currentTopic,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(
    !!(currentType || currentMinistry || currentEra || currentTopic),
  );
  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = !!(
    currentType ||
    currentMinistry ||
    currentEra ||
    currentTopic
  );

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
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-sm border transition-colors ${
          hasActiveFilters
            ? "border-primary/30 text-primary bg-primary/10"
            : "border-border text-muted-foreground bg-background hover:bg-muted"
        }`}
      >
        <SlidersHorizontal size={13} />
        Filtres avancés
        {hasActiveFilters && (
          <span className="w-4 h-4 rounded-sm bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {
              [currentType, currentMinistry, currentEra, currentTopic].filter(
                Boolean,
              ).length
            }
          </span>
        )}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 bg-background border border-border rounded-sm p-5 space-y-6">
          <TopicsFilter
            currentTopic={currentTopic}
            onSelect={(t) => push({ topic: t })}
          />

          {/* Era filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Période historique
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => push({ era: "" })}
                className={`text-left text-sm px-3 py-2 rounded-sm transition-colors ${
                  !currentEra
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                Toutes les périodes
              </button>
              {ERAS.map((era) => (
                <button
                  key={era.value}
                  onClick={() => push({ era: era.value })}
                  className={`text-left px-3 py-2 rounded-sm transition-colors ${
                    currentEra === era.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-sm block">{era.label}</span>
                  <span
                    className={`text-[11px] ${currentEra === era.value ? "text-primary-foreground/60" : "text-muted-foreground"}`}
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
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Ministère
            </p>
            <select
              value={currentMinistry}
              onChange={(e) => push({ ministry: e.target.value })}
              className="w-full text-sm border border-border rounded-sm px-3 py-2 bg-background text-foreground focus:outline-none focus:border-primary/40 mb-3"
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
                onClick={() =>
                  push({ type: "", ministry: "", era: "", topic: "" })
                }
                className="flex items-center gap-1.5 text-xs text-destructive hover:underline mt-2"
              >
                <X size={11} /> Effacer tous les filtres
              </button>
            )}

            {isPending && (
              <p className="text-xs text-muted-foreground animate-pulse mt-2">
                Chargement...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
