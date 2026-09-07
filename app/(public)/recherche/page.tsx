import { meiliClient } from "@/lib/meilisearch";
import { LAWS_INDEX } from "@/lib/meilisearch-schema";
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

function quote(value: string): string {
  return JSON.stringify(value);
}

// publication_date_ts (YYYYMMDD as an integer) is what these ranges filter
// on — Meilisearch's comparison operators only work on numeric attributes,
// not the display-only publication_date string (see lib/meilisearch-schema.ts).
const ERA_FILTERS: Record<string, string> = {
  colonial: "publication_date_ts < 19770627",
  independence:
    "publication_date_ts >= 19770627 AND publication_date_ts < 19900101",
  modern: "publication_date_ts >= 19900101",
};

// Loi (the most common/consequential type) gets the brand tint; every other
// type shares one neutral tone — mirrors hero-search.tsx's DOC_TYPE_COLORS.
const DOC_TYPE_COLORS: Record<string, string> = {
  Loi: "bg-primary/10 text-primary",
};
const DEFAULT_DOC_TYPE_COLOR = "bg-muted text-muted-foreground";

// ── Highlight rendering — Meilisearch wraps matches in <mark> tags ────────────
function ExcerptHighlight({ text }: { text: string }) {
  // highlightPreTag/highlightPostTag are set to <mark> on the search call —
  // render the resulting HTML safely
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

  // ── Build Meilisearch filter expression ───────────────────────────────────
  const filters: string[] = [];
  if (typeFilter) filters.push(`doc_type = ${quote(typeFilter)}`);
  if (ministryFilter)
    filters.push(`ministry_normalized = ${quote(ministryFilter)}`);
  if (eraFilter && ERA_FILTERS[eraFilter]) filters.push(ERA_FILTERS[eraFilter]);
  if (topicFilter) filters.push(`topics = ${quote(topicFilter)}`);
  const filterBy = filters.join(" AND ");

  // ── Sort ──────────────────────────────────────────────────────────────────
  // Meilisearch's default ranking rules already place `sort` after
  // words/typo/proximity/attribute and before exactness, so pub_year:desc
  // alongside a text query gives "relevance first, date tiebreak" for free —
  // no separate relevance-vs-browse case needed like Typesense required.
  const sortArr =
    sort === "date_desc"
      ? ["pub_year:desc"]
      : sort === "date_asc"
        ? ["pub_year:asc"]
        : ["pub_year:desc"];

  // ── Search ────────────────────────────────────────────────────────────────
  let rows: any[] = [];
  let total = 0;
  let totalPages = 0;
  let docTypes: { value: string; count: number }[] = [];
  let ministries: { value: string; count: number }[] = [];

  // Always fetch facets so the filter sidebar is populated even on empty state
  // limit=0 means we get facet counts without fetching any documents
  const facetResult = await meiliClient.index(LAWS_INDEX).search("", {
    limit: 0,
    facets: ["doc_type", "ministry_normalized", "topics"],
    filter: filterBy || undefined,
  } as any);

  const facetDistribution = (facetResult as any).facetDistribution ?? {};

  docTypes = Object.entries(facetDistribution.doc_type ?? {}).map(
    ([value, count]) => ({ value, count: count as number }),
  );

  ministries = Object.entries(facetDistribution.ministry_normalized ?? {}).map(
    ([value, count]) => ({ value, count: count as number }),
  );

  // Only fetch results when there is a query or active filter
  if (q || hasFilters) {
    const result = await meiliClient.index(LAWS_INDEX).search(q, {
      filter: filterBy || undefined,
      sort: sortArr,
      page,
      hitsPerPage: PAGE_SIZE,
      matchingStrategy: "all",
      attributesToHighlight: ["intro_text"],
      attributesToCrop: ["intro_text"],
      cropLength: 30,
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      attributesToRetrieve: [
        "id",
        "title",
        "doc_type",
        "ministry",
        "publication_date",
        "reference_number",
        "issue_number",
        "intro_text",
      ],
    } as any);

    total = (result as any).totalHits ?? 0;
    totalPages = (result as any).totalPages ?? Math.ceil(total / PAGE_SIZE);

    rows =
      result.hits?.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title ?? "",
        doc_type: hit.doc_type ?? null,
        ministry: hit.ministry ?? null,
        publication_date: hit.publication_date ?? null,
        reference_number: hit.reference_number ?? null,
        issue_number: hit.issue_number ?? null,
        intro_text: hit.intro_text ?? null,
        excerpt:
          hit._formatted?.intro_text ?? hit.intro_text?.slice(0, 200) ?? "",
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
    <div className="min-h-screen bg-background">
      {/* ── SEARCH HEADER ── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="font-sans uppercase font-bold text-foreground text-2xl tracking-tight mb-5">
            Recherche plein texte
          </h1>
          <SearchInput initialQ={q} />

          {hasFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {typeFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-sm px-3 py-1">
                  {typeFilter}
                </span>
              )}
              {ministryFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-sm px-3 py-1">
                  {toTitleCase(ministryFilter)}
                </span>
              )}
              {eraFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-sm px-3 py-1">
                  {eraFilter === "colonial"
                    ? "Période coloniale"
                    : eraFilter === "independence"
                      ? "1977–1990"
                      : "Période moderne"}
                </span>
              )}
              {topicFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-sm px-3 py-1">
                  {topicFilter}
                </span>
              )}
              <Link
                href={`/recherche?q=${encodeURIComponent(q)}`}
                className="text-xs text-destructive hover:underline no-underline self-center"
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
            <p className="text-sm text-muted-foreground">
              {total === 0 ? (
                "Aucun résultat"
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    {total.toLocaleString("fr-FR")}
                  </span>{" "}
                  résultat{total > 1 ? "s" : ""}
                  {q && (
                    <>
                      {" "}
                      pour{" "}
                      <span className="font-semibold text-foreground">« {q} »</span>
                    </>
                  )}
                </>
              )}
            </p>
            <div className="flex items-center gap-3">
              {q && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                        className={`px-2.5 py-1 rounded-sm transition-colors no-underline ${
                          sort === s.value
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted"
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

        {/* ── FILTERS — powered by Meilisearch facets ── */}
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
            <div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <FileText size={24} className="text-primary" />
            </div>
            <p className="text-muted-foreground text-sm mb-1 font-medium">
              Recherchez dans 54 000+ textes officiels
            </p>
            <p className="text-muted-foreground text-xs mb-8">
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
                  className="text-xs text-primary bg-primary/10 border border-primary/10 rounded-sm px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors no-underline"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── NO RESULTS ── */}
        {(q || hasFilters) && rows.length === 0 && (
          <div className="text-center py-16 bg-background rounded-sm border border-border">
            <p className="text-sm text-muted-foreground mb-1">
              Aucun texte ne correspond à votre recherche
            </p>
            <p className="text-xs text-muted-foreground">
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
                className="group block bg-background border border-border rounded-sm px-5 py-4 hover:border-primary/40 transition-colors no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums font-mono w-5">
                        {(page - 1) * PAGE_SIZE + i + 1}.
                      </span>
                      {law.doc_type && (
                        <span
                          className={`text-[11px] font-medium rounded-sm px-2 py-0.5 ${
                            DOC_TYPE_COLORS[law.doc_type] ?? DEFAULT_DOC_TYPE_COLOR
                          }`}
                        >
                          {law.doc_type}
                        </span>
                      )}
                      {law.issue_number && (
                        <span className="text-[11px] text-muted-foreground bg-muted rounded-sm px-2 py-0.5">
                          N° {law.issue_number}
                        </span>
                      )}
                      {law.publication_date && (
                        <span className="text-[11px] text-muted-foreground">
                          {law.publication_date < "1977-06-27"
                            ? "🏛 Période coloniale"
                            : law.publication_date < "1990-01-01"
                              ? "⭐ Post-indépendance"
                              : null}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors mb-1.5">
                      <TitleHighlight text={law.title ?? "Sans titre"} q={q} />
                    </p>

                    {/* Excerpt with Meilisearch highlights */}
                    {law.excerpt && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-light mb-2">
                        <ExcerptHighlight text={law.excerpt} />
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {law.ministry && (
                        <span className="text-[11px] text-muted-foreground">
                          {toTitleCase(law.ministry)}
                        </span>
                      )}
                      {law.reference_number && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {law.reference_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="shrink-0 flex flex-col items-end gap-1 pt-1">
                    {law.publication_date && (
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
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
            <span className="text-sm text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
              sur {total.toLocaleString("fr-FR")}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors no-underline text-foreground"
                >
                  ← Précédent
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors no-underline text-foreground"
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
