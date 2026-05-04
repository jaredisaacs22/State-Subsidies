import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";
import type { IncentiveFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_JURISDICTION = ["FEDERAL", "STATE", "CITY", "AGENCY"] as const;
const VALID_TYPE = ["GRANT", "TAX_CREDIT", "POINT_OF_SALE_REBATE", "SUBSIDY", "LOAN", "VOUCHER"] as const;
const VALID_STATUS = ["ACTIVE", "CLOSED", "UPCOMING", "SUSPENDED"] as const;
const VALID_SORT = ["relevance", "createdAt", "fundingAmount", "deadline"] as const;

function pickValid<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function safeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
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
      sortBy: pickValid(searchParams.get("sortBy"), VALID_SORT) ?? "relevance",
      sortOrder: pickValid(searchParams.get("sortOrder"), ["asc", "desc"] as const) ?? "desc",
      page: safeInt(searchParams.get("page"), 1),
      pageSize: safeInt(searchParams.get("pageSize"), 12),
      minFunding: searchParams.get("minFunding") ? safeInt(searchParams.get("minFunding"), 0) : undefined,
      maxFunding: searchParams.get("maxFunding") ? safeInt(searchParams.get("maxFunding"), 0) : undefined,
      verified: searchParams.get("verified") === "true" ? true : undefined,
      closingSoon: searchParams.get("closingSoon") === "true" ? true : undefined,
      excludeIndustryCategory: searchParams.get("excludeIndustryCategory") ?? undefined,
    };
    const jurisdictionNameFilter = searchParams.get("jurisdictionName") ?? undefined;
    const slugsParam = searchParams.get("slugs");
    const slugsFilter = slugsParam ? slugsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 500) : [];

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    // When fetching by slug list (saved page), skip status filter so closed programs still show
    if (slugsFilter.length > 0) {
      where.slug = { in: slugsFilter };
    } else if (filters.status) {
      where.status = filters.status;
    }
    if (filters.jurisdictionLevel) where.jurisdictionLevel = filters.jurisdictionLevel;
    if (filters.incentiveType) where.incentiveType = filters.incentiveType;
    if (jurisdictionNameFilter) where.jurisdictionName = { equals: jurisdictionNameFilter, mode: "insensitive" };

    // Full-text search across title, summary, agency
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { shortSummary: { contains: filters.search, mode: "insensitive" } },
        { managingAgency: { contains: filters.search, mode: "insensitive" } },
        { agencyAcronym: { contains: filters.search, mode: "insensitive" } },
        { jurisdictionName: { contains: filters.search, mode: "insensitive" } },
        { industryCategories: { hasSome: [filters.search] } },
      ];
    }

    if (filters.industryCategory) {
      where.industryCategories = { has: filters.industryCategory };
    }

    if (filters.excludeIndustryCategory) {
      where.NOT = { industryCategories: { has: filters.excludeIndustryCategory } };
    }

    if (filters.verified) where.isVerified = true;
    if (filters.closingSoon) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      where.deadline = { gte: now, lte: thirtyDays };
    }
    if (filters.minFunding !== undefined || filters.maxFunding !== undefined) {
      const fundingFilter: Record<string, number> = {};
      if (filters.minFunding !== undefined) fundingFilter.gte = filters.minFunding;
      if (filters.maxFunding !== undefined) fundingFilter.lte = filters.maxFunding;
      where.fundingAmount = fundingFilter;
    }

    // "relevance" is the default — surface broad, trustworthy, well-funded
    // programs first. jurisdictionLevel sorted desc gives lexicographic order
    // STATE > FEDERAL > CITY > AGENCY, which happens to be the broad-to-niche
    // ranking we want (any state resident vs. niche federal program vs. local).
    const orderBy =
      filters.sortBy === "fundingAmount"
        ? [{ fundingAmount: filters.sortOrder }]
        : filters.sortBy === "deadline"
        ? [{ deadline: filters.sortOrder }]
        : filters.sortBy === "createdAt"
        ? [{ createdAt: filters.sortOrder }]
        : [
            { isVerified: "desc" as const },
            { jurisdictionLevel: "desc" as const },
            { fundingAmount: { sort: "desc" as const, nulls: "last" as const } },
            { createdAt: "desc" as const },
          ];

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
    const err = error as { message?: string; code?: string };
    console.error("[GET /api/incentives]", err.code, err.message);
    // Return an empty page instead of 500 so the site renders a clean
    // "no programs" state during DB outages rather than crashing the UI.
    return NextResponse.json({
      data: [],
      total: 0,
      page: 1,
      pageSize: 0,
      totalPages: 0,
      degraded: true,
      reason: err.code ?? "DB_ERROR",
    });
  }
}
