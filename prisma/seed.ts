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

  // ── 5. IRA Home Energy Rebates (HEAR) ───────────────────────────────────
  {
    title: "IRA Home Energy Rebates — High-Efficiency Electric Home Rebate Act (HEEHRA)",
    slug: "ira-heehra-home-energy-rebates",
    jurisdictionLevel: "FEDERAL",
    jurisdictionName: "United States",
    managingAgency: "U.S. Department of Energy",
    agencyAcronym: "DOE",
    shortSummary:
      "Provides point-of-sale rebates of up to $14,000 per household for energy-efficient electric appliances " +
      "and home upgrades including heat pumps, electric stoves, EV chargers, and electrical panel upgrades. " +
      "Income-qualified households can receive up to 100% of upgrade costs; moderate-income households up to 50%.",
    keyRequirements: JSON.stringify([
      "Must be a U.S. resident purchasing qualifying high-efficiency electric appliances or upgrades",
      "Income must be at or below 150% of area median income (AMI) for full rebate eligibility",
      "Households 80–150% AMI receive 50% rebate up to the program cap; below 80% AMI receive 100%",
      "Heat pump water heater: up to $1,750 rebate; heat pump space heating/cooling: up to $8,000",
      "Electric stove or cooktop: up to $840; electric panel upgrade: up to $4,000",
      "Rebates administered by state energy offices — check your state's program status",
      "Cannot combine with federal tax credits for the same measure in the same year",
    ]),
    industryCategories: JSON.stringify(["Energy Management", "Real Estate", "Construction", "Clean Technology"]),
    incentiveType: "POINT_OF_SALE_REBATE",
    fundingAmount: 14000,
    deadline: null,
    sourceUrl: "https://www.energy.gov/scep/home-energy-rebates-frequently-asked-questions",
    programCode: "IRA-HEEHRA",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "federal_doe_scraper",
  },

  // ── 6. NY Green Bank Clean Energy Financing ─────────────────────────────
  {
    title: "NY Green Bank Clean Energy Project Financing",
    slug: "ny-green-bank-clean-energy-financing",
    jurisdictionLevel: "STATE",
    jurisdictionName: "New York",
    managingAgency: "New York State Energy Research and Development Authority",
    agencyAcronym: "NYSERDA",
    shortSummary:
      "NY Green Bank provides low-cost debt financing for commercial, industrial, and multifamily clean energy " +
      "projects in New York State that have difficulty accessing conventional capital markets. " +
      "Eligible projects include solar, energy storage, efficiency retrofits, and EV charging infrastructure.",
    keyRequirements: JSON.stringify([
      "Project must be located in New York State",
      "Applicant must be a developer, owner, or operator of a clean energy project",
      "Minimum transaction size: $1 million; no stated maximum",
      "Project must demonstrate a financing gap — i.e., conventional lenders have declined or offered unworkable terms",
      "Eligible sectors: commercial/industrial, multifamily residential, community distributed generation",
      "Projects must meet NYSERDA's environmental justice and climate criteria",
      "Repayment terms up to 20 years; interest rates negotiated based on project risk profile",
    ]),
    industryCategories: JSON.stringify(["Energy Management", "Real Estate", "Clean Technology", "Infrastructure"]),
    incentiveType: "LOAN",
    fundingAmount: 50000000,
    deadline: null,
    sourceUrl: "https://greenbank.ny.gov/",
    programCode: "NYGB-FINANCE",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "state_scraper",
  },

  // ── 7. Austin Energy Value of Solar Tariff ──────────────────────────────
  {
    title: "Austin Energy Value of Solar (VoS) Tariff",
    slug: "austin-energy-value-of-solar-tariff",
    jurisdictionLevel: "CITY",
    jurisdictionName: "Austin, TX",
    managingAgency: "Austin Energy",
    agencyAcronym: "AE",
    shortSummary:
      "Austin Energy purchases excess solar generation from rooftop systems at a rate reflecting the full " +
      "economic value of solar to the grid. The VoS rate is recalculated annually and credited directly " +
      "to the customer's bill, making rooftop solar investment more predictable and financially attractive.",
    keyRequirements: JSON.stringify([
      "Customer must be within Austin Energy's service territory",
      "Solar system must be grid-connected and owned by the customer (not leased)",
      "System must be interconnected under Austin Energy's interconnection agreement",
      "Residential systems up to 20 kW; commercial systems up to 500 kW",
      "VoS credit rate set annually by Austin City Council — currently ~9.8 cents/kWh",
      "Credits applied to monthly bill; excess credits roll over for 12 months",
      "Separate from federal Investment Tax Credit (ITC) — can be combined",
    ]),
    industryCategories: JSON.stringify(["Energy Management", "Real Estate", "Clean Technology"]),
    incentiveType: "TAX_CREDIT",
    fundingAmount: null,
    deadline: null,
    sourceUrl: "https://austinenergy.com/ae/residential/solar/value-of-solar-tariff",
    programCode: "AE-VOS",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "city_scraper",
  },

  // ── 8. SBA Small Business Clean Energy Loan ─────────────────────────────
  {
    title: "SBA 7(a) Small Business Clean Energy & Sustainability Loan",
    slug: "sba-7a-clean-energy-sustainability-loan",
    jurisdictionLevel: "FEDERAL",
    jurisdictionName: "United States",
    managingAgency: "U.S. Small Business Administration",
    agencyAcronym: "SBA",
    shortSummary:
      "The SBA 7(a) loan program provides government-guaranteed financing for small businesses pursuing " +
      "clean energy projects, energy efficiency upgrades, and sustainability investments. " +
      "IRA amendments expanded eligible uses to include solar, EV charging, energy storage, and efficiency retrofits.",
    keyRequirements: JSON.stringify([
      "Applicant must be a for-profit small business operating in the United States",
      "Business must meet SBA size standards for its industry (typically <500 employees)",
      "Eligible uses: solar panels, EV charging stations, energy storage, HVAC upgrades, insulation",
      "Maximum loan amount: $5 million; government guaranty up to 85% for loans ≤$150K, 75% above",
      "Must demonstrate ability to repay from business cash flow",
      "Personal guarantee required from all owners with 20%+ equity stake",
      "Cannot be delinquent on any existing federal debt",
    ]),
    industryCategories: JSON.stringify(["Energy Management", "Manufacturing", "Retail", "Clean Technology", "Fleet"]),
    incentiveType: "LOAN",
    fundingAmount: 5000000,
    deadline: null,
    sourceUrl: "https://www.sba.gov/funding-programs/loans/7a-loans",
    programCode: "SBA-7A-CE",
    status: "ACTIVE",
    isVerified: true,
    scraperSource: "federal_sba_scraper",
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
