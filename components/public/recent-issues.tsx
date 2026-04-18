import { sql, count, desc } from "drizzle-orm";
import Link from "next/link";
import { FileText, ArrowRight, Calendar } from "lucide-react";
import { db } from "@/drizzle/src";

async function getRecentIssues() {
  const rows = await db.execute(sql`
    SELECT
      issue_number,
      issue_date,
      COUNT(*)::int AS count
    FROM laws
    WHERE issue_number IS NOT NULL
      AND issue_date IS NOT NULL
    GROUP BY issue_number, issue_date
    ORDER BY issue_date DESC NULLS LAST
    LIMIT 6
  `);
  return rows.rows as {
    issue_number: string;
    issue_date: string;
    count: number;
  }[];
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

export async function RecentIssues() {
  const issues = await getRecentIssues();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {issues.map((issue) => (
        <Link
          key={issue.issue_number}
          href={`/journal/${issue.issue_number.split("/").map(encodeURIComponent).join("/")}`}
          className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-black/[0.07] hover:border-[#1A3A5C]/25 hover:shadow-sm transition-all no-underline"
        >
          <div className="w-10 h-10 rounded-lg bg-[#EEF3F8] flex items-center justify-center shrink-0 group-hover:bg-[#1A3A5C]/10 transition-colors">
            <FileText size={16} className="text-[#1A3A5C]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#111] group-hover:text-[#1A3A5C] transition-colors">
                {issue.issue_number}
              </span>
              <ArrowRight
                size={13}
                className="text-[#AAA] group-hover:text-[#1A3A5C] group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </div>
            {issue.issue_date && (
              <div className="flex items-center gap-1.5 mt-1">
                <Calendar size={11} className="text-[#AAA]" />
                <span className="text-xs text-[#888]">
                  {formatDate(issue.issue_date)}
                </span>
              </div>
            )}
            <p className="text-xs text-[#AAA] mt-1.5">
              {Number(issue.count).toLocaleString("fr-FR")} texte
              {Number(issue.count) > 1 ? "s" : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
