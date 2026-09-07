import { sql, count, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { db } from "@/drizzle/src";

const PAGE_SIZE = 36;

interface Props {
  searchParams: Promise<{ page?: string; era?: string; q?: string }>;
}

function formatDate(d: string | null, format: "long" | "short" = "long") {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("fr-DJ", {
      day: "numeric",
      month: format === "long" ? "long" : "short",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

function getEra(date: string | null): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  if (!date) return { label: "", color: "", bg: "", dot: "" };
  if (date < "1977-06-27")
    return {
      label: "Colonial",
      color: "text-amber-700",
      bg: "bg-amber-50",
      dot: "bg-amber-400",
    };
  if (date < "1990-01-01")
    return {
      label: "Post-indép.",
      color: "text-violet-700",
      bg: "bg-violet-50",
      dot: "bg-violet-400",
    };
  if (date < "2000-01-01")
    return {
      label: "1990s",
      color: "text-cyan-700",
      bg: "bg-cyan-50",
      dot: "bg-cyan-400",
    };
  return {
    label: "Moderne",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-400",
  };
}

export default async function JournalPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const eraFilter = params.era ?? "";
  const q = params.q?.trim() ?? "";

  // Era boundaries are fixed literals, not user input — safe as static SQL
  // fragments. `q` below is the one user-controlled value and is bound as
  // a parameter via the tagged `sql` template, never string-concatenated
  // (see architecture.md Invariant 7 — this previously used sql.raw() with
  // unescaped interpolation, a real SQL injection, fixed here).
  const ERA_CONDITIONS: Record<string, ReturnType<typeof sql>> = {
    colonial: sql`issue_date < '1977-06-27'`,
    independence: sql`issue_date >= '1977-06-27' AND issue_date < '1990-01-01'`,
    modern: sql`issue_date >= '1990-01-01'`,
  };

  const conditions = [
    sql`issue_number IS NOT NULL`,
    eraFilter && ERA_CONDITIONS[eraFilter] ? ERA_CONDITIONS[eraFilter] : undefined,
    q
      ? sql`(issue_number ILIKE ${`%${q}%`} OR issue_date::text ILIKE ${`%${q}%`})`
      : undefined,
    sql`id NOT IN (SELECT id FROM duplicate_laws)`,
  ].filter(Boolean) as ReturnType<typeof sql>[];

  const whereSql = sql.join(conditions, sql` AND `);

  const [issuesResult, totalResult, stats] = await Promise.all([
    db.execute(sql`
      SELECT issue_number, issue_date, COUNT(*)::int as count
      FROM laws
      WHERE ${whereSql}
      GROUP BY issue_number, issue_date
      ORDER BY issue_date DESC NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
    `),
    db.execute(sql`
      SELECT COUNT(DISTINCT issue_number)::int as total
      FROM laws WHERE ${whereSql}
    `),
    // Era breakdown for the header
    db.execute(sql`
      SELECT
        CASE
          WHEN issue_date < '1977-06-27' THEN 'colonial'
          WHEN issue_date < '1990-01-01' THEN 'independence'
          ELSE 'modern'
        END as era,
        COUNT(DISTINCT issue_number)::int as count
      FROM laws
      WHERE issue_number IS NOT NULL AND issue_date IS NOT NULL
        AND id NOT IN (SELECT id FROM duplicate_laws)
      GROUP BY era
      ORDER BY era
    `),
  ]);

  const rows = issuesResult.rows as {
    issue_number: string;
    issue_date: string;
    count: number;
  }[];
  const total = Number((totalResult.rows[0] as any)?.total ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const eraStats = stats.rows as { era: string; count: number }[];

  const eraLabels: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    colonial: {
      label: "Période coloniale",
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    independence: {
      label: "Post-indépendance",
      color: "text-violet-700",
      bg: "bg-violet-50",
    },
    modern: {
      label: "Période moderne",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
  };

  function issueUrl(num: string) {
    return `/journal/${num.split("/").map(encodeURIComponent).join("/")}`;
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    if (eraFilter) sp.set("era", eraFilter);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return `/journal${s ? `?${s}` : ""}`;
  }

  function eraFilterClass(active: boolean) {
    return `text-xs font-medium rounded-sm px-4 py-2 transition-colors no-underline border ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
    }`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-sans uppercase font-black text-4xl md:text-5xl tracking-tight leading-tight text-foreground mb-2">
            Numéros <span className="text-muted-foreground">archivés</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-10">
            {Number(total).toLocaleString("fr-FR")} numéros · de 1904 à
            aujourd'hui
          </p>

          <form method="GET" action="/journal" className="mb-8 w-full">
            {eraFilter && <input type="hidden" name="era" value={eraFilter} />}
            <div className="relative">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Rechercher un numéro ou une date..."
                className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm pl-4 pr-12 py-3 rounded-sm focus:outline-none focus:border-primary/40 transition-colors"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </div>
          </form>

          {/* Era filter pills */}
          <div className="flex flex-wrap gap-2">
            <Link href="/journal" className={eraFilterClass(!eraFilter)}>
              Tous les numéros
            </Link>
            {eraStats.map((e) => {
              const meta = eraLabels[e.era] ?? {
                label: e.era,
                color: "",
                bg: "",
              };
              return (
                <Link
                  key={e.era}
                  href={`/journal?era=${e.era}`}
                  className={eraFilterClass(eraFilter === e.era)}
                >
                  {meta.label} · {Number(e.count).toLocaleString("fr-FR")}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Results info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {q ? (
              <>
                <span className="font-semibold text-foreground">
                  {Number(total).toLocaleString("fr-FR")}
                </span>{" "}
                résultat{Number(total) > 1 ? "s" : ""} pour{" "}
                <span className="font-semibold text-foreground">« {q} »</span>
              </>
            ) : eraFilter ? (
              <>
                {Number(total).toLocaleString("fr-FR")} numéros ·{" "}
                {eraLabels[eraFilter]?.label}
              </>
            ) : (
              <>{Number(total).toLocaleString("fr-FR")} numéros au total</>
            )}
          </p>
          <div className="flex items-center gap-3">
            {q && (
              <Link
                href={`/journal${eraFilter ? `?era=${eraFilter}` : ""}`}
                className="text-xs text-destructive hover:underline no-underline"
              >
                Effacer
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((issue) => {
            const era = getEra(issue.issue_date);
            const n = Number(issue.count);

            return (
              <Link
                key={issue.issue_number}
                href={issue.issue_number ? issueUrl(issue.issue_number) : "#"}
                className="group bg-background border border-border rounded-sm p-4 hover:border-primary/40 transition-colors no-underline overflow-hidden relative"
              >
                {/* Era badge */}
                {era.label && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium ${era.color} ${era.bg} rounded-sm px-2 py-0.5 mb-3`}
                  >
                    <span className={`w-1 h-1 rounded-full ${era.dot}`} />
                    {era.label}
                  </span>
                )}

                {/* Issue number — big */}
                <div className="mb-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Numéro
                  </p>
                  <p className="font-serif text-lg font-normal text-foreground group-hover:text-primary transition-colors leading-tight">
                    {issue.issue_number}
                  </p>
                </div>

                {/* Date */}
                {issue.issue_date && (
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    {formatDate(issue.issue_date, "short")}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen size={11} />
                    {n.toLocaleString("fr-FR")} texte{n > 1 ? "s" : ""}
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Numéros {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} sur{" "}
              {total.toLocaleString("fr-FR")}
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
  );
}
