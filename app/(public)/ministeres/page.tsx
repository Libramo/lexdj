import { count, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";

export default async function MinistreresPage() {
  const rows = await db
    .select({ ministry: laws.ministry, count: count() })
    .from(laws)
    .where(sql`${laws.id} NOT IN (SELECT id FROM duplicate_laws)`)
    .groupBy(laws.ministry)
    .orderBy(desc(count()));

  const ministries = rows.filter((r) => r.ministry);
  const total = ministries.reduce((s, r) => s + Number(r.count), 0);
  const max = Number(ministries[0]?.count ?? 1);

  // Top 3 for hero cards
  const top3 = ministries.slice(0, 3);
  const rest = ministries.slice(3);

  // Top 3 in the breakdown bar get decreasing primary-tint weight, rather
  // than a rainbow of hand-picked hues — one semantic color system, per
  // ui-context.md's Colors section.
  const TOP3_BAR_COLORS = ["bg-primary", "bg-primary/60", "bg-primary/30"];
  const TOP3_TEXT_COLORS = [
    "text-primary",
    "text-primary/80",
    "text-muted-foreground",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── HEADER ── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-sans uppercase font-black text-4xl md:text-5xl tracking-tight leading-tight text-foreground mb-4">
            Ministères &{" "}
            <span className="text-muted-foreground">institutions</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            {ministries.length} entités · {total.toLocaleString("fr-FR")} textes
            publiés au Journal Officiel
          </p>

          {/* Overall bar */}
          <div className="mt-8 max-w-lg">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Répartition des publications</span>
              <span>{total.toLocaleString("fr-FR")} textes</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              {top3.map((m, i) => {
                const pct = (Number(m.count) / total) * 100;
                return (
                  <div
                    key={i}
                    className={`h-full ${TOP3_BAR_COLORS[i]} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${toTitleCase(m.ministry ?? "")}: ${Number(m.count).toLocaleString("fr-FR")}`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              {top3.map((m, i) => (
                <span
                  key={i}
                  className={`text-[10px] ${TOP3_TEXT_COLORS[i]} flex items-center gap-1`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${TOP3_BAR_COLORS[i]}`}
                  />
                  {toTitleCase(m.ministry ?? "")
                    .split(" ")
                    .slice(0, 3)
                    .join(" ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* ── TOP 3 HERO CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 -mt-8">
          {top3.map((m, i) => {
            const n = Number(m.count);
            const pct = Math.round((n / total) * 100);
            const medals = ["🥇", "🥈", "🥉"];
            const slug = encodeURIComponent(m.ministry!);
            return (
              <Link
                key={i}
                href={`/ministeres/${slug}`}
                className="group relative bg-background rounded-sm border border-border p-6 hover:border-primary/40 transition-colors no-underline overflow-hidden"
              >
                {/* Background number */}
                <div className="absolute -right-2 -bottom-4 font-serif text-[80px] font-bold text-muted-foreground/10 leading-none select-none">
                  {i + 1}
                </div>

                <div className="relative">
                  <span className="text-2xl mb-3 block">{medals[i]}</span>
                  <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-4">
                    {toTitleCase(m.ministry ?? "")}
                  </p>

                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-primary tabular-nums">
                        {n.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-xs text-muted-foreground">textes publiés</p>
                    </div>
                    <p className="text-3xl font-bold text-muted-foreground/20 tabular-nums">
                      {pct}%
                    </p>
                  </div>

                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── REST — compact list ── */}
        <div className="mb-6">
          <h2 className="font-sans uppercase font-bold text-foreground text-xl tracking-tight mb-1">
            Toutes les entités
          </h2>
          <p className="text-sm text-muted-foreground">
            {rest.length} autres ministères et institutions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rest.map((m, i) => {
            const n = Number(m.count);
            const pct = Math.round((n / max) * 100);
            const slug = encodeURIComponent(m.ministry!);

            return (
              <Link
                key={i}
                href={`/ministeres/${slug}`}
                className="group flex items-center gap-4 bg-background border border-border rounded-sm px-4 py-3.5 hover:border-primary/40 hover:bg-muted transition-colors no-underline"
              >
                {/* Rank */}
                <span className="text-xs text-muted-foreground tabular-nums w-5 shrink-0 text-right font-mono">
                  {i + 4}
                </span>

                {/* Colored dot */}
                <span className="w-2 h-2 rounded-full shrink-0 bg-primary/50" />

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {toTitleCase(m.ministry ?? "")}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/40 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-16 text-right">
                      {n.toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>

                <ArrowRight
                  size={12}
                  className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
