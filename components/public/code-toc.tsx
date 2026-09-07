"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CodeSectionNode } from "@/lib/codes";

// Recursive collapsible tree for a code's sticky sidebar. Conceptually
// similar to site-nav.tsx's open/closed dropdown pattern (per-node expand
// state, rotated chevron), rebuilt standalone since this is a multi-level
// tree, not a single-level menu.
export function CodeToc({
  codeSlug,
  nodes,
  currentSlug,
  defaultExpanded,
}: {
  codeSlug: string;
  nodes: CodeSectionNode[];
  currentSlug?: string;
  defaultExpanded: number[];
}) {
  const [expanded, setExpanded] = React.useState<Set<number>>(
    () => new Set(defaultExpanded),
  );

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <nav aria-label="Table des matières" className="text-sm">
      <ul className="flex flex-col gap-0.5">
        {nodes.map((node) => (
          <TocNode
            key={node.id}
            codeSlug={codeSlug}
            node={node}
            currentSlug={currentSlug}
            expanded={expanded}
            onToggle={toggle}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  );
}

function TocNode({
  codeSlug,
  node,
  currentSlug,
  expanded,
  onToggle,
  depth,
}: {
  codeSlug: string;
  node: CodeSectionNode;
  currentSlug?: string;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isCurrent = node.slug === currentSlug;

  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded-sm ${isCurrent ? "bg-primary/10" : ""}`}
        style={{ paddingLeft: depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Réduire" : "Développer"}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronRight
              size={13}
              className={`transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-[22px] shrink-0" aria-hidden="true" />
        )}
        <Link
          href={`/codes/${codeSlug}/${node.slug}`}
          className={`flex-1 min-w-0 truncate py-1.5 pr-2 no-underline ${
            isCurrent
              ? "text-primary font-medium"
              : "text-foreground/80 hover:text-primary"
          }`}
        >
          {node.title}
        </Link>
      </div>
      {hasChildren && isOpen ? (
        <ul className="flex flex-col gap-0.5">
          {node.children.map((child) => (
            <TocNode
              key={child.id}
              codeSlug={codeSlug}
              node={child}
              currentSlug={currentSlug}
              expanded={expanded}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
