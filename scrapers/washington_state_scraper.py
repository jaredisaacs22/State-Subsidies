"""
Washington State Department of Commerce — Energy Programs Scraper
==================================================================
Scrapes Washington State clean energy and efficiency program directory at:
  https://www.commerce.wa.gov/growing-the-economy/energy/

Washington Commerce administers the state's Clean Energy Fund (CEF),
weatherization, Solar+Storage programs, EV charging investments, and
federal pass-through funds. Washington has aggressive 100%-clean-electricity-
by-2045 goals (CETA — Clean Energy Transformation Act) and well-developed
state-level incentives complementing utility programs from PSE, Seattle
City Light, Avista, and Snohomish PUD.

Quality
-------
- STATE jurisdiction / Washington
- Mock mode: 5 realistic WA Commerce fixtures
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

BASE = "https://www.commerce.wa.gov"
INDEX_URLS = [
    f"{BASE}/growing-the-economy/energy/",
    f"{BASE}/growing-the-economy/energy/clean-energy-fund/",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("grant",       IncentiveType.GRANT),
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
    ("voucher",     IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("battery",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("manufacturing","Manufacturing"),
    ("school",      "Government & Nonprofit"),
    ("low-income",  "Government & Nonprofit"),
    ("hydrogen",    "Clean Technology"),
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


class WashingtonStateScraper(BaseScraper):
    """Scrapes Washington State Department of Commerce energy programs."""

    SOURCE_NAME = "washington_commerce"
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
                    if (href.startswith("/") or href.startswith(BASE)) and len(href) > 3:
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if full not in all_links and BASE in full and full not in INDEX_URLS:
                            all_links.append(full)
            except Exception as e:
                self._log.debug("wa-commerce index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("wa-commerce detail failed", url=url, error=str(e))

        self._log.info("wa-commerce scraped", links=len(all_links), kept=len(results))
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
            jurisdiction_name="Washington",
            managing_agency="Washington State Department of Commerce",
            agency_acronym="WA Commerce",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"WA-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Washington Clean Energy Fund (CEF) — Grid Modernization & Storage",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Washington",
                managing_agency="Washington State Department of Commerce",
                agency_acronym="WA Commerce",
                short_summary=(
                    "Washington's Clean Energy Fund (CEF) provides competitive grants for "
                    "grid modernization, energy storage, transmission, and demonstration "
                    "projects. Funded through state appropriations and federal Bipartisan "
                    "Infrastructure Law dollars. Awards range from $500K to $20M per project. "
                    "Recent rounds have focused on utility-scale battery storage, microgrids, "
                    "and distributed energy resource (DER) management systems."
                ),
                detailed_summary=(
                    "Award structure\n"
                    "• Award size: typically $500,000-$20,000,000 per project\n"
                    "• Cost-share: typically 25-50% applicant cost share required\n"
                    "• Total available per cycle: $25M-$60M depending on appropriation\n"
                    "• Cycles: typically 1-2 per biennium, announced 6+ months in advance\n\n"
                    "Eligible applicants\n"
                    "• Investor-owned utilities (PSE, Avista, PacifiCorp)\n"
                    "• Public utility districts (PUDs) and consumer-owned utilities\n"
                    "• Tribal governments and tribal utilities\n"
                    "• Municipal utilities (Seattle City Light, Tacoma Power, etc.)\n"
                    "• Local governments and special districts\n"
                    "• Private companies in partnership with eligible public entities\n\n"
                    "Eligible project types\n"
                    "• Utility-scale battery energy storage systems (BESS)\n"
                    "• Microgrid demonstration projects\n"
                    "• Distributed energy resource management systems (DERMS)\n"
                    "• Grid-forming inverter and grid services demonstrations\n"
                    "• Transmission and substation modernization\n"
                    "• Long-duration energy storage (>10 hours)\n"
                    "• Renewable hydrogen production and storage\n"
                    "• Vehicle-to-grid (V2G) demonstration projects\n\n"
                    "Priority criteria\n"
                    "1. Projects in named communities (per Washington's HEAL Act mapping)\n"
                    "2. Cost-effectiveness ($/kWh of capacity or $/MW of services)\n"
                    "3. Tribal partnership and co-benefit (e.g., tribal sovereignty over energy)\n"
                    "4. Use of domestic content (per IRA bonus credit definitions)\n"
                    "5. Demonstrable replicability and knowledge-transfer plan\n\n"
                    "Stacking with federal funds (typical $30M battery storage project)\n"
                    "• Washington CEF grant: $10M (33%)\n"
                    "• Federal §48 ITC standalone storage (now eligible post-IRA): 30%+\n"
                    "  with domestic content adder (+10%) and energy community adder (+10%)\n"
                    "• Federal Bipartisan Infrastructure Law grants (DOE Energy Storage Grand Challenge, "
                    "OCED Long-Duration Storage Demonstration, etc.): variable, often 40-60% match\n"
                    "Total federal + state: often 70-90% of project cost on qualifying sites."
                ),
                key_requirements=[
                    "Utility, tribal government, local government, or qualified private partner",
                    "Project: grid modernization, storage, microgrid, hydrogen, or transmission",
                    "Award size: $500K to $20M; typically 25-50% applicant cost share required",
                    "Application during open RFP cycle (announced 6+ months in advance)",
                    "Stackable with federal §48 ITC bonus adders (domestic content, energy community)",
                ],
                industry_categories=["Energy Storage", "Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=20000000,
                source_url="https://www.commerce.wa.gov/growing-the-economy/energy/clean-energy-fund/",
                program_code="WA-CEF-GRID",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Washington Solar + Storage for Low-Income Households",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Washington",
                managing_agency="Washington State Department of Commerce",
                agency_acronym="WA Commerce",
                short_summary=(
                    "Provides solar PV + battery storage installations at no cost to "
                    "qualifying low-income Washington households (≤80% Area Median Income). "
                    "Administered through partner nonprofits (Spark Northwest, GRID Alternatives "
                    "Northwest, Washington Trust for Historic Preservation). Reaches 1,000+ "
                    "households per program cycle. Households retain 100% of energy savings; "
                    "ongoing system maintenance also covered for 5 years."
                ),
                detailed_summary=(
                    "Eligibility\n"
                    "• Washington homeowner-occupant\n"
                    "• Household income at or below 80% Area Median Income (AMI)\n"
                    "• Home must be the applicant's primary residence\n"
                    "• Home must be structurally suitable (roof condition, electrical capacity)\n"
                    "• Renters are NOT directly eligible (separate landlord-tenant programs in development)\n\n"
                    "Income limits (2024, by county — representative thresholds)\n"
                    "• King County: 1 person $77,650 / 4 person $110,900\n"
                    "• Spokane County: 1 person $51,150 / 4 person $73,050\n"
                    "• Yakima County: 1 person $43,200 / 4 person $61,700\n"
                    "• Pierce County: 1 person $75,000 / 4 person $107,150\n\n"
                    "What's installed\n"
                    "• Solar PV system sized to offset 75-100% of annual usage (typical 4-7 kW)\n"
                    "• Battery energy storage (typically 10-13 kWh, optional in some cycles)\n"
                    "• Smart electrical panel upgrade (when needed)\n"
                    "• 5-year monitoring and maintenance contract\n"
                    "• Production guarantee (system replaced/repaired if underperforming)\n\n"
                    "Implementation partners\n"
                    "Apply through one of three implementation partners:\n"
                    "• GRID Alternatives Northwest (gridalternatives.org/regions/nw)\n"
                    "• Spark Northwest (sparknorthwest.org)\n"
                    "• Tribal-specific partners for tribal members (varies by tribe)\n\n"
                    "How it's funded\n"
                    "Households pay $0. The program is funded by:\n"
                    "• Washington state appropriation ($30M-$50M per biennium)\n"
                    "• Federal Solar for All grant ($156M to Washington over 5 years, 2024-2029)\n"
                    "• Inflation Reduction Act §25D credit (claimed by program partner, applied as cost offset)\n"
                    "• Bonus credits where applicable (low-income community adder = +20% ITC)\n\n"
                    "Energy bill savings\n"
                    "Typical household saves $600-$1,400/year on electricity. Combined with "
                    "Washington's Low-Income Home Energy Assistance Program (LIHEAP), "
                    "participating households often experience 40-60% reduction in total "
                    "household energy costs."
                ),
                key_requirements=[
                    "Washington homeowner-occupant, primary residence",
                    "Household income ≤80% Area Median Income (county-specific)",
                    "Home structurally suitable for solar (roof condition, electrical capacity)",
                    "Apply through GRID Alternatives Northwest, Spark Northwest, or tribal partner",
                    "Zero upfront cost; household retains 100% of energy savings",
                ],
                industry_categories=["Clean Technology", "Energy Storage", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://www.commerce.wa.gov/growing-the-economy/energy/solar-low-income/",
                program_code="WA-LMI-SOLAR-STORAGE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Washington EV Instant Rebate Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Washington",
                managing_agency="Washington State Department of Commerce",
                agency_acronym="WA Commerce",
                short_summary=(
                    "Provides $2,500-$9,000 instant point-of-sale rebates on new and used EVs "
                    "for income-qualified Washington residents. Higher rebates for households "
                    "at or below 80% State Median Income, vehicles assembled in the U.S., and "
                    "vehicles purchased from Washington dealers participating in the instant "
                    "transfer program. Stackable with federal §30D/25E tax credits."
                ),
                detailed_summary=(
                    "Rebate structure\n"
                    "Base rebates (new vehicle, lease ≥3 years OR purchase):\n"
                    "• Standard income: $2,500\n"
                    "• Below 80% State Median Income (SMI): $5,000\n"
                    "Bonus rebates (stackable on top of base):\n"
                    "• U.S.-assembled vehicle: +$1,000\n"
                    "• Purchased from a Washington-licensed participating dealer: +$1,000\n"
                    "• Income-qualified (below 80% SMI) AND U.S.-assembled: total can reach $9,000\n\n"
                    "Used EV rebates\n"
                    "• Standard income: $1,500 for used BEV/PHEV from a WA dealer\n"
                    "• Below 80% SMI: $3,500 for used BEV/PHEV from a WA dealer\n"
                    "Used vehicle must be ≥2 model years old, priced ≤$25,000, ≤80,000 miles.\n\n"
                    "Income limits (80% State Median Income, 2024)\n"
                    "• 1 person: $66,750\n"
                    "• 2 persons: $87,300\n"
                    "• 3 persons: $107,800\n"
                    "• 4 persons: $128,400\n"
                    "Documentation: prior year tax return OR three most recent paystubs.\n\n"
                    "Vehicle MSRP caps\n"
                    "• New BEV/PHEV sedans/hatchbacks: ≤$50,000 MSRP\n"
                    "• New BEV/PHEV trucks/SUVs/vans: ≤$80,000 MSRP\n\n"
                    "How the instant rebate works\n"
                    "Unlike traditional rebates that require mail-in/post-purchase application, "
                    "Washington's program is structured as an instant rebate applied by the "
                    "dealer at the time of purchase or lease. The dealer is reimbursed by the "
                    "state within 30-45 days. Effectively converts the rebate to a down payment.\n\n"
                    "Combined incentive maximums (income-qualified buyer at 60% SMI, US-assembled, WA dealer)\n"
                    "On a new $40,000 BEV (e.g., Chevy Bolt EUV at WA dealer):\n"
                    "• Washington base rebate: $5,000\n"
                    "• U.S. assembly bonus: $1,000\n"
                    "• WA dealer bonus: $1,000\n"
                    "• Subtotal Washington: $7,000\n"
                    "• Federal §30D Clean Vehicle Credit: $7,500 (via dealer point-of-sale transfer)\n"
                    "• Local utility EV charger rebate: $300-$500\n"
                    "• Total potential incentives: $15,000 on a $40,000 BEV"
                ),
                key_requirements=[
                    "Washington resident at time of vehicle purchase or lease",
                    "New BEV/PHEV ≤$50K sedan / $80K truck OR used BEV/PHEV ≤$25K",
                    "Vehicle titled, registered, and primarily operated in Washington",
                    "Income tier determines base rebate ($2,500 standard, $5,000 ≤80% SMI)",
                    "Bonus stacking: +$1K U.S.-assembled, +$1K WA participating dealer",
                ],
                industry_categories=["EV Charging", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=9000,
                source_url="https://www.commerce.wa.gov/growing-the-economy/energy/ev-instant-rebate-program/",
                program_code="WA-EV-INSTANT-REBATE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Washington Weatherization Plus Health Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Washington",
                managing_agency="Washington State Department of Commerce",
                agency_acronym="WA Commerce",
                short_summary=(
                    "Provides free comprehensive home weatherization plus health and safety "
                    "improvements to low-income Washington households. Combines federal "
                    "Weatherization Assistance Program (WAP) funds with Washington's state "
                    "Matchmaker funds and the federal Bipartisan Infrastructure Law to deliver "
                    "$10,000-$15,000 per home in improvements. Households at or below 80% AMI eligible."
                ),
                detailed_summary=(
                    "Eligibility (80% Area Median Income, 2024)\n"
                    "Income limits vary by county. Representative thresholds:\n"
                    "• King County: 1 person $77,650 / 4 person $110,900\n"
                    "• Spokane County: 1 person $51,150 / 4 person $73,050\n"
                    "Households receiving LIHEAP, TANF, SNAP, or SSI are categorically eligible.\n\n"
                    "What's covered (typical $10K-$15K per home)\n"
                    "• Comprehensive home energy audit (BPI-certified, blower-door directed)\n"
                    "• Attic insulation upgrade to R-49 (often blown cellulose)\n"
                    "• Wall insulation where feasible\n"
                    "• Crawlspace insulation and vapor barrier\n"
                    "• Air sealing — comprehensive blower-door directed sealing\n"
                    "• Duct sealing for forced-air systems\n"
                    "• High-efficiency heating system replacement (when existing fails health/safety)\n"
                    "• Heat pump installation (replacing electric resistance or oil heat)\n"
                    "• Water heater replacement (high-efficiency electric or gas)\n"
                    "• Refrigerator replacement (ENERGY STAR) for units >12 years old\n"
                    "• LED lighting throughout home\n\n"
                    "Health and safety \"plus\" components\n"
                    "Washington's program is one of the few in the country that pairs "
                    "weatherization with health and safety upgrades:\n"
                    "• Mold remediation\n"
                    "• Asbestos abatement\n"
                    "• Lead paint encapsulation in pre-1978 homes\n"
                    "• Radon mitigation (passive sub-slab depressurization)\n"
                    "• Pest exclusion and minor structural repairs needed for weatherization\n"
                    "• Combustion safety testing and CO/smoke detector installation\n"
                    "• Ventilation upgrades (HRV/ERV) when weatherization tightens the home\n\n"
                    "Apply through your Community Action Agency\n"
                    "Washington has 27 sub-grantee agencies covering all 39 counties. Find your "
                    "local agency via the Washington State Department of Commerce or call "
                    "211 for referral. Typical processing time: 60-180 days from application to "
                    "project completion, depending on county queue.\n\n"
                    "Renter eligibility\n"
                    "Renters are eligible with written landlord approval. Landlord typically "
                    "co-funds 25-50% depending on measure type. Anti-displacement clause: "
                    "landlord must agree to no rent increase or eviction directly tied to "
                    "the energy upgrades for 5 years post-completion."
                ),
                key_requirements=[
                    "Washington household at or below 80% Area Median Income",
                    "Apply through your local Community Action Agency",
                    "Categorical eligibility for LIHEAP/TANF/SNAP/SSI recipients",
                    "Renters eligible with landlord written approval + 25-50% co-fund",
                    "Free audit, free installation, post-work quality inspection",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=15000,
                source_url="https://www.commerce.wa.gov/growing-the-economy/energy/weatherization/",
                program_code="WA-WAP-PLUS",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Washington Sales Tax Exemption — Solar & EVs",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Washington",
                managing_agency="Washington State Department of Revenue",
                agency_acronym="WA DOR",
                short_summary=(
                    "Washington exempts solar energy systems (≤10 kW) and qualifying electric "
                    "vehicles from state and local sales tax. Solar exemption applies to "
                    "panels, inverters, and installation labor. EV exemption applies to the "
                    "first $20,000-$25,000 of the vehicle purchase price (depending on type). "
                    "Both exemptions are applied automatically at point of sale; no application required."
                ),
                detailed_summary=(
                    "Solar sales tax exemption (RCW 82.08.962)\n"
                    "• Applies to: solar PV systems up to 10 kW DC nameplate capacity\n"
                    "• Covers: panels, inverters, racking, batteries (when paired with solar), "
                    "labor for installation\n"
                    "• Tax saved: 8.5%-10.4% depending on city/county (state 6.5% + local 2-3.9%)\n"
                    "• On a typical $20,000 residential solar install: $1,700-$2,100 saved\n"
                    "• Applied automatically by the installer; no separate application\n\n"
                    "EV sales tax exemption (RCW 82.08.809)\n"
                    "• Applies to: new BEVs and PHEVs (sedans, hatchbacks, SUVs, trucks)\n"
                    "• Cap on exempt value:\n"
                    "  - 2024-2025: first $20,000 of sale price for new BEV\n"
                    "  - First $16,000 of sale price for new PHEV (where electric range ≥30 miles)\n"
                    "  - Used BEV/PHEV: first $16,000 of sale price\n"
                    "• Tax saved: 8.5%-10.4% of exempt amount = $1,360-$2,080 on a new BEV\n"
                    "• Applied automatically by the dealer at point of sale\n\n"
                    "Eligibility caveats\n"
                    "• MSRP cap for new EV: $45,000 (sedans/hatchbacks) — higher cap for trucks/SUVs\n"
                    "• Used EV: must be ≥2 model years old, priced ≤$30,000\n"
                    "• Vehicle must be titled and registered in Washington\n"
                    "• Exemption is per-vehicle (no household cap, but multi-vehicle households "
                    "may benefit from purchasing multiple qualifying EVs over time)\n\n"
                    "Stacking with other Washington incentives\n"
                    "EV sales tax exemption is FULLY STACKABLE with:\n"
                    "• Washington EV Instant Rebate ($2,500-$9,000)\n"
                    "• Federal §30D Clean Vehicle Tax Credit ($7,500)\n"
                    "• Local utility rebates (PSE, Seattle City Light, etc.)\n\n"
                    "Solar sales tax exemption is FULLY STACKABLE with:\n"
                    "• Federal §25D Residential Clean Energy Credit (30% of cost)\n"
                    "• Utility net-metering revenue (ongoing)\n"
                    "• Washington Solar+Storage Low-Income program (no-cost installations)\n\n"
                    "Sunset dates\n"
                    "Both exemptions have legislatively-set sunset dates. Current sunsets:\n"
                    "• EV exemption: July 31, 2028 (most recent extension)\n"
                    "• Solar exemption: open-ended (renewable energy sales tax exemption)\n"
                    "Renewals often happen 12-18 months before sunset; check current status "
                    "on the Washington DOR site."
                ),
                key_requirements=[
                    "Vehicle: new BEV/PHEV titled and registered in Washington",
                    "New BEV MSRP cap: $45,000 (sedan/hatchback) — higher for trucks/SUVs",
                    "Solar: residential or small commercial PV system ≤10 kW DC capacity",
                    "Both exemptions applied automatically at point of sale (no application)",
                    "Stackable with WA EV Instant Rebate and federal credits for maximum savings",
                ],
                industry_categories=["Clean Technology", "EV Charging"],
                incentive_type=IncentiveType.TAX_CREDIT,
                source_url="https://dor.wa.gov/taxes-rates/tax-incentives/incentive-programs/",
                program_code="WA-SALES-TAX-EXEMPT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
