"""
Michigan Energy Office (MEO) / Michigan Saves Scraper
======================================================
Scrapes Michigan energy programs from:
  https://www.michigan.gov/egle (EGLE — Department of Environment, Great Lakes, and Energy)
  https://michigansaves.org (Michigan Saves green bank)
  https://www.michigan.gov/egle/about/groups/materials-management/energy

Michigan administers state energy programs through the Energy Office in
EGLE plus Michigan Saves (the state's nonprofit green bank). DTE Energy
and Consumers Energy are the two major utilities and offer separate
energy efficiency programs. Michigan is the largest Midwest market by
manufacturing energy intensity.

Quality
-------
- STATE jurisdiction / Michigan
- Mock mode: 5 realistic MEO/Michigan Saves fixtures
"""

from __future__ import annotations

import re
from typing import Optional

from .base_scraper import BaseScraper
from .fingerprint import compute_source_hash
from .models import (
    IncentiveStatus,
    IncentiveType,
    JurisdictionLevel,
    ParseConfidence,
    ScrapedIncentive,
)

BASE = "https://www.michigan.gov"
INDEX_URLS = [
    f"{BASE}/egle/about/groups/materials-management/energy",
    "https://michigansaves.org/find-a-loan/",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",       IncentiveType.GRANT),
    ("tax credit",  IncentiveType.TAX_CREDIT),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("renewable",   "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("manufacturing","Manufacturing"),
    ("industrial",  "Manufacturing"),
    ("school",      "Government & Nonprofit"),
    ("agriculture", "Agriculture"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.GRANT


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Energy Management"]


class MichiganEnergyScraper(BaseScraper):
    """Scrapes Michigan EGLE Energy Office and Michigan Saves program listings."""

    SOURCE_NAME = "michigan_energy"
    BASE_URL = BASE

    def __init__(self, mock: bool = False, max_programs: int = 50):
        super().__init__()
        self.mock = mock
        self.max_programs = max_programs

    def scrape(self) -> list[ScrapedIncentive]:
        if self.mock:
            return self._mock_results()
        return self._scrape_live()

    def _scrape_live(self) -> list[ScrapedIncentive]:
        all_links: list[str] = []
        for index_url in INDEX_URLS:
            try:
                html = self.fetch(index_url)
                soup = self.parse(html)
                for a in soup.select("a[href]"):
                    href = str(a.get("href", ""))
                    if (href.startswith("/") or href.startswith("http")) and len(href) > 3:
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if full not in all_links and full not in INDEX_URLS:
                            all_links.append(full)
            except Exception as e:
                self._log.debug("mi-energy index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("mi-energy detail failed", url=url, error=str(e))

        self._log.info("mi-energy scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)
        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None
        summary = ""
        for sel in [".main-content", "main", "article", "#content"]:
            el = soup.select_one(sel)
            if el:
                paras = [p.get_text(strip=True) for p in el.select("p") if len(p.get_text(strip=True)) > 30]
                summary = " ".join(paras[:3])
                if len(summary) >= 40:
                    break
        if len(summary) < 20:
            return None
        return ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.STATE,
            jurisdiction_name="Michigan",
            managing_agency="Michigan Department of Environment, Great Lakes, and Energy",
            agency_acronym="EGLE",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"MI-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Michigan Saves Home Energy Loan Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Michigan",
                managing_agency="Michigan Saves",
                agency_acronym="MI Saves",
                short_summary=(
                    "Michigan Saves provides below-market home energy improvement loans of "
                    "up to $50,000 with terms up to 15 years through a network of authorized "
                    "Michigan lenders. Eligible improvements include heat pumps, insulation, "
                    "high-efficiency furnaces, windows, solar PV, EV chargers, and battery "
                    "storage. Michigan Saves is the nation's first nonprofit green bank, "
                    "established in 2009, and has financed over $400M in upgrades."
                ),
                detailed_summary=(
                    "Loan terms\n"
                    "• Loan amount: $1,000 minimum, $50,000 maximum (residential)\n"
                    "• Term: up to 15 years\n"
                    "• Interest rate: typically 4.99%-7.99% APR depending on credit, "
                    "term, and project (significantly below personal-loan rates)\n"
                    "• No origination fees or prepayment penalties\n"
                    "• Unsecured (no home equity required)\n"
                    "• Credit requirement: 640+ FICO typical (lower with proof of energy savings)\n\n"
                    "Eligible improvements\n"
                    "• Heat pump systems (air-source and ground-source)\n"
                    "• Heat pump water heaters\n"
                    "• High-efficiency furnaces and boilers (≥95% AFUE)\n"
                    "• Insulation and air sealing\n"
                    "• Windows and exterior doors\n"
                    "• Solar photovoltaic systems\n"
                    "• Battery energy storage systems\n"
                    "• Level 2 EV chargers\n"
                    "• Smart thermostats and building controls\n"
                    "• Whole-home generators (limited eligibility)\n\n"
                    "How to apply\n"
                    "1. Find a Michigan Saves Authorized Contractor (online directory at "
                    "michigansaves.org)\n"
                    "2. Get a written estimate for the project\n"
                    "3. Apply for a loan through a participating lender (Michigan Saves "
                    "directs the loan; lender underwrites)\n"
                    "4. Loan approval typically takes 1-3 business days\n"
                    "5. Funds disbursed directly to the contractor upon project completion\n\n"
                    "Stacking with federal credits\n"
                    "• Federal §25C Energy Efficient Home Improvement Credit: up to $3,200/year\n"
                    "• Federal §25D Residential Clean Energy Credit: 30% for solar/storage\n"
                    "• Federal §30C EV Charger Credit: 30% up to $1,000\n"
                    "• DTE Energy and Consumers Energy utility rebates: typically $50-$2,500\n"
                    "Michigan Saves loans can be repaid from the federal credit refund check "
                    "received the following year, effectively converting the credit to an "
                    "upfront discount."
                ),
                key_requirements=[
                    "Must own and occupy a Michigan home as primary residence",
                    "Must use a Michigan Saves Authorized Contractor",
                    "Credit score generally 640+ (lower scores considered with project review)",
                    "Loan amount: $1,000–$50,000; term up to 15 years",
                    "Loan funds disbursed directly to contractor after work completion",
                ],
                industry_categories=["Energy Management", "Clean Technology"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=50000,
                source_url="https://michigansaves.org/find-a-loan/home-energy-loan/",
                program_code="MI-SAVES-HOME-LOAN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Michigan Saves Business Energy Financing",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Michigan",
                managing_agency="Michigan Saves",
                agency_acronym="MI Saves",
                short_summary=(
                    "Provides commercial energy efficiency and renewable energy financing of "
                    "$1,000-$500,000 to Michigan businesses, nonprofits, and public-sector "
                    "entities. Loans amortize over up to 10 years with rates as low as 4.99%. "
                    "Covers LED lighting, HVAC, building automation, solar PV, EV charging, "
                    "and process improvements. Michigan Saves is the nation's first nonprofit "
                    "green bank and has financed over $400M in clean energy projects since 2009."
                ),
                detailed_summary=(
                    "Loan terms\n"
                    "• Loan amount: $1,000 to $500,000 per business\n"
                    "• Term: up to 10 years (typically matches projected payback period)\n"
                    "• Interest rate: 4.99%-9.99% APR depending on credit and project size\n"
                    "• No application or origination fees\n"
                    "• Personal guarantee may be required for businesses < 3 years old\n\n"
                    "Eligible borrowers\n"
                    "• Michigan-based for-profit businesses (LLC, S-Corp, C-Corp, sole prop)\n"
                    "• 501(c)(3) nonprofits\n"
                    "• Religious organizations and faith-based facilities\n"
                    "• Local governments (cities, counties, townships)\n"
                    "• Public school districts and community colleges\n"
                    "• Healthcare facilities (hospitals, clinics)\n\n"
                    "Eligible projects\n"
                    "• Lighting: LED replacements, controls, daylighting\n"
                    "• HVAC: rooftop unit replacement, heat pumps, VFDs, controls\n"
                    "• Building envelope: insulation, windows, roofing\n"
                    "• Refrigeration: ECM motors, controls, evaporator upgrades\n"
                    "• Solar PV (rooftop and ground-mount)\n"
                    "• Battery energy storage\n"
                    "• EV charging stations (Level 2 and DC Fast)\n"
                    "• Process improvements (compressed air, motors, pumps)\n"
                    "• Energy management systems and metering\n\n"
                    "Application + funding timeline\n"
                    "1. Get contractor proposal from a Michigan Saves Authorized Business Contractor\n"
                    "2. Apply online — typical 2-5 business day approval\n"
                    "3. Funds disbursed directly to contractor when project completes\n"
                    "4. Repayment from utility savings; M&V typically waived for projects < $100K\n\n"
                    "Common stacking opportunities\n"
                    "• Federal §48 Investment Tax Credit: 30%+ for solar, storage, certain efficiency\n"
                    "• Federal §179D Commercial Buildings Energy-Efficient Deduction: $5.65/sq ft\n"
                    "• DTE Energy / Consumers Energy custom incentives: $0.04-$0.10/kWh saved\n"
                    "• USDA REAP (for ag businesses in qualifying rural areas): 50% grant"
                ),
                key_requirements=[
                    "Must be a Michigan-based business, nonprofit, school, or government",
                    "Must use a Michigan Saves Authorized Business Contractor",
                    "Loan amount: $1,000-$500,000; term up to 10 years",
                    "Personal guarantee may be required for businesses operating < 3 years",
                    "Funds disbursed directly to contractor after project completion",
                ],
                industry_categories=["Energy Management", "Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=500000,
                source_url="https://michigansaves.org/find-a-loan/business-energy-financing/",
                program_code="MI-SAVES-BIZ-LOAN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Michigan EGLE Energy Smart Schools Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Michigan",
                managing_agency="Michigan Department of Environment, Great Lakes, and Energy",
                agency_acronym="EGLE",
                short_summary=(
                    "Provides free technical assistance and small grants ($5K-$50K) to Michigan "
                    "K-12 school districts for energy efficiency planning and implementation. "
                    "Covers comprehensive energy audits, benchmarking through ENERGY STAR "
                    "Portfolio Manager, and project scoping. Larger capital projects can be "
                    "financed through Michigan Saves. Targets districts with annual energy "
                    "costs above the state median ($1.40/sq ft)."
                ),
                detailed_summary=(
                    "Eligible recipients\n"
                    "• Michigan K-12 public school districts\n"
                    "• Public school academies (charters)\n"
                    "• Intermediate school districts (ISDs)\n"
                    "• Community colleges (limited eligibility)\n\n"
                    "Services offered\n"
                    "• Free comprehensive energy audits for districts >250,000 sq ft\n"
                    "• Walk-through assessments for smaller districts\n"
                    "• ENERGY STAR Portfolio Manager benchmarking and training\n"
                    "• Project scoping and engineering review\n"
                    "• Procurement support for major equipment purchases\n"
                    "• Indoor air quality (IAQ) co-assessment for healthier schools funding\n\n"
                    "Grant component\n"
                    "Districts can receive $5,000-$50,000 in direct grants for:\n"
                    "• Energy management system / building automation upgrades\n"
                    "• Comprehensive sub-metering installations\n"
                    "• Energy manager training and certification\n"
                    "• Demonstration projects (e.g., school district pilots a new technology)\n"
                    "Capital projects (LED retrofits, HVAC replacement, solar) are typically "
                    "financed through Michigan Saves rather than grant-funded.\n\n"
                    "Priority for funding\n"
                    "1. Districts in environmental justice communities\n"
                    "2. Districts with energy intensity > 1.40 ENERGY STAR EUI\n"
                    "3. Rural and lower-resource districts\n"
                    "4. Districts pursuing comprehensive energy management programs\n\n"
                    "Stacking with federal funds\n"
                    "EGLE coordinates with federal Bipartisan Infrastructure Law funds:\n"
                    "• Renew America's Schools (DOE): $40M nationwide for school energy retrofits\n"
                    "• Clean Energy Demonstration Projects (DOE)\n"
                    "• EPA Clean School Bus Program (separate but coordinated)\n"
                    "Districts that complete a baseline EGLE audit are positioned to apply "
                    "for these federal funds with documented energy data."
                ),
                key_requirements=[
                    "Must be a Michigan K-12 public school district or PSA",
                    "Must designate a staff energy contact for program coordination",
                    "Must commit to ENERGY STAR Portfolio Manager benchmarking",
                    "Grant funds: $5K-$50K for non-capital energy management investments",
                    "Capital projects financed separately through Michigan Saves",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=50000,
                source_url="https://www.michigan.gov/egle/about/groups/materials-management/energy/schools",
                program_code="MI-EGLE-SCHOOLS",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Michigan Renewable Energy Program (MREP) — Solar + Storage Grants",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Michigan",
                managing_agency="Michigan Department of Environment, Great Lakes, and Energy",
                agency_acronym="EGLE",
                short_summary=(
                    "Competitive grants of up to $500,000 per project for solar PV, energy "
                    "storage, geothermal, and small wind installations on Michigan public "
                    "buildings, schools, and nonprofit facilities. Awards cover up to 50% of "
                    "eligible project costs. Bonus scoring for projects in environmental justice "
                    "communities, those creating apprenticeship opportunities, and those "
                    "demonstrating innovative configurations (solar + storage + EV)."
                ),
                detailed_summary=(
                    "Award structure\n"
                    "• Cost-share: up to 50% of eligible project costs\n"
                    "• Per-project cap: $500,000 (residential not eligible — public/nonprofit only)\n"
                    "• Annual program cap: $5M-$8M per cycle (varies with appropriation)\n"
                    "• Multiple cycles per year typical (2-3)\n\n"
                    "Eligible applicants\n"
                    "• Michigan local governments (cities, counties, townships, special districts)\n"
                    "• Public school districts and community colleges\n"
                    "• 501(c)(3) nonprofits (including religious orgs, healthcare, community orgs)\n"
                    "• State agencies and tribal governments\n"
                    "Private businesses NOT eligible (use Michigan Saves or federal §48 ITC).\n\n"
                    "Eligible technologies\n"
                    "• Solar photovoltaic (rooftop, ground-mount, solar canopy)\n"
                    "• Battery energy storage (paired with solar or standalone)\n"
                    "• Geothermal heat pump systems\n"
                    "• Small wind (limited eligibility, typically community-scale)\n"
                    "• EV charging infrastructure (when paired with solar)\n\n"
                    "Scoring criteria (100 points total)\n"
                    "• Cost-effectiveness: $/kW or $/kWh of expected production (30 points)\n"
                    "• Environmental justice community siting (15 points)\n"
                    "• Apprenticeship and prevailing wage commitments (15 points)\n"
                    "• Innovation (solar+storage, microgrid, V2G) (10 points)\n"
                    "• Community engagement and educational programming (10 points)\n"
                    "• Project readiness (permits, site control, contractor selected) (10 points)\n"
                    "• Co-funding from federal or other state programs (10 points)\n\n"
                    "Common stacking strategy (typical $400K rooftop solar project on a school)\n"
                    "• MREP grant: $200,000 (50%)\n"
                    "• Federal Direct Pay §48 ITC (for tax-exempts via IRA elective payment): 30% = $120K\n"
                    "• Federal Direct Pay §48 storage adder (if storage included): up to 20% bonus\n"
                    "• Utility net-metering / value-of-solar credit revenue (ongoing)\n"
                    "School pays only 20-30% of project cost out of capital budget."
                ),
                key_requirements=[
                    "Michigan local government, school district, public agency, or 501(c)(3) nonprofit",
                    "Project: solar PV, energy storage, geothermal, small wind, or EV+solar",
                    "Cost-share: up to 50% of eligible costs, max $500,000 per project",
                    "Application during open cycle (typically 2-3 cycles per year)",
                    "Stackable with federal §48 Direct Pay ITC for additional 30%+",
                ],
                industry_categories=["Clean Technology", "Energy Storage", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=500000,
                source_url="https://www.michigan.gov/egle/about/groups/materials-management/energy/renewable",
                program_code="MI-MREP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Michigan Mobility Wallet — EV Purchase Incentive (Pilot)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Michigan",
                managing_agency="Michigan Department of Environment, Great Lakes, and Energy",
                agency_acronym="EGLE",
                short_summary=(
                    "Pilot program providing $2,500-$5,000 income-qualified rebates to Michigan "
                    "residents purchasing or leasing new or used electric vehicles. Funded by "
                    "settlement proceeds from utility violation cases. Pairs with the federal "
                    "§30D and §25E tax credits for maximum savings. Currently limited to "
                    "Wayne, Oakland, and Macomb counties (Metro Detroit) but expanding statewide."
                ),
                detailed_summary=(
                    "Rebate amounts (income-qualified, by household income tier)\n"
                    "• ≤80% Area Median Income (AMI): $5,000 for new BEV, $3,500 for used BEV\n"
                    "• 80-150% AMI: $3,500 for new BEV, $2,500 for used BEV\n"
                    "• PHEV: same tiers minus $500 each\n\n"
                    "Vehicle eligibility\n"
                    "• New BEV/PHEV: MSRP ≤ $55,000 (sedans) or $80,000 (trucks/SUVs/vans)\n"
                    "• Used BEV/PHEV: priced ≤ $25,000, ≥2 model years old, ≤80,000 miles\n"
                    "• Vehicle must be purchased from a licensed Michigan dealer\n"
                    "• Vehicle must be titled, registered, and primarily operated in Michigan\n\n"
                    "Currently eligible counties (pilot)\n"
                    "Wayne, Oakland, Macomb (Metro Detroit). Statewide expansion expected 2025-2026.\n\n"
                    "Stacking with federal credits (income-qualified example)\n"
                    "Buyer at 60% AMI purchasing a new $40,000 BEV:\n"
                    "• Michigan Mobility Wallet: $5,000\n"
                    "• Federal §30D: $7,500 (or income-qualified portion via dealer point-of-sale)\n"
                    "• DTE / Consumers Energy EV charger rebate: $300-$500\n"
                    "• Federal §30C charger credit (if installing home charger): $1,000\n"
                    "Total potential incentive: $14,000+ on a $40,000 BEV.\n\n"
                    "Application timing\n"
                    "Submit through EGLE's online portal within 60 days of vehicle purchase. "
                    "Funds limited per cycle; applications queued during high-demand periods. "
                    "Income verification (tax returns or paystubs) and proof of vehicle "
                    "registration required."
                ),
                key_requirements=[
                    "Michigan resident in Wayne, Oakland, or Macomb County (pilot phase)",
                    "Household income ≤150% Area Median Income",
                    "New BEV/PHEV: MSRP ≤$55K (sedans) or $80K (trucks); used: ≤$25K, ≤80K miles",
                    "Vehicle purchased from a licensed Michigan dealer, registered in Michigan",
                    "Application within 60 days of purchase; income documentation required",
                ],
                industry_categories=["EV Charging", "Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=5000,
                source_url="https://www.michigan.gov/egle/about/groups/materials-management/energy/mobility-wallet",
                program_code="MI-MOBILITY-WALLET",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
