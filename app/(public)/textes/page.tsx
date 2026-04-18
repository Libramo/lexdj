import { sql, count, desc, ilike, and, eq } from "drizzle-orm";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";
import { ArrowRight, FileText, BookOpen, Hash } from "lucide-react";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";
import { TextesFilters } from "@/components/public/text-filters";

const PAGE_SIZE = 25;

interface Props {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
    ministry?: string;
    era?: string;
  }>;
}

const ERA_CONDITIONS: Record<string, any> = {
  colonial: sql`publication_date < '1977-06-27'`,
  independence: sql`publication_date >= '1977-06-27' AND publication_date < '1990-01-01'`,
  modern: sql`publication_date >= '1990-01-01'`,
};

const DOC_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Loi: { bg: "bg-blue-50", text: "text-blue-700" },
  Décret: { bg: "bg-violet-50", text: "text-violet-700" },
  Arrêté: { bg: "bg-amber-50", text: "text-amber-700" },
  Ordonnance: { bg: "bg-rose-50", text: "text-rose-700" },
  Circulaire: { bg: "bg-cyan-50", text: "text-cyan-700" },
  Délibération: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Décision: { bg: "bg-orange-50", text: "text-orange-700" },
};

function getDocTypeStyle(type: string | null) {
  if (!type) return { bg: "bg-gray-50", text: "text-gray-500" };
  return (
    DOC_TYPE_COLORS[type] ?? { bg: "bg-[#EEF3F8]", text: "text-[#1A3A5C]" }
  );
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

function getEraTag(date: string | null) {
  if (!date) return null;
  if (date < "1977-06-27")
    return { label: "Colonial", color: "text-amber-600" };
  if (date < "1990-01-01")
    return { label: "Post-indép.", color: "text-violet-600" };
  return null;
}

async function getFilterOptions() {
  const [docTypes, ministries] = await Promise.all([
    db
      .select({ value: laws.doc_type })
      .from(laws)
      .groupBy(laws.doc_type)
      .orderBy(laws.doc_type),
    db
      .select({ value: laws.ministry })
      .from(laws)
      .groupBy(laws.ministry)
      .orderBy(laws.ministry)
      .limit(80),
  ]);
  return {
    docTypes: docTypes.map((d) => d.value).filter(Boolean) as string[],
    ministries: ministries.map((m) => m.value).filter(Boolean) as string[],
  };
}

export default async function TextesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const q = params.q?.trim() ?? "";
  const typeFilter = params.type ?? "";
  const ministryFilter = params.ministry ?? "";
  const eraFilter = params.era ?? "";

  const conditions = [
    q ? ilike(laws.title, `%${q}%`) : undefined,
    typeFilter ? eq(laws.doc_type, typeFilter) : undefined,
    ministryFilter ? eq(laws.ministry, ministryFilter) : undefined,
    eraFilter ? ERA_CONDITIONS[eraFilter] : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const hasFilters = !!(q || typeFilter || ministryFilter || eraFilter);

  const [{ total }, rows, { docTypes, ministries }, docTypeCounts] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(laws)
        .where(where)
        .then((r) => r[0]),
      db
        .select({
          id: laws.id,
          title: laws.title,
          doc_type: laws.doc_type,
          reference_number: laws.reference_number,
          ministry: laws.ministry,
          publication_date: laws.publication_date,
          mesure: laws.mesure,
          issue_number: laws.issue_number,
          intro_text: laws.intro_text,
        })
        .from(laws)
        .where(where)
        .orderBy(desc(laws.publication_date))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      getFilterOptions(),
      // Count by doc type for the header chips
      db
        .select({ doc_type: laws.doc_type, count: count() })
        .from(laws)
        .groupBy(laws.doc_type)
        .orderBy(desc(count()))
        .limit(7),
    ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    if (q) sp.set("q", q);
    if (typeFilter) sp.set("type", typeFilter);
    if (ministryFilter) sp.set("ministry", ministryFilter);
    if (eraFilter) sp.set("era", eraFilter);
    return `/textes${sp.toString() ? `?${sp.toString()}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── HEADER ── */}
      <div className="bg-[#1A3A5C] text-white">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-['Libre_Baskerville'] text-4xl font-normal leading-tight mb-2">
            Textes <em className="text-[#9DC4E0]">officiels</em>
          </h1>
          <p className="text-white/50 text-sm font-light mb-8">
            54 000+ textes — lois, décrets, arrêtés, circulaires depuis 1904
          </p>

          {/* Doc type quick filters */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/textes"
              className={`text-xs font-medium rounded-full px-4 py-2 border transition-colors no-underline ${
                !typeFilter && !eraFilter
                  ? "bg-white text-[#1A3A5C] border-white"
                  : "text-white/70 border-white/20 hover:border-white/40 hover:text-white"
              }`}
            >
              Tous
            </Link>
            {docTypeCounts
              .filter((d) => d.doc_type)
              .map((d) => (
                <Link
                  key={d.doc_type}
                  href={`/textes?type=${encodeURIComponent(d.doc_type!)}`}
                  className={`text-xs font-medium rounded-full px-4 py-2 border transition-colors no-underline ${
                    typeFilter === d.doc_type
                      ? "bg-white text-[#1A3A5C] border-white"
                      : "text-white/70 border-white/20 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {d.doc_type} · {Number(d.count).toLocaleString("fr-FR")}
                </Link>
              ))}
            <Link
              href="/textes?era=colonial"
              className={`text-xs font-medium rounded-full px-4 py-2 border transition-colors no-underline ${
                eraFilter === "colonial"
                  ? "bg-amber-300 text-amber-900 border-amber-300"
                  : "text-amber-300 border-amber-300/40 hover:border-amber-300/70"
              }`}
            >
              🏛 Période coloniale
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 flex gap-8">
        {/* ── SIDEBAR ── */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-[76px] space-y-1">
            <p className="text-[11px] font-semibold text-[#AAA] uppercase tracking-wider mb-4 px-1">
              Affiner les résultats
            </p>
            <TextesFilters
              docTypes={docTypes}
              ministries={ministries}
              currentQ={q}
              currentType={typeFilter}
              currentMinistry={ministryFilter}
            />
          </div>
        </aside>

        {/* ── RESULTS ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile filters */}
          <div className="lg:hidden mb-4">
            <TextesFilters
              docTypes={docTypes}
              ministries={ministries}
              currentQ={q}
              currentType={typeFilter}
              currentMinistry={ministryFilter}
              mobile
            />
          </div>

          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#888]">
              <span className="font-semibold text-[#111]">
                {total.toLocaleString("fr-FR")}
              </span>{" "}
              texte{total > 1 ? "s" : ""}
              {hasFilters && " filtrés"}
            </p>
            {hasFilters && (
              <Link
                href="/textes"
                className="text-xs text-red-500 hover:underline no-underline"
              >
                Effacer les filtres
              </Link>
            )}
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-black/[0.06]">
              <FileText size={28} className="mx-auto mb-3 text-[#CCC]" />
              <p className="text-sm text-[#888]">Aucun résultat</p>
              {hasFilters && (
                <Link
                  href="/textes"
                  className="text-sm text-[#1A3A5C] hover:underline mt-2 inline-block"
                >
                  Effacer les filtres
                </Link>
              )}
            </div>
          )}

          {/* Results list */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              {rows.map((law, i) => {
                const style = getDocTypeStyle(law.doc_type);
                const era = getEraTag(law.publication_date);

                return (
                  <Link
                    key={law.id}
                    href={`/textes/${law.id}`}
                    className="group bg-white border border-black/[0.07] rounded-xl px-5 py-4 hover:border-[#1A3A5C]/25 hover:shadow-sm transition-all no-underline block"
                  >
                    <div className="flex items-start gap-4">
                      {/* Left — doc type badge */}
                      <div className="shrink-0 pt-0.5 w-24 text-right">
                        <span
                          className={`text-[11px] font-semibold rounded-md px-2 py-0.5 ${style.bg} ${style.text}`}
                        >
                          {law.doc_type ?? "—"}
                        </span>
                      </div>

                      {/* Center — main content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111] leading-snug group-hover:text-[#1A3A5C] transition-colors line-clamp-2 mb-1.5">
                          {law.title ?? "Sans titre"}
                        </p>

                        {/* Excerpt */}
                        {law.intro_text && (
                          <p className="text-xs text-[#AAA] leading-relaxed line-clamp-1 mb-2 font-light">
                            {law.intro_text.slice(0, 120)}
                          </p>
                        )}

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
                          {law.reference_number && (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-[#BBB]">
                              <Hash size={9} />
                              {law.reference_number}
                            </span>
                          )}
                          {law.ministry && (
                            <span className="text-[11px] text-[#999] truncate max-w-[200px]">
                              {toTitleCase(law.ministry)}
                            </span>
                          )}
                          {era && (
                            <span
                              className={`text-[10px] font-medium ${era.color}`}
                            >
                              {era.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right — date + issue + arrow */}
                      <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5 min-w-[80px]">
                        {law.publication_date && (
                          <span className="text-xs text-[#AAA] tabular-nums whitespace-nowrap">
                            {formatDate(law.publication_date)}
                          </span>
                        )}
                        {law.issue_number && (
                          <span className="flex items-center gap-1 text-[10px] text-[#CCC]">
                            <BookOpen size={9} />
                            {law.issue_number}
                          </span>
                        )}
                        <ArrowRight
                          size={13}
                          className="text-[#DDD] group-hover:text-[#1A3A5C] group-hover:translate-x-0.5 transition-all mt-1"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-black/[0.06]">
              <span className="text-sm text-[#888]">
                {((page - 1) * PAGE_SIZE + 1).toLocaleString("fr-FR")}–
                {Math.min(page * PAGE_SIZE, total).toLocaleString("fr-FR")} sur{" "}
                {total.toLocaleString("fr-FR")}
              </span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="px-4 py-2 text-sm border border-black/[0.1] rounded-lg hover:bg-white transition-colors no-underline text-[#444]"
                  >
                    ← Précédent
                  </Link>
                )}
                <span className="text-sm text-[#888] px-2">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="px-4 py-2 text-sm bg-[#1A3A5C] text-white rounded-lg hover:bg-[#122840] transition-colors no-underline font-medium"
                  >
                    Suivant →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
