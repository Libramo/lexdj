import { sql, count } from "drizzle-orm";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Info, BookOpen } from "lucide-react";
import { PartialIssuesTable } from "@/components/public/partial-issues-table";
import { DuplicatesTable } from "@/components/public/duplicates-table";
import { db } from "@/drizzle/src";
import { laws, scrape_logs } from "@/drizzle/src/db/schema";
import {
  AnimatedKPI,
  DecadeChart,
  TimelineSpark,
} from "@/components/public/coverage-chart";

async function getCoverageData() {
  const [
    totalLaws,
    totalMissing,
    partialIssues,
    duplicates,
    missingByDecade,
    timeline,
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(laws)
      .then((r) => Number(r[0].total)),

    db
      .select({ total: sql<number>`count(*)` })
      .from(scrape_logs)
      .where(sql`status = '404' AND level = 'law'`)
      .then((r) => Number(r[0].total)),

    db.execute(sql`
        SELECT l.issue_number, l.issue_date,
          COUNT(l.id)::int AS available,
          COALESCE(m.missing,0)::int AS missing,
          ROUND(COUNT(l.id)::numeric / (COUNT(l.id) + COALESCE(m.missing,0)) * 100)::int AS pct_complete
        FROM laws l
        LEFT JOIN (
          SELECT issue_number, COUNT(*)::int AS missing
          FROM scrape_logs WHERE status = '404' AND level = 'law'
          GROUP BY issue_number
        ) m ON m.issue_number = l.issue_number
        WHERE COALESCE(m.missing,0) > 0
        GROUP BY l.issue_number, l.issue_date, m.missing
        ORDER BY m.missing DESC LIMIT 50
      `),

    db.execute(sql`
        SELECT title, publication_date::text, issue_number,
          COUNT(*)::int AS occurrences, MIN(id)::int AS canonical_id
        FROM laws
        GROUP BY title, publication_date, issue_number
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC LIMIT 100
      `),

    db.execute(sql`
        SELECT FLOOR(EXTRACT(YEAR FROM issue_date::date)/10)*10 AS decade,
          COUNT(*)::int AS missing_count
        FROM scrape_logs s JOIN laws l ON l.issue_number = s.issue_number
        WHERE s.status='404' AND s.level='law' AND l.issue_date IS NOT NULL
        GROUP BY decade ORDER BY decade
      `),

    // Publications per year for timeline sparkline — filter valid years only
    db.execute(sql`
        SELECT EXTRACT(YEAR FROM publication_date::date)::int AS year,
          COUNT(*)::int AS count
        FROM laws
        WHERE publication_date IS NOT NULL
          AND EXTRACT(YEAR FROM publication_date::date) BETWEEN 1900 AND 2030
        GROUP BY year ORDER BY year
      `),
  ]);

  return {
    totalLaws,
    totalMissing,
    partialIssues: partialIssues.rows as {
      issue_number: string;
      issue_date: string;
      available: number;
      missing: number;
      pct_complete: number;
    }[],
    duplicates: duplicates.rows as {
      title: string;
      publication_date: string;
      issue_number: string;
      occurrences: number;
      canonical_id: number;
    }[],
    missingByDecade: missingByDecade.rows as {
      decade: number;
      missing_count: number;
    }[],
    timeline: timeline.rows as { year: number; count: number }[],
  };
}

