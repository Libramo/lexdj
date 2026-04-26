// app/api/v1/search/route.ts
// FTS search — mirrors the /recherche page query logic.
//
// GET /api/v1/search?q=décret&limit=15&page=1&type=Loi&ministry=...&era=colonial&sort=relevance

import { NextRequest } from "next/server";
import { db } from "@/drizzle/src";
import { sql } from "drizzle-orm";
import { corsJson, handleOptions } from "@/lib/cors";

export function OPTIONS() {
  return handleOptions();
}

const ERA_CONDITIONS: Record<string, string> = {
  colonial: "publication_date < '1977-06-27'",
  independence:
    "publication_date >= '1977-06-27' AND publication_date < '1990-01-01'",
  modern: "publication_date >= '1990-01-01'",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? 15)),
  );
  const offset = (page - 1) * limit;
  const typeFilter = searchParams.get("type") ?? "";
  const ministryFilter = searchParams.get("ministry") ?? "";
  const eraFilter = searchParams.get("era") ?? "";
  const sort = searchParams.get("sort") ?? "relevance";

  if (!q && !typeFilter && !ministryFilter && !eraFilter) {
    return corsJson(
      {
        error: "Provide at least a query parameter: q, type, ministry, or era",
      },
      400,
    );
  }

  const qSafe = q.replace(/'/g, "''");

  const conditions: string[] = [];
  if (q)
    conditions.push(`(
    to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')) @@ plainto_tsquery('french', '${qSafe}')
    OR
    to_tsvector('simple', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')) @@ plainto_tsquery('simple', '${qSafe}')
  )`);
  if (typeFilter)
    conditions.push(`doc_type = '${typeFilter.replace(/'/g, "''")}'`);
  if (ministryFilter)
    conditions.push(`ministry = '${ministryFilter.replace(/'/g, "''")}'`);
  if (eraFilter && ERA_CONDITIONS[eraFilter])
    conditions.push(ERA_CONDITIONS[eraFilter]);

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderClause =
    sort === "date_desc"
      ? "ORDER BY publication_date DESC NULLS LAST"
      : sort === "date_asc"
        ? "ORDER BY publication_date ASC NULLS LAST"
        : q
          ? `ORDER BY (
      ts_rank(to_tsvector('french', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')), plainto_tsquery('french', '${qSafe}'))
      +
      ts_rank(to_tsvector('simple', COALESCE(title,'') || ' ' || COALESCE(intro_text,'') || ' ' || COALESCE(full_text,'')), plainto_tsquery('simple', '${qSafe}'))
    ) DESC`
          : "ORDER BY publication_date DESC NULLS LAST";

  const excerptExpr = q
    ? `ts_headline('simple',
        COALESCE(intro_text,'') || ' ' || COALESCE(full_text,''),
        plainto_tsquery('simple', '${qSafe}'),
        'MaxFragments=2, MaxWords=15, MinWords=8, FragmentDelimiter= ... , StartSel=<<<, StopSel=>>>'
      )`
    : `intro_text`;

  try {
    const [results, totalResult] = await Promise.all([
      db.execute(
        sql.raw(`
        SELECT id, title, doc_type, ministry, publication_date,
               reference_number, issue_number,
               ${excerptExpr} as excerpt
        FROM laws_distinct
        ${whereClause}
        ${orderClause}
        LIMIT ${limit} OFFSET ${offset}
      `),
      ),
      db.execute(
        sql.raw(`SELECT COUNT(*) as total FROM laws_distinct ${whereClause}`),
      ),
    ]);

    const total = Number((totalResult.rows[0] as any)?.total ?? 0);

    return corsJson({
      data: results.rows,
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
