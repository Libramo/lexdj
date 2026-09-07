"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { GovMark } from "@/components/ui/gov-mark";
import { SiteNav, type SiteNavItem } from "@/components/public/site-nav";

// Single source of truth for both the desktop mega-menu (SiteNav, grouped
// dropdowns) and the mobile menu (rendered directly below from this same
// array — see Nav's JSX) — there is deliberately no separate flat list to
// hand-maintain, since two independently-edited arrays are exactly how
// mobile and desktop drift apart (see progress-tracker.md's nav
// restructuring note). "type"/"era" values match what /textes and
// /journal actually read from their searchParams. Grouped as: national law
// (codes + non-colonial textes + ministries), colonial-era textes on their
// own, then official publications (eJO). "Législation régionale et
// internationale" (conventions, UA charters) is deliberately not here yet
// — that's a new content type with no data behind it, not a nav change.
const navItems: SiteNavItem[] = [
  {
    label: "Législation nationale",
    href: "/textes",
    groups: [
      {
        title: "Codes",
        items: [{ label: "Tous les codes", href: "/codes" }],
      },
      {
        title: "Par période",
        items: [
          { label: "Après l'indépendance", href: "/textes?era=independence" },
          { label: "Période moderne", href: "/textes?era=modern" },
        ],
      },
      {
        title: "Par type",
        items: [
          { label: "Lois", href: "/textes?type=Loi" },
          { label: "Décrets", href: "/textes?type=Décret" },
          { label: "Arrêtés", href: "/textes?type=Arrêté" },
          { label: "Ordonnances", href: "/textes?type=Ordonnance" },
          { label: "Circulaires", href: "/textes?type=Circulaire" },
          { label: "Avis", href: "/textes?type=Avis" },
        ],
      },
      {
        title: "Parcourir",
        items: [{ label: "Par ministère", href: "/ministeres" }],
      },
    ],
  },
  { label: "Textes coloniaux", href: "/textes?era=colonial" },
  {
    label: "Publications officielles",
    href: "/journal",
    groups: [
      {
        title: "Journal officiel",
        items: [
          { label: "Tous les numéros", href: "/journal" },
          { label: "Période coloniale", href: "/journal?era=colonial" },
          { label: "Après l'indépendance", href: "/journal?era=independence" },
          { label: "Période moderne", href: "/journal?era=modern" },
        ],
      },
    ],
  },
  { label: "Recherche", href: "/recherche" },
  { label: "Couverture", href: "/couverture" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      {/* Row 1 — identity */}
      <div className="max-w-6xl mx-auto px-8 flex items-center justify-between py-3 border-b border-border">
        <Link href="/" className="no-underline">
          {/* Mobile: smaller GovMark, name stacked below it — the full-size
              side-by-side lockup is wider than a phone viewport. Same fix
              gouv-dj's own Header applies via its "stacked" identityLayout. */}
          <div className="flex md:hidden flex-col gap-1.5">
            <GovMark
              size="sm"
              emblem={
                <Image
                  src="/Emblem_of_Djibouti.svg"
                  alt="Emblème de la République de Djibouti"
                  width={59}
                  height={64}
                  className="h-full w-auto"
                  priority
                />
              }
              flag={
                <Image
                  src="/Flag_of_Djibouti.svg"
                  alt="Drapeau de Djibouti"
                  width={72}
                  height={48}
                  className="h-full w-auto"
                />
              }
            />
            <div>
              <div className="text-sm font-medium text-foreground leading-tight">
                LexDJ
              </div>
              <div className="text-[10px] font-serif italic text-muted-foreground leading-tight">
                Archive non officielle · Droit &amp; législation
              </div>
            </div>
          </div>

          {/* Desktop: full-size GovMark, name beside it */}
          <div className="hidden md:flex items-center gap-4">
            <GovMark
              emblem={
                <Image
                  src="/Emblem_of_Djibouti.svg"
                  alt="Emblème de la République de Djibouti"
                  width={59}
                  height={64}
                  className="h-full w-auto"
                  priority
                />
              }
              flag={
                <Image
                  src="/Flag_of_Djibouti.svg"
                  alt="Drapeau de Djibouti"
                  width={72}
                  height={48}
                  className="h-full w-auto"
                />
              }
            />
            <div className="border-l border-border pl-4">
              <div className="text-sm font-medium text-foreground leading-tight">
                LexDJ
              </div>
              <div className="text-[11px] font-serif italic text-muted-foreground leading-tight">
                Archive non officielle · Droit &amp; législation
              </div>
            </div>
          </div>
        </Link>

        {/* Mobile hamburger — row 2 is desktop-only, so this lives here */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Row 2 — nav (desktop only) */}
      <div className="hidden md:block max-w-6xl mx-auto px-8">
        <SiteNav items={navItems} />
      </div>

      {/* Mobile menu — derived from the same navItems as the desktop
          SiteNav (see the comment above navItems). A grouped item renders
          as a native <details>/<summary> accordion (tap to expand/collapse,
          closed by default) rather than a permanently-expanded nested list
          — the mobile equivalent of desktop's click-to-open dropdown, not
          a flattened dump of every sub-link. */}
      {open && (
        <div className="md:hidden bg-background border-t border-border px-8 py-4 flex flex-col">
          {navItems.map((item) =>
            item.groups && item.groups.length > 0 ? (
              <details
                key={item.label}
                className="group py-2.5 border-b border-border last:border-0"
              >
                <summary className="flex items-center justify-between text-sm font-medium text-foreground cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.label}
                  <ChevronDown
                    aria-hidden="true"
                    size={14}
                    className="text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="flex flex-col gap-3 pl-3 mt-3">
                  {item.groups.map((group) => (
                    <div key={group.title ?? item.label} className="flex flex-col gap-1">
                      {group.title ? (
                        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          {group.title}
                        </div>
                      ) : null}
                      {group.items.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setOpen(false)}
                          className="text-sm text-foreground/80 hover:text-foreground py-1 transition-colors decoration-0"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block text-sm text-foreground/80 hover:text-foreground py-2.5 border-b border-border last:border-0 transition-colors decoration-0"
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      )}
    </header>
  );
}
