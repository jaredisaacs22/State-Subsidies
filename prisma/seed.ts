import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const incentives = [
  // ── 1. WAZIP Off-Road Equipment Grant ───────────────────────────────────
  {
    title: "WAZIP Off-Road Equipment Replacement Grant",
    slug: "wazip-off-road-equipment-replacement",
    jurisdictionLevel: "AGENCY",
    jurisdictionName: "San Joaquin Valley, CA",
    managingAgency: "San Joaquin Valley Air Pollution Control District",
    agencyAcronym: "WAZIP",
    shortSummary:
      "Provides vouchers to replace older, high-polluting off-road equipment with newer, cleaner models. " +
      "Eligible equipment includes forklifts, agricultural tractors, and construction machinery. " +
      "Funding covers up to 80% of the purchase price of qualifying zero-emission or near-zero-emission replacements.",
    keyRequirements: JSON.stringify([
      "Equipment must be registered or primarily operated in the San Joaquin Valley Air Basin",
      "Old equipment (scrap unit) must be Tier 0, Tier 1, or Tier 2 diesel engine",
      "Old equipment must have been owned and operated by the applicant for at least 2 years",
      "New replacement must be zero-emission (ZE) or near-zero-emission (NZE) certified",
      "Applicant must be a business, non-profit, or government entity — not an individual",
      "Equipment must remain in the Valley for a minimum of 5 years post-purchase",
    ]),
    industryCategories: JSON.stringify(["Construction", "Agriculture", "Logistics", "Fleet"]),
    incentiveType: "VOUCHER",
    fundingAmount: 500000,
    deadline: new Date("2025-06-30"),
    sourceUrl: "https://www.valleyair.org/grant_programs/WAZIP/wazip_main.htm",
    programCode: "WAZIP-2024",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "wazip_scraper",
  },

  // ── 2. CARB HVIP Zero-Emission Truck Rebate ─────────────────────────────
  {
    title: "CARB Hybrid and Zero-Emission Truck and Bus Voucher Incentive Project (HVIP)",
    slug: "carb-hvip-zero-emission-truck-bus",
    jurisdictionLevel: "AGENCY",
    jurisdictionName: "California",
    managingAgency: "California Air Resources Board",
    agencyAcronym: "CARB",
    shortSummary:
      "HVIP offers point-of-sale vouchers to California fleets to reduce the upfront cost of purchasing " +
      "zero-emission and near-zero-emission trucks, buses, and other heavy-duty vehicles. " +
      "Voucher amounts are tiered based on vehicle type, weight class, and whether the purchaser qualifies for equity bonuses.",
    keyRequirements: JSON.stringify([
      "Vehicle must be on CARB's approved HVIP vehicle list at time of purchase",
      "Purchaser must be a California-based business, non-profit, or government fleet operator",
      "Vehicle must be registered and primarily operated in California",
      "Voucher must be pre-approved before vehicle purchase — retroactive applications not accepted",
      "Applicant fleets with 10 or fewer trucks qualify for an equity bonus of up to $10,000 additional",
      "Vehicle must remain in California fleet operation for a minimum of 3 years",
    ]),
    industryCategories: JSON.stringify(["Fleet", "Logistics", "Construction", "Public Transit"]),
    incentiveType: "POINT_OF_SALE_REBATE",
    fundingAmount: 300000,
    deadline: null,
    sourceUrl: "https://www.californiahvip.org/",
    programCode: "HVIP-2024",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "carb_scraper",
  },

  // ── 3. Federal IRA Section 48C Advanced Energy Tax Credit ───────────────
  {
    title: "IRA Section 48C Advanced Energy Manufacturing & Recycling Tax Credit",
    slug: "ira-section-48c-advanced-energy-manufacturing",
    jurisdictionLevel: "FEDERAL",
    jurisdictionName: "United States",
    managingAgency: "U.S. Department of Energy / IRS",
    agencyAcronym: "DOE",
    shortSummary:
      "Provides a 30% investment tax credit for qualifying advanced energy projects, including " +
      "manufacturing facilities for clean energy equipment and industrial decarbonization projects. " +
      "Projects must be certified by the IRS through a competitive application process.",
    keyRequirements: JSON.stringify([
      "Project must manufacture, fabricate, or assemble clean energy equipment or components",
      "Facility must be located in the United States",
      "30% credit applies; increases to 40% for projects in designated energy communities",
      "Application must be submitted to IRS for allocation — credits are capped per funding round",
      "Must meet prevailing wage and registered apprenticeship requirements for full credit",
      "Must be a mobile BESS unit or stationary energy storage system to qualify under storage provisions",
      "Facilities re-equipping for critical material processing or recycling are also eligible",
    ]),
    industryCategories: JSON.stringify(["Energy Management", "Manufacturing", "Clean Technology"]),
    incentiveType: "TAX_CREDIT",
    fundingAmount: null,
    deadline: new Date("2025-12-31"),
    sourceUrl: "https://www.energy.gov/lpo/inflation-reduction-act",
    programCode: "IRA-48C",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "federal_doe_scraper",
  },

  // ── 4. CalTrans CORE Zero-Emission Transit Capital Grant ────────────────
  {
    title: "CalTrans CORE Zero-Emission Transit Capital Program",
    slug: "caltrans-core-zero-emission-transit",
    jurisdictionLevel: "STATE",
    jurisdictionName: "California",
    managingAgency: "California Department of Transportation",
    agencyAcronym: "CalTrans",
    shortSummary:
      "The CORE program funds capital projects that accelerate the adoption of zero-emission transit vehicles " +
      "and supporting infrastructure across California. Eligible projects include electric bus procurement, " +
      "charging infrastructure, and depot electrification for public and private transit operators.",
    keyRequirements: JSON.stringify([
      "Applicant must be a California public transit agency or qualified private transit operator",
      "Vehicles purchased must be zero-emission (battery-electric or hydrogen fuel cell)",
      "Charging or fueling infrastructure must support the procured ZE fleet",
      "Project must demonstrate a minimum 3-year operational commitment in California",
      "Applications must include a Climate Action Plan or equivalent sustainability commitment",
      "Cost-share of at least 20% required from non-state sources",
      "Prevailing wage requirements apply to all construction and installation work",
    ]),
    industryCategories: JSON.stringify(["Public Transit", "Fleet", "Infrastructure", "Clean Technology"]),
    incentiveType: "GRANT",
    fundingAmount: 25000000,
    deadline: new Date("2025-03-31"),
    applicationOpenDate: new Date("2024-10-01"),
    sourceUrl: "https://dot.ca.gov/programs/rail-and-mass-transportation/core",
    programCode: "CORE-2024",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "caltrans_scraper",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const incentive of incentives) {
    await prisma.incentive.upsert({
      where: { slug: incentive.slug },
      update: incentive,
      create: incentive,
    });
    console.log(`  ✓ ${incentive.title}`);
  }

  console.log(`\n✅ Seeded ${incentives.length} incentives.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
