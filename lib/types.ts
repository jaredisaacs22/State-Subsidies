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
  jurisdictionName?: string;
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
  "Agriculture", "Automotive", "Aviation", "Building Electrification",
  "Clean Technology", "Construction", "Education", "Energy Management",
  "Energy Storage", "EV Charging", "Film & Media", "Financial Services",
  "Fleet", "Food & Beverage", "Forestry", "Government & Nonprofit",
  "Healthcare", "Hospitality", "Infrastructure", "Logistics",
  "Manufacturing", "Maritime", "Mining & Extraction", "Oil & Gas Transition",
  "Public Transit", "Real Estate", "Research & Development", "Retail",
  "Technology", "Telecommunications", "Waste Management", "Water & Utilities",
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

export const INCENTIVE_TYPE_BORDER: Record<IncentiveType, string> = {
  GRANT: "border-l-emerald-500",
  TAX_CREDIT: "border-l-violet-500",
  POINT_OF_SALE_REBATE: "border-l-orange-500",
  SUBSIDY: "border-l-sky-500",
  LOAN: "border-l-yellow-500",
  VOUCHER: "border-l-pink-500",
};

const NEUTRAL_TAG = "bg-slate-100 text-slate-600";

export const INDUSTRY_COLORS: Record<string, string> = {
  "Agriculture": NEUTRAL_TAG,
  "Automotive": NEUTRAL_TAG,
  "Aviation": NEUTRAL_TAG,
  "Building Electrification": NEUTRAL_TAG,
  "Clean Technology": NEUTRAL_TAG,
  "Construction": NEUTRAL_TAG,
  "Education": NEUTRAL_TAG,
  "Energy Management": NEUTRAL_TAG,
  "Energy Storage": NEUTRAL_TAG,
  "EV Charging": NEUTRAL_TAG,
  "Film & Media": NEUTRAL_TAG,
  "Financial Services": NEUTRAL_TAG,
  "Fleet": NEUTRAL_TAG,
  "Food & Beverage": NEUTRAL_TAG,
  "Forestry": NEUTRAL_TAG,
  "Government & Nonprofit": NEUTRAL_TAG,
  "Healthcare": NEUTRAL_TAG,
  "Hospitality": NEUTRAL_TAG,
  "Infrastructure": NEUTRAL_TAG,
  "Logistics": NEUTRAL_TAG,
  "Manufacturing": NEUTRAL_TAG,
  "Maritime": NEUTRAL_TAG,
  "Mining & Extraction": NEUTRAL_TAG,
  "Oil & Gas Transition": NEUTRAL_TAG,
  "Public Transit": NEUTRAL_TAG,
  "Real Estate": NEUTRAL_TAG,
  "Research & Development": NEUTRAL_TAG,
  "Retail": NEUTRAL_TAG,
  "Technology": NEUTRAL_TAG,
  "Telecommunications": NEUTRAL_TAG,
  "Waste Management": NEUTRAL_TAG,
  "Water & Utilities": NEUTRAL_TAG,
};

export const JURISDICTION_COLORS: Record<JurisdictionLevel, string> = {
  FEDERAL: "bg-brand-100 text-brand-800",
  STATE: "bg-indigo-100 text-indigo-800",
  CITY: "bg-teal-100 text-teal-800",
  AGENCY: "bg-rose-100 text-rose-800",
};
