import { sql } from "drizzle-orm";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SearchInput } from "@/components/public/search-input";
import { SearchFilters } from "@/components/public/search-filters";
import { toTitleCase } from "@/lib/utils";
import { db } from "@/drizzle/src";

const PAGE_SIZE = 15;

interface Props {
  searchParams: Promise<{
    q?: string;
    page?: string;
    type?: string;
    ministry?: string;
    era?: string;
    sort?: string;
  }>;
}

// ── Excerpt highlight — renders <<<word>>> markers ────────────────────────────
function ExcerptHighlight({ text }: { text: string }) {
  const parts = text.split(/(<<<[^>]+>>>)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("<<<") ? (
          <mark
            key={i}
            className="bg-amber-100 text-amber-900 rounded-sm px-0.5 font-medium not-italic"
          >
            {part.slice(3, -3)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

// ── Title highlight — simple word-by-word ─────────────────────────────────────
function TitleHighlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const words = q.trim().split(/\s+/).filter(Boolean);
  const pattern = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        words.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            className="bg-amber-100 text-amber-900 rounded-sm px-0.5 not-italic font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

async function getFilterOptions(
  q: string,
  typeFilter: string,
  ministryFilter: string,
  eraFilter: string,
) {
  const qSafe = q.replace(/'/g, "''");

  const buildWhere = (exclude: "type" | "ministry" | null) => {
    const conds: string[] = [];
    if (q)
      conds.push(`(
      to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')) @@ plainto_tsquery('french', '${qSafe}')
      OR to_tsvector('simple', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')) @@ plainto_tsquery('simple', '${qSafe}')
    )`);
    if (exclude !== "type" && typeFilter)
      conds.push(`doc_type = '${typeFilter.replace(/'/g, "''")}'`);
    if (exclude !== "ministry" && ministryFilter)
      conds.push(`ministry = '${ministryFilter.replace(/'/g, "''")}'`);
    if (eraFilter && ERA_CONDITIONS[eraFilter])
      conds.push(ERA_CONDITIONS[eraFilter]);
    return conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  };

  const [docTypes, ministries] = await Promise.all([
    db.execute(
      sql.raw(`
      SELECT doc_type as value, COUNT(*)::int as count
      FROM laws_distinct ${buildWhere("type")}
      GROUP BY doc_type ORDER BY count DESC
    `),
    ),
    db.execute(
      sql.raw(`
      SELECT ministry as value, COUNT(*)::int as count
      FROM laws_distinct ${buildWhere("ministry")}
      GROUP BY ministry ORDER BY count DESC LIMIT 60
    `),
    ),
  ]);

  return {
    docTypes: (docTypes.rows as { value: string; count: number }[]).filter(
      (r) => r.value,
    ),
    ministries: (ministries.rows as { value: string; count: number }[]).filter(
      (r) => r.value,
    ),
  };
}

const ERA_CONDITIONS: Record<string, string> = {
  colonial: "publication_date < '1977-06-27'",
  independence:
    "publication_date >= '1977-06-27' AND publication_date < '1990-01-01'",
  modern: "publication_date >= '1990-01-01'",
};

export default async function RecherchePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const typeFilter = params.type ?? "";
  const ministryFilter = params.ministry ?? "";
  const eraFilter = params.era ?? "";
  const sort = params.sort ?? "relevance";

  const hasFilters = !!(typeFilter || ministryFilter || eraFilter);
  const { docTypes, ministries } = await getFilterOptions(
    q,
    typeFilter,
    ministryFilter,
    eraFilter,
  );

  const qSafe = q.replace(/'/g, "''");

  // Build WHERE clause
  const conditions: string[] = [];
  if (q)
    conditions.push(`(
    to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')) @@ plainto_tsquery('french', '${qSafe}')
    OR
    to_tsvector('simple', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')) @@ plainto_tsquery('simple', '${qSafe}')
  )`);
  if (typeFilter)
    conditions.push(`doc_type = '${typeFilter.replace(/'/g, "''")}'`);
  if (ministryFilter)
    conditions.push(`ministry = '${ministryFilter.replace(/'/g, "''")}'`);
  if (eraFilter && ERA_CONDITIONS[eraFilter])
    conditions.push(ERA_CONDITIONS[eraFilter]);
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Order
  const orderClause =
    sort === "date_desc"
      ? "ORDER BY publication_date DESC NULLS LAST"
      : sort === "date_asc"
        ? "ORDER BY publication_date ASC NULLS LAST"
        : q
          ? `ORDER BY (
        ts_rank(to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')), plainto_tsquery('french', '${qSafe}'))
        +
        ts_rank(to_tsvector('simple', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')), plainto_tsquery('simple', '${qSafe}'))
      ) DESC`
          : "ORDER BY publication_date DESC NULLS LAST";

  // Excerpt via ts_headline
  const excerptExpr = q
    ? `ts_headline('simple',
        COALESCE(intro_text,'') || ' ' || COALESCE(full_text,''),
        plainto_tsquery('simple', '${qSafe}'),
        'MaxFragments=3, MaxWords=15, MinWords=8, FragmentDelimiter= ‧‧‧ , StartSel=<<<, StopSel=>>>'
      )`
    : `intro_text`;

  const [results, totalResult] = await Promise.all([
    q || hasFilters
      ? db.execute(
          sql.raw(`
          SELECT id, title, doc_type, ministry, publication_date,
                 reference_number, intro_text, issue_number,
                 ${excerptExpr} as excerpt
          FROM laws_distinct
          ${whereClause}
          ${orderClause}
          LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
        `),
        )
      : Promise.resolve({ rows: [] }),
    q || hasFilters
      ? db.execute(
          sql.raw(`SELECT COUNT(*) as total FROM laws_distinct ${whereClause}`),
        )
      : Promise.resolve({ rows: [{ total: 0 }] }),
  ]);

  const total = Number((totalResult.rows[0] as any)?.total ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rows = results.rows as {
    id: number;
    title: string;
    doc_type: string;
    ministry: string;
    publication_date: string;
    reference_number: string;
    intro_text: string;
    issue_number: string;
    excerpt: string;
  }[];

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    if (typeFilter) sp.set("type", typeFilter);
    if (ministryFilter) sp.set("ministry", ministryFilter);
    if (eraFilter) sp.set("era", eraFilter);
    if (sort !== "relevance") sp.set("sort", sort);
    return `/recherche?${sp.toString()}`;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── SEARCH HEADER ── */}
      <div className="bg-white border-b border-black/[0.06]">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] mb-5">
            Recherche plein texte
          </h1>
          <SearchInput initialQ={q} />

          {hasFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {typeFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#1A3A5C] text-white rounded-full px-3 py-1">
                  {typeFilter}
                </span>
              )}
              {ministryFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#1A3A5C] text-white rounded-full px-3 py-1">
                  {toTitleCase(ministryFilter)}
                </span>
              )}
              {eraFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#1A3A5C] text-white rounded-full px-3 py-1">
                  {eraFilter === "colonial"
                    ? "Période coloniale"
                    : eraFilter === "independence"
                      ? "1977–1990"
                      : "Période moderne"}
                </span>
              )}
              <Link
                href={`/recherche?q=${encodeURIComponent(q)}`}
                className="text-xs text-red-500 hover:underline no-underline self-center"
              >
                Effacer les filtres
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6">
        {/* ── RESULTS HEADER ── */}
        {(q || hasFilters) && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#888]">
              {total === 0 ? (
                "Aucun résultat"
              ) : (
                <>
                  <span className="font-semibold text-[#111]">
                    {total.toLocaleString("fr-FR")}
                  </span>{" "}
                  résultat{total > 1 ? "s" : ""}
                  {q && (
                    <>
                      {" "}
                      pour{" "}
                      <span className="font-semibold text-[#111]">« {q} »</span>
                    </>
                  )}
                </>
              )}
            </p>
            <div className="flex items-center gap-3">
              {q && (
                <div className="flex items-center gap-1.5 text-xs text-[#888]">
                  <span>Trier :</span>
                  {[
                    { value: "relevance", label: "Pertinence" },
                    { value: "date_desc", label: "Plus récent" },
                    { value: "date_asc", label: "Plus ancien" },
                  ].map((s) => {
                    const sp = new URLSearchParams();
                    if (q) sp.set("q", q);
                    if (typeFilter) sp.set("type", typeFilter);
                    if (ministryFilter) sp.set("ministry", ministryFilter);
                    if (eraFilter) sp.set("era", eraFilter);
                    if (s.value !== "relevance") sp.set("sort", s.value);
                    return (
                      <Link
                        key={s.value}
                        href={`/recherche?${sp.toString()}`}
                        className={`px-2.5 py-1 rounded-md transition-colors no-underline ${
                          sort === s.value
                            ? "bg-[#1A3A5C] text-white font-medium"
                            : "text-[#888] hover:bg-black/[0.05]"
                        }`}
                      >
                        {s.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FILTERS ── */}
        <SearchFilters
          docTypes={docTypes}
          ministries={ministries}
          currentQ={q}
          currentType={typeFilter}
          currentMinistry={ministryFilter}
          currentEra={eraFilter}
          currentSort={sort}
        />

        {/* ── EMPTY STATE ── */}
        {!q && !hasFilters && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#EEF3F8] flex items-center justify-center mx-auto mb-5">
              <FileText size={24} className="text-[#1A3A5C]" />
            </div>
            <p className="text-[#888] text-sm mb-1 font-medium">
              Recherchez dans 54 000+ textes officiels
            </p>
            <p className="text-[#AAA] text-xs mb-8">
              Décrets, arrêtés, lois, ordonnances, circulaires — depuis 1904
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "nomination",
                "élection présidentielle",
                "code du travail",
                "budget",
                "santé publique",
                "foncier",
              ].map((s) => (
                <Link
                  key={s}
                  href={`/recherche?q=${encodeURIComponent(s)}`}
                  className="text-xs text-[#1A3A5C] bg-[#EEF3F8] border border-[#1A3A5C]/10 rounded-full px-3 py-1.5 hover:bg-[#1A3A5C] hover:text-white transition-colors no-underline"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── NO RESULTS ── */}
        {(q || hasFilters) && rows.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-black/[0.06]">
            <p className="text-sm text-[#888] mb-1">
              Aucun texte ne correspond à votre recherche
            </p>
            <p className="text-xs text-[#AAA]">
              Essayez d'autres mots-clés ou élargissez les filtres
            </p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {rows.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {rows.map((law, i) => (
              <Link
                key={law.id}
                href={`/textes/${law.id}`}
                className="group block bg-white border border-black/[0.07] rounded-xl px-5 py-4 hover:border-[#1A3A5C]/25 hover:shadow-sm transition-all no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] text-[#CCC] tabular-nums font-mono w-5">
                        {(page - 1) * PAGE_SIZE + i + 1}.
                      </span>
                      {law.doc_type && (
                        <span className="text-[11px] font-medium bg-[#EEF3F8] text-[#1A3A5C] rounded px-2 py-0.5">
                          {law.doc_type}
                        </span>
                      )}
                      {law.issue_number && (
                        <span className="text-[11px] text-[#AAA] bg-black/[0.03] rounded px-2 py-0.5">
                          N° {law.issue_number}
                        </span>
                      )}
                      {law.publication_date && (
                        <span className="text-[11px] text-[#AAA]">
                          {law.publication_date < "1977-06-27"
                            ? "🏛 Période coloniale"
                            : law.publication_date < "1990-01-01"
                              ? "⭐ Post-indépendance"
                              : null}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold text-[#111] leading-snug group-hover:text-[#1A3A5C] transition-colors mb-1.5">
                      <TitleHighlight text={law.title ?? "Sans titre"} q={q} />
                    </p>

                    {/* Excerpt with ts_headline highlights */}
                    {law.excerpt && (
                      <p className="text-xs text-[#888] leading-relaxed line-clamp-3 font-light mb-2">
                        <ExcerptHighlight text={law.excerpt} />
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {law.ministry && (
                        <span className="text-[11px] text-[#AAA]">
                          {toTitleCase(law.ministry)}
                        </span>
                      )}
                      {law.reference_number && (
                        <span className="text-[11px] font-mono text-[#CCC]">
                          {law.reference_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="shrink-0 flex flex-col items-end gap-1 pt-1">
                    {law.publication_date && (
                      <span className="text-xs text-[#AAA] tabular-nums whitespace-nowrap">
                        {law.publication_date}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <span className="text-sm text-[#888]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
              sur {total.toLocaleString("fr-FR")}
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
    </div>
  );
}
