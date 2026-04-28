import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  try {
    const [total, federal, state, city, agency, awardStats] = await Promise.all([
      prisma.incentive.count({ where: { status: "ACTIVE" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "FEDERAL" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "STATE" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "CITY" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "AGENCY" } }),
      // SS-005: median + largest from Postgres percentile function
      prisma.$queryRaw<[{ median: number | null; largest: number | null }]>`
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "fundingAmount") AS median,
          MAX("fundingAmount") AS largest
        FROM "Incentive"
        WHERE status = 'ACTIVE' AND "fundingAmount" IS NOT NULL
      `,
    ]);

    const { median, largest } = awardStats[0] ?? { median: null, largest: null };

    return NextResponse.json({
      total,
      federal,
      state,
      city,
      agency,
      medianAward: median != null ? Number(median) : null,
      largestActive: largest != null ? Number(largest) : null,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json({
      total: 0, federal: 0, state: 0, city: 0, agency: 0,
      medianAward: null, largestActive: null, asOf: new Date().toISOString(),
    });
  }
}
