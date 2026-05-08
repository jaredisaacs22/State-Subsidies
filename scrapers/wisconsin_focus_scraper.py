"""
Wisconsin Focus on Energy Scraper
==================================
Scrapes the Wisconsin Focus on Energy program directory at:
  https://focusonenergy.com/

Focus on Energy is Wisconsin's statewide energy efficiency and renewable
resource program, funded by all of the state's investor-owned utilities and
participating municipal and electric cooperative utilities. Administered by
the Wisconsin Public Service Commission (PSC), it has been in continuous
operation since 2001 and is one of the longest-running and most-studied
ratepayer-funded efficiency programs in the country.

Quality
-------
- STATE jurisdiction / Wisconsin
- Mock mode: 5 realistic Focus on Energy fixtures (residential, business, ag, low-income, RE)
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

BASE = "https://focusonenergy.com"
INDEX_URLS = [
    f"{BASE}/residential",
    f"{BASE}/business",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",       IncentiveType.GRANT),
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("renewable",   "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("agriculture", "Agriculture"),
    ("commercial",  "Technology"),
    ("industrial",  "Manufacturing"),
    ("low-income",  "Government & Nonprofit"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.POINT_OF_SALE_REBATE


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Energy Management"]


class WisconsinFocusScraper(BaseScraper):
    """Scrapes Wisconsin Focus on Energy program listings."""

    SOURCE_NAME = "wisconsin_focus_on_energy"
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
                self._log.debug("foe index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("foe detail failed", url=url, error=str(e))

        self._log.info("foe scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None

        summary = ""
        for sel in ["main", ".main-content", ".entry-content", "#content"]:
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
            jurisdiction_name="Wisconsin",
            managing_agency="Wisconsin Focus on Energy",
            agency_acronym="FOE",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"FOE-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Focus on Energy — Residential Smart Thermostat Rebate",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Wisconsin",
                managing_agency="Wisconsin Focus on Energy",
                agency_acronym="FOE",
                short_summary=(
                    "Provides $75 instant rebates to Wisconsin residential customers for "
                    "purchasing and installing a qualifying ENERGY STAR smart thermostat. "
                    "Available to customers of all participating Wisconsin utilities. "
                    "Combine with HVAC, water heater, and insulation rebates for whole-home "
                    "efficiency upgrades. Online retailer instant rebates available via the "
                    "Focus on Energy Marketplace."
                ),
                detailed_summary=(
                    "Eligible models\n"
                    "Must be ENERGY STAR-certified smart thermostats with Wi-Fi connectivity. "
                    "Common qualifying models include Ecobee SmartThermostat, Nest Learning "
                    "Thermostat, Honeywell T9/T10, and Sensi Touch. The Marketplace catalog "
                    "is the authoritative list and is updated quarterly.\n\n"
                    "How to claim\n"
                    "1. Online instant rebate via the Focus on Energy Marketplace — applied "
                    "automatically at checkout, ships free.\n"
                    "2. Mail-in/online rebate after retail purchase — submit receipt and serial "
                    "number within 90 days at focusonenergy.com/savings/rebates. Rebate check "
                    "arrives in 6-8 weeks.\n\n"
                    "Eligible customers\n"
                    "Residential customers of any participating Wisconsin utility (covers all "
                    "investor-owned utilities — Alliant, We Energies, Wisconsin Public Service, "
                    "Madison Gas and Electric — plus most cooperatives and municipal utilities). "
                    "Limited to one thermostat rebate per household per calendar year.\n\n"
                    "Stacking\n"
                    "Can be combined with federal §25C Energy Efficient Home Improvement Credit "
                    "(30% of cost up to $1,200 annual cap for the broader category). Some local "
                    "utilities also offer additional time-of-use enrollment incentives ($25-$50) "
                    "for connecting the thermostat to their demand-response program."
                ),
                key_requirements=[
                    "Must be a residential customer of a participating Wisconsin utility",
                    "Thermostat must be ENERGY STAR certified and Wi-Fi enabled",
                    "Limit one rebate per household per calendar year",
                    "Mail-in rebates must be submitted within 90 days of purchase",
                    "Marketplace purchase = instant rebate; retail purchase = mail-in rebate",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=75,
                source_url="https://focusonenergy.com/residential/smart-thermostats",
                program_code="FOE-RES-THERMOSTAT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Focus on Energy — Business Energy Efficiency Incentives",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Wisconsin",
                managing_agency="Wisconsin Focus on Energy",
                agency_acronym="FOE",
                short_summary=(
                    "Comprehensive incentive program for Wisconsin businesses, nonprofits, "
                    "schools, and local governments. Provides prescriptive rebates for common "
                    "equipment (LED lighting, HVAC, motors, food service) and custom incentives "
                    "for non-standard projects calculated at $0.04/kWh and $4.00/therm of "
                    "lifetime savings. Pre-approval required for projects exceeding $50,000. "
                    "Free technical assistance and energy audits available."
                ),
                detailed_summary=(
                    "Prescriptive incentives\n"
                    "Pre-set rebate amounts for common equipment without an engineering review. "
                    "Examples: LED tube replacements ($2-5/lamp), LED high-bay fixtures "
                    "($60-120/fixture), variable frequency drives ($60/HP), commercial heat "
                    "pumps ($300-1,500/ton), refrigeration controllers ($150-500/unit).\n\n"
                    "Custom incentives\n"
                    "For projects without prescriptive paths. Calculated at $0.04 per kWh and "
                    "$4.00 per therm of first-year savings, with cap at 50% of incremental "
                    "project cost. Requires:\n"
                    "• Pre-installation application with engineering analysis\n"
                    "• Pre-approval before equipment is purchased or installed\n"
                    "• Post-installation Measurement & Verification (M&V) for projects > $25,000\n\n"
                    "Bonus incentives\n"
                    "• 10% bonus for projects in designated low-income census tracts\n"
                    "• 5% bonus for use of Wisconsin-based contractors and equipment manufacturers\n"
                    "• Whole-building deep retrofits (>30% energy savings) eligible for stacked bonuses\n\n"
                    "Free services\n"
                    "Focus on Energy provides free technical assistance to all eligible "
                    "businesses, including walk-through energy audits, ASHRAE Level 1-2 audits "
                    "for facilities >50,000 sq ft, and project scoping support. Engineering "
                    "studies for complex projects (>$100,000) may be co-funded up to 50%.\n\n"
                    "Program caps\n"
                    "Custom incentive cap: $400,000 per project, $800,000 per customer per year. "
                    "Some sub-programs (e.g., Strategic Energy Management) have separate caps."
                ),
                key_requirements=[
                    "Must be a business, nonprofit, school, or local government in Wisconsin",
                    "Must be a customer of a participating Wisconsin utility",
                    "Custom projects > $50,000 require pre-approval before installation",
                    "Equipment must meet program technical specifications",
                    "Custom incentives require Measurement & Verification (M&V) for projects > $25,000",
                ],
                industry_categories=["Energy Management", "Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=400000,
                source_url="https://focusonenergy.com/business",
                program_code="FOE-BIZ-EE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Focus on Energy — Agriculture, Schools & Government Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Wisconsin",
                managing_agency="Wisconsin Focus on Energy",
                agency_acronym="FOE",
                short_summary=(
                    "Specialized incentives for Wisconsin agricultural producers, K-12 schools, "
                    "and local government facilities. Covers high-efficiency irrigation pumps, "
                    "ventilation fans, milking equipment, grain dryers, school HVAC, and "
                    "municipal building upgrades. Custom incentives at $0.05/kWh of lifetime "
                    "savings (higher than commercial rate). Free dairy farm energy assessments."
                ),
                detailed_summary=(
                    "Agriculture\n"
                    "Tailored prescriptive incentives for dairy, livestock, and crop operations. "
                    "Common rebates include:\n"
                    "• Variable-speed milk pumps: $300-600/unit\n"
                    "• Plate coolers: $30/cow\n"
                    "• Dairy refrigeration heat recovery: $500/unit\n"
                    "• Grain dryer retrofits: 25-40% of project cost\n"
                    "• Ventilation fans (>2,800 CFM/watt): $50-100/unit\n"
                    "• Irrigation pump tests + rebates: free test, up to $4,000 for upgrades\n\n"
                    "Schools\n"
                    "K-12 districts receive enhanced custom incentive rates ($0.05/kWh vs. "
                    "$0.04/kWh commercial standard). The Schools & Government track also funds:\n"
                    "• Free ASHRAE Level 2 audits for facilities >50,000 sq ft\n"
                    "• Strategic Energy Management (SEM) coaching cohorts\n"
                    "• HVAC commissioning and retro-commissioning incentives at $0.10/sq ft\n\n"
                    "Local government\n"
                    "Counties, municipalities, and tribal governments receive the same enhanced "
                    "rates as schools. Wastewater treatment plants are a priority sector with "
                    "specialized incentives for aeration blowers ($30/HP), VFDs, and process "
                    "controls. Outdoor street/parking lot LED conversions receive prescriptive "
                    "rebates of $50-200 per fixture."
                ),
                key_requirements=[
                    "Must be a Wisconsin farm, K-12 school district, or local/tribal government",
                    "Must be a customer of a participating Wisconsin utility",
                    "Pre-approval required for custom projects > $25,000",
                    "Schools and government receive enhanced custom rate ($0.05/kWh)",
                    "Free energy audits available — request before scoping major projects",
                ],
                industry_categories=["Agriculture", "Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                source_url="https://focusonenergy.com/business/agriculture-schools-and-government",
                program_code="FOE-AG-SCHOOLS-GOV",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Focus on Energy — Renewable Energy Competitive Incentive Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Wisconsin",
                managing_agency="Wisconsin Focus on Energy",
                agency_acronym="FOE",
                short_summary=(
                    "Competitive grant program for solar PV, biogas, and other renewable energy "
                    "systems in Wisconsin. Awards funding through annual Request for Proposal "
                    "(RFP) cycles. Maximum award is typically $200,000 per residential project "
                    "(uncommon at this level) or $1,000,000 per commercial/industrial project. "
                    "Scoring favors projects with high MWh production per dollar requested."
                ),
                detailed_summary=(
                    "Cycle structure\n"
                    "Focus on Energy issues 1-2 RFPs per year for renewable energy. Application "
                    "windows are typically 60-90 days; awards announced 90-120 days after close. "
                    "Eligible technologies:\n"
                    "• Solar photovoltaic (PV) — most common award\n"
                    "• Anaerobic digesters / biogas\n"
                    "• Solar thermal\n"
                    "• Geothermal heat pumps (large-scale only)\n"
                    "• Small wind (limited eligibility)\n\n"
                    "Scoring criteria\n"
                    "Applications are scored primarily on:\n"
                    "1. Cost-effectiveness ($/MWh) — lowest-cost projects per MWh awarded first\n"
                    "2. Wisconsin economic benefit (in-state contractor / equipment use)\n"
                    "3. Environmental and community benefit (siting, low-income access)\n"
                    "4. Technical readiness and project completion certainty\n\n"
                    "Award structure\n"
                    "Awards are paid as a fixed-dollar grant after project commissioning and "
                    "verification. Award amount typically covers 10-25% of installed cost.\n\n"
                    "Stacking\n"
                    "Compatible with federal Investment Tax Credit (§48) for businesses or "
                    "Residential Clean Energy Credit (§25D) for homeowners. Federal credit basis "
                    "is reduced by half of the Focus on Energy award (per IRS rules on grant "
                    "treatment of state incentives)."
                ),
                key_requirements=[
                    "Must be a Wisconsin resident, business, school, or government entity",
                    "Project must use solar PV, biogas, solar thermal, geothermal, or wind",
                    "Must apply during open RFP cycle (1-2 per year)",
                    "Must be a customer of a participating Wisconsin utility",
                    "Award paid after project is built and commissioned",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=1000000,
                source_url="https://focusonenergy.com/renewables",
                program_code="FOE-RENEWABLES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Focus on Energy — Income Qualified Weatherization Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Wisconsin",
                managing_agency="Wisconsin Focus on Energy",
                agency_acronym="FOE",
                short_summary=(
                    "Provides free weatherization improvements to Wisconsin households at or "
                    "below 60% State Median Income. Improvements include attic and wall "
                    "insulation, air sealing, duct sealing, water heater replacement, refrigerator "
                    "replacement, and CFL/LED lighting. Coordinates with the federal Weatherization "
                    "Assistance Program (WAP) administered by Wisconsin DOA. Average value of "
                    "services delivered: $4,000-$6,500 per home."
                ),
                detailed_summary=(
                    "Eligibility\n"
                    "Households at or below 60% of Wisconsin State Median Income (SMI). For 2024:\n"
                    "• 1 person: $30,816 / year\n"
                    "• 2 persons: $40,295 / year\n"
                    "• 3 persons: $49,775 / year\n"
                    "• 4 persons: $59,254 / year\n"
                    "Renters are eligible with landlord permission; landlord typically must "
                    "co-fund 25-50% of measure cost.\n\n"
                    "Process\n"
                    "1. Apply through your local community action agency (e.g., CAP Services, "
                    "Couleecap, Newcap) or directly via focusonenergy.com/iq.\n"
                    "2. Free pre-installation energy assessment by a certified auditor identifies "
                    "cost-effective measures.\n"
                    "3. Approved contractor installs measures at no cost to the household.\n"
                    "4. Quality control inspection within 60 days of completion.\n\n"
                    "Typical measures delivered\n"
                    "• Attic insulation (R-49 minimum) and air sealing\n"
                    "• Wall insulation where feasible (typically dense-pack cellulose)\n"
                    "• Duct sealing and balancing\n"
                    "• Water heater replacement (high-efficiency electric or gas)\n"
                    "• Refrigerator replacement (ENERGY STAR) for units >15 years old\n"
                    "• High-efficiency furnace replacement (when existing unit fails health/safety inspection)\n"
                    "• LED lighting upgrades throughout the home\n\n"
                    "Coordination with federal WAP\n"
                    "Focus on Energy coordinates with the Wisconsin Department of Administration's "
                    "Weatherization Assistance Program (WAP), which uses U.S. Department of Energy "
                    "funds. Households generally receive both programs together, doubling the "
                    "available investment per home."
                ),
                key_requirements=[
                    "Wisconsin household at or below 60% State Median Income",
                    "Apply through local community action agency or focusonenergy.com",
                    "Renters eligible with landlord co-funding agreement",
                    "Free assessment, installation, and post-work quality control",
                    "Coordinates with federal Weatherization Assistance Program (WAP)",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=6500,
                source_url="https://focusonenergy.com/iq",
                program_code="FOE-IQ-WEATHERIZATION",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
