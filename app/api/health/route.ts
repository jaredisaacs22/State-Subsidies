/**
 * Health endpoint — for uptime monitors, deploy verification, and ops runbooks.
 *
 * Returns JSON with three signals:
 *   - ok           process is alive and the response handler ran
 *   - dbLatencyMs  round-trip time of a trivial DB query (null if unreachable)
 *   - dbReachable  whether the DB query succeeded
 *
 * Always 200 if the process is up. The dbReachable flag is the actionable
 * signal — uptime monitors should alert on dbReachable=false, not on HTTP
 * status (so the endpoint stays observable through partial outages).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type HealthBody = {
  ok: true;
  ts: string;
  dbReachable: boolean;
  dbLatencyMs: number | null;
  dbError: string | null;
  dbHost: string | null;
  region: string | null;
  commit: string | null;
};

function extractHost(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/@([^:/]+)/);
  return m ? m[1] : null;
}

export async function GET(): Promise<NextResponse<HealthBody>> {
  const t0 = Date.now();
  let dbReachable = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReachable = true;
    dbLatencyMs = Date.now() - t0;
  } catch (e) {
    dbReachable = false;
    dbLatencyMs = null;
    const err = e as { message?: string; code?: string };
    dbError = `${err.code ?? "ERR"}: ${(err.message ?? String(e)).slice(0, 400)}`;
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    dbReachable,
    dbLatencyMs,
    dbError,
    dbHost: extractHost(process.env.DATABASE_URL),
    region: process.env.VERCEL_REGION ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
