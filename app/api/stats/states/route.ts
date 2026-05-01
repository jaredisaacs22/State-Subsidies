import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 300;

// Map sub-state jurisdiction names (AGENCY/CITY) to their parent US state name
const JURISDICTION_TO_STATE: Record<string, string> = {
  // California
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
  // Washington
  "Seattle, WA": "Washington",
  "Puget Sound, WA": "Washington",
  // Arizona
  "Phoenix, AZ": "Arizona",
  "Maricopa County, AZ": "Arizona",
  // Colorado
  "Denver, CO": "Colorado",
  // Texas
  "Houston, TX": "Texas",
  "Dallas, TX": "Texas",
  "Austin, TX": "Texas",
  "San Antonio, TX": "Texas",
  // New York
  "New York City, NY": "New York",
  "NYC, NY": "New York",
  // Illinois
  "Chicago, IL": "Illinois",
  // Georgia
  "Atlanta, GA": "Georgia",
  // Florida
  "Miami, FL": "Florida",
  // Pennsylvania
  "Philadelphia, PA": "Pennsylvania",
  // Massachusetts
  "Boston, MA": "Massachusetts",
  // Maryland
  "Baltimore, MD": "Maryland",
  // Minnesota
  "Minneapolis, MN": "Minnesota",
  // Tennessee
  "Nashville, TN": "Tennessee",
  // Oregon
  "Portland, OR": "Oregon",
  // Michigan
  "Detroit, MI": "Michigan",
};

export async function GET() {
  try {
    // Single groupBy query for STATE-level counts
    const stateGroups = await prisma.incentive.groupBy({
      by: ["jurisdictionName"],
      where: { status: "ACTIVE", jurisdictionLevel: "STATE" },
      _count: { _all: true },
    });

    // Separate query for AGENCY + CITY — map to parent state
    const subStatePrograms = await prisma.incentive.findMany({
      where: {
        status: "ACTIVE",
        jurisdictionLevel: { in: ["AGENCY", "CITY"] },
      },
      select: { jurisdictionName: true },
    });

    // Build counts map
    const counts: Record<string, number> = {};

    for (const row of stateGroups) {
      counts[row.jurisdictionName] = (counts[row.jurisdictionName] ?? 0) + row._count._all;
    }

    for (const { jurisdictionName } of subStatePrograms) {
      const state = JURISDICTION_TO_STATE[jurisdictionName];
      if (state) {
        counts[state] = (counts[state] ?? 0) + 1;
      }
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('[GET /api/stats/states]', error);
    return NextResponse.json({ counts: {} });
  }
}
