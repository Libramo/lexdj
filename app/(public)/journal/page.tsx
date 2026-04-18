import { sql, count, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { db } from "@/drizzle/src";

const PAGE_SIZE = 36;

interface Props {
  searchParams: Promise<{ page?: string; era?: string }>;
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

  const eraConditions: Record<string, string> = {
    colonial: "issue_date < '1977-06-27'",
    independence: "issue_date >= '1977-06-27' AND issue_date < '1990-01-01'",
    modern: "issue_date >= '1990-01-01'",
  };

  const whereClause =
    eraFilter && eraConditions[eraFilter]
      ? `WHERE issue_number IS NOT NULL AND ${eraConditions[eraFilter]}`
      : "WHERE issue_number IS NOT NULL";

  const [issues, totalResult, stats] = await Promise.all([
    db.execute(
      sql.raw(`
      SELECT issue_number, issue_date, COUNT(*)::int as count
      FROM laws
      ${whereClause}
      GROUP BY issue_number, issue_date
      ORDER BY issue_date DESC NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
    `),
    ),
    db.execute(
      sql.raw(`
      SELECT COUNT(DISTINCT issue_number)::int as total
      FROM laws ${whereClause}
    `),
    ),
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
      GROUP BY era
      ORDER BY era
    `),
  ]);

  const rows = issues.rows as {
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
    const s = sp.toString();
    return `/journal${s ? `?${s}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── HEADER ── */}
      <div className="bg-[#1A3A5C] text-white">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-['Libre_Baskerville'] text-4xl md:text-5xl font-normal leading-tight mb-2">
            Numéros
            <br />
            <em className="text-[#9DC4E0]">archivés</em>
          </h1>
          <p className="text-white/50 text-sm font-light mb-10">
            {Number(total).toLocaleString("fr-FR")} numéros · de 1904 à
            aujourd'hui
          </p>

          {/* Era filter pills */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/journal"
              className={`text-xs font-medium rounded-full px-4 py-2 transition-colors no-underline border ${
                !eraFilter
                  ? "bg-white text-[#1A3A5C] border-white"
                  : "text-white/70 border-white/20 hover:border-white/40 hover:text-white"
              }`}
            >
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
                  className={`text-xs font-medium rounded-full px-4 py-2 transition-colors no-underline border ${
                    eraFilter === e.era
                      ? "bg-white text-[#1A3A5C] border-white"
                      : "text-white/70 border-white/20 hover:border-white/40 hover:text-white"
                  }`}
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
          <p className="text-sm text-[#888]">
            {eraFilter ? (
              <>
                {Number(total).toLocaleString("fr-FR")} numéros ·{" "}
                {eraLabels[eraFilter]?.label}
              </>
            ) : (
              <>{Number(total).toLocaleString("fr-FR")} numéros au total</>
            )}
          </p>
          <span className="text-xs text-[#AAA]">
            Page {page} / {totalPages}
          </span>
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
                className="group bg-white border border-black/[0.07] rounded-xl p-4 hover:border-[#1A3A5C]/25 hover:shadow-md hover:-translate-y-0.5 transition-all no-underline overflow-hidden relative"
              >
                {/* Era badge */}
                {era.label && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium ${era.color} ${era.bg} rounded-full px-2 py-0.5 mb-3`}
                  >
                    <span className={`w-1 h-1 rounded-full ${era.dot}`} />
                    {era.label}
                  </span>
                )}

                {/* Issue number — big */}
                <div className="mb-1">
                  <p className="text-xs text-[#AAA] font-medium uppercase tracking-wider">
                    Numéro
                  </p>
                  <p className="font-['Libre_Baskerville'] text-lg font-normal text-[#111] group-hover:text-[#1A3A5C] transition-colors leading-tight">
                    {issue.issue_number}
                  </p>
                </div>

                {/* Date */}
                {issue.issue_date && (
                  <p className="text-xs text-[#888] mt-1 mb-3">
                    {formatDate(issue.issue_date, "short")}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-black/[0.05]">
                  <span className="flex items-center gap-1.5 text-xs text-[#AAA]">
                    <BookOpen size={11} />
                    {n.toLocaleString("fr-FR")} texte{n > 1 ? "s" : ""}
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-[#CCC] group-hover:text-[#1A3A5C] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-black/[0.06]">
            <span className="text-sm text-[#888]">
              Numéros {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} sur{" "}
              {total.toLocaleString("fr-FR")}
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
  );
}
