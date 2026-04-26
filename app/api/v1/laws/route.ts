import { db } from "@/drizzle/src";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10),
    ),
  );
  const offset = (page - 1) * limit;

  // Filters
  const type = searchParams.get("type") ?? "";
  const ministry = searchParams.get("ministry") ?? "";
  const era = searchParams.get("era") ?? "";

  // Build WHERE
  const conditions: string[] = [];
  if (type) conditions.push(`doc_type = '${type.replace(/'/g, "''")}'`);
  if (ministry) conditions.push(`ministry = '${ministry.replace(/'/g, "''")}'`);
  if (era === "colonial") conditions.push(`publication_date < '1977-06-27'`);
  if (era === "independence")
    conditions.push(
      `publication_date >= '1977-06-27' AND publication_date < '1990-01-01'`,
    );
  if (era === "modern") conditions.push(`publication_date >= '1990-01-01'`);

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [rows, totalResult] = await Promise.all([
      db.execute(
        sql.raw(`
        SELECT
          id,
          title,
          doc_type,
          reference_number,
          ministry,
          publication_date,
          issue_number,
          intro_text,
          signed_by,
          source_url
        FROM laws_distinct
        ${where}
        ORDER BY publication_date DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `),
      ),
      db.execute(
        sql.raw(`
        SELECT COUNT(*)::int as total FROM laws_distinct ${where}
      `),
      ),
    ]);

    const total = Number((totalResult.rows[0] as any).total);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: rows.rows,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
