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

  // Build WHERE — every value below is bound as a real query parameter via
  // Drizzle's tagged `sql` template (never sql.raw + string interpolation),
  // per architecture.md Invariant 7. This previously used sql.raw() with
  // manual `.replace(/'/g, "''")` escaping, a known gap (see
  // code-standards.md) rather than true parameterization.
  const conditions: ReturnType<typeof sql>[] = [
    sql`id NOT IN (SELECT id FROM duplicate_laws)`,
  ];
  if (type) conditions.push(sql`doc_type = ${type}`);
  if (ministry) conditions.push(sql`ministry = ${ministry}`);
  if (era === "colonial") conditions.push(sql`publication_date < '1977-06-27'`);
  if (era === "independence")
    conditions.push(
      sql`publication_date >= '1977-06-27' AND publication_date < '1990-01-01'`,
    );
  if (era === "modern") conditions.push(sql`publication_date >= '1990-01-01'`);

  const where = sql.join(conditions, sql` AND `);

  try {
    const [rows, totalResult] = await Promise.all([
      db.execute(sql`
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
        FROM laws
        WHERE ${where}
        ORDER BY publication_date DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(*)::int as total FROM laws WHERE ${where}
      `),
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
