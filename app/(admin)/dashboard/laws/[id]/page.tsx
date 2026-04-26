// app/(admin)/dashboard/laws/[id]/page.tsx
// OCR editor — per-law editor. Side-by-side: public render | textarea.

import { OcrEditor } from "@/components/admin/ocr-editor";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema"; // raw table, not the view — edit source of truth
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminLawEditorPage({ params }: PageProps) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const [law] = await db.select().from(laws).where(eq(laws.id, numId)).limit(1);
  if (!law) notFound();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-[#1A3A5C] text-white px-6 py-3 flex items-center gap-3 shrink-0">
        <a
          href="/dashboard/laws"
          className="text-blue-200 hover:text-white text-sm transition-colors"
        >
          ← Retour
        </a>
        <span className="text-blue-300">|</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-300">
            ID {law.id} · {law.doc_type}
          </p>
          <h1 className="font-semibold text-sm leading-tight truncate">
            {law.title}
          </h1>
        </div>
      </header>

      {/* ── Client editor ──────────────────────────────────────── */}
      <OcrEditor law={law} />
    </div>
  );
}
