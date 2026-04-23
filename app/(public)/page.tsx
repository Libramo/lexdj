import Link from "next/link";
import {
  Search,
  ArrowRight,
  FileText,
  Building2,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { HeroSearch } from "@/components/public/hero-search";
import { RecentIssues } from "@/components/public/recent-issues";
import {
  AnimatedCTA,
  AnimatedDocTypes,
  AnimatedHero,
  AnimatedMinistries,
  AnimatedSection,
} from "@/components/public/animated-hero";
import { db } from "@/drizzle/src";
import { laws, lawsDistinct } from "@/drizzle/src/db/schema";
import { count, sql } from "drizzle-orm";

async function getStats() {
  const [totalLaws, totalMinistries, totalIssues, yearRange] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(lawsDistinct) // ← only this one
        .then((r) => Number(r[0].total)),
      db
        .select({ total: sql<number>`count(distinct ministry)` })
        .from(laws) // ministries don't change with dedup
        .where(sql`ministry is not null`)
        .then((r) => Number(r[0].total)),
      db
        .select({ total: sql<number>`count(distinct issue_number)` })
        .from(laws) // issues don't change with dedup
        .where(sql`issue_number is not null`)
        .then((r) => Number(r[0].total)),
      db
        .select({
          min: sql<number>`extract(year from min(publication_date::date))`,
          max: sql<number>`extract(year from max(publication_date::date))`,
        })
        .from(laws) // year range doesn't change with dedup
        .where(sql`publication_date is not null`)
        .then((r) => ({ min: Number(r[0].min), max: Number(r[0].max) })),
    ]);

  return [
    { label: "Textes indexés", value: totalLaws, suffix: "" },
    { label: "Ministères", value: totalMinistries, suffix: "" },
    { label: "Numéros archivés", value: totalIssues, suffix: "" },
    {
      label: "Années couvertes",
      value: yearRange.max - yearRange.min,
      suffix: "+",
    },
  ];
}

export default async function HomePage() {
  const stats = await getStats();
  return (
    <div className="flex flex-col">
      {/* ── HERO ── */}
      <AnimatedHero stats={stats} />

      {/* ── RECENT ISSUES ── */}
      <AnimatedSection className="max-w-6xl mx-auto px-8 py-14 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] leading-tight">
              Dernières publications
            </h2>
            <p className="text-sm text-[#666] mt-1">
              Numéros récents du Journal Officiel
            </p>
          </div>
          <Link
            href="/journal"
            className="flex items-center gap-1.5 text-sm text-[#1A3A5C] font-medium hover:underline no-underline"
          >
            Tous les numéros <ArrowRight size={14} />
          </Link>
        </div>
        <RecentIssues />
      </AnimatedSection>

      {/* ── BROWSE BY TYPE ── */}
      <AnimatedDocTypes />

      {/* ── MINISTRIES STRIP ── */}
      <AnimatedMinistries />

      {/* ── CTA ── */}
      <AnimatedCTA />
    </div>
  );
}
