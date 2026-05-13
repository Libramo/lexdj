import { typesenseClient } from "@/lib/typesense";
import { LAWS_COLLECTION } from "@/lib/typesense-schema";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SearchInput } from "@/components/public/search-input";
import { SearchFilters } from "@/components/public/search-filters";
import { toTitleCase } from "@/lib/utils";

const PAGE_SIZE = 15;

interface Props {
  searchParams: Promise<{
    q?: string;
    page?: string;
    type?: string;
    ministry?: string;
    era?: string;
    sort?: string;
    topic?: string;
  }>;
}

// ── Era filter mapping — Typesense filter syntax ──────────────────────────────
const ERA_FILTERS: Record<string, string> = {
  colonial: "publication_date:<1977-06-27",
  independence: "publication_date:>=1977-06-27 && publication_date:<1990-01-01",
  modern: "publication_date:>=1990-01-01",
};

// ── Highlight rendering — Typesense wraps matches in <mark> tags ──────────────
function ExcerptHighlight({ text }: { text: string }) {
  // Typesense uses <mark> tags for highlights — render them safely
  return (
    <span
      dangerouslySetInnerHTML={{ __html: text }}
      className="[&_mark]:bg-amber-100 [&_mark]:text-amber-900 [&_mark]:rounded-sm [&_mark]:px-0.5 [&_mark]:font-medium"
    />
  );
}

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

export default async function RecherchePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const typeFilter = params.type ?? "";
  const ministryFilter = params.ministry ?? "";
  const eraFilter = params.era ?? "";
  const sort = params.sort ?? "relevance";
  const topicFilter = params.topic ?? "";

  const hasFilters = !!(
    typeFilter ||
    ministryFilter ||
    eraFilter ||
    topicFilter
  );

  // ── Build Typesense filter_by ─────────────────────────────────────────────
  const filters: string[] = [];
  if (typeFilter) filters.push(`doc_type:=${typeFilter}`);
  if (ministryFilter) filters.push(`ministry_normalized:=${ministryFilter}`);
  if (eraFilter && ERA_FILTERS[eraFilter]) filters.push(ERA_FILTERS[eraFilter]);
  if (topicFilter) filters.push(`topics:=${topicFilter}`);
  const filterBy = filters.join(" && ");

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortBy =
    sort === "date_desc"
      ? "pub_year:desc"
      : sort === "date_asc"
        ? "pub_year:asc"
        : q
          ? "_text_match:desc,pub_year:desc"
          : "pub_year:desc";

  // ── Search ────────────────────────────────────────────────────────────────
  let rows: any[] = [];
  let total = 0;
  let totalPages = 0;
  let docTypes: { value: string; count: number }[] = [];
  let ministries: { value: string; count: number }[] = [];

  // Always fetch facets so the filter sidebar is populated even on empty state
  // per_page=0 means we get facet counts without fetching any documents
  const facetResult = await typesenseClient
    .collections(LAWS_COLLECTION)
    .documents()
    .search({
      q: "*",
      query_by: "title",
      per_page: 0,
      facet_by: "doc_type,ministry_normalized",
      max_facet_values: 60,
      filter_by: filterBy || undefined,
    } as any);

  docTypes =
    (facetResult as any).facet_counts
      ?.find((f: any) => f.field_name === "doc_type")
      ?.counts.map((c: any) => ({ value: c.value, count: c.count })) ?? [];

  ministries =
    facetResult.facet_counts
      ?.find((f: any) => f.field_name === "ministry_normalized")
      ?.counts.map((c: any) => ({ value: c.value, count: c.count })) ?? [];

  // Only fetch results when there is a query or active filter
  if (q || hasFilters) {
    const result = await typesenseClient
      .collections(LAWS_COLLECTION)
      .documents()
      .search({
        q: q || "*",
        query_by: "title,reference_number,intro_text,full_text",
        query_by_weights: "4,3,2,1",
        filter_by: filterBy || undefined,
        sort_by: sortBy,
        page,
        per_page: PAGE_SIZE,
        num_typos: 1,
        prefix: false,
        highlight_fields: "title,intro_text",
        highlight_start_tag: "<mark>",
        highlight_end_tag: "</mark>",
        snippet_threshold: 30,
        include_fields:
          "id,title,doc_type,ministry,publication_date,reference_number,issue_number,intro_text",
      } as any);

    total = (result as any).found;
    totalPages = Math.ceil(total / PAGE_SIZE);

    rows =
      (result as any).hits?.map((hit: any) => ({
        id: parseInt(hit.document.id),
        title: hit.document.title ?? "",
        doc_type: hit.document.doc_type ?? null,
        ministry: hit.document.ministry ?? null,
        publication_date: hit.document.publication_date ?? null,
        reference_number: hit.document.reference_number ?? null,
        issue_number: hit.document.issue_number ?? null,
        intro_text: hit.document.intro_text ?? null,
        excerpt:
          hit.highlights?.find((h: any) => h.field === "intro_text")?.snippet ??
          hit.document.intro_text?.slice(0, 200) ??
          "",
      })) ?? [];
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    if (typeFilter) sp.set("type", typeFilter);
    if (ministryFilter) sp.set("ministry", ministryFilter);
    if (eraFilter) sp.set("era", eraFilter);
    if (sort !== "relevance") sp.set("sort", sort);
    if (topicFilter) sp.set("topic", topicFilter);
    return `/recherche?${sp.toString()}`;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── SEARCH HEADER ── */}
      <div className="bg-white border-b border-black/6">
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
              {topicFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#1A3A5C] text-white rounded-full px-3 py-1">
                  {topicFilter}
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
                            : "text-[#888] hover:bg-black/5"
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

        {/* ── FILTERS — powered by Typesense facets ── */}
        <SearchFilters
          docTypes={docTypes}
          ministries={ministries}
          currentQ={q}
          currentType={typeFilter}
          currentMinistry={ministryFilter}
          currentEra={eraFilter}
          currentSort={sort}
          currentTopic={topicFilter}
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
          <div className="text-center py-16 bg-white rounded-2xl border border-black/6">
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
                        <span className="text-[11px] text-[#AAA] bg-black/3 rounded px-2 py-0.5">
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

                    {/* Excerpt with Typesense highlights */}
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
                  className="px-4 py-2 text-sm border border-black/10 rounded-lg hover:bg-white transition-colors no-underline text-[#444]"
                >
                  ← Précédent
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-4 py-2 text-sm border border-black/10 rounded-lg hover:bg-white transition-colors no-underline text-[#444]"
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
