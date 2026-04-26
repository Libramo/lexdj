// proxy.ts — root level
// Replaces in-memory Map with Upstash Redis sliding-window rate limiter.
// Requires: npm install @upstash/ratelimit @upstash/redis
//
// Vercel env vars to set:
//   UPSTASH_REDIS_REST_URL   — from Upstash console → REST API → Endpoint
//   UPSTASH_REDIS_REST_TOKEN — from Upstash console → REST API → Read/Write Token

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(), // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute per IP
  analytics: true, // visible in Upstash dashboard
  prefix: "lexdj_rl", // namespace in Redis so keys don't clash
});

export async function proxy(req: NextRequest) {
  // ── Admin auth ────────────────────────────────────────────
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("admin_token")?.value;
    if (token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (!req.nextUrl.pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset", String(reset));
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*"],
};
