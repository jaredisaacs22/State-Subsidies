import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_JURISDICTION = ["FEDERAL", "STATE", "CITY", "AGENCY"] as const;
const VALID_TYPE = ["GRANT", "TAX_CREDIT", "POINT_OF_SALE_REBATE", "SUBSIDY", "LOAN", "VOUCHER"] as const;
const VALID_STATUS = ["ACTIVE", "CLOSED", "UPCOMING", "SUSPENDED"] as const;
const VALID_SORT = ["createdAt", "fundingAmount", "deadline"] as const;

function pickValid<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const filters: IncentiveFilters = {
      search: searchParams.get("search") ?? undefined,
      jurisdictionLevel: pickValid(searchParams.get("jurisdictionLevel"), VALID_JURISDICTION),
      incentiveType: pickValid(searchParams.get("incentiveType"), VALID_TYPE),
      industryCategory: searchParams.get("industryCategory") ?? undefined,
      status: pickValid(searchParams.get("status"), VALID_STATUS) ?? "ACTIVE",
      sortBy: pickValid(searchParams.get("sortBy"), VALID_SORT) ?? "createdAt",
      sortOrder: pickValid(searchParams.get("sortOrder"), ["asc", "desc"] as const) ?? "desc",
      page: parseInt(searchParams.get("page") ?? "1"),
      pageSize: parseInt(searchParams.get("pageSize") ?? "12"),
      minFunding: searchParams.get("minFunding") ? parseInt(searchParams.get("minFunding")!) : undefined,
      maxFunding: searchParams.get("maxFunding") ? parseInt(searchParams.get("maxFunding")!) : undefined,
      verified: searchParams.get("verified") === "true" ? true : undefined,
      closingSoon: searchParams.get("closingSoon") === "true" ? true : undefined,
    };
    const jurisdictionNameFilter = searchParams.get("jurisdictionName") ?? undefined;

    // Build Prisma where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (filters.status) where.status = filters.status;
    if (filters.jurisdictionLevel) where.jurisdictionLevel = filters.jurisdictionLevel;
    if (filters.incentiveType) where.incentiveType = filters.incentiveType;
    if (jurisdictionNameFilter) where.jurisdictionName = { contains: jurisdictionNameFilter, mode: "insensitive" };

    // Full-text search across title, summary, agency
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { shortSummary: { contains: filters.search, mode: "insensitive" } },
        { managingAgency: { contains: filters.search, mode: "insensitive" } },
        { agencyAcronym: { contains: filters.search, mode: "insensitive" } },
        { jurisdictionName: { contains: filters.search, mode: "insensitive" } },
        { industryCategories: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Industry category is stored as JSON array string — use contains
    if (filters.industryCategory) {
      where.industryCategories = { contains: filters.industryCategory, mode: "insensitive" };
    }

    if (filters.verified) where.isVerified = true;
    if (filters.closingSoon) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      where.deadline = { gte: now.toISOString(), lte: thirtyDays.toISOString() };
    }
    if (filters.minFunding !== undefined || filters.maxFunding !== undefined) {
      where.fundingAmount = {};
      if (filters.minFunding !== undefined) where.fundingAmount.gte = filters.minFunding;
      if (filters.maxFunding !== undefined) where.fundingAmount.lte = filters.maxFunding;
    }

    const orderBy =
      filters.sortBy === "fundingAmount"
        ? { fundingAmount: filters.sortOrder }
        : filters.sortBy === "deadline"
        ? { deadline: filters.sortOrder }
        : { createdAt: filters.sortOrder };

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 12));
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
