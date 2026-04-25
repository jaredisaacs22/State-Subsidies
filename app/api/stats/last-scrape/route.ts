import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
// Cache for 60s — Trust Ribbon shows "updated X ago"; minute-level granularity is fine.
export const revalidate = 60;

// SS-001 Trust Ribbon backing endpoint.
// Returns the latest ScrapeRun across all sources + per-source most-recent run.
// Until ScrapeRun has rows (pre-live promotion), the response is shape-stable
// with nulls so the frontend can render "Updated: never" without crashing.
export async function GET() {
  try {
    const latest = await prisma.scrapeRun.findFirst({
      orderBy: { finishedAt: "desc" },
    });

    const perSource = await prisma.scrapeRun.findMany({
      orderBy: { finishedAt: "desc" },
      distinct: ["source"],
      select: {
        source: true,
        finishedAt: true,
        status: true,
        rowsInserted: true,
        rowsUpdated: true,
        qualityGateRejections: true,
      },
    });

    return NextResponse.json({
      latest: latest
        ? {
            source: latest.source,
            finishedAt: latest.finishedAt,
            status: latest.status,
            rowsInserted: latest.rowsInserted,
            rowsUpdated: latest.rowsUpdated,
            durationMs: latest.durationMs,
          }
        : null,
      perSource,
    });
  } catch (error) {
    console.error("[GET /api/stats/last-scrape]", error);
    // ScrapeRun table may not exist yet on a fresh DB before migration runs.
    return NextResponse.json({ latest: null, perSource: [] });
  }
}
