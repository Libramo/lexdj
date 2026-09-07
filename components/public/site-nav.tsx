"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, X } from "lucide-react";

// Full-width mega-menu nav, adapted from gouv-dj/packages/ui's SiteNav (same
// mechanism: a panel that opens below the whole nav row, not a
// trigger-anchored popover — matches the reference the user pointed at
// (Légifrance's "Droit national" dropdown), rebuilt without the @base-ui
// dependency since only the full-width variant is needed here.

type NavGroup = {
  title?: string;
  items: { label: string; href: string }[];
};

export type SiteNavItem = {
  label: string;
  href: string;
  groups?: NavGroup[];
};

// Tailwind needs literal class names to pick them up — a template-string
// `lg:grid-cols-${n}` wouldn't be found by its scanner.
const GRID_COLS_LG: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

const topLevelItemClassName =
  "flex items-center gap-1 border-b-2 border-transparent px-3 py-4 text-[13px] text-muted-foreground font-medium transition-colors outline-none hover:border-primary hover:text-foreground";

export function SiteNav({
  items,
  className,
}: {
  items: SiteNavItem[];
  className?: string;
}) {
  const [openLabel, setOpenLabel] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!openLabel) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenLabel(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenLabel(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openLabel]);

  const activeItem = items.find(
    (item) => item.label === openLabel && item.groups && item.groups.length > 0,
  );

  return (
    <div ref={containerRef} className="relative">
      <nav
        aria-label="Principal"
        className={`flex items-stretch gap-1 ${className ?? ""}`}
      >
        {items.map((item) => {
          if (item.groups && item.groups.length > 0) {
            const isOpen = openLabel === item.label;
            return (
              <button
                key={item.label}
                type="button"
                aria-expanded={isOpen}
                className={`${topLevelItemClassName} ${isOpen ? "border-primary bg-primary/10 text-foreground" : ""}`}
                onClick={() =>
                  setOpenLabel((current) =>
                    current === item.label ? null : item.label,
                  )
                }
              >
                {item.label}
                <ChevronDown
                  aria-hidden="true"
                  size={13}
                  className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            );
          }

          return (
            <a key={item.label} href={item.href} className={topLevelItemClassName}>
              {item.label}
            </a>
          );
        })}
      </nav>

      <AnimatePresence>
        {activeItem?.groups ? (
          <motion.div
            key="site-nav-panel"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top" }}
            // border-t restores the header's bottom border line, which the
            // panel's own opaque background otherwise paints over (it sits
            // right at that same y-position). The inset shadow is the
            // "upper bound" shadow separating the panel from the nav row —
            // Tailwind shadow utilities replace rather than stack, so the
            // panel's overall elevation shadow (shadow-lg's own values) is
            // folded into the same arbitrary box-shadow.
            className="absolute top-full left-1/2 z-40 w-screen -translate-x-1/2 border-t border-b border-border bg-background shadow-[inset_0_6px_6px_-6px_rgba(0,0,0,0.12),0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)]"
          >
            {/* Same max-w-6xl/px-8 as the header rows above, so the panel's
                content edges line up with the logo and nav links exactly —
                only the panel's own background (w-screen, above) bleeds
                full width, not this content column. */}
            <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col">
              <button
                type="button"
                onClick={() => setOpenLabel(null)}
                className="flex items-center gap-1.5 self-end text-xs font-medium text-muted-foreground hover:text-primary mb-2"
              >
                Fermer
                <X size={14} />
              </button>

              {/* Column count matches the actual group count (capped at 4) —
                  a hard-coded lg:grid-cols-4 left empty tracks (and a
                  narrow-looking panel) for items with fewer groups. */}
              <div
                className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${
                  GRID_COLS_LG[Math.min(activeItem.groups.length, 4)]
                }`}
              >
                {activeItem.groups.map((group) => (
                  <div key={group.title} className="flex flex-col gap-1">
                    {group.title ? (
                      <h3 className="border-b border-border pb-2 mb-1 font-sans uppercase text-xs font-bold text-foreground tracking-wide">
                        {group.title}
                      </h3>
                    ) : null}
                    <ul className="flex flex-col">
                      {group.items.map((navItem) => (
                        <li key={navItem.href}>
                          <a
                            href={navItem.href}
                            onClick={() => setOpenLabel(null)}
                            className="block py-2 text-sm text-muted-foreground hover:text-primary no-underline"
                          >
                            {navItem.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
