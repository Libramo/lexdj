"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { HeroSearch } from "@/components/public/hero-search";
import { toTitleCase } from "@/lib/utils";

// ── Hero section ──────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { label: "Lois", href: "/textes?type=Loi" },
  { label: "Décrets", href: "/textes?type=Décret" },
  { label: "Arrêtés", href: "/textes?type=Arrêté" },
  { label: "Ordonnances", href: "/textes?type=Ordonnance" },
  { label: "Circulaires", href: "/textes?type=Circulaire" },
  { label: "Avis", href: "/textes?type=Avis" },
];

interface Stat {
  label: string;
  value: number;
  suffix: string;
}

function formatStat(stat: Stat): string {
  return `${stat.value.toLocaleString("fr-FR")}${stat.suffix}`;
}

export function Hero({ stats }: { stats: Stat[] }) {
  return (
    <section className="relative bg-background">
      {/* Single, non-repeating fade on initial load — no scroll-triggered
          motion, no floating decoration. See ui-context.md → Theme.
          Light, white background throughout — primary/secondary are small
          accents (text, buttons, thin washes), never a large solid fill. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-6xl mx-auto px-8 pt-20 pb-16"
      >
        <span className="block font-serif italic text-muted-foreground text-sm mb-6">
          Archive numérique · 1904–2026
        </span>

        <h1 className="font-sans uppercase font-black text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-foreground max-w-3xl mb-2">
          Index du Journal Officiel
        </h1>
        <h2 className="font-sans uppercase font-black text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-muted-foreground max-w-3xl mb-8">
          de la République de Djibouti
        </h2>

        <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mb-10">
          Recherchez et explorez les textes officiels publiés depuis 1904. Un
          outil de référence, pas un substitut au portail officiel.
        </p>

        <HeroSearch />

        <div className="flex flex-wrap gap-2 mt-6">
          <span className="text-muted-foreground text-xs self-center mr-1">
            Parcourir :
          </span>
          {DOC_TYPES.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-xs text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded-sm px-3 py-1 transition-colors no-underline"
            >
              {label}
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Stats — static values, no count-up animation */}
      <div className="border-t border-border bg-muted">
        <dl className="max-w-6xl mx-auto px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {stat.label}
              </dt>
              <dd className="text-foreground text-xl font-bold tabular-nums mt-0.5">
                {formatStat(stat)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ── Plain section wrapper (no motion — see ui-context.md → Theme) ─────────────

export function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

// ── Doc type cards ────────────────────────────────────────────────────────────

export function DocTypesGrid() {
  return (
    <section className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-8 py-14">
        <h2 className="font-sans uppercase font-bold text-foreground text-xl tracking-tight mb-8">
          Parcourir par type
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOC_TYPES.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center gap-2 p-5 border border-border hover:border-primary/40 transition-colors no-underline text-center"
            >
              <div className="w-10 h-10 rounded-sm bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <FileText size={18} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Ministries strip ──────────────────────────────────────────────────────────

const MINISTRIES = [
  "ACTES DU POUVOIR LOCAL",
  "ACTES DU POUVOIR CENTRAL",
  "MINISTÈRE DE LA FONCTION PUBLIQUE",
  "ASSEMBLÉE NATIONALE",
  "PRÉSIDENCE DU CONSEIL DE GOUVERNEMENT",
  "PRÉSIDENCE DE LA RÉPUBLIQUE",
  "MINISTERE DES AFFAIRES INTERIEURES",
  "MINISTERE DE FINANCE",
  "MINISTERE DES FINANCES ET DU PLAN",
  "MINISTÈRE DU TRAVAIL",
];

export function MinistriesStrip() {
  return (
    <section className="border-t border-border bg-muted">
      <div className="max-w-6xl mx-auto px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-sans uppercase font-bold text-foreground text-xl tracking-tight">
            Ministères
          </h2>
          <Link
            href="/ministeres"
            className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline no-underline"
          >
            Voir tous <ArrowRight size={14} />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {MINISTRIES.map((m) => (
            <Link
              key={m}
              href={`/ministeres/${encodeURIComponent(m)}`}
              className="text-sm text-foreground/80 bg-background border border-border rounded-sm px-4 py-1.5 hover:border-primary/40 hover:text-primary transition-colors no-underline"
            >
              {toTitleCase(m)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── API CTA ───────────────────────────────────────────────────────────────────

export function ApiCta() {
  return (
    <section className="border-t border-border bg-muted">
      <div className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-sans uppercase font-black text-foreground text-2xl md:text-3xl tracking-tight leading-tight mb-3">
            Accès programmatique via API
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Intégrez les données du Journal Officiel dans vos applications.
            API REST avec authentification par clé, documentation complète.
          </p>
        </div>
        <div className="flex flex-col gap-3 shrink-0">
          <div className="bg-background border border-border rounded-sm px-6 py-4 font-mono text-sm text-muted-foreground">
            GET /api/v1/laws?ministry=Justice
          </div>
          <Link
            href="/api"
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium rounded-sm px-6 py-3 hover:bg-primary/90 transition-colors no-underline"
          >
            Documentation API <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
