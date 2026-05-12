"""
Colorado Energy Office (CEO) Scraper
=====================================
Scrapes the Colorado Energy Office program directory at:
  https://energyoffice.colorado.gov/

The Colorado Energy Office (CEO) administers state-funded clean energy
and efficiency programs, federal pass-through funds (DOE State Energy
Program, Weatherization Assistance), and a portfolio of incentives
covering buildings, transportation, agriculture, and industry. Colorado
has aggressive 2030/2040/2050 climate targets including 100% clean
electricity by 2040.

Quality
-------
- STATE jurisdiction / Colorado
- Mock mode: 5 realistic CEO fixtures (heat pump, EV, weatherization, charge ahead, ag)
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

BASE = "https://energyoffice.colorado.gov"
INDEX_URLS = [
    f"{BASE}/programs",
    f"{BASE}/funding-opportunities",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",       IncentiveType.GRANT),
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
    ("voucher",     IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("agriculture", "Agriculture"),
    ("commercial",  "Technology"),
    ("low-income",  "Government & Nonprofit"),
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


class ColoradoEnergyScraper(BaseScraper):
    """Scrapes Colorado Energy Office program listings."""

    SOURCE_NAME = "colorado_energy_office"
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
                        if (
                            full not in all_links
                            and BASE in full
                            and full not in INDEX_URLS
                        ):
                            all_links.append(full)
            except Exception as e:
                self._log.debug("ceo index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("ceo detail failed", url=url, error=str(e))

        self._log.info("ceo scraped", links=len(all_links), kept=len(results))
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
            jurisdiction_name="Colorado",
            managing_agency="Colorado Energy Office",
            agency_acronym="CEO",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"CEO-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Colorado Heat Pump Tax Credit",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Colorado",
                managing_agency="Colorado Department of Revenue",
                agency_acronym="CDOR",
                short_summary=(
                    "Refundable Colorado state income tax credit of up to $1,500 for "
                    "homeowners installing qualifying air-source or ground-source heat pump "
                    "systems. The credit is structured as a tax credit but is refundable, "
                    "meaning homeowners receive the full benefit even if their state tax "
                    "liability is below the credit amount. Credit is administered through a "
                    "post-installation tax filing using DR 1322 with itemized installation invoice."
                ),
                detailed_summary=(
                    "Credit amounts (effective 2024-2032)\n"
                    "• Air-source heat pump (cold-climate, NEEP-listed): $1,500 per system\n"
                    "• Ground-source (geothermal) heat pump: $3,000 per system (separate higher-tier credit)\n"
                    "• Heat pump water heater: $500 per unit\n"
                    "Credit is fully refundable — if the credit exceeds your Colorado tax "
                    "liability, the difference is paid as a refund check (not just carried forward).\n\n"
                    "Equipment requirements\n"
                    "Air-source heat pumps must:\n"
                    "• Be cold-climate certified (HSPF2 ≥ 8.5)\n"
                    "• Appear on the NEEP Cold-Climate Air-Source Heat Pump Specification list\n"
                    "• Be installed by a licensed Colorado HVAC contractor\n"
                    "Ground-source heat pumps must:\n"
                    "• Meet ENERGY STAR efficiency requirements (typically EER ≥ 17.1, COP ≥ 3.6)\n"
                    "• Loop installation must be permitted and inspected\n\n"
                    "How to claim\n"
                    "1. Install qualifying heat pump equipment in primary or secondary Colorado residence\n"
                    "2. Retain itemized invoice from installer including AHRI certification number\n"
                    "3. File Colorado Form DR 1322 (Heat Pump Property Tax Credit) with annual tax return\n"
                    "4. Refundable credit applied against tax owed; excess refunded\n\n"
                    "Stacking with other incentives\n"
                    "Fully stackable with:\n"
                    "• Federal §25C Energy Efficient Home Improvement Credit (30% up to $2,000 for heat pumps)\n"
                    "• Federal HOMES rebate (when Colorado launches its program)\n"
                    "• Federal HEEHRA rebate for income-qualified households\n"
                    "• Xcel Energy and Black Hills Energy heat pump rebates ($1,500-$2,500)\n"
                    "Combined federal + state + utility incentives can offset 60-80% of total install cost."
                ),
                key_requirements=[
                    "Must own Colorado primary or secondary residence",
                    "Equipment must meet NEEP cold-climate standards (air-source) or ENERGY STAR (ground-source)",
                    "Installation must be performed by a licensed Colorado HVAC contractor",
                    "Air-source: $1,500 credit; ground-source: $3,000; heat pump water heater: $500",
                    "Claimed via Colorado Form DR 1322 with annual state tax return",
                ],
                industry_categories=["Energy Management", "Clean Technology"],
                incentive_type=IncentiveType.TAX_CREDIT,
                funding_amount=3000,
                source_url="https://tax.colorado.gov/heat-pump-credit",
                program_code="CDOR-HEAT-PUMP-CREDIT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Colorado Vehicle Exchange Colorado (VXC) — Income-Qualified EV Rebate",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Colorado",
                managing_agency="Colorado Energy Office",
                agency_acronym="CEO",
                short_summary=(
                    "Vehicle Exchange Colorado (VXC) provides up to $6,000 to income-qualified "
                    "Coloradans who scrap a high-emission vehicle (model year 2002 or older) "
                    "and replace it with a new or used electric vehicle. Stackable with federal "
                    "§30D and §25E credits, the Colorado state EV tax credit, and utility EV "
                    "rebates. Total potential incentive on a new BEV: $14,500."
                ),
                detailed_summary=(
                    "Income eligibility\n"
                    "VXC is income-qualified — household income must be at or below 80% of "
                    "the relevant Area Median Income (AMI). For 2024:\n"
                    "• 1 person, Denver-Aurora MSA: ~$73,400\n"
                    "• 2 persons: ~$83,900\n"
                    "• 4 persons: ~$104,800\n"
                    "Other Colorado regions have lower thresholds — check the VXC eligibility tool.\n\n"
                    "Qualifying scrapped vehicle\n"
                    "• Must be model year 2002 or older (some flexibility for high-emission newer vehicles)\n"
                    "• Must be currently registered in Colorado in your name\n"
                    "• Must be drivable (capable of arriving at the scrap yard under its own power)\n"
                    "• Must have current vehicle insurance and a valid title\n"
                    "Vehicle is permanently scrapped (engine destroyed) — cannot be returned to service.\n\n"
                    "Replacement vehicle eligibility\n"
                    "• New BEV or PHEV (must be on the qualifying vehicle list)\n"
                    "• Used BEV or PHEV from a Colorado-licensed dealer (model year ≥ 2018, ≤80,000 miles)\n"
                    "• MSRP cap: $50,000 (sedans) or $80,000 (trucks/SUVs/vans) for new vehicles\n"
                    "• Used vehicle price cap: $25,000\n\n"
                    "Maximum stacking on a new BEV\n"
                    "• VXC scrap-and-replace incentive: $6,000\n"
                    "• Colorado EV state tax credit: $5,000 ($2,500 base + $2,500 income qualified)\n"
                    "• Federal §30D Clean Vehicle Credit: $7,500 (or income-qualified buyers' "
                    "portion via point-of-sale transfer)\n"
                    "Total: up to $18,500 — equivalent to driving a $40,000 BEV out of the "
                    "showroom for an effective net cost of ~$21,500 (less than many gasoline "
                    "vehicles in the same class).\n\n"
                    "Application process\n"
                    "1. Apply through the VXC online portal — eligibility verified before scrap\n"
                    "2. Receive pre-authorization voucher\n"
                    "3. Visit a participating Colorado scrap yard (must be VXC-approved); "
                    "vehicle scrapped, certificate issued\n"
                    "4. Apply scrap certificate as down payment at participating dealer\n"
                    "5. State + federal tax credits filed at year-end (or applied at point of sale via dealer transfer)"
                ),
                key_requirements=[
                    "Colorado resident with household income ≤80% Area Median Income (AMI)",
                    "Scrapped vehicle: 2002 or older, registered in Colorado, currently insured and drivable",
                    "Replacement: new or used BEV/PHEV (price caps apply)",
                    "Vehicle scrapped at participating Colorado yard (cannot return to service)",
                    "Stackable with federal §30D and Colorado state EV tax credit for total up to $18,500",
                ],
                industry_categories=["EV Charging", "Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=6000,
                source_url="https://energyoffice.colorado.gov/zero-emission-vehicles/vehicle-exchange-colorado",
                program_code="CEO-VXC",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Colorado Weatherization Assistance Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Colorado",
                managing_agency="Colorado Energy Office",
                agency_acronym="CEO",
                short_summary=(
                    "Free home weatherization for Colorado households at or below 60% State "
                    "Median Income. Funded by federal Weatherization Assistance Program (WAP) "
                    "plus state matching funds and the federal Bipartisan Infrastructure Law. "
                    "Average per-home investment: $7,500-$11,000. Includes insulation, air "
                    "sealing, heating system replacement, refrigerator replacement, and "
                    "comprehensive health and safety upgrades. Renters eligible with landlord approval."
                ),
                detailed_summary=(
                    "Income eligibility (60% Colorado SMI, 2024)\n"
                    "• 1 person: $33,975 / year\n"
                    "• 2 persons: $44,427 / year\n"
                    "• 3 persons: $54,879 / year\n"
                    "• 4 persons: $65,331 / year\n"
                    "• 5 persons: $75,783 / year\n"
                    "Households receiving SNAP, LEAP, or SSI benefits are categorically eligible "
                    "without separate income verification.\n\n"
                    "Apply through your local provider\n"
                    "Colorado uses a network of 9 sub-grantee agencies covering all 64 counties. "
                    "Apply via energyoffice.colorado.gov/weatherization or call the LEAP/WAP "
                    "intake line (1-866-HEAT-HELP).\n\n"
                    "Process\n"
                    "1. Application submitted (online, phone, or in person at sub-grantee)\n"
                    "2. Income and eligibility verified — typically 2-4 weeks\n"
                    "3. Free comprehensive home energy audit by BPI-certified auditor\n"
                    "4. Approved measures installed by licensed weatherization contractor\n"
                    "5. Quality control inspection within 60 days of completion\n\n"
                    "Typical scope (per-home value $7,500-$11,000)\n"
                    "• Air sealing — comprehensive blower-door directed sealing\n"
                    "• Attic insulation upgrade to R-49\n"
                    "• Wall insulation where feasible (dense-pack cellulose)\n"
                    "• Crawlspace insulation and vapor barrier\n"
                    "• Duct sealing for forced-air systems\n"
                    "• Heating system replacement (when existing fails health/safety inspection)\n"
                    "• Hot water heater replacement (high-efficiency)\n"
                    "• Refrigerator replacement (ENERGY STAR) for units >12 years old\n"
                    "• LED lighting throughout home\n"
                    "• Health and safety: combustion safety, CO/smoke detectors, mold remediation\n\n"
                    "Renter eligibility\n"
                    "Renters are eligible with landlord written approval. Landlord typically "
                    "co-funds 25-50% depending on measure (e.g., 50% co-fund for furnace replacement). "
                    "Anti-displacement requirement: landlord must agree to not raise rent or "
                    "displace tenants for at least 5 years post-weatherization."
                ),
                key_requirements=[
                    "Colorado household at or below 60% State Median Income",
                    "Apply via CEO weatherization portal or call 1-866-HEAT-HELP",
                    "Renters eligible with landlord written approval and co-funding",
                    "Categorical eligibility for SNAP/LEAP/SSI recipients",
                    "Free audit, free installation, post-work quality inspection",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=11000,
                source_url="https://energyoffice.colorado.gov/weatherization",
                program_code="CEO-WAP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Charge Ahead Colorado — EV Charging Infrastructure Grants",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Colorado",
                managing_agency="Colorado Energy Office",
                agency_acronym="CEO",
                short_summary=(
                    "Grants of up to 80% of equipment + installation cost for Level 2 and DC "
                    "Fast Charging (DCFC) stations across Colorado. Eligible applicants include "
                    "businesses, nonprofits, multifamily property owners, local governments, "
                    "and HOAs. Priority scoring for stations in Disproportionately Impacted "
                    "Communities (DIC), high-traffic corridors, workplaces, and multifamily "
                    "housing. Stackable with federal §30C tax credit."
                ),
                detailed_summary=(
                    "Award structure\n"
                    "• Level 2 charging: up to 80% of equipment + installation, max $9,000 per port\n"
                    "• DC Fast Charging: up to 80% of equipment + installation, max $50,000 per port\n"
                    "• DCFC corridor stations: up to 80%, max $250,000 per station (typically 4-6 ports)\n"
                    "Awards must be matched with at least 20% applicant funds (or stacked federal funds).\n\n"
                    "Eligible applicants\n"
                    "• Private businesses (workplace charging, retail/destination charging)\n"
                    "• Multifamily property owners and HOAs (apartment building charging)\n"
                    "• Nonprofit organizations\n"
                    "• Local governments and special districts\n"
                    "• School districts and higher education\n"
                    "• Tribal governments\n"
                    "Single-family residential is NOT eligible (use utility programs instead).\n\n"
                    "Priority scoring criteria\n"
                    "1. Located in Disproportionately Impacted Community (per CO Air Pollution Control Division mapping)\n"
                    "2. Located on a designated Alternative Fuel Corridor\n"
                    "3. Workplace charging or multifamily charging (high underserved-need categories)\n"
                    "4. Public access (24/7) vs. restricted/private use\n"
                    "5. Use of OCPP-compliant networked charging (open protocol, interoperable)\n"
                    "6. Co-located solar/storage for grid resilience\n\n"
                    "Application timing\n"
                    "Charge Ahead Colorado opens 2-3 funding cycles per year. Each cycle has "
                    "$8-15M available; awards announced 60-90 days after close. Application "
                    "requires:\n"
                    "• Site control documentation (lease, deed, or owner authorization)\n"
                    "• Equipment specifications (must be UL-listed, OCPP-compliant for networked)\n"
                    "• Three contractor quotes for installation\n"
                    "• 5-year operations and reporting commitment\n\n"
                    "Stacking with federal §30C\n"
                    "Federal Alternative Fuel Vehicle Refueling Property Credit (§30C) provides "
                    "up to 30% / $100,000 per item for commercial chargers in low-income or non-urban "
                    "census tracts. CEO grant + federal §30C can together offset 80-100% of total "
                    "project cost for qualifying sites."
                ),
                key_requirements=[
                    "Colorado-based business, nonprofit, multifamily owner, government, school, or HOA",
                    "Level 2: max $9,000/port; DCFC: max $50,000/port; corridor: max $250K/station",
                    "Minimum 20% applicant cost share (or stacked federal grant)",
                    "Equipment must be UL-listed and OCPP-compliant for networked chargers",
                    "5-year operations, public access (when applicable), and quarterly reporting required",
                ],
                industry_categories=["EV Charging", "Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=250000,
                source_url="https://energyoffice.colorado.gov/zero-emission-vehicles/charge-ahead-colorado",
                program_code="CEO-CHARGE-AHEAD",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Colorado Agricultural Energy Efficiency Program (CAEEP)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Colorado",
                managing_agency="Colorado Energy Office",
                agency_acronym="CEO",
                short_summary=(
                    "Provides up to $50,000 in cost-share grants to Colorado agricultural "
                    "producers for energy efficiency and on-site renewable energy projects. "
                    "Free energy audits, irrigation pump tests, and engineering support "
                    "available. Coordinates with USDA REAP grant applications, Xcel Energy "
                    "incentives, and local utility cooperative programs to maximize "
                    "cost coverage on major projects."
                ),
                detailed_summary=(
                    "Cost-share structure\n"
                    "• Standard cost-share: up to 50% of project cost\n"
                    "• Maximum award: $50,000 per producer per fiscal year\n"
                    "• Cumulative producer cap: $150,000 over a 5-year period\n"
                    "• Income-qualified or socially disadvantaged producers: enhanced cost-share up to 75%\n\n"
                    "Eligible projects\n"
                    "• Irrigation efficiency: VFD installation, pump replacement, system rebalancing, "
                    "soil moisture sensors, low-pressure delivery systems\n"
                    "• On-site renewable energy: solar PV (up to 200% of operation's annual usage), "
                    "small wind, anaerobic digesters\n"
                    "• Refrigeration: dairy plate coolers, walk-in cooler controls, evaporator fan upgrades\n"
                    "• Grain drying/storage: high-efficiency dryers, aeration controls, fan upgrades\n"
                    "• Greenhouse: energy curtains, LED grow lights, high-efficiency boilers\n"
                    "• Building envelope: barn insulation, ventilation upgrades, dairy parlor improvements\n\n"
                    "Free pre-application services\n"
                    "All eligible producers can request free pre-application services:\n"
                    "• Comprehensive farm energy audit (typical $1,500-$3,000 value)\n"
                    "• Irrigation pump efficiency test\n"
                    "• Engineering analysis with payback estimates\n"
                    "• Application support for federal USDA REAP grants (which can stack with CEO funds)\n\n"
                    "Stacking strategy (typical large project)\n"
                    "On a $100,000 irrigation efficiency project:\n"
                    "• USDA REAP grant: 50% ($50,000)\n"
                    "• CEO CAEEP: 25% ($25,000)\n"
                    "• Local utility rebate (Xcel, Tri-State, Holy Cross, etc.): 10-15% ($10-15K)\n"
                    "• Federal §48 Investment Tax Credit (for solar/digester components): 30%\n"
                    "Producer pays only 5-15% of project cost out-of-pocket.\n\n"
                    "Application timing\n"
                    "CAEEP opens 1-2 cycles per year with $1.5M-$3M available per cycle. Awards "
                    "announced 90-120 days after application close. Cycle dates announced 30 days "
                    "in advance via the CEO mailing list."
                ),
                key_requirements=[
                    "Must be a Colorado agricultural producer (farm, ranch, food processor)",
                    "Project must be eligible energy efficiency or on-site renewable measure",
                    "Maximum award: $50K/year, $150K cumulative over 5 years",
                    "Free pre-application audits and engineering support available",
                    "Stackable with USDA REAP, utility rebates, and federal §48 ITC",
                ],
                industry_categories=["Agriculture", "Energy Management", "Clean Technology"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=50000,
                source_url="https://energyoffice.colorado.gov/agriculture",
                program_code="CEO-CAEEP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
