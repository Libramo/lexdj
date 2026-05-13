// app/api/pdf/law/[id]/route.ts
// Generates a styled PDF for a single law
//
// GET /api/pdf/law/123

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";
import { eq, and, sql } from "drizzle-orm";
import React from "react";
import { LawDocument } from "@/components/public/law-document-pdf";
import { getBlyLogo } from "@/lib/pdf-assets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Fetch law — exclude duplicates
  const [law] = await db
    .select({
      id: laws.id,
      title: laws.title,
      doc_type: laws.doc_type,
      reference_number: laws.reference_number,
      ministry: laws.ministry,
      publication_date: laws.publication_date,
      issue_number: laws.issue_number,
      issue_date: laws.issue_date,
      mesure: laws.mesure,
      period: laws.period,
      intro_text: laws.intro_text,
      visas_text: laws.visas_text,
      full_text: laws.full_text,
      signed_by: laws.signed_by,
      source_url: laws.source_url,
    })
    .from(laws)
    .where(
      and(
        eq(laws.id, numId),
        sql`${laws.id} NOT IN (SELECT id FROM duplicate_laws)`,
      ),
    )
    .limit(1);

  if (!law) {
    return NextResponse.json({ error: "Law not found" }, { status: 404 });
  }

  //   Generate PDF buffer
  const logoSrc = getBlyLogo();
  const buffer = await renderToBuffer(
    <LawDocument law={law} logoSrc={logoSrc} />,
  );

  // Build a safe filename from title or reference number
  const filename = `${(law.reference_number ?? law.title ?? `loi-${law.id}`)
    .replace(/[^a-zA-Z0-9\-_àâéèêëîïôùûüçœæÀÂÉÈÊËÎÏÔÙÛÜÇŒÆ]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .toLowerCase()}-lexdj-bly-analytics`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
