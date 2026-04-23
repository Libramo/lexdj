"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toTitleCase } from "@/lib/utils";

const PREVIEW = 3;

interface MissingLaw {
  url: string | null;
  title: string | null;
  ministry: string | null;
}

export function InaccessiblesSection({ laws }: { laws: MissingLaw[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? laws : laws.slice(0, PREVIEW);
  const hidden = laws.length - PREVIEW;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold text-amber-600 uppercase tracking-widest">
          Inaccessibles
        </span>
        <span className="text-xs text-[#CCC]">{laws.length}</span>
        <div className="flex-1 h-px bg-amber-100" />
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-3 border-b border-amber-100">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Ces textes sont référencés dans l'index de ce numéro sur le portail
            officiel mais leur page retourne une erreur 404. Ils existent
            probablement en version papier dans les archives physiques.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-amber-100">
          {visible.map((law, i) => (
            <div
              key={i}
              className="flex items-start gap-4 px-5 py-4 opacity-60"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#555] leading-snug line-clamp-2">
                  {law.title ?? "Titre non disponible"}
                </p>
                {law.ministry && (
                  <p className="text-xs text-[#888] mt-1">
                    {toTitleCase(law.ministry)}
                  </p>
                )}
              </div>
              <a
                href={law.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-600 border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-100 transition-colors no-underline shrink-0 mt-1"
              >
                Portail ↗
              </a>
            </div>
          ))}
        </div>

        {laws.length > PREVIEW && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-amber-600 hover:bg-amber-100 transition-colors border-t border-amber-100"
          >
            {expanded ? (
              <>
                <ChevronUp size={13} /> Réduire
              </>
            ) : (
              <>
                <ChevronDown size={13} /> Voir {hidden} texte
                {hidden > 1 ? "s" : ""} inaccessible{hidden > 1 ? "s" : ""} de
                plus
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
