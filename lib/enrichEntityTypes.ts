// ─── Entity-type enrichment for seed data ────────────────────────────────────
//
// The original 560+ seed programs were written before eligibleEntityTypes /
// funderType existed. Rather than hand-editing every record, this module
// derives both fields from each program's own text at seed time.
//
// The rules are deliberately CONSERVATIVE: a program is only tagged NONPROFIT /
// GOVERNMENT / TRIBAL / INDIVIDUAL when its title, summary, or requirements
// explicitly say so. False positives here would tell a nonprofit they can
// apply to a program that will reject them — worse than a false negative.
// BUSINESS is always included for legacy records since the site's original
// catalog was curated for business applicants.
//
// New seed files (nonprofit/foundation programs) set both fields explicitly;
// enrichment never overrides an explicit value.

interface SeedProgram {
  title: string;
  shortSummary: string;
  detailedSummary?: string | null;
  keyRequirements: string[];
  managingAgency: string;
  eligibleEntityTypes?: string[];
  funderType?: string;
  [key: string]: unknown;
}

const NONPROFIT_RE =
  /non-?profits?|501\s*\(\s*c\s*\)|charitable|community-based organizations?|faith-based/i;
const GOVERNMENT_RE =
  /government (?:entit|agenc|fleet)|public agenc|municipalit|school districts?|public schools?|transit agenc|local governments?|cities and counties|public entit/i;
const TRIBAL_RE = /\btribal\b|\btribes?\b/i;
// Narrow on purpose: "individual" appears in exclusions like "not an individual".
const INDIVIDUAL_RE = /homeowners?|renters?|households?|residential customers?/i;

const UTILITY_AGENCY_RE =
  /PG&E|Pacific Gas|Southern California Edison|SoCalGas|San Diego Gas|Tennessee Valley Authority/i;

export function enrichProgram<T extends SeedProgram>(program: T): T & {
  eligibleEntityTypes: string[];
  funderType: string;
} {
  // Explicit values from new seed files win — never override curation.
  if (program.eligibleEntityTypes && program.funderType) {
    return program as T & { eligibleEntityTypes: string[]; funderType: string };
  }

  const text = [
    program.title,
    program.shortSummary,
    program.detailedSummary ?? "",
    ...program.keyRequirements,
  ].join(" ");

  const types = new Set<string>(program.eligibleEntityTypes ?? ["BUSINESS"]);
  if (NONPROFIT_RE.test(text)) types.add("NONPROFIT");
  if (GOVERNMENT_RE.test(text)) types.add("GOVERNMENT");
  if (TRIBAL_RE.test(text)) types.add("TRIBAL");
  if (INDIVIDUAL_RE.test(text)) types.add("INDIVIDUAL");

  const funderType =
    program.funderType ??
    (UTILITY_AGENCY_RE.test(program.managingAgency) ? "UTILITY" : "GOVERNMENT");

  return { ...program, eligibleEntityTypes: Array.from(types), funderType };
}
