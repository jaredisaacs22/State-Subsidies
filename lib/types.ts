// ─── Enums (mirror Prisma schema for client-side use) ───────────────────────

export type JurisdictionLevel = "FEDERAL" | "STATE" | "CITY" | "AGENCY";
export type IncentiveType = "GRANT" | "TAX_CREDIT" | "POINT_OF_SALE_REBATE" | "SUBSIDY" | "LOAN" | "VOUCHER";
export type IncentiveStatus = "ACTIVE" | "CLOSED" | "UPCOMING" | "SUSPENDED";

// ─── Core Incentive shape returned by API ───────────────────────────────────

export interface Incentive {
  id: string;
  createdAt: string;
  updatedAt: string;

  title: string;
  slug: string;

  jurisdictionLevel: JurisdictionLevel;
  jurisdictionName: string;

  managingAgency: string;
  agencyAcronym: string | null;

  shortSummary: string;
  keyRequirements: string[]; // parsed from JSON
  industryCategories: string[]; // parsed from JSON

  incentiveType: IncentiveType;

  fundingAmount: number | null;
  deadline: string | null;
  applicationOpenDate: string | null;

  sourceUrl: string;
  programCode: string | null;
  status: IncentiveStatus;
  isVerified: boolean;

  scrapedAt: string | null;
  scraperSource: string | null;
}

// ─── API query params ────────────────────────────────────────────────────────

export interface IncentiveFilters {
  search?: string;
  jurisdictionLevel?: JurisdictionLevel;
  incentiveType?: IncentiveType;
  industryCategory?: string;
  status?: IncentiveStatus;
  sortBy?: "deadline" | "fundingAmount" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ─── API response envelope ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Display label helpers ───────────────────────────────────────────────────

export const JURISDICTION_LABELS: Record<JurisdictionLevel, string> = {
  FEDERAL: "Federal",
  STATE: "State",
  CITY: "City / Municipal",
  AGENCY: "Agency / District",
};

export const INCENTIVE_TYPE_LABELS: Record<IncentiveType, string> = {
  GRANT: "Grant",
  TAX_CREDIT: "Tax Credit",
  POINT_OF_SALE_REBATE: "Point-of-Sale Rebate",
  SUBSIDY: "Subsidy",
  LOAN: "Loan",
  VOUCHER: "Voucher",
};

export const INDUSTRY_CATEGORIES = [
  "Agriculture",
  "Clean Technology",
  "Construction",
  "Energy Management",
  "Fleet",
  "Infrastructure",
  "Logistics",
  "Manufacturing",
  "Public Transit",
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

// ─── Badge color maps ────────────────────────────────────────────────────────

export const INCENTIVE_TYPE_COLORS: Record<IncentiveType, string> = {
  GRANT: "bg-emerald-100 text-emerald-800",
  TAX_CREDIT: "bg-violet-100 text-violet-800",
  POINT_OF_SALE_REBATE: "bg-orange-100 text-orange-800",
  SUBSIDY: "bg-sky-100 text-sky-800",
  LOAN: "bg-yellow-100 text-yellow-800",
  VOUCHER: "bg-pink-100 text-pink-800",
};

export const JURISDICTION_COLORS: Record<JurisdictionLevel, string> = {
  FEDERAL: "bg-brand-100 text-brand-800",
  STATE: "bg-indigo-100 text-indigo-800",
  CITY: "bg-teal-100 text-teal-800",
  AGENCY: "bg-rose-100 text-rose-800",
};
