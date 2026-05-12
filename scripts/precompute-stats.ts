/**
 * Build-time stat pre-computation.
 *
 * Generates two static JSON files served from /data/* — replacing per-request
 * /api/stats and /api/stats/states queries on the home and map pages.
 *
 * Schemas are kept identical to the API responses so client fetches only need
 * the URL change.
 *
 * Falls back to writing empty stat shells if DATABASE_URL is missing or the DB
 * is unreachable, so missing-secret builds don't break the deploy.
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(process.cwd(), "public/data");

const JURISDICTION_TO_STATE: Record<string, string> = {
  "San Joaquin Valley, CA": "California",
  "Bay Area, CA": "California",
  "Southern California": "California",
  "Northern & Central California": "California",
  "Sacramento, CA": "California",
  "San Diego, CA": "California",
  "Ventura County, CA": "California",
  "Los Angeles, CA": "California",
  "PG&E territory CA": "California",
  "SoCalGas territory CA": "California",
  "Seattle, WA": "Washington",
  "Puget Sound, WA": "Washington",
  "Phoenix, AZ": "Arizona",
  "Maricopa County, AZ": "Arizona",
  "Denver, CO": "Colorado",
  "Houston, TX": "Texas",
  "Dallas, TX": "Texas",
  "Austin, TX": "Texas",
  "San Antonio, TX": "Texas",
  "New York City, NY": "New York",
  "NYC, NY": "New York",
  "Chicago, IL": "Illinois",
  "Atlanta, GA": "Georgia",
  "Miami, FL": "Florida",
  "Philadelphia, PA": "Pennsylvania",
  "Boston, MA": "Massachusetts",
  "Baltimore, MD": "Maryland",
  "Minneapolis, MN": "Minnesota",
  "Nashville, TN": "Tennessee",
  "Portland, OR": "Oregon",
  "Detroit, MI": "Michigan",
};

function writeJSON(name: string, data: unknown): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(data));
}

function writeEmpty(): void {
  writeJSON("stats.json", {
    total: 0, federal: 0, state: 0, city: 0, agency: 0,
    medianAward: null, largestActive: null,
    asOf: new Date().toISOString(),
  });
  writeJSON("stats-states.json", { counts: {} });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("[precompute-stats] DATABASE_URL not set — writing empty stat files");
    writeEmpty();
    return;
  }

  const prisma = new PrismaClient();
  try {
    const [total, federal, state, city, agency, awardStats] = await Promise.all([
      prisma.incentive.count({ where: { status: "ACTIVE" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "FEDERAL" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "STATE" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "CITY" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "AGENCY" } }),
      prisma.$queryRaw<[{ median: number | null; largest: number | null }]>`
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "fundingAmount") AS median,
          MAX("fundingAmount") AS largest
        FROM "Incentive"
        WHERE status = 'ACTIVE' AND "fundingAmount" IS NOT NULL
      `,
    ]);

    const { median, largest } = awardStats[0] ?? { median: null, largest: null };

    writeJSON("stats.json", {
      total, federal, state, city, agency,
      medianAward: median != null ? Number(median) : null,
      largestActive: largest != null ? Number(largest) : null,
      asOf: new Date().toISOString(),
    });

    const stateGroups = await prisma.incentive.groupBy({
      by: ["jurisdictionName"],
      where: { status: "ACTIVE", jurisdictionLevel: "STATE" },
      _count: { _all: true },
    });
    const subStatePrograms = await prisma.incentive.findMany({
      where: { status: "ACTIVE", jurisdictionLevel: { in: ["AGENCY", "CITY"] } },
      select: { jurisdictionName: true },
    });

    const counts: Record<string, number> = {};
    for (const row of stateGroups) {
      counts[row.jurisdictionName] = (counts[row.jurisdictionName] ?? 0) + row._count._all;
    }
    for (const { jurisdictionName } of subStatePrograms) {
      const parent = JURISDICTION_TO_STATE[jurisdictionName];
      if (parent) counts[parent] = (counts[parent] ?? 0) + 1;
    }

    writeJSON("stats-states.json", { counts });

    console.log(`[precompute-stats] wrote ${total} programs, ${Object.keys(counts).length} states`);
  } catch (err) {
    console.warn("[precompute-stats] DB query failed — writing empty stat files:", err);
    writeEmpty();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[precompute-stats] fatal:", err);
  writeEmpty();
  process.exit(0);
});
