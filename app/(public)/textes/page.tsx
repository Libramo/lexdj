import { sql, count, desc, ilike, and, eq } from "drizzle-orm";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";
import { ArrowRight, FileText, BookOpen, Hash } from "lucide-react";
import { db } from "@/drizzle/src";
import { TextesFilters } from "@/components/public/text-filters";
import { laws } from "@/drizzle/src/db/schema";

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

// Loi (the most common/consequential type) gets the brand tint; every other
// type shares one neutral tone — mirrors hero-search.tsx's DOC_TYPE_COLORS,
// per ui-context.md's rule against a rainbow of pastel doc-type hues.
const DOC_TYPE_COLORS: Record<string, string> = {
  Loi: "bg-primary/10 text-primary",
};
const DEFAULT_DOC_TYPE_COLOR = "bg-muted text-muted-foreground";

function getDocTypeClass(type: string | null): string {
  if (!type) return DEFAULT_DOC_TYPE_COLOR;
  return DOC_TYPE_COLORS[type] ?? DEFAULT_DOC_TYPE_COLOR;
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
      .where(sql`id NOT IN (SELECT id FROM duplicate_laws)`)
      .groupBy(laws.doc_type)
      .orderBy(laws.doc_type),

    db
      .select({ value: laws.ministry })
      .from(laws)
      .where(sql`id NOT IN (SELECT id FROM duplicate_laws)`)
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
    sql`${laws.id} NOT IN (SELECT id FROM duplicate_laws)`,
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
      db
        .select({ doc_type: laws.doc_type, count: count() })
        .from(laws)
        .where(sql`id NOT IN (SELECT id FROM duplicate_laws)`)
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

  function quickFilterClass(active: boolean) {
    return `text-xs font-medium rounded-sm px-4 py-2 border transition-colors no-underline ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
    }`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-12">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-sans uppercase font-black text-3xl sm:text-4xl tracking-tight text-foreground mb-2">
            Textes <span className="text-muted-foreground">officiels</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            54 000+ textes — lois, décrets, arrêtés, circulaires depuis 1904
          </p>

          {/* Doc type quick filters */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/textes"
              className={quickFilterClass(!typeFilter && !eraFilter)}
            >
              Tous
            </Link>
            {docTypeCounts
              .filter((d) => d.doc_type)
              .map((d) => (
                <Link
                  key={d.doc_type}
                  href={`/textes?type=${encodeURIComponent(d.doc_type!)}`}
                  className={quickFilterClass(typeFilter === d.doc_type)}
                >
                  {d.doc_type} · {Number(d.count).toLocaleString("fr-FR")}
                </Link>
              ))}
            <Link
              href="/textes?era=colonial"
              className={quickFilterClass(eraFilter === "colonial")}
            >
              🏛 Période coloniale
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex gap-8">
        {/* ── SIDEBAR ───────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-19 space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
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

        {/* ── RESULTS ───────────────────────────────────────────────── */}
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
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {total.toLocaleString("fr-FR")}
              </span>{" "}
              texte{total > 1 ? "s" : ""}
              {hasFilters && " filtrés"}
            </p>
            {hasFilters && (
              <Link
                href="/textes"
                className="text-xs text-destructive hover:underline no-underline"
              >
                Effacer les filtres
              </Link>
            )}
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="text-center py-20 bg-background rounded-sm border border-border">
              <FileText size={28} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun résultat</p>
              {hasFilters && (
                <Link
                  href="/textes"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Effacer les filtres
                </Link>
              )}
            </div>
          )}

          {/* ── RESULTS LIST ────────────────────────────────────────── */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              {rows.map((law) => {
                const docTypeClass = getDocTypeClass(law.doc_type);
                const era = getEraTag(law.publication_date);

                return (
                  <Link
                    key={law.id}
                    href={`/textes/${law.id}`}
                    className="group bg-background border border-border rounded-sm px-4 py-3.5 sm:px-5 sm:py-4 hover:border-primary/40 transition-colors no-underline block"
                  >
                    {/* ── Row 1: badge + date on same line (all screens) ── */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`shrink-0 text-[11px] font-semibold rounded-sm px-2 py-0.5 ${docTypeClass}`}
                      >
                        {law.doc_type ?? "—"}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {law.publication_date && (
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatDate(law.publication_date)}
                          </span>
                        )}
                        {law.issue_number && (
                          <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                            <BookOpen size={9} />
                            {law.issue_number}
                          </span>
                        )}
                        <ArrowRight
                          size={13}
                          className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>

                    {/* ── Row 2: title ─────────────────────────────────── */}
                    <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                      {law.title ?? "Sans titre"}
                    </p>

                    {/* ── Row 3: intro excerpt ─────────────────────────── */}
                    {law.intro_text && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mb-2 font-light">
                        {law.intro_text.slice(0, 120)}
                      </p>
                    )}

                    {/* ── Row 4: meta chips ────────────────────────────── */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
                      {law.reference_number && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <Hash size={9} />
                          {law.reference_number}
                        </span>
                      )}
                      {law.ministry && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-50">
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
                      {/* Issue number on mobile (hidden in row 1) */}
                      {law.issue_number && (
                        <span className="sm:hidden flex items-center gap-1 text-[10px] text-muted-foreground">
                          <BookOpen size={9} />
                          {law.issue_number}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {((page - 1) * PAGE_SIZE + 1).toLocaleString("fr-FR")}–
                {Math.min(page * PAGE_SIZE, total).toLocaleString("fr-FR")} sur{" "}
                {total.toLocaleString("fr-FR")}
              </span>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted transition-colors no-underline text-foreground"
                  >
                    ← Précédent
                  </Link>
                )}
                <span className="text-sm text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors no-underline font-medium"
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
