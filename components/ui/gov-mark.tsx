import * as React from "react";

import { cn } from "@/lib/utils";

// Ported from gouv-dj/packages/ui/src/components/gov-mark.tsx — same
// component, only the `cn` import path changed. See ui-context.md for why
// LexDJ (an explicitly non-official archive) is using the actual national
// mark here: a deliberate call, not an oversight.
function GovMark({
  emblem,
  flag,
  className,
  countryName = "République de Djibouti",
  motto = ["Unité", "Égalité", "Paix"],
  size = "default",
}: {
  emblem: React.ReactNode;
  flag?: React.ReactNode;
  className?: string;
  countryName?: string;
  motto?: [string, string, string];
  size?: "default" | "sm";
}) {
  return (
    <div
      data-slot="gov-mark"
      className={cn(
        "flex items-center",
        size === "sm" ? "gap-2" : "gap-4",
        className,
      )}
    >
      {flag ? (
        <div
          data-slot="gov-mark-flag"
          className={cn(
            "shrink-0 overflow-hidden ring-1 ring-foreground/10",
            size === "sm" ? "h-9" : "h-16",
          )}
        >
          {flag}
        </div>
      ) : null}
      <div className={cn("shrink-0", size === "sm" ? "h-9" : "h-16")}>
        {emblem}
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-bold tracking-wide uppercase",
            size === "sm" ? "text-[10px]" : "text-sm",
          )}
        >
          {countryName}
        </span>
        {motto.map((word) => (
          <span
            key={word}
            className={cn(
              "font-serif italic text-muted-foreground",
              size === "sm" ? "text-[8px]" : "text-[11px]",
            )}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

export { GovMark };
