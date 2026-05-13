import { NextRequest, NextResponse } from "next/server";
import { typesenseClient } from "@/lib/typesense";
import { LAWS_COLLECTION } from "@/lib/typesense-schema";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  try {
    const result = await typesenseClient
      .collections(LAWS_COLLECTION)
      .documents()
      .search({
        q,
        query_by: "title,reference_number,intro_text",
        query_by_weights: "4,3,1",
        num_typos: 1, // tolerate 1 typo — arrete finds arrêté
        prefix: true, // arret finds arrêté as you type
        per_page: 6,
        highlight_full_fields: "title",
        include_fields: "id,title,doc_type,publication_date",
      });

    const hits =
      result.hits?.map((hit: any) => ({
        id: parseInt(hit.document.id),
        title: hit.document.title,
        doc_type: hit.document.doc_type || null,
        publication_date: hit.document.publication_date || null,
      })) ?? [];

    return NextResponse.json(hits);
  } catch (err) {
    console.error("[suggest]", err);
    return NextResponse.json([]);
  }
}
