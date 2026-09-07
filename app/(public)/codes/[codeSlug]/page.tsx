import { notFound } from "next/navigation";
import { getCodeBySlug, getCodeTree } from "@/lib/codes";
import { CodeToc } from "@/components/public/code-toc";
import { CodeNodeList } from "@/components/public/code-node-list";

export default async function CodePage({
  params,
}: {
  params: Promise<{ codeSlug: string }>;
}) {
  const { codeSlug } = await params;
  const code = await getCodeBySlug(codeSlug);
  if (!code || !code.slug) notFound();

  const tree = await getCodeTree(code.id);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="mb-6">
        <p className="text-xs font-serif italic text-muted-foreground mb-1">
          Code
        </p>
        <h1 className="text-2xl font-sans font-black uppercase tracking-tight text-foreground">
          {code.title}
        </h1>
        {code.description ? (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            {code.description}
          </p>
        ) : null}
      </div>

      <div className="flex gap-8">
        <aside className="w-72 shrink-0 hidden lg:block">
          <div className="sticky top-19 max-h-[calc(100vh-5rem)] overflow-y-auto pb-8">
            <CodeToc codeSlug={code.slug} nodes={tree} defaultExpanded={[]} />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ce code ne contient pas encore de sections.
            </p>
          ) : (
            <CodeNodeList codeSlug={code.slug} nodes={tree} />
          )}
        </div>
      </div>
    </div>
  );
}
