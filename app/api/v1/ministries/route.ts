import { db } from "@/drizzle/src";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";

  // Every value below is bound as a real query parameter via Drizzle's
  // tagged `sql` template (never sql.raw + string interpolation), per
  // architecture.md Invariant 7.
  const conditions: ReturnType<typeof sql>[] = [
    sql`ministry IS NOT NULL`,
    sql`id NOT IN (SELECT id FROM duplicate_laws)`,
  ];

  if (q) conditions.push(sql`ministry ILIKE ${`%${q}%`}`);

  const where = sql.join(conditions, sql` AND `);

  try {
    const [rows, totalResult] = await Promise.all([
      db.execute(sql`
        SELECT
          ministry,
          COUNT(*)::int AS text_count
        FROM laws
        WHERE ${where}
        GROUP BY ministry
        ORDER BY text_count DESC
      `),
      db.execute(sql`
        SELECT COUNT(DISTINCT ministry)::int as total
        FROM laws
        WHERE ${where}
      `),
    ]);

    const total = Number((totalResult.rows[0] as any).total);

    return NextResponse.json({
      data: rows.rows,
      meta: { total },
    });
  } catch (err) {
    console.error("API ministries error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
