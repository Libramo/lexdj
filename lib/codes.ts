import { getPayload } from "payload";
import config from "@payload-config";
import type { Code, CodeSection } from "@/payload-types";

export type CodeSectionNode = CodeSection & { children: CodeSectionNode[] };

export async function getCodeBySlug(slug: string): Promise<Code | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "codes",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  return result.docs[0] ?? null;
}

// One query fetches every section of a code (small, hand-curated content,
// not the scraper's 54k-row scale) and builds the parent -> children tree
// in memory — avoids N+1 queries and avoids relying on the nested-docs
// plugin's `breadcrumbs` field for public rendering, which is admin-UI
// oriented (see collections/CodeSections.ts).
export async function getCodeTree(codeId: number): Promise<CodeSectionNode[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "code-sections",
    where: { code: { equals: codeId } },
    sort: "order",
    limit: 0,
    depth: 0,
  });

  const byId = new Map<number, CodeSectionNode>();
  for (const doc of result.docs) {
    byId.set(doc.id, { ...doc, children: [] });
  }

  const roots: CodeSectionNode[] = [];
  for (const node of byId.values()) {
    const parentId =
      typeof node.parent === "object" && node.parent !== null
        ? node.parent.id
        : node.parent;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export type FoundNode = {
  node: CodeSectionNode;
  ancestors: CodeSectionNode[];
};

export function findNode(
  tree: CodeSectionNode[],
  slug: string,
  ancestors: CodeSectionNode[] = [],
): FoundNode | null {
  for (const node of tree) {
    if (node.slug === slug) return { node, ancestors };
    const found = findNode(node.children, slug, [...ancestors, node]);
    if (found) return found;
  }
  return null;
}

// For prev/next article navigation on a node page — mirrors
// journal/[...issue]'s prev/next sibling pattern, but across the whole
// code's article sequence (document order) rather than just siblings.
export function flattenArticles(tree: CodeSectionNode[]): CodeSectionNode[] {
  const result: CodeSectionNode[] = [];
  function walk(nodes: CodeSectionNode[]) {
    for (const node of nodes) {
      if (node.type === "article") result.push(node);
      walk(node.children);
    }
  }
  walk(tree);
  return result;
}
