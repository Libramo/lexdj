import { NextRequest, NextResponse } from "next/server";
import { meiliClient } from "@/lib/meilisearch";
import { LAWS_INDEX } from "@/lib/meilisearch-schema";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  try {
    const result = await meiliClient.index(LAWS_INDEX).search(q, {
      limit: 6,
      // Restrict to a subset of searchableAttributes for this request —
      // never match on full_text for autocomplete. Default matchingStrategy
      // ("last") already gives prefix-like behavior as you type.
      attributesToSearchOn: ["title", "reference_number", "intro_text"],
      attributesToHighlight: ["title"],
      attributesToRetrieve: ["id", "title", "doc_type", "publication_date"],
    } as any);

    const hits =
      result.hits?.map((hit: any) => ({
        id: parseInt(hit.id),
        title: hit.title,
        doc_type: hit.doc_type || null,
        publication_date: hit.publication_date || null,
      })) ?? [];

    return NextResponse.json(hits);
  } catch (err) {
    console.error("[suggest]", err);
    return NextResponse.json([]);
  }
}
