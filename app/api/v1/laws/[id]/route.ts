import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { corsJson, handleOptions } from "@/lib/cors";

export function OPTIONS() {
  return handleOptions();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return corsJson({ error: "Invalid id — must be a number" }, 400);
  }

  try {
    const result = await db.execute(
      sql.raw(`
      SELECT
        id, title, doc_type, reference_number, ministry,
        publication_date, issue_number, issue_date,
        intro_text, full_text, visas_text, signed_by,
        mesure, verbe, period, pdf_links, source_url
      FROM laws_distinct
      WHERE id = ${numId}
      LIMIT 1
    `),
    );

    if (result.rows.length === 0) {
      return corsJson({ error: "Law not found" }, 404);
    }

    return corsJson({ data: result.rows[0] });
  } catch (err) {
    console.error("API error:", err);
    return corsJson({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const numId = parseInt(id, 10);
  if (isNaN(numId))
    return corsJson({ error: "Invalid id — must be a number" }, 400);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return corsJson({ error: "JSON invalide" }, 400);

  const allowed = [
    "title",
    "intro_text",
    "full_text",
    "visas_text",
    "signed_by",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] ?? null;
  }

  if (Object.keys(updates).length === 0)
    return corsJson({ error: "Rien à mettre à jour" }, 400);

  updates.ocr_corrected = true;

  const [updated] = await db
    .update(laws)
    .set(updates)
    .where(eq(laws.id, numId))
    .returning({ id: laws.id });

  if (!updated) return corsJson({ error: "Law not found" }, 404);

  return corsJson({ ok: true, id: updated.id });
}
