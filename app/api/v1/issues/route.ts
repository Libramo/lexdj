import { db } from "@/drizzle/src";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10),
    ),
  );
  const offset = (page - 1) * limit;
  const era = searchParams.get("era") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  // Every value below is bound as a real query parameter via Drizzle's
  // tagged `sql` template (never sql.raw + string interpolation), per
  // architecture.md Invariant 7. This previously used sql.raw() with
  // manual `.replace(/'/g, "''")` escaping, a known gap (see
  // code-standards.md) rather than true parameterization.
  const conditions: ReturnType<typeof sql>[] = [
    sql`issue_number IS NOT NULL`,
    sql`issue_date IS NOT NULL`,
    sql`id NOT IN (SELECT id FROM duplicate_laws)`,
  ];

  if (era === "colonial") conditions.push(sql`issue_date < '1977-06-27'`);
  if (era === "independence")
    conditions.push(
      sql`issue_date >= '1977-06-27' AND issue_date < '1990-01-01'`,
    );
  if (era === "modern") conditions.push(sql`issue_date >= '1990-01-01'`);
  if (q)
    conditions.push(
      sql`(issue_number ILIKE ${`%${q}%`} OR issue_date::text ILIKE ${`%${q}%`})`,
    );

  const where = sql.join(conditions, sql` AND `);

  try {
    const [rows, totalResult] = await Promise.all([
      db.execute(sql`
        SELECT
          issue_number,
          issue_date,
          COUNT(*)::int AS text_count
        FROM laws
        WHERE ${where}
        GROUP BY issue_number, issue_date
        ORDER BY issue_date DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `),
      db.execute(sql`
        SELECT COUNT(DISTINCT issue_number)::int as total
        FROM laws
        WHERE ${where}
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
    console.error("API issues error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
