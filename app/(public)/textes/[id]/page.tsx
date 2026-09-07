import { eq, and, not, desc, sql } from "drizzle-orm";
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
import { parseSignedBy } from "@/lib/utils";

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

function SignedBy({ value }: { value: string }) {
  const { titles, name } = parseSignedBy(value);
  return (
    <div className="flex flex-col items-end gap-0.5 mt-1">
      {titles.map((t, i) => (
        <p key={i} className="font-serif text-xs text-muted-foreground italic text-right">
          {t}
        </p>
      ))}
      <p className="font-serif text-sm font-semibold text-foreground mt-1 text-right">
        {name}
      </p>
    </div>
  );
}
export default async function LawDetailPage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const [law] = await db
    .select()
    .from(laws)
    .where(
      and(
        eq(laws.id, numId),
        sql`${laws.id} NOT IN (SELECT id FROM duplicate_laws)`,
      ),
    )
    .limit(1);
  if (!law) notFound();

  const parsedPdfLinks = law.pdf_links ?? [];

  const related = law.ministry
    ? await db
        .select({
          id: laws.id,
          title: laws.title,
          doc_type: laws.doc_type,
          publication_date: laws.publication_date,
        })
        .from(laws)
        .where(
          and(
            eq(laws.ministry, law.ministry),
            not(eq(laws.id, numId)),
            sql`${laws.id} NOT IN (SELECT id FROM duplicate_laws)`,
          ),
        )
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
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-8">
        <div className="flex items-center gap-2">
          <BackButton />
          <span>/</span>
          <Link
            href="/textes"
            className="hover:text-foreground transition-colors no-underline"
          >
            Textes
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">
            {law.reference_number ?? `#${law.id}`}
          </span>
        </div>
        <a
          href={`/api/pdf/law/${law.id}`}
          download
          className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/15 rounded-sm px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors no-underline shrink-0"
        >
          <FileText size={13} />
          Télécharger PDF
        </a>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {law.doc_type && (
            <span className="text-xs font-medium bg-primary text-primary-foreground rounded-sm px-3 py-1">
              {law.doc_type}
            </span>
          )}
          {law.mesure && (
            <span className="text-xs font-medium bg-primary/10 text-primary border border-primary/15 rounded-sm px-3 py-1">
              {law.mesure}
            </span>
          )}
          {law.period && (
            <span className="text-xs text-muted-foreground bg-muted rounded-sm px-3 py-1">
              {law.period}
            </span>
          )}
        </div>

        <h1 className="font-serif text-2xl md:text-3xl font-normal text-foreground leading-snug mb-3 max-w-4xl">
          {law.title ?? "Sans titre"}
        </h1>

        {law.reference_number && (
          <p className="font-mono text-sm text-muted-foreground">
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
            <div className="bg-background rounded-sm border border-border p-6">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Introduction
              </h2>
              <p className="font-serif text-sm leading-relaxed text-foreground font-light">
                {law.intro_text}
              </p>
            </div>
          )}

          {/* Visas */}
          {law.visas_text && (
            <div className="bg-background rounded-sm border border-border p-6">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Visas
              </h2>
              <VisasRenderer text={law.visas_text} />
            </div>
          )}

          {/* Full text */}
          {law.full_text && (
            <div className="bg-background rounded-sm border border-border p-6">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6">
                Texte intégral
              </h2>
              <LawTextRenderer text={law.full_text} />
            </div>
          )}

          {/* Signature block */}
          {law.signed_by && (
            <div className="bg-background rounded-sm border border-border p-6">
              <div className="flex flex-col items-end gap-1 pt-2">
                <div className="w-8 h-px bg-border mb-3" />
                <SignedBy value={law.signed_by} />
              </div>
            </div>
          )}

          {/* PDFs */}
          {parsedPdfLinks.length > 0 && (
            <div className="bg-background rounded-sm border border-border p-6">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Documents PDF
              </h2>
              <PdfLinks links={parsedPdfLinks} />
            </div>
          )}

          {/* Source */}
          {law.source_url && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Source officielle :</span>
              <a
                href={law.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
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
          <div className="bg-background rounded-sm border border-border p-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-5">
              Métadonnées
            </h2>
            <div className="space-y-4">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {label}
                    </p>
                    <p className="text-sm text-foreground font-medium leading-snug mt-0.5 wrap-break-word">
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
              className="flex items-center justify-between p-4 bg-primary/10 rounded-sm border border-primary/10 hover:border-primary/40 transition-colors no-underline group"
            >
              <div>
                <p className="text-xs text-primary font-medium">
                  Voir tout le numéro
                </p>
                <p className="text-sm font-semibold text-primary">
                  JO N° {law.issue_number}
                </p>
                {law.issue_date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(law.issue_date)}
                  </p>
                )}
              </div>
              <ArrowUpRight
                size={16}
                className="text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </Link>
          )}

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-background rounded-sm border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Du même ministère
                </h2>
              </div>
              <div className="divide-y divide-border">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/textes/${r.id}`}
                    className="block px-5 py-3.5 hover:bg-muted transition-colors no-underline group"
                  >
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {r.title ?? "Sans titre"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {r.doc_type && (
                        <span className="text-[11px] text-muted-foreground">
                          {r.doc_type}
                        </span>
                      )}
                      {r.publication_date && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
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
