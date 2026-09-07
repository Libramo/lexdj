import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CodeSectionNode } from "@/lib/codes";

// Shared "list this node's children" block — used by both the Code
// landing page (root-level sections) and a container node's own page
// (its direct children), since both are the same shape of list.
export function CodeNodeList({
  codeSlug,
  nodes,
}: {
  codeSlug: string;
  nodes: CodeSectionNode[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-border border-t border-border">
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/codes/${codeSlug}/${node.slug}`}
            className="group flex items-center justify-between gap-4 py-3 no-underline"
          >
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">
              {node.title}
            </span>
            <ChevronRight
              size={14}
              className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
