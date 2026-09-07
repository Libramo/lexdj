import { sql } from "drizzle-orm";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Info, BookOpen } from "lucide-react";
import { PartialIssuesTable } from "@/components/public/partial-issues-table";
import { DuplicatesTable } from "@/components/public/duplicates-table";

import { db } from "@/drizzle/src";
import { scrape_logs } from "@/drizzle/src/db/schema";
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
    duplicateCount,
  ] = await Promise.all([
    // Total laws excluding duplicates
    db
      .execute(
        sql`
        SELECT COUNT(*)::int as total
        FROM laws
        WHERE id NOT IN (SELECT id FROM duplicate_laws)
      `,
      )
      .then((r) => Number((r.rows[0] as any).total)),

    // Total missing laws from scrape_logs
    db
      .execute(
        sql`
        SELECT COUNT(*)::int as total
        FROM scrape_logs
        WHERE status IN ('404', 'base_url') AND level = 'law'
      `,
      )
      .then((r) => Number((r.rows[0] as any).total)),

    // Issues with partial content — exclude duplicates from law counts
    db.execute(sql`
      SELECT l.issue_number, l.issue_date,
  COUNT(l.id)::int AS available,
  MAX(COALESCE(m.missing, 0))::int AS missing,
  ROUND(COUNT(l.id)::numeric / (COUNT(l.id) + MAX(COALESCE(m.missing, 0))) * 100)::int AS pct_complete
FROM laws l
LEFT JOIN (
  SELECT issue_number, COUNT(*)::int AS missing
  FROM scrape_logs
  WHERE status IN ('404', 'base_url') AND level = 'law'
  GROUP BY issue_number
) m ON m.issue_number = l.issue_number
WHERE COALESCE(m.missing, 0) > 0
  AND l.id NOT IN (SELECT id FROM duplicate_laws)
GROUP BY l.issue_number, l.issue_date
ORDER BY MAX(COALESCE(m.missing, 0)) DESC
LIMIT 50
    `),

    // Duplicates — group by law, count occurrences, link to canonical version
    // canonical_id is the MIN(id) kept in laws, occurrences = duplicates + 1
    db.execute(sql`
      SELECT
        d.title,
        d.publication_date::text,
        d.issue_number,
        MIN(l.id)::int AS canonical_id,
        COUNT(*)::int + 1 AS occurrences
      FROM duplicate_laws d
      JOIN laws l
        ON l.title = d.title
        AND l.issue_number = d.issue_number
        AND l.id NOT IN (SELECT id FROM duplicate_laws)
      GROUP BY d.title, d.publication_date, d.issue_number
      ORDER BY occurrences DESC
      LIMIT 100
    `),

    // Missing laws by decade — exclude duplicates from inner laws subquery
    db.execute(sql`
      SELECT FLOOR(EXTRACT(YEAR FROM issue_date::date) / 10) * 10 AS decade,
        COUNT(*)::int AS missing_count
      FROM scrape_logs s
      JOIN (
        SELECT DISTINCT issue_number, MIN(issue_date) AS issue_date
        FROM laws
        WHERE issue_number IS NOT NULL
          AND issue_date IS NOT NULL
          AND id NOT IN (SELECT id FROM duplicate_laws)
        GROUP BY issue_number
      ) l ON l.issue_number = s.issue_number
      WHERE s.status IN ('404', 'base_url') AND s.level = 'law'
        AND l.issue_date IS NOT NULL
      GROUP BY decade
      ORDER BY decade
    `),

    // Publications per year — exclude duplicates
    db.execute(sql`
      SELECT EXTRACT(YEAR FROM publication_date::date)::int AS year,
        COUNT(*)::int AS count
      FROM laws
      WHERE publication_date IS NOT NULL
        AND EXTRACT(YEAR FROM publication_date::date) BETWEEN 1900 AND 2030
        AND id NOT IN (SELECT id FROM duplicate_laws)
      GROUP BY year
      ORDER BY year
    `),

    // Duplicate count — query directly from duplicate_laws table
    db
      .execute(sql`SELECT COUNT(*)::int AS duplicates FROM duplicate_laws`)
      .then((r) => Number((r.rows[0] as any).duplicates)),
  ]);

  return {
    totalLaws,
    totalMissing,
    duplicateCount,
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
    duplicateCount,
  } = await getCoverageData();

  const totalAttempted = totalLaws + totalMissing;
  const overallPct = Math.round((totalLaws / totalAttempted) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-8 py-14">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium mb-3">
            LexDJ · Archive non officielle
          </p>
          <h1 className="font-sans uppercase font-black text-4xl md:text-5xl tracking-tight leading-tight text-foreground mb-4">
            Couverture <span className="text-muted-foreground">de l'archive</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mb-10">
            Transparence sur l'état de l'indexation — ce qui est disponible, ce
            qui manque, et pourquoi.
          </p>

          {/* Timeline sparkline in header */}
          {timeline.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">
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
            icon={<Info size={14} className="text-primary" />}
            color="bg-primary"
            barPct={overallPct}
          />
          <AnimatedKPI
            value={duplicateCount}
            label="En double"
            sublabel="entrées dupliquées sur le portail"
            icon={<BookOpen size={14} className="text-violet-500" />}
            color="bg-violet-400"
          />
        </div>

        {/* ── ALERT ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-5 py-4 flex gap-3">
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
            <h2 className="font-sans uppercase font-bold text-foreground text-xl tracking-tight">
              Textes manquants par décennie
            </h2>
            <span className="text-xs text-muted-foreground">
              {totalMissing.toLocaleString("fr-FR")} au total
            </span>
          </div>
          <div className="bg-background border border-border rounded-sm p-6">
            <DecadeChart data={missingByDecade} />
          </div>
        </div>

        {/* ── DUPLICATES ── */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="font-sans uppercase font-bold text-foreground text-xl tracking-tight">
              Textes en double
            </h2>
            <span className="text-xs text-muted-foreground">
              Rapport (fichier csv) disponible sur demande
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Ces textes ont plusieurs URLs sur le portail officiel pointant vers
            le même contenu — probablement un artefact de pagination du CMS. Ce
            fichier peut être transmis aux gestionnaires du portail officiel.
          </p>
          <DuplicatesTable duplicates={duplicates} />
        </div>

        {/* ── PARTIAL ISSUES ── */}
        <div>
          <h2 className="font-sans uppercase font-bold text-foreground text-xl tracking-tight mb-2">
            Numéros avec contenu partiel
          </h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Ces numéros ont été identifiés dans l'index mais certains textes
            individuels retournent une erreur 404 sur le portail officiel.
          </p>
          <PartialIssuesTable issues={partialIssues} />
        </div>

        {/* ── FOOTER NOTE ── */}
        <div className="border-t border-border pt-8 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Cette page est mise à jour automatiquement à chaque indexation. Les
            données proviennent du portail officiel du Journal Officiel de la
            République de Djibouti. Pour signaler une erreur ou un texte
            manquant, consultez les{" "}
            <Link
              href="/textes"
              className="text-primary hover:underline no-underline"
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
