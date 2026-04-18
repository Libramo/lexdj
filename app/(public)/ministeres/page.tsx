import { count, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { toTitleCase } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";

// Assign a color accent per ministry based on index
const ACCENTS = [
  {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    bar: "bg-blue-400",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    bar: "bg-amber-400",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    bar: "bg-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-700",
    bar: "bg-rose-400",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-violet-50",
    border: "border-violet-100",
    text: "text-violet-700",
    bar: "bg-violet-400",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-cyan-50",
    border: "border-cyan-100",
    text: "text-cyan-700",
    bar: "bg-cyan-400",
    dot: "bg-cyan-500",
  },
];

export default async function MinistreresPage() {
  const rows = await db
    .select({ ministry: laws.ministry, count: count() })
    .from(laws)
    .groupBy(laws.ministry)
    .orderBy(desc(count()));

  const ministries = rows.filter((r) => r.ministry);
  const total = ministries.reduce((s, r) => s + Number(r.count), 0);
  const max = Number(ministries[0]?.count ?? 1);

  // Top 3 for hero cards
  const top3 = ministries.slice(0, 3);
  const rest = ministries.slice(3);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── HEADER ── */}
      <div className="bg-[#1A3A5C] text-white">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium mb-3">
            Journal Officiel · Djibouti
          </p>
          <h1 className="font-['Libre_Baskerville'] text-4xl md:text-5xl font-normal leading-tight mb-4">
            Ministères &<br />
            <em className="text-[#9DC4E0]">institutions</em>
          </h1>
          <p className="text-white/50 text-sm font-light max-w-md">
            {ministries.length} entités · {total.toLocaleString("fr-FR")} textes
            publiés au Journal Officiel
          </p>

          {/* Overall bar */}
          <div className="mt-8 max-w-lg">
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Répartition des publications</span>
              <span>{total.toLocaleString("fr-FR")} textes</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
              {top3.map((m, i) => {
                const pct = (Number(m.count) / total) * 100;
                const colors = ["bg-[#9DC4E0]", "bg-[#4A7FA8]", "bg-white/40"];
                return (
                  <div
                    key={i}
                    className={`h-full ${colors[i]} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${toTitleCase(m.ministry ?? "")}: ${Number(m.count).toLocaleString("fr-FR")}`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              {top3.map((m, i) => {
                const colors = [
                  "text-[#9DC4E0]",
                  "text-[#4A7FA8]",
                  "text-white/40",
                ];
                return (
                  <span
                    key={i}
                    className={`text-[10px] ${colors[i]} flex items-center gap-1`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-[#9DC4E0]" : i === 1 ? "bg-[#4A7FA8]" : "bg-white/40"}`}
                    />
                    {toTitleCase(m.ministry ?? "")
                      .split(" ")
                      .slice(0, 3)
                      .join(" ")}
                  </span>
                );
              })}
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
                className="group relative bg-white rounded-2xl border border-black/[0.07] p-6 hover:shadow-md hover:-translate-y-1 transition-all no-underline overflow-hidden"
              >
                {/* Background number */}
                <div className="absolute -right-2 -bottom-4 font-['Libre_Baskerville'] text-[80px] font-bold text-black/[0.03] leading-none select-none">
                  {i + 1}
                </div>

                <div className="relative">
                  <span className="text-2xl mb-3 block">{medals[i]}</span>
                  <p className="text-base font-semibold text-[#111] group-hover:text-[#1A3A5C] transition-colors leading-snug mb-4">
                    {toTitleCase(m.ministry ?? "")}
                  </p>

                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-[#1A3A5C] tabular-nums">
                        {n.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-xs text-[#AAA]">textes publiés</p>
                    </div>
                    <p className="text-3xl font-bold text-black/[0.06] tabular-nums">
                      {pct}%
                    </p>
                  </div>

                  <div className="h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1A3A5C] rounded-full"
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
          <h2 className="font-['Libre_Baskerville'] text-xl font-normal text-[#111] mb-1">
            Toutes les entités
          </h2>
          <p className="text-sm text-[#AAA]">
            {rest.length} autres ministères et institutions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rest.map((m, i) => {
            const n = Number(m.count);
            const pct = Math.round((n / max) * 100);
            const accent = ACCENTS[(i + 3) % ACCENTS.length];
            const slug = encodeURIComponent(m.ministry!);

            return (
              <Link
                key={i}
                href={`/ministeres/${slug}`}
                className="group flex items-center gap-4 bg-white border border-black/[0.06] rounded-xl px-4 py-3.5 hover:border-[#1A3A5C]/20 hover:bg-[#FAFAF8] transition-all no-underline"
              >
                {/* Rank */}
                <span className="text-xs text-[#DDD] tabular-nums w-5 shrink-0 text-right font-mono">
                  {i + 4}
                </span>

                {/* Colored dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${accent.dot}`}
                />

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#222] group-hover:text-[#1A3A5C] transition-colors truncate">
                    {toTitleCase(m.ministry ?? "")}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-black/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${accent.bar} rounded-full opacity-60`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#BBB] tabular-nums shrink-0 w-16 text-right">
                      {n.toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>

                <ArrowRight
                  size={12}
                  className="text-[#DDD] group-hover:text-[#1A3A5C] group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
