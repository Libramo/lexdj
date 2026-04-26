// app/(admin)/dashboard/laws/page.tsx

import Link from "next/link";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";
import { desc, ilike, eq, and, sql } from "drizzle-orm";
import { FileEdit, AlertTriangle, CheckCircle2, Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    filter?: string;
    year?: string;
  }>;
}

const PAGE_SIZE = 50;
const SHORT_TEXT_THRESHOLD = 80;

// Years range for the filter dropdown — oldest JO is 1904
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR - 1904 + 1 },
  (_, i) => CURRENT_YEAR - i,
);

export default async function AdminLawsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const filter = params.filter ?? "all";
  const year = params.year ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [
    q ? ilike(laws.title, `%${q}%`) : undefined,
    filter === "corrected" ? eq(laws.ocr_corrected, true) : undefined,
    filter === "uncorrected" ? eq(laws.ocr_corrected, false) : undefined,
    year
      ? sql`extract(year from ${laws.publication_date}::date) = ${Number(year)}`
      : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }], [{ totalCorrected }], [{ totalUncorrected }]] =
    await Promise.all([
      db
        .select({
          id: laws.id,
          title: laws.title,
          doc_type: laws.doc_type,
          publication_date: laws.publication_date,
          ministry: laws.ministry,
          ocr_corrected: laws.ocr_corrected,
          textLength: sql<number>`char_length(coalesce(${laws.full_text}, '') || coalesce(${laws.intro_text}, ''))`,
        })
        .from(laws)
        .where(where)
        .orderBy(desc(laws.publication_date))
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)` })
        .from(laws)
        .where(where),
      db
        .select({ totalCorrected: sql<number>`count(*)` })
        .from(laws)
        .where(eq(laws.ocr_corrected, true)),
      db
        .select({ totalUncorrected: sql<number>`count(*)` })
        .from(laws)
        .where(eq(laws.ocr_corrected, false)),
    ]);

  const totalPages = Math.ceil(Number(total) / PAGE_SIZE);

  function tabUrl(f: string) {
    const sp = new URLSearchParams();
    sp.set("filter", f);
    if (q) sp.set("q", q);
    if (year) sp.set("year", year);
    return `/dashboard/laws?${sp.toString()}`;
  }

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (q) sp.set("q", q);
    if (filter !== "all") sp.set("filter", filter);
    if (year) sp.set("year", year);
    return `/dashboard/laws?${sp.toString()}`;
  }

  const tabs = [
    {
      key: "all",
      label: "Tous",
      count: Number(totalCorrected) + Number(totalUncorrected),
    },
    {
      key: "uncorrected",
      label: "À corriger",
      count: Number(totalUncorrected),
    },
    { key: "corrected", label: "Corrigés", count: Number(totalCorrected) },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-[#1A3A5C] text-white px-6 py-4 flex items-center gap-4">
        <FileEdit className="h-5 w-5" />
        <div>
          <h1 className="font-bold text-lg leading-none">LexDJ Admin</h1>
          <p className="text-blue-200 text-xs mt-0.5">
            Éditeur de corrections OCR
          </p>
        </div>
        <span className="ml-auto text-blue-200 text-sm">
          {Number(total).toLocaleString()} textes
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Search ─────────────────────────────────────────────── */}
        <form method="GET" className="mb-6 flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher par titre…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent"
            />
          </div>
          <select
            name="year"
            defaultValue={year}
            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C] focus:border-transparent"
          >
            <option value="">Toutes années</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg bg-[#1A3A5C] text-white text-sm font-medium hover:bg-[#15304d] transition-colors"
          >
            Chercher
          </button>
          {(q || year) && (
            <Link
              href={tabUrl(filter)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Effacer
            </Link>
          )}
        </form>

        {/* ── Filter tabs ─────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tabUrl(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-[#1A3A5C] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  filter === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {Number(tab.count).toLocaleString()}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Legend ─────────────────────────────────────────────── */}
        <div className="flex gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Texte court — OCR probable
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Texte OK
          </span>
        </div>

        {/* ── Table ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Titre</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 font-medium text-center">OCR</th>
                <th className="px-4 py-3 font-medium text-center">Corrigé</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const flagged = row.textLength < SHORT_TEXT_THRESHOLD;
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="line-clamp-2 text-slate-800 font-medium leading-snug">
                        {row.title}
                      </span>
                      {row.ministry && (
                        <span className="text-xs text-slate-400 mt-0.5 block truncate max-w-xs">
                          {row.ministry}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-500">
                        {row.doc_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-500">
                        {row.publication_date
                          ? new Date(row.publication_date).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {flagged ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-[10px] text-slate-400">
                            {row.textLength}c
                          </span>
                        </div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.ocr_corrected ? (
                        <CheckCircle2 className="h-4 w-4 text-[#1A3A5C] mx-auto" />
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/laws/${row.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1A3A5C] text-white text-xs font-medium hover:bg-[#15304d] transition-colors"
                      >
                        <FileEdit className="h-3 w-3" />
                        Éditer
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-400 text-sm"
                  >
                    Aucun texte trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  ← Précédent
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Suivant →
                </Link>
              )}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
