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

export const INDUSTRY_COLORS: Record<string, string> = {
  "Agriculture": "bg-green-100 text-green-800",
  "Automotive": "bg-blue-100 text-blue-800",
  "Aviation": "bg-sky-100 text-sky-800",
  "Building Electrification": "bg-orange-100 text-orange-800",
  "Clean Technology": "bg-emerald-100 text-emerald-800",
  "Construction": "bg-amber-100 text-amber-800",
  "Education": "bg-indigo-100 text-indigo-800",
  "Energy Management": "bg-yellow-100 text-yellow-800",
  "Energy Storage": "bg-teal-100 text-teal-800",
  "EV Charging": "bg-violet-100 text-violet-800",
  "Film & Media": "bg-pink-100 text-pink-800",
  "Financial Services": "bg-slate-100 text-slate-700",
  "Fleet": "bg-sky-100 text-sky-800",
  "Food & Beverage": "bg-rose-100 text-rose-800",
  "Forestry": "bg-lime-100 text-lime-800",
  "Government & Nonprofit": "bg-blue-100 text-blue-800",
  "Healthcare": "bg-red-100 text-red-800",
  "Hospitality": "bg-pink-100 text-pink-800",
  "Infrastructure": "bg-gray-100 text-gray-700",
  "Logistics": "bg-amber-100 text-amber-800",
  "Manufacturing": "bg-stone-100 text-stone-800",
  "Maritime": "bg-cyan-100 text-cyan-800",
  "Mining & Extraction": "bg-orange-100 text-orange-800",
  "Oil & Gas Transition": "bg-yellow-100 text-yellow-800",
  "Public Transit": "bg-purple-100 text-purple-800",
  "Real Estate": "bg-stone-100 text-stone-700",
  "Research & Development": "bg-purple-100 text-purple-800",
  "Retail": "bg-pink-100 text-pink-800",
  "Technology": "bg-blue-100 text-blue-800",
  "Telecommunications": "bg-indigo-100 text-indigo-800",
  "Waste Management": "bg-lime-100 text-lime-800",
  "Water & Utilities": "bg-cyan-100 text-cyan-800",
};

export const JURISDICTION_COLORS: Record<JurisdictionLevel, string> = {
  FEDERAL: "bg-brand-100 text-brand-800",
  STATE: "bg-indigo-100 text-indigo-800",
  CITY: "bg-teal-100 text-teal-800",
  AGENCY: "bg-rose-100 text-rose-800",
};
