import { db } from "@/drizzle/src";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  // Use GIN index for full-text search across title + intro + full_text
  // Ranked by relevance, fallback to title ilike for short queries
  const results = await db.execute(sql`
    SELECT id, title, doc_type, publication_date,
      ts_rank(
        to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')),
        plainto_tsquery('french', ${q})
      ) AS rank
    FROM laws
    WHERE
      to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,''))
      @@ plainto_tsquery('french', ${q})
    ORDER BY rank DESC, publication_date DESC NULLS LAST
    LIMIT 6
  `);

  return NextResponse.json(results.rows);
}
