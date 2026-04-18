"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, FileText, Loader2 } from "lucide-react";

interface Suggestion {
  id: number;
  title: string;
  doc_type: string | null;
  publication_date: string | null;
}

const DOC_TYPE_COLORS: Record<string, string> = {
  Loi: "bg-blue-50 text-blue-700",
  Décret: "bg-violet-50 text-violet-700",
  Arrêté: "bg-amber-50 text-amber-700",
  Ordonnance: "bg-rose-50 text-rose-700",
  Circulaire: "bg-cyan-50 text-cyan-700",
  Décision: "bg-orange-50 text-orange-700",
};

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function handleSubmit(query?: string) {
    const target = query ?? q;
    if (!target.trim()) return;
    setOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(target.trim())}`);
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
    DOC_TYPE_COLORS[type ?? ""] ?? "bg-[#EEF3F8] text-[#1A3A5C]";

  return (
    <div ref={containerRef} className="relative max-w-2xl w-full">
      {/* Input */}
      <div className="flex gap-0">
        <div className="relative flex-1">
          {loading ? (
            <Loader2
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 animate-spin"
            />
          ) : (
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() =>
              q.length >= 2 && suggestions.length > 0 && setOpen(true)
            }
            placeholder="Rechercher un décret, arrêté, nomination..."
            autoComplete="off"
            className={`w-full bg-white/10 border text-white placeholder:text-white/40 text-sm pl-11 pr-4 py-4 focus:outline-none focus:bg-white/15 transition-all ${
              open
                ? "rounded-tl-xl border-white/30 border-b-white/10 bg-white/15"
                : "rounded-l-xl border-white/20 focus:border-white/40"
            }`}
          />
        </div>
        <button
          onClick={() => handleSubmit()}
          className="bg-white text-[#1A3A5C] text-sm font-semibold px-7 rounded-r-xl hover:bg-[#EEF3F8] transition-colors shrink-0"
        >
          Rechercher
        </button>
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white rounded-b-xl shadow-xl border border-black/[0.1] border-t-0 overflow-hidden z-50">
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
                i === activeIndex ? "bg-[#EEF3F8]" : "hover:bg-[#F8FAFC]"
              } ${i < suggestions.length - 1 ? "border-b border-black/[0.04]" : ""}`}
            >
              <FileText size={13} className="text-[#AAA] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#111] leading-snug line-clamp-1">
                  {s.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.doc_type && (
                    <span
                      className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${badgeStyle(s.doc_type)}`}
                    >
                      {s.doc_type}
                    </span>
                  )}
                  {s.publication_date && (
                    <span className="text-[11px] text-[#BBB] tabular-nums">
                      {s.publication_date}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight size={12} className="text-[#CCC] shrink-0 mt-1" />
            </button>
          ))}

          {/* Full search link */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-[#1A3A5C] bg-[#F0F5FA] hover:bg-[#EEF3F8] transition-colors border-t border-black/[0.06]"
          >
            <Search size={11} />
            Rechercher « {q} » dans tous les textes
          </button>
        </div>
      )}
    </div>
  );
}
