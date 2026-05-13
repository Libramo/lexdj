// app/api/v1/search/route.ts
import { NextRequest } from "next/server";
import { typesenseClient } from "@/lib/typesense";
import { LAWS_COLLECTION } from "@/lib/typesense-schema";
import { corsJson, handleOptions } from "@/lib/cors";

export function OPTIONS() {
  return handleOptions();
}

const ERA_FILTERS: Record<string, string> = {
  colonial: "publication_date:<1977-06-27",
  independence: "publication_date:>=1977-06-27 && publication_date:<1990-01-01",
  modern: "publication_date:>=1990-01-01",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? 15)),
  );
  const typeFilter = searchParams.get("type") ?? "";
  const ministryFilter = searchParams.get("ministry") ?? "";
  const eraFilter = searchParams.get("era") ?? "";
  const sort = searchParams.get("sort") ?? "relevance";

  if (!q && !typeFilter && !ministryFilter && !eraFilter) {
    return corsJson(
      { error: "Provide at least one parameter: q, type, ministry, or era" },
      400,
    );
  }

  // Build Typesense filter_by string
  const filters: string[] = [];
  if (typeFilter) filters.push(`doc_type:=${typeFilter}`);
  if (ministryFilter) filters.push(`ministry_normalized:=${ministryFilter}`);
  if (eraFilter && ERA_FILTERS[eraFilter]) filters.push(ERA_FILTERS[eraFilter]);
  const filterBy = filters.join(" && ");

  // Sort
  const sortBy =
    sort === "date_desc"
      ? "pub_year:desc"
      : sort === "date_asc"
        ? "pub_year:asc"
        : q
          ? "_text_match:desc,pub_year:desc"
          : "pub_year:desc";

  try {
    const result = await typesenseClient
      .collections(LAWS_COLLECTION)
      .documents()
      .search({
        q: q || "*",
        query_by: "title,reference_number,intro_text,full_text",
        query_by_weights: "4,3,2,1",
        filter_by: filterBy || undefined,
        sort_by: sortBy,
        page,
        per_page: limit,
        num_typos: 1,
        prefix: false,
        highlight_fields: "title,intro_text",
        snippet_threshold: 30,
        include_fields:
          "id,title,doc_type,ministry,publication_date,reference_number,issue_number,intro_text",
      });

    const total = result.found;
    const data =
      result.hits?.map((hit: any) => ({
        ...hit.document,
        id: parseInt(hit.document.id),
        excerpt:
          hit.highlights?.find((h: any) => h.field === "intro_text")?.snippet ??
          hit.document.intro_text?.slice(0, 200) ??
          "",
      })) ?? [];

    return corsJson({
      data,
      meta: {
        q,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/search]", err);
    return corsJson({ error: "Internal server error" }, 500);
  }
}
