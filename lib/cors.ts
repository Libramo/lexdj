// lib/cors.ts
// Shared CORS headers for all /api/v1/ routes.
// Usage: wrap your NextResponse with withCors(response)
//        or use corsHeaders directly.

import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Attach CORS headers to any NextResponse */
export function withCors(res: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * Handle OPTIONS preflight — add this at the top of every route:
 *
 *   export function OPTIONS() { return handleOptions(); }
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Convenience: build a JSON response with CORS + optional extra headers.
 *
 *   return corsJson(data, 200);
 *   return corsJson({ error: "Not found" }, 404);
 */
export function corsJson(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
