import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
// Cache for 5 minutes — stats don't need to be real-time
export const revalidate = 300;

export async function GET() {
  try {
    const [total, federal, state, city, agency] = await Promise.all([
      prisma.incentive.count({ where: { status: "ACTIVE" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "FEDERAL" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "STATE" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "CITY" } }),
      prisma.incentive.count({ where: { status: "ACTIVE", jurisdictionLevel: "AGENCY" } }),
    ]);

    return NextResponse.json({ total, federal, state, city, agency });
  } catch (error) {
    console.error('[GET /api/stats]', error);
    return NextResponse.json({ total: 0, federal: 0, state: 0, city: 0, agency: 0 });
  }
}
