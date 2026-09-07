"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  FileText,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

interface Suggestion {
  id: number;
  title: string;
  doc_type: string | null;
  publication_date: string | null;
}

// Loi (the most common/consequential type) is called out with the brand
// tint; every other type shares one neutral tone rather than a rainbow of
// pastel hues — see ui-context.md's note on desaturating this set further.
const DOC_TYPE_COLORS: Record<string, string> = {
  Loi: "bg-primary/10 text-primary",
};
const DEFAULT_DOC_TYPE_COLOR = "bg-muted text-muted-foreground";

// "all" means no attributesToSearchOn restriction — every other value must
// match a real entry in lib/meilisearch-schema.ts's searchableAttributes,
// since /recherche passes this straight through as a Meilisearch param.
type SearchScope =
  "all" | "title" | "full_text" | "ministry" | "reference_number";

const SCOPE_OPTIONS: { value: SearchScope; label: string }[] = [
  { value: "all", label: "Tous les champs" },
  { value: "title", label: "Titre" },
  { value: "full_text", label: "Texte intégral" },
  { value: "ministry", label: "Ministère" },
  { value: "reference_number", label: "Référence" },
];

function SearchOptionsPanel({
  scope,
  onScopeChange,
  exact,
  onExactChange,
}: {
  scope: SearchScope;
  onScopeChange: (s: SearchScope) => void;
  exact: boolean;
  onExactChange: (v: boolean) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Zone de recherche
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onScopeChange(opt.value)}
              className={`text-xs font-medium rounded-sm px-2.5 py-1.5 border transition-colors ${
                scope === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs text-foreground">
          Rechercher l&rsquo;expression exacte
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={exact}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onExactChange(!exact)}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
            exact ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
              exact ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </label>
    </div>
  );
}

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [scope, setScope] = useState<SearchScope>("all");
  const [exact, setExact] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `open` controls dropdown visibility (focus/outside-click/escape/submit);
  // `suggestions` is just data. Kept separate so a query with zero results
  // still shows the options panel + footer links instead of the whole
  // dropdown vanishing.
  const fetchSuggestions = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQ(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function handleSubmit(query?: string) {
    const target = query ?? q;
    if (!target.trim()) return;
    setOpen(false);
    const params = new URLSearchParams();
    params.set("q", target.trim());
    if (scope !== "all") params.set("champ", scope);
    if (exact) params.set("exact", "1");
    router.push(`/recherche?${params.toString()}`);
  }

  // "Recherche avancée" always goes to today's /recherche page, blank —
  // once the combinable-groups builder (a separate, not-yet-built unit)
  // ships there, this link naturally becomes the real advanced-search
  // entry point without needing another change here.
  function goToAdvanced() {
    setOpen(false);
    router.push("/recherche");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter") handleSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        router.push(`/textes/${suggestions[activeIndex].id}`);
        setOpen(false);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const badgeStyle = (type: string | null) =>
    DOC_TYPE_COLORS[type ?? ""] ?? DEFAULT_DOC_TYPE_COLOR;

  return (
    <div ref={containerRef} className="relative max-w-6xl w-full">
      {/* Input — solid, high-contrast surface instead of translucent glass */}
      <div className="flex gap-0">
        <div className="relative flex-1">
          {loading ? (
            <Loader2
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
            />
          ) : (
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder="Rechercher un décret, arrêté, nomination..."
            autoComplete="off"
            className={`w-full bg-background border text-foreground placeholder:text-muted-foreground text-sm pl-11 pr-4 py-4 focus:outline-none transition-colors ${
              open
                ? "rounded-tl-sm border-border border-b-transparent"
                : "rounded-l-sm border-border focus:border-primary/40"
            }`}
          />
        </div>
        <button
          onClick={() => handleSubmit()}
          className="bg-primary text-primary-foreground text-sm font-semibold px-7 rounded-r-sm hover:bg-primary/90 transition-colors shrink-0"
        >
          Rechercher
        </button>
      </div>

      {/* Dropdown — options panel stays visible throughout; suggestions
          appear below it once there's a real query, footer links always
          available once there's something to search for */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-background rounded-b-sm border border-border border-t-0 overflow-hidden z-50">
          <SearchOptionsPanel
            scope={scope}
            onScopeChange={setScope}
            exact={exact}
            onExactChange={setExact}
          />

          {suggestions.length > 0 && (
            <div className="border-t border-border">
              <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Suggestions
              </p>
              {suggestions.map((s, i) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push(`/textes/${s.id}`);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                    i === activeIndex ? "bg-muted" : "hover:bg-muted"
                  } ${i < suggestions.length - 1 ? "border-b border-border" : ""}`}
                >
                  <FileText
                    size={13}
                    className="text-muted-foreground shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug line-clamp-1">
                      {s.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.doc_type && (
                        <span
                          className={`text-[10px] font-medium rounded-sm px-1.5 py-0.5 ${badgeStyle(s.doc_type)}`}
                        >
                          {s.doc_type}
                        </span>
                      )}
                      {s.publication_date && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {s.publication_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={12}
                    className="text-muted-foreground shrink-0 mt-1"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Footer — always available once there's something to search for */}
          {q.trim().length > 0 && (
            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToAdvanced();
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
              >
                <SlidersHorizontal size={11} />
                Recherche avancée
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
              >
                <Search size={11} />
                Tous les résultats
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
