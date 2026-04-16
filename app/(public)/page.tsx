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

const STATS = [
  { label: "Textes indexés", value: "46 000+", icon: FileText },
  { label: "Ministères", value: "28", icon: Building2 },
  { label: "Numéros archivés", value: "2 100+", icon: CalendarDays },
  { label: "Années couvertes", value: "30+", icon: TrendingUp },
];

const DOC_TYPES = [
  { label: "Lois", href: "/textes?type=Loi" },
  { label: "Décrets", href: "/textes?type=Décret" },
  { label: "Arrêtés", href: "/textes?type=Arrêté" },
  { label: "Ordonnances", href: "/textes?type=Ordonnance" },
  { label: "Circulaires", href: "/textes?type=Circulaire" },
  { label: "Avis", href: "/textes?type=Avis" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── HERO ── */}
      <section className="relative bg-[#1A3A5C] overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0 bg-radial-[ellipse_80%_50%_at_50%_120%] from-[#4A7FA8]/30 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-8 pt-20 pb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-xs tracking-wider font-medium uppercase">
              Base de données officielle
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-white font-['Libre_Baskerville'] text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight mb-6 max-w-3xl">
            Le droit djiboutien,
            <br />
            <em className="text-[#9DC4E0]">accessible à tous.</em>
          </h1>

          <p className="text-white/60 text-lg leading-relaxed max-w-xl mb-10 font-light">
            Recherchez, lisez et explorez l'intégralité des textes publiés au
            Journal Officiel de la République de Djibouti.
          </p>

          {/* Search */}
          <HeroSearch />

          {/* Quick type links */}
          <div className="flex flex-wrap gap-2 mt-6">
            <span className="text-white/40 text-xs self-center mr-1">
              Parcourir :
            </span>
            {DOC_TYPES.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-3 py-1 transition-colors no-underline"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-black/20">
          <div className="max-w-6xl mx-auto px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-white/60" />
                </div>
                <div>
                  <div className="text-white text-xl font-semibold leading-tight tabular-nums">
                    {value}
                  </div>
                  <div className="text-white/40 text-xs leading-tight">
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT ISSUES ── */}
      <section className="max-w-6xl mx-auto px-8 py-14 w-full">
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
      </section>

      {/* ── BROWSE BY TYPE ── */}
      <section className="border-t border-black/[0.06] bg-white">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111]">
              Parcourir par type
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {DOC_TYPES.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex flex-col items-center gap-2 p-5 rounded-xl border border-black/[0.07] hover:border-[#1A3A5C]/30 hover:bg-[#EEF3F8] transition-all no-underline text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EEF3F8] group-hover:bg-[#1A3A5C]/10 flex items-center justify-center transition-colors">
                  <FileText size={18} className="text-[#1A3A5C]" />
                </div>
                <span className="text-sm font-medium text-[#111]">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── MINISTRIES STRIP ── */}
      <section className="border-t border-black/[0.06] bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111]">
              Ministères
            </h2>
            <Link
              href="/ministeres"
              className="flex items-center gap-1.5 text-sm text-[#1A3A5C] font-medium hover:underline no-underline"
            >
              Voir tous <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Ministère de l'Intérieur",
              "Ministère de la Justice",
              "Ministère des Finances",
              "Ministère de la Santé",
              "Ministère de l'Éducation",
              "Ministère des Affaires Étrangères",
              "Ministère de la Défense",
              "Ministère du Travail",
              "Présidence de la République",
              "Ministère de l'Économie",
            ].map((m) => (
              <Link
                key={m}
                href={`/ministeres/${encodeURIComponent(m)}`}
                className="text-sm text-[#444] bg-white border border-black/[0.08] rounded-full px-4 py-1.5 hover:border-[#1A3A5C]/40 hover:text-[#1A3A5C] transition-colors no-underline"
              >
                {m}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-black/[0.06] bg-[#1A3A5C]">
        <div className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-['Libre_Baskerville'] text-3xl font-normal text-white leading-tight mb-3">
              Accès programmatique
              <br />
              <em className="text-[#9DC4E0]">via API.</em>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-md font-light">
              Intégrez les données du Journal Officiel dans vos applications.
              API REST avec authentification par clé, documentation complète.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 font-mono text-sm text-white/70">
              GET /api/v1/laws?ministry=Justice
            </div>
            <Link
              href="#"
              className="flex items-center justify-center gap-2 bg-white text-[#1A3A5C] text-sm font-medium rounded-lg px-6 py-3 hover:bg-[#EEF3F8] transition-colors no-underline"
            >
              Documentation API <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
