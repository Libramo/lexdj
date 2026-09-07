// app/api/v1/search/route.ts
import { NextRequest } from "next/server";
import { meiliClient } from "@/lib/meilisearch";
import { LAWS_INDEX } from "@/lib/meilisearch-schema";
import { corsJson, handleOptions } from "@/lib/cors";

export function OPTIONS() {
  return handleOptions();
}

// publication_date_ts (YYYYMMDD as an integer) is what these ranges
// actually filter on — Meilisearch's comparison operators only work on
// numeric attributes, not the display-only publication_date string.
const ERA_FILTERS: Record<string, string> = {
  colonial: "publication_date_ts < 19770627",
  independence:
    "publication_date_ts >= 19770627 AND publication_date_ts < 19900101",
  modern: "publication_date_ts >= 19900101",
};

function quote(value: string): string {
  return JSON.stringify(value);
}

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

  // Build Meilisearch filter expression
  const filters: string[] = [];
  if (typeFilter) filters.push(`doc_type = ${quote(typeFilter)}`);
  if (ministryFilter)
    filters.push(`ministry_normalized = ${quote(ministryFilter)}`);
  if (eraFilter && ERA_FILTERS[eraFilter]) filters.push(ERA_FILTERS[eraFilter]);
  const filterBy = filters.join(" AND ");

  // Sort — Meilisearch's default ranking rules already place `sort` after
  // words/typo/proximity/attribute and before exactness, so passing
  // pub_year:desc alongside a text query gives "relevance first, date
  // tiebreak" for free; no need for Typesense's separate _text_match case.
  const sortArr =
    sort === "date_desc"
      ? ["pub_year:desc"]
      : sort === "date_asc"
        ? ["pub_year:asc"]
        : ["pub_year:desc"];

  try {
    const result = await meiliClient.index(LAWS_INDEX).search(q, {
      filter: filterBy || undefined,
      sort: sortArr,
      page,
      hitsPerPage: limit,
      matchingStrategy: "all",
      attributesToHighlight: ["intro_text"],
      attributesToCrop: ["intro_text"],
      cropLength: 30,
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      attributesToRetrieve: [
        "id",
        "title",
        "doc_type",
        "ministry",
        "publication_date",
        "reference_number",
        "issue_number",
        "intro_text",
      ],
    } as any);

    const total = (result as any).totalHits ?? 0;
    const totalPages = (result as any).totalPages ?? Math.ceil(total / limit);

    const data =
      result.hits?.map((hit: any) => ({
        ...hit,
        id: parseInt(hit.id),
        excerpt:
          hit._formatted?.intro_text ?? hit.intro_text?.slice(0, 200) ?? "",
      })) ?? [];

    return corsJson({
      data,
      meta: {
        q,
        page,
        limit,
        total,
        pages: totalPages,
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/search]", err);
    return corsJson({ error: "Internal server error" }, 500);
  }
}