export default async function CoveragePage() {
  const {
    totalLaws,
    totalMissing,
    partialIssues,
    duplicates,
    missingByDecade,
    timeline,
  } = await getCoverageData();

  const totalAttempted = totalLaws + totalMissing;
  const overallPct = Math.round((totalLaws / totalAttempted) * 100);
  const multiPubCount = duplicates.reduce((s, d) => s + d.occurrences - 1, 0);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── HEADER ── */}
      <div className="bg-[#1A3A5C] text-white">
        <div className="max-w-5xl mx-auto px-8 py-14">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-['Libre_Baskerville'] text-4xl md:text-5xl font-normal leading-tight mb-4">
            Couverture
            <br />
            <em className="text-[#9DC4E0]">de l'archive</em>
          </h1>
          <p className="text-white/50 text-sm font-light max-w-lg mb-10">
            Transparence sur l'état de l'indexation — ce qui est disponible, ce
            qui manque, et pourquoi.
          </p>

          {/* Timeline sparkline in header */}
          {timeline.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                Publications par année · 1904–2026
              </p>
              <TimelineSpark data={timeline} />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-12 space-y-12">
        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 -mt-8">
          <AnimatedKPI
            value={totalLaws}
            label="Disponibles"
            sublabel="textes indexés"
            icon={<CheckCircle size={14} className="text-emerald-500" />}
            color="bg-emerald-400"
            barPct={overallPct}
          />
          <AnimatedKPI
            value={totalMissing}
            label="Manquants"
            sublabel="non disponibles en ligne"
            icon={<AlertTriangle size={14} className="text-amber-500" />}
            color="bg-amber-400"
            barPct={Math.round((totalMissing / totalAttempted) * 100)}
          />
          <AnimatedKPI
            value={overallPct}
            label="Couverture"
            sublabel="taux de disponibilité"
            icon={<Info size={14} className="text-[#4A7FA8]" />}
            color="bg-[#1A3A5C]"
            barPct={overallPct}
          />
          <AnimatedKPI
            value={multiPubCount}
            label="Multi-publiés"
            sublabel="textes dans plusieurs numéros"
            icon={<BookOpen size={14} className="text-violet-500" />}
            color="bg-violet-400"
          />
        </div>

        {/* ── ALERT ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-0.5">
              Textes manquants concentrés sur 1977–1983
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Les premières années de la République de Djibouti sont les moins
              bien couvertes. Ces numéros existent mais leurs textes individuels
              ne sont pas disponibles en version numérique sur le portail
              officiel. Consultez les{" "}
              <strong>archives physiques du Journal Officiel</strong> pour ces
              périodes.
            </p>
          </div>
        </div>

        {/* ── DECADE CHART ── */}
        <div>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111]">
              Textes manquants par décennie
            </h2>
            <span className="text-xs text-[#AAA]">
              {totalMissing.toLocaleString("fr-FR")} au total
            </span>
          </div>
          <div className="bg-white border border-black/[0.07] rounded-xl p-6">
            <DecadeChart data={missingByDecade} />
          </div>
        </div>

        {/* ── MULTI-PUBLISHED ── */}
        <div>
          <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] mb-2">
            Textes multi-publiés
          </h2>
          <p className="text-sm text-[#888] mb-5 leading-relaxed">
            Ces textes apparaissent dans plusieurs numéros distincts du Journal
            Officiel — republication, annexe ou référence croisée. Chaque entrée
            correspond à une URL source différente. Il ne s'agit pas d'erreurs.
          </p>
          <DuplicatesTable duplicates={duplicates} />
        </div>

        {/* ── PARTIAL ISSUES ── */}
        <div>
          <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] mb-2">
            Numéros avec contenu partiel
          </h2>
          <p className="text-sm text-[#888] mb-5 leading-relaxed">
            Ces numéros ont été identifiés dans l'index mais certains textes
            individuels retournent une erreur 404 sur le portail officiel.
          </p>
          <PartialIssuesTable issues={partialIssues} />
        </div>

        {/* ── FOOTER NOTE ── */}
        <div className="border-t border-black/[0.06] pt-8 pb-4">
          <p className="text-xs text-[#AAA] leading-relaxed max-w-2xl">
            Cette page est mise à jour automatiquement à chaque indexation. Les
            données proviennent du portail officiel du Journal Officiel de la
            République de Djibouti. Pour signaler une erreur ou un texte
            manquant, consultez les{" "}
            <Link
              href="/textes"
              className="text-[#1A3A5C] hover:underline no-underline"
            >
              archives disponibles
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
