import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  DollarSign,
  Scale,
  Shield,
  Truck,
  GraduationCap,
  Building2,
  Heart,
  Stethoscope,
  Home,
  Users,
} from "lucide-react";
import { RecentIssues } from "@/components/public/recent-issues";
import {
  AnimatedCTA,
  AnimatedDocTypes,
  AnimatedHero,
  AnimatedMinistries,
  AnimatedSection,
} from "@/components/public/animated-hero";
import { db } from "@/drizzle/src";
import { count, sql } from "drizzle-orm";
import { laws } from "@/drizzle/src/db/schema";

const TOPICS = [
  { label: "Travail & Emploi", icon: Briefcase, count: 2923 },
  { label: "Finances & Fiscalité", icon: DollarSign, count: 2866 },
  { label: "Justice & Procédures", icon: Scale, count: 2505 },
  { label: "Sécurité & Défense", icon: Shield, count: 2182 },
  { label: "Transport & Logistique", icon: Truck, count: 1832 },
  { label: "Éducation", icon: GraduationCap, count: 1160 },
  { label: "Commerce & Entreprise", icon: Building2, count: 1066 },
  { label: "Protection Sociale", icon: Heart, count: 708 },
  { label: "Santé", icon: Stethoscope, count: 302 },
  { label: "Immobilier & Foncier", icon: Home, count: 219 },
  { label: "Famille & Statut Civil", icon: Users, count: 199 },
];

async function getStats() {
  const [totalLaws, totalMinistries, totalIssues, yearRange] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(laws)
        .where(sql`id NOT IN (SELECT id FROM duplicate_laws)`)
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
        .from(laws)
        .where(
          sql`publication_date is not null AND id NOT IN (SELECT id FROM duplicate_laws) AND EXTRACT(YEAR FROM publication_date::date) BETWEEN 1900 AND 2030`,
        )
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

      {/* ── TOPICS ── */}
      <AnimatedSection className="max-w-6xl mx-auto px-8 py-14 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] leading-tight">
              Parcourir par thème
            </h2>
            <p className="text-sm text-[#666] mt-1">
              Trouvez les textes selon votre besoin
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOPICS.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.label}
                href={`/recherche?topic=${encodeURIComponent(topic.label)}`}
                className="group flex items-center gap-4 bg-white border border-black/[0.07] rounded-xl px-6 py-5 hover:border-[#1A3A5C]/25 hover:shadow-md hover:-translate-y-0.5 transition-all no-underline"
              >
                <div className="w-11 h-11 rounded-lg bg-[#EEF3F8] flex items-center justify-center shrink-0 group-hover:bg-[#1A3A5C] transition-colors">
                  <Icon
                    size={20}
                    className="text-[#1A3A5C] group-hover:text-white transition-colors"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111] group-hover:text-[#1A3A5C] transition-colors leading-snug">
                    {topic.label}
                  </p>
                  <p className="text-xs text-[#AAA] tabular-nums mt-0.5">
                    {topic.count.toLocaleString("fr-FR")} textes
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-[#CCC] group-hover:text-[#1A3A5C] group-hover:translate-x-0.5 transition-all shrink-0 ml-auto"
                />
              </Link>
            );
          })}
        </div>
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
