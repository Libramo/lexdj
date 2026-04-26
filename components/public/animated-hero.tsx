"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Building2,
  CalendarDays,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import { HeroSearch } from "@/components/public/hero-search";
import { toTitleCase } from "@/lib/utils";

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 1800, bounce: 0 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    return spring.on("change", (v) => {
      setDisplay(Math.round(v).toLocaleString("fr-FR"));
    });
  }, [spring]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

// ── Fade in on scroll ─────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.07 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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
const STAT_ICONS: LucideIcon[] = [
  FileText,
  Building2,
  CalendarDays,
  TrendingUp,
];

export function AnimatedHero({ stats }: { stats: Stat[] }) {
  return (
    <section className="relative bg-[#1A3A5C] overflow-hidden">
      {/* Animated grid */}
      <motion.div
        className="absolute inset-0 opacity-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1.5 }}
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 right-20 w-64 h-64 rounded-full bg-[#4A7FA8]/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#9DC4E0]/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-8 pt-20 pb-16">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/80 text-xs tracking-wider font-medium uppercase">
            Archive numérique · 1904–2026
          </span>
        </motion.div>

        {/* Headline — staggered lines */}
        <div className="overflow-hidden mb-3">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-white font-['Libre_Baskerville'] text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight"
          >
            Index du Journal Officiel
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-8">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-white font-['Libre_Baskerville'] text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight"
          >
            <em className="text-[#9DC4E0]">de la République de Djibouti.</em>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="text-white/55 text-lg leading-relaxed max-w-xl mb-10 font-light"
        >
          Recherchez et explorez les textes officiels publiés depuis 1904. Un
          outil de référence, pas un substitut au portail officiel.
        </motion.p>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
        >
          <HeroSearch />
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="flex flex-wrap gap-2 mt-6"
        >
          <span className="text-white/40 text-xs self-center mr-1">
            Parcourir :
          </span>
          {DOC_TYPES.map(({ label, href }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.95 + i * 0.06 }}
            >
              <Link
                href={href}
                className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-3 py-1 transition-colors no-underline"
              >
                {label}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Stats bar */}
      <div className="relative border-t border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ label, value, suffix }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.1, duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = STAT_ICONS[i % STAT_ICONS.length];
                  return <Icon size={15} className="text-white/60" />;
                })()}
              </div>
              <div>
                <div className="text-white text-xl font-semibold leading-tight tabular-nums">
                  <AnimatedCounter value={value} suffix={suffix} />
                </div>
                <div className="text-white/40 text-xs leading-tight">
                  {label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Recent issues section ─────────────────────────────────────────────────────

export function AnimatedSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <FadeUp className={className}>{children}</FadeUp>;
}

// ── Doc type cards ────────────────────────────────────────────────────────────

export function AnimatedDocTypes() {
  return (
    <section className="border-t border-black/6 bg-white">
      <div className="max-w-6xl mx-auto px-8 py-14">
        <FadeUp>
          <h2 className="font-['Libre_Baskerville'] text-2xl font-normal text-[#111] mb-8">
            Parcourir par type
          </h2>
        </FadeUp>
        <StaggerList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOC_TYPES.map(({ label, href }) => (
            <StaggerItem key={label}>
              <Link
                href={href}
                className="group flex flex-col items-center gap-2 p-5 rounded-xl border border-black/[0.07] hover:border-[#1A3A5C]/30 hover:bg-[#EEF3F8] hover:-translate-y-1 transition-all no-underline text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EEF3F8] group-hover:bg-[#1A3A5C]/10 flex items-center justify-center transition-colors">
                  <FileText size={18} className="text-[#1A3A5C]" />
                </div>
                <span className="text-sm font-medium text-[#111]">{label}</span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
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

export function AnimatedMinistries() {
  return (
    <section className="border-t border-black/6 bg-[#FAFAF8]">
      <div className="max-w-6xl mx-auto px-8 py-14">
        <FadeUp>
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
        </FadeUp>
        <StaggerList className="flex flex-wrap gap-2">
          {MINISTRIES.map((m) => (
            <StaggerItem key={m}>
              <Link
                href={`/ministeres/${encodeURIComponent(m)}`}
                className="text-sm text-[#444] bg-white border border-black/8 rounded-full px-4 py-1.5 hover:border-[#1A3A5C]/40 hover:text-[#1A3A5C] hover:-translate-y-0.5 transition-all no-underline"
              >
                {toTitleCase(m)}
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}

// ── API CTA ───────────────────────────────────────────────────────────────────

export function AnimatedCTA() {
  return (
    <section className="border-t border-black/6 bg-[#1A3A5C]">
      <FadeUp>
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
            <motion.div
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 font-mono text-sm text-white/70"
              whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              GET /api/v1/laws?ministry=Justice
            </motion.div>
            <Link
              href="/api"
              className="flex items-center justify-center gap-2 bg-white text-[#1A3A5C] text-sm font-medium rounded-lg px-6 py-3 hover:bg-[#EEF3F8] transition-colors no-underline"
            >
              Documentation API <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
