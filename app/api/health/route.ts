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
  region: string | null;
  commit: string | null;
};

export async function GET(): Promise<NextResponse<HealthBody>> {
  const t0 = Date.now();
  let dbReachable = false;
  let dbLatencyMs: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReachable = true;
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbReachable = false;
    dbLatencyMs = null;
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    dbReachable,
    dbLatencyMs,
    region: process.env.VERCEL_REGION ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
