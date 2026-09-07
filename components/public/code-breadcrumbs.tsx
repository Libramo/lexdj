import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Code } from "@/payload-types";
import type { CodeSectionNode } from "@/lib/codes";

// A shared breadcrumb component, unlike the hand-rolled inline trails in
// journal/textes — justified here because a code's depth is variable (up
// to Livre > Titre > Chapitre > Section > Article), not the fixed 2-3
// crumbs those pages hand-roll.
export function CodeBreadcrumbs({
  code,
  ancestors,
  current,
}: {
  code: Code;
  ancestors: CodeSectionNode[];
  current: CodeSectionNode;
}) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
    >
      <Link href="/codes" className="hover:text-primary no-underline">
        Codes
      </Link>
      <ChevronRight size={11} className="shrink-0" />
      <Link
        href={`/codes/${code.slug}`}
        className="hover:text-primary no-underline"
      >
        {code.title}
      </Link>
      {ancestors.map((a) => (
        <span key={a.id} className="flex items-center gap-1.5">
          <ChevronRight size={11} className="shrink-0" />
          <Link
            href={`/codes/${code.slug}/${a.slug}`}
            className="hover:text-primary no-underline"
          >
            {a.title}
          </Link>
        </span>
      ))}
      <ChevronRight size={11} className="shrink-0" />
      <span className="text-foreground font-medium">{current.title}</span>
    </nav>
  );
}
