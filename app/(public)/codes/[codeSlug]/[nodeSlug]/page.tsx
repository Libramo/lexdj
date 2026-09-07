import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getCodeBySlug,
  getCodeTree,
  findNode,
  flattenArticles,
  type CodeSectionNode,
} from "@/lib/codes";
import { CodeToc } from "@/components/public/code-toc";
import { CodeNodeList } from "@/components/public/code-node-list";
import { CodeContent } from "@/components/public/code-content";
import { CodeBreadcrumbs } from "@/components/public/code-breadcrumbs";

const TYPE_LABELS: Record<string, string> = {
  livre: "Livre",
  titre: "Titre",
  chapitre: "Chapitre",
  section: "Section",
  "sous-section": "Sous-section",
  article: "Article",
};

export default async function CodeNodePage({
  params,
}: {
  params: Promise<{ codeSlug: string; nodeSlug: string }>;
}) {
  const { codeSlug, nodeSlug } = await params;
  const code = await getCodeBySlug(codeSlug);
  if (!code || !code.slug) notFound();

  const tree = await getCodeTree(code.id);
  const found = findNode(tree, nodeSlug);
  if (!found) notFound();
  const { node, ancestors } = found;

  const defaultExpanded = ancestors.map((a) => a.id);

  let prev: CodeSectionNode | null = null;
  let next: CodeSectionNode | null = null;
  if (node.type === "article") {
    const articles = flattenArticles(tree);
    const idx = articles.findIndex((a) => a.id === node.id);
    prev = idx > 0 ? articles[idx - 1] : null;
    next = idx >= 0 && idx < articles.length - 1 ? articles[idx + 1] : null;
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <CodeBreadcrumbs code={code} ancestors={ancestors} current={node} />

      <div className="flex gap-8 mt-6">
        <aside className="w-72 shrink-0 hidden lg:block">
          <div className="sticky top-19 max-h-[calc(100vh-5rem)] overflow-y-auto pb-8">
            <CodeToc
              codeSlug={code.slug}
              nodes={tree}
              currentSlug={node.slug ?? undefined}
              defaultExpanded={defaultExpanded}
            />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-serif italic text-muted-foreground mb-1">
            {TYPE_LABELS[node.type]}
          </p>
          <h1 className="text-xl font-sans font-black uppercase tracking-tight text-foreground mb-6">
            {node.title}
          </h1>

          {node.type === "article" ? (
            <CodeContent content={node.content} />
          ) : node.children.length > 0 ? (
            <CodeNodeList codeSlug={code.slug} nodes={node.children} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Cette section ne contient pas encore de contenu.
            </p>
          )}

          {node.type === "article" && (prev || next) ? (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
              {prev ? (
                <Link
                  href={`/codes/${codeSlug}/${prev.slug}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary no-underline"
                >
                  <ArrowLeft size={14} />
                  {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={`/codes/${codeSlug}/${next.slug}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary no-underline"
                >
                  {next.title}
                  <ArrowRight size={14} />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
