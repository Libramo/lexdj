import { eq, and, not, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Building2,
  Hash,
  FileText,
  Newspaper,
} from "lucide-react";
import { LawTextRenderer } from "@/components/public/law-text-renderer";
import { BackButton } from "@/components/public/back-button";
import { PdfLinks } from "@/components/public/pdf-links";
import { ExpandableText } from "@/components/public/expandable-text";
import { VisasRenderer } from "@/components/public/visas-renderer";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";

interface Props {
  params: Promise<{ id: string }>;
}

function parsePdfLinks(raw: string | null): string[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  const trimmed = raw.trim();

  // PostgreSQL array literal: {url1,url2}
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter((s) => s.startsWith("http"));
  }

  // JSON array: ["url1","url2"]
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
  }

  // Fallback: newline or comma separated
  return trimmed
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
}

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("fr-DJ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

// Splits "Le Président de la République,Chef du GouvernementISMAÏL OMAR GUELLEH"
// into title lines and name
function parseSignedBy(raw: string): { titles: string[]; name: string } {
  // Name is the last all-caps word sequence (uppercase letters, spaces, hyphens, accents)
  const nameMatch = raw.match(
    /([A-ZÀÂÉÈÊËÎÏÔÙÛÜÇŒÆ][A-ZÀÂÉÈÊËÎÏÔÙÛÜÇŒÆ\s\-\']+)$/,
  );
  if (!nameMatch) return { titles: [], name: raw };

  const name = nameMatch[1].trim();
  const titlePart = raw.slice(0, raw.lastIndexOf(name)).trim();

  // Split titles on comma or known separators
  const titles = titlePart
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { titles, name };
}

function SignedBy({ value }: { value: string }) {
  const { titles, name } = parseSignedBy(value);
  return (
    <div className="flex flex-col items-end gap-0.5 mt-1">
      {titles.map((t, i) => (
        <p key={i} className="text-xs text-[#888] italic text-right">
          {t}
        </p>
      ))}
      <p className="text-sm font-semibold text-[#111] mt-1 text-right">
        {name}
      </p>
    </div>
  );
}
export default async function LawDetailPage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const [law] = await db.select().from(laws).where(eq(laws.id, numId)).limit(1);
  if (!law) notFound();

  const parsedPdfLinks = law.pdf_links ?? [];

  console.log("Parsed", parsedPdfLinks);
  console.log("ROW law :", law.pdf_links);

  const related = law.ministry
    ? await db
        .select({
          id: laws.id,
          title: laws.title,
          doc_type: laws.doc_type,
          publication_date: laws.publication_date,
        })
        .from(laws)
        .where(and(eq(laws.ministry, law.ministry), not(eq(laws.id, numId))))
        .orderBy(desc(laws.publication_date))
        .limit(5)
    : [];

  const meta = [
    { icon: Hash, label: "Référence", value: law.reference_number },
    { icon: Building2, label: "Ministère", value: law.ministry },
    {
      icon: Calendar,
      label: "Publication",
      value: formatDate(law.publication_date),
    },
    { icon: Newspaper, label: "Numéro JO", value: law.issue_number },
    {
      icon: Calendar,
      label: "Date du numéro",
      value: formatDate(law.issue_date),
    },
    { icon: FileText, label: "Mesure", value: law.mesure },
    { icon: FileText, label: "Signé par", value: law.signed_by },
  ].filter((m) => m.value);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888] mb-8">
        <BackButton />
        <span>/</span>
        <Link
          href="/textes"
          className="hover:text-[#111] transition-colors no-underline"
        >
          Textes
        </Link>
        <span>/</span>
        <span className="text-[#111] truncate max-w-xs">
          {law.reference_number ?? `#${law.id}`}
        </span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {law.doc_type && (
            <span className="text-xs font-medium bg-[#1A3A5C] text-white rounded-full px-3 py-1">
              {law.doc_type}
            </span>
          )}
          {law.mesure && (
            <span className="text-xs font-medium bg-[#EEF3F8] text-[#1A3A5C] border border-[#1A3A5C]/15 rounded-full px-3 py-1">
              {law.mesure}
            </span>
          )}
          {law.period && (
            <span className="text-xs text-[#888] bg-black/[0.04] rounded-full px-3 py-1">
              {law.period}
            </span>
          )}
        </div>

        <h1 className="font-['Libre_Baskerville'] text-2xl md:text-3xl font-normal text-[#111] leading-snug mb-3 max-w-4xl">
          {law.title ?? "Sans titre"}
        </h1>

        {law.reference_number && (
          <p className="font-mono text-sm text-[#888]">
            {law.reference_number}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intro */}
          {law.intro_text && (
            <div className="bg-white rounded-xl border border-black/[0.07] p-6">
              <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest mb-4">
                Introduction
              </h2>
              <p className="text-sm leading-relaxed text-[#333] font-light">
                {law.intro_text}
              </p>
            </div>
          )}

          {/* Visas */}
          {law.visas_text && (
            <div className="bg-white rounded-xl border border-black/[0.07] p-6">
              <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest mb-4">
                Visas
              </h2>
              <VisasRenderer text={law.visas_text} />
            </div>
          )}

          {/* Full text */}
          {law.full_text && (
            <div className="bg-white rounded-xl border border-black/[0.07] p-6">
              <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest mb-6">
                Texte intégral
              </h2>
              <LawTextRenderer text={law.full_text} />
            </div>
          )}

          {/* Signature block */}
          {law.signed_by && (
            <div className="bg-white rounded-xl border border-black/[0.07] p-6">
              <div className="flex flex-col items-end gap-1 pt-2">
                <div className="w-8 h-px bg-black/[0.15] mb-3" />
                <SignedBy value={law.signed_by} />
              </div>
            </div>
          )}

          {/* PDFs */}
          {parsedPdfLinks.length > 0 && (
            <div className="bg-white rounded-xl border border-black/[0.07] p-6">
              <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest mb-4">
                Documents PDF
              </h2>
              <PdfLinks links={parsedPdfLinks} />
            </div>
          )}

          {/* Source */}
          {law.source_url && (
            <div className="flex items-center gap-2 text-xs text-[#AAA]">
              <span>Source officielle :</span>
              <a
                href={law.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1A3A5C] hover:underline flex items-center gap-1"
              >
                {law.source_url.replace(/^https?:\/\//, "").slice(0, 60)}
                <ArrowUpRight size={11} />
              </a>
            </div>
          )}
        </div>

        {/* Right — metadata + related */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-xl border border-black/[0.07] p-5">
            <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest mb-5">
              Métadonnées
            </h2>
            <div className="space-y-4">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon size={14} className="text-[#AAA] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#AAA] uppercase tracking-wider">
                      {label}
                    </p>
                    <p className="text-sm text-[#222] font-medium leading-snug mt-0.5 break-words">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issue link */}
          {law.issue_number && (
            <Link
              href={
                law.issue_number
                  ? `/journal/${law.issue_number.split("/").map(encodeURIComponent).join("/")}`
                  : "#"
              }
              className="flex items-center justify-between p-4 bg-[#EEF3F8] rounded-xl border border-[#1A3A5C]/10 hover:border-[#1A3A5C]/25 transition-colors no-underline group"
            >
              <div>
                <p className="text-xs text-[#4A7FA8] font-medium">
                  Voir tout le numéro
                </p>
                <p className="text-sm font-semibold text-[#1A3A5C]">
                  JO N° {law.issue_number}
                </p>
                {law.issue_date && (
                  <p className="text-xs text-[#888] mt-0.5">
                    {formatDate(law.issue_date)}
                  </p>
                )}
              </div>
              <ArrowUpRight
                size={16}
                className="text-[#4A7FA8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </Link>
          )}

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-white rounded-xl border border-black/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05]">
                <h2 className="text-xs font-medium text-[#888] uppercase tracking-widest">
                  Du même ministère
                </h2>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/textes/${r.id}`}
                    className="block px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors no-underline group"
                  >
                    <p className="text-xs font-medium text-[#111] leading-snug line-clamp-2 group-hover:text-[#1A3A5C] transition-colors">
                      {r.title ?? "Sans titre"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {r.doc_type && (
                        <span className="text-[11px] text-[#888]">
                          {r.doc_type}
                        </span>
                      )}
                      {r.publication_date && (
                        <span className="text-[11px] text-[#AAA] tabular-nums">
                          · {r.publication_date}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
