import { eq, desc, sql, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, FileText } from "lucide-react";
import { db } from "@/drizzle/src";
import { issues, laws, scrape_logs } from "@/drizzle/src/db/schema";
import { toTitleCase } from "@/lib/utils";
import { InaccessiblesSection } from "@/components/public/inaccessibles-section";

interface Props {
  params: Promise<{ issue: string[] }>;
}

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("fr-DJ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

export default async function IssuePage({ params }: Props) {
  const { issue: issueParts } = await params;
  const issue = issueParts.map(decodeURIComponent).join("/");

  const [rows, missingRows] = await Promise.all([
    // Laws for this issue — exclude duplicates
    db
      .select({
        id: laws.id,
        title: laws.title,
        doc_type: laws.doc_type,
        reference_number: laws.reference_number,
        ministry: laws.ministry,
        publication_date: laws.publication_date,
        mesure: laws.mesure,
        issue_date: laws.issue_date,
        signed_by: laws.signed_by,
      })
      .from(laws)
      .where(
        and(
          eq(laws.issue_number, issue),
          sql`${laws.id} NOT IN (SELECT id FROM duplicate_laws)`,
        ),
      )
      .orderBy(laws.id),

    // Inaccessible laws for this issue — slugless base_url entries from scrape_logs
    db
      .select({
        url: scrape_logs.url,
        title: scrape_logs.title,
        ministry: scrape_logs.ministry,
      })
      .from(scrape_logs)
      .where(
        sql`issue_number = ${issue} AND status = 'base_url' AND level = 'law'`,
      )
      .orderBy(scrape_logs.id),
  ]);

  if (rows.length === 0 && missingRows.length === 0) notFound();

  const issueDate = rows[0]?.issue_date ?? null;

  const [prevIssue, nextIssue, issueUrl] = await Promise.all([
    // Previous issue — exclude duplicates to avoid navigating to a duplicate
    db
      .select({ issue_number: laws.issue_number })
      .from(laws)
      .where(
        sql`issue_date < ${issueDate} AND issue_number IS NOT NULL AND issue_date IS NOT NULL AND id NOT IN (SELECT id FROM duplicate_laws)`,
      )
      .orderBy(desc(laws.issue_date))
      .limit(1)
      .then((r) => r[0]?.issue_number ?? null),

    // Next issue — exclude duplicates
    db
      .select({ issue_number: laws.issue_number })
      .from(laws)
      .where(
        sql`issue_date > ${issueDate} AND issue_number IS NOT NULL AND issue_date IS NOT NULL AND id NOT IN (SELECT id FROM duplicate_laws)`,
      )
      .orderBy(laws.issue_date)
      .limit(1)
      .then((r) => r[0]?.issue_number ?? null),

    // Real issue URL from issues table
    db
      .select({ url: issues.source_url })
      .from(issues)
      .where(eq(issues.issue_number, issue))
      .limit(1)
      .then((r) => r[0]?.url ?? null),
  ]);

  // Group available laws by doc_type
  const grouped = rows.reduce<Record<string, typeof rows>>((acc, law) => {
    const key = law.doc_type ?? "Autres";
    if (!acc[key]) acc[key] = [];
    acc[key].push(law);
    return acc;
  }, {});

  const docTypeOrder = [
    "Loi",
    "Ordonnance",
    "Décret",
    "Arrêté",
    "Circulaire",
    "Avis",
    "Autres",
  ];

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const ai = docTypeOrder.indexOf(a);
    const bi = docTypeOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link
          href="/journal"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors no-underline"
        >
          <ArrowLeft size={14} /> Numéros
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{issue}</span>
      </div>

      {/* Header */}
      <div className="mb-8 pb-8 border-b border-border">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-sm bg-primary flex items-center justify-center">
                <FileText size={15} className="text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Journal Officiel
              </span>
            </div>
            <h1 className="font-serif text-3xl font-normal text-foreground">
              Numéro du {issue.slice(2)}
            </h1>
            {issueDate && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar size={13} />
                {formatDate(issueDate)}
                {issueUrl && (
                  <a
                    href={issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline no-underline mt-1"
                  >
                    Voir sur le portail officiel ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 shrink-0">
            <div className="text-right">
              <div className="text-3xl font-semibold text-foreground tabular-nums">
                {rows.length}
              </div>
              <div className="text-xs text-muted-foreground">
                disponible{rows.length > 1 ? "s" : ""}
              </div>
            </div>
            {missingRows.length > 0 && (
              <div className="text-right">
                <div className="text-3xl font-semibold text-amber-500 tabular-nums">
                  {missingRows.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  inaccessible{missingRows.length > 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coverage bar */}
        {missingRows.length > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Complétude de ce numéro</span>
              <span>
                {Math.round(
                  (rows.length / (rows.length + missingRows.length)) * 100,
                )}
                %
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${Math.round((rows.length / (rows.length + missingRows.length)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex justify-between gap-3 mt-6">
          {prevIssue && (
            <Link
              href={`/journal/${prevIssue.split("/").map(encodeURIComponent).join("/")}`}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-sm hover:border-primary/40 hover:text-primary transition-colors no-underline text-muted-foreground"
            >
              <ArrowLeft size={13} /> {prevIssue.toUpperCase()}
            </Link>
          )}
          {nextIssue && (
            <Link
              href={`/journal/${nextIssue.split("/").map(encodeURIComponent).join("/")}`}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-sm hover:border-primary/40 hover:text-primary transition-colors no-underline text-muted-foreground"
            >
              {nextIssue.toUpperCase()} <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Available laws grouped */}
      <div className="space-y-8">
        {sortedGroups.map(([docType, items]) => (
          <div key={docType}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                {docType}
              </span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex flex-col divide-y divide-border border border-border rounded-sm overflow-hidden bg-background">
              {items.map((law) => (
                <Link
                  key={law.id}
                  href={`/textes/${law.id}`}
                  className="group flex items-start gap-4 px-5 py-4 hover:bg-muted transition-colors no-underline"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {law.title ?? "Sans titre"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                      {law.reference_number && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {law.reference_number}
                        </span>
                      )}
                      {law.ministry && (
                        <span className="text-xs text-muted-foreground truncate max-w-70">
                          {toTitleCase(law.ministry)}
                        </span>
                      )}
                      {law.signed_by && (
                        <span className="text-xs text-muted-foreground">
                          Signé : {law.signed_by}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={13}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Missing / inaccessible laws */}
        {missingRows.length > 0 && <InaccessiblesSection laws={missingRows} />}
      </div>
    </div>
  );
}
