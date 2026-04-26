"use client";
// app/(admin)/dashboard/laws/[id]/OcrEditor.tsx
// Client component — textarea editor + live preview + save.

import { useState, useTransition, useCallback } from "react";
import {
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Law {
  id: number;
  title: string | null;
  doc_type: string | null;
  ministry: string | null;
  publication_date: string | null;
  intro_text: string | null;
  visas_text: string | null;
  full_text: string | null;
  signed_by: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Component ─────────────────────────────────────────────────────────────────

export function OcrEditor({ law }: { law: Law }) {
  const [title, setTitle] = useState(law.title ?? "");
  const [introText, setIntroText] = useState(law.intro_text ?? "");
  const [fullText, setFullText] = useState(law.full_text ?? "");
  const [visasText, setVisasText] = useState(law.visas_text ?? "");
  const [signedBy, setSignedBy] = useState(law.signed_by ?? "");
  const [showPreview, setShowPreview] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const isDirty =
    title !== (law.title ?? "") ||
    introText !== (law.intro_text ?? "") ||
    fullText !== (law.full_text ?? "") ||
    visasText !== (law.visas_text ?? "") ||
    signedBy !== (law.signed_by ?? "");

  const handleSave = useCallback(() => {
    startTransition(async () => {
      setStatus("saving");
      setErrorMsg("");
      try {
        const res = await fetch(`/api/v1/laws/${law.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            intro_text: introText,
            full_text: fullText,
            visas_text: visasText,
            signed_by: signedBy,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      } catch (err: unknown) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  }, [law.id, title, introText, fullText, visasText]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 shrink-0">
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {showPreview ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showPreview ? "Masquer aperçu" : "Afficher aperçu"}
        </button>
        <a
          href={`/textes/${law.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir sur le site
        </a>

        <span className="flex-1" />

        {/* Status feedback */}
        {status === "saved" && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sauvegardé
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> {errorMsg}
          </span>
        )}
        {!isDirty && status === "idle" && (
          <span className="text-xs text-slate-400">Aucune modification</span>
        )}

        <button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
            isDirty && !isPending
              ? "bg-[#1A3A5C] text-white hover:bg-[#15304d]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Sauvegarder
        </button>
      </div>

      {/* ── Main split ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 overflow-hidden grid",
          showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {/* Editor pane */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4 border-r border-slate-200">
          <Field label="Titre">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={3}
              className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent transition-shadow"
            />
          </Field>

          <Field label="Texte d'introduction">
            <textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={5}
              placeholder="Pas de texte d'introduction…"
              className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent transition-shadow"
            />
          </Field>

          <Field label="Visas (VU / SUR / CONSIDERANT)">
            <textarea
              value={visasText}
              onChange={(e) => setVisasText(e.target.value)}
              rows={6}
              placeholder="Pas de visas…"
              className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent transition-shadow"
            />
          </Field>

          <Field
            label="Corps du texte"
            hint={`${fullText.length.toLocaleString()} caractères`}
          >
            <textarea
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              rows={20}
              placeholder="Texte complet…"
              className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-mono leading-relaxed placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent transition-shadow"
            />
          </Field>

          <Field label="Signataire">
            <textarea
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              rows={2}
              placeholder="Pas de signataire…"
              className="w-full resize-vertical rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent transition-shadow"
            />
          </Field>
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div className="overflow-y-auto p-6 bg-white">
            <div className="max-w-prose mx-auto">
              <p className="text-xs text-slate-400 mb-4 uppercase tracking-wide">
                Aperçu public
              </p>

              {/* Title */}
              <h1 className="font-serif text-xl font-bold text-slate-900 mb-4 leading-snug">
                {title || <em className="text-slate-300">Pas de titre</em>}
              </h1>

              {/* Intro */}
              {introText && (
                <p className="text-sm text-slate-600 italic mb-4 border-l-2 border-slate-200 pl-3">
                  {introText}
                </p>
              )}

              {/* Visas */}
              {visasText && (
                <div className="mb-4 text-xs text-slate-500 space-y-1">
                  {visasText
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                </div>
              )}

              {/* Body */}
              <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap font-serif leading-relaxed">
                {fullText || (
                  <em className="text-slate-300 not-italic">Pas de texte…</em>
                )}
              </div>

              {/* Signed by */}
              {signedBy && (
                <p className="mt-6 text-sm text-slate-500 italic border-t border-slate-100 pt-4">
                  {signedBy}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
        </label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
