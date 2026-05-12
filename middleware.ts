/**
 * Edge-layer rate limiting for API routes that carry real cost or spam risk.
 *
 * Current limits (per IP, per route, per window):
 *   /api/chat  POST — 10 req/min   (each call hits Anthropic; budget protection)
 *   /api/track POST — 100 req/min  (cheap DB insert, but prevent flood)
 *
 * Storage: in-process Map — safe for single-instance (local dev, single Vercel
 * worker). For multi-region / high-concurrency production, swap the store for
 * Vercel KV or Upstash Redis:
 *
 *   import { kv } from "@vercel/kv";
 *   const count = await kv.incr(`rl:${key}`);
 *   if (count === 1) await kv.expire(`rl:${key}`, WINDOW_SEC);
 *   if (count > limit.max) return 429;
 *
 * The in-process store still provides meaningful protection in production
 * because each Vercel edge worker enforces the limit independently — a
 * distributed flood is throttled at each shard, not globally, so effective
 * protection degrades gracefully rather than disappearing entirely.
 */

import { NextRequest, NextResponse } from "next/server";

type Entry = { count: number; resetAt: number };

// Bound memory: evict expired entries once the store reaches this size.
const MAX_STORE_SIZE = 10_000;
const store = new Map<string, Entry>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/chat":     { max: 10,  windowMs: 60_000 },
  "/api/track":    { max: 100, windowMs: 60_000 },
  "/api/redirect": { max: 30,  windowMs: 60_000 },
};

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon"
  );
}

export function middleware(req: NextRequest): NextResponse | undefined {
  const { pathname } = req.nextUrl;
  const limit = LIMITS[pathname];

  // Limit configured routes; allow other methods (e.g. OPTIONS) through.
  if (!limit) return undefined;
  if (req.method !== "POST" && req.method !== "GET") return undefined;

  const ip = clientIp(req);
  const key = `${pathname}:${ip}`;
  const now = Date.now();

  // Periodic eviction to keep the store bounded.
  if (store.size >= MAX_STORE_SIZE) {
    store.forEach((v, k) => {
      if (now > v.resetAt) store.delete(k);
    });
  }

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + limit.windowMs });
    return undefined;
  }

  entry.count++;

  const remaining = Math.max(0, limit.max - entry.count);
  const resetSec = Math.ceil(entry.resetAt / 1000);

  if (entry.count > limit.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfterSeconds: retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After":          String(retryAfter),
          "X-RateLimit-Limit":    String(limit.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset":    String(resetSec),
        },
      }
    );
  }

  // Passthrough — attach rate-limit headers so clients can self-throttle.
  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit",     String(limit.max));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset",     String(resetSec));
  return res;
}

export const config = {
  matcher: ["/api/chat", "/api/track", "/api/redirect"],
};
