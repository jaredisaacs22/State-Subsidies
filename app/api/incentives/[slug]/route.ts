import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const raw = await prisma.incentive.findUnique({
      where: { slug: params.slug },
    });

    if (!raw) {
      return NextResponse.json({ error: "Incentive not found" }, { status: 404 });
    }

    return NextResponse.json(parseIncentive(raw as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[GET /api/incentives/:slug]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
