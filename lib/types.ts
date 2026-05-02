// ─── Enums (mirror Prisma schema for client-side use) ───────────────────────

export type JurisdictionLevel = "FEDERAL" | "STATE" | "CITY" | "AGENCY";
export type IncentiveType = "GRANT" | "TAX_CREDIT" | "POINT_OF_SALE_REBATE" | "SUBSIDY" | "LOAN" | "VOUCHER";
export type IncentiveStatus = "ACTIVE" | "CLOSED" | "UPCOMING" | "SUSPENDED";
// SS-003: parse quality signal. LOW rows filtered from AI advisor (SS-008).
export type ParseConfidence = "HIGH" | "MEDIUM" | "LOW";

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

  sourceUrl:    string;
  sourceDomain: string;
  programCode:  string | null;

  // SS-003 provenance fields
  sourceHash:      string | null;
  parseConfidence: ParseConfidence;
  parseNotes:      string | null;
  lastVerifiedAt:  string | null;
  lastVerifiedBy:  string | null;
  firstSeenAt:     string;
  lastSeenAt:      string;

  status:     IncentiveStatus;
  isVerified: boolean;

  scrapedAt:     string | null;
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
  minFunding?: number;
  maxFunding?: number;
  verified?: boolean;
  closingSoon?: boolean;
  excludeIndustryCategory?: string;
  applicantType?: "ANY" | "PRIVATE_BUSINESS" | "NONPROFIT" | "GOVERNMENT";
  sortBy?: "relevance" | "deadline" | "fundingAmount" | "createdAt";
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

// Grouped for the Industry dropdown — same values, organized for readability
export const INDUSTRY_CATEGORY_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Energy & Clean Tech",
    options: ["Clean Technology", "Building Electrification", "EV Charging", "Energy Storage", "Energy Management", "Oil & Gas Transition"],
  },
  {
    label: "Transportation",
    options: ["Fleet", "Automotive", "Aviation", "Maritime", "Public Transit", "Logistics"],
  },
  {
    label: "Land & Resources",
    options: ["Agriculture", "Forestry", "Mining & Extraction", "Water & Utilities", "Waste Management"],
  },
  {
    label: "Built Environment",
    options: ["Construction", "Real Estate", "Infrastructure"],
  },
  {
    label: "Business & Industry",
    options: ["Manufacturing", "Technology", "Research & Development", "Healthcare", "Education", "Food & Beverage", "Financial Services"],
  },
  {
    label: "Other",
    options: ["Government & Nonprofit", "Retail", "Hospitality", "Telecommunications", "Film & Media"],
  },
];

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
  // Energy & Clean Tech — greens/teals
  "Agriculture":             "bg-lime-50 text-lime-700",
  "Clean Technology":        "bg-emerald-50 text-emerald-700",
  "Building Electrification":"bg-orange-50 text-orange-700",
  "EV Charging":             "bg-violet-50 text-violet-700",
  "Energy Storage":          "bg-teal-50 text-teal-700",
  "Energy Management":       "bg-cyan-50 text-cyan-700",
  "Oil & Gas Transition":    "bg-amber-50 text-amber-700",
  // Transportation — blues/sky
  "Fleet":                   "bg-sky-50 text-sky-700",
  "Automotive":              "bg-blue-50 text-blue-700",
  "Aviation":                "bg-indigo-50 text-indigo-700",
  "Maritime":                "bg-cyan-50 text-cyan-700",
  "Public Transit":          "bg-blue-50 text-blue-700",
  "Logistics":               "bg-slate-100 text-slate-600",
  // Land & Resources
  "Forestry":                "bg-green-50 text-green-700",
  "Mining & Extraction":     "bg-stone-100 text-stone-600",
  "Water & Utilities":       "bg-cyan-50 text-cyan-700",
  "Waste Management":        "bg-lime-50 text-lime-700",
  // Built Environment — ambers/stones
  "Construction":            "bg-amber-50 text-amber-700",
  "Real Estate":             "bg-stone-100 text-stone-600",
  "Infrastructure":          "bg-slate-100 text-slate-600",
  // Business & Industry
  "Manufacturing":           "bg-gray-100 text-gray-600",
  "Technology":              "bg-blue-50 text-blue-700",
  "Research & Development":  "bg-purple-50 text-purple-700",
  "Healthcare":              "bg-rose-50 text-rose-700",
  "Education":               "bg-indigo-50 text-indigo-700",
  "Food & Beverage":         "bg-orange-50 text-orange-700",
  "Financial Services":      "bg-green-50 text-green-700",
  // Other
  "Government & Nonprofit":  "bg-slate-100 text-slate-600",
  "Retail":                  "bg-pink-50 text-pink-700",
  "Hospitality":             "bg-pink-50 text-pink-700",
  "Telecommunications":      "bg-blue-50 text-blue-700",
  "Film & Media":            "bg-fuchsia-50 text-fuchsia-700",
};

export const JURISDICTION_COLORS: Record<JurisdictionLevel, string> = {
  FEDERAL: "bg-brand-100 text-brand-800",
  STATE: "bg-indigo-100 text-indigo-800",
  CITY: "bg-teal-100 text-teal-800",
  AGENCY: "bg-rose-100 text-rose-800",
};
