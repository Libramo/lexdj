import { eq, desc, count, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, FileText } from "lucide-react";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";

const PAGE_SIZE = 25;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; type?: string }>;
}

function formatDate(d: string | null) {
  if (!d) return null;
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

export default async function MinistryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const ministry = decodeURIComponent(slug);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const typeFilter = sp.type ?? "";

  // Check ministry exists
  const [exists] = await db
    .select({ count: count() })
    .from(laws)
    .where(eq(laws.ministry, ministry));

  if (!exists || Number(exists.count) === 0) notFound();

  // Doc types for this ministry
  const docTypes = await db
    .select({ doc_type: laws.doc_type, count: count() })
    .from(laws)
    .where(eq(laws.ministry, ministry))
    .groupBy(laws.doc_type)
    .orderBy(desc(count()));

  const whereClause = typeFilter
    ? sql`ministry = ${ministry} AND doc_type = ${typeFilter}`
    : eq(laws.ministry, ministry);

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(laws)
      .where(whereClause)
      .then((r) => r[0]),
    db
      .select({
        id: laws.id,
        title: laws.title,
        doc_type: laws.doc_type,
        reference_number: laws.reference_number,
        publication_date: laws.publication_date,
        issue_number: laws.issue_number,
        mesure: laws.mesure,
      })
      .from(laws)
      .where(whereClause)
      .orderBy(desc(laws.publication_date))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const s = new URLSearchParams();
    if (p > 1) s.set("page", String(p));
    if (typeFilter) s.set("type", typeFilter);
    const q = s.toString();
    return `/ministeres/${slug}${q ? `?${q}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888] mb-8">
        <Link
          href="/ministeres"
          className="flex items-center gap-1.5 hover:text-[#111] transition-colors no-underline"
        >
          <ArrowLeft size={14} />
          Ministères
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 pb-8 border-b border-black/[0.06]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A3A5C] flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] leading-snug">
              {ministry}
            </h1>
            <p className="text-sm text-[#888] mt-1">
              {Number(exists.count).toLocaleString("fr-FR")} textes publiés
            </p>
          </div>
        </div>

        {/* Doc type filter pills */}
        <div className="flex flex-wrap gap-2 mt-6">
          <Link
            href={`/ministeres/${slug}`}
            className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors no-underline border ${
              !typeFilter
                ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
                : "text-[#666] border-black/[0.1] hover:border-[#1A3A5C]/30 hover:text-[#1A3A5C]"
            }`}
          >
            Tous ({Number(exists.count).toLocaleString("fr-FR")})
          </Link>
          {docTypes
            .filter((d) => d.doc_type)
            .map((d) => (
              <Link
                key={d.doc_type}
                href={`/ministeres/${slug}?type=${encodeURIComponent(d.doc_type!)}`}
                className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors no-underline border ${
                  typeFilter === d.doc_type
                    ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
                    : "text-[#666] border-black/[0.1] hover:border-[#1A3A5C]/30 hover:text-[#1A3A5C]"
                }`}
              >
                {d.doc_type} ({Number(d.count).toLocaleString("fr-FR")})
              </Link>
            ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-[#888] mb-5">
        {total.toLocaleString("fr-FR")} texte{total > 1 ? "s" : ""}
        {typeFilter && ` · ${typeFilter}`}
      </p>

      {/* Laws list */}
      <div className="flex flex-col divide-y divide-black/[0.06] border border-black/[0.07] rounded-xl overflow-hidden bg-white mb-6">
        {rows.map((law) => (
          <Link
            key={law.id}
            href={`/textes/${law.id}`}
            className="group flex items-start gap-4 px-5 py-4 hover:bg-[#FAFAF8] transition-colors no-underline"
          >
            <div className="shrink-0 pt-0.5">
              <span className="text-[11px] font-medium bg-[#EEF3F8] text-[#1A3A5C] rounded px-2 py-0.5 whitespace-nowrap">
                {law.doc_type ?? "—"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111] leading-snug group-hover:text-[#1A3A5C] transition-colors line-clamp-2">
                {law.title ?? "Sans titre"}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                {law.reference_number && (
                  <span className="text-xs font-mono text-[#AAA]">
                    {law.reference_number}
                  </span>
                )}
                {law.mesure && (
                  <span className="text-xs text-[#AAA]">{law.mesure}</span>
                )}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
              {law.publication_date && (
                <span className="text-xs text-[#AAA] tabular-nums whitespace-nowrap">
                  {formatDate(law.publication_date)}
                </span>
              )}
              {law.issue_number && (
                <span className="text-[11px] text-[#CCC]">
                  N° {law.issue_number}
                </span>
              )}
              <ArrowRight
                size={13}
                className="text-[#CCC] group-hover:text-[#1A3A5C] group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#888]">
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="px-4 py-2 text-sm border border-black/[0.1] rounded-lg hover:bg-white transition-colors no-underline text-[#444]"
              >
                ← Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="px-4 py-2 text-sm border border-black/[0.1] rounded-lg hover:bg-white transition-colors no-underline text-[#444]"
              >
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
