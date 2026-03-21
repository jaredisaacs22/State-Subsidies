import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const filters: IncentiveFilters = {
      search: searchParams.get("search") ?? undefined,
      jurisdictionLevel: (searchParams.get("jurisdictionLevel") as IncentiveFilters["jurisdictionLevel"]) ?? undefined,
      incentiveType: (searchParams.get("incentiveType") as IncentiveFilters["incentiveType"]) ?? undefined,
      industryCategory: searchParams.get("industryCategory") ?? undefined,
      status: (searchParams.get("status") as IncentiveFilters["status"]) ?? "ACTIVE",
      sortBy: (searchParams.get("sortBy") as IncentiveFilters["sortBy"]) ?? "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc",
      page: parseInt(searchParams.get("page") ?? "1"),
      pageSize: parseInt(searchParams.get("pageSize") ?? "12"),
    };

    // Build Prisma where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (filters.status) where.status = filters.status;
    if (filters.jurisdictionLevel) where.jurisdictionLevel = filters.jurisdictionLevel;
    if (filters.incentiveType) where.incentiveType = filters.incentiveType;

    // Full-text search across title, summary, agency
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { shortSummary: { contains: filters.search, mode: "insensitive" } },
        { managingAgency: { contains: filters.search, mode: "insensitive" } },
        { jurisdictionName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Industry category is stored as JSON array string — use contains
    if (filters.industryCategory) {
      where.industryCategories = { contains: filters.industryCategory };
    }

    const orderBy =
      filters.sortBy === "fundingAmount"
        ? { fundingAmount: filters.sortOrder }
        : filters.sortBy === "deadline"
        ? { deadline: filters.sortOrder }
        : { createdAt: filters.sortOrder };

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 12));
    const skip = (page - 1) * pageSize;

    const [total, rawItems] = await Promise.all([
      prisma.incentive.count({ where }),
      prisma.incentive.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    const data = rawItems.map((item) => parseIncentive(item as unknown as Record<string, unknown>));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[GET /api/incentives]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
