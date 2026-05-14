"""
Pennsylvania DEP / PA PUC / PennSAVE Scraper
=============================================
Scrapes Pennsylvania energy programs from:
  https://www.dep.pa.gov/Citizens/EnergyAndClimate/
  https://www.puc.pa.gov/

PA's clean energy and efficiency programs are split across the Department
of Environmental Protection (DEP) for grants/rebates and the Public Utility
Commission (PUC) for utility-administered Act 129 programs (PECO, PPL,
Duquesne Light, FirstEnergy/Met-Ed/Penelec/West Penn). The Pennsylvania
Energy Development Authority (PEDA) administers larger competitive grants.

Quality
-------
- STATE jurisdiction / Pennsylvania
- Mock mode: 5 realistic PA fixtures
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

BASE = "https://www.dep.pa.gov"
INDEX_URLS = [
    f"{BASE}/Citizens/EnergyAndClimate/Pages/default.aspx",
    f"{BASE}/Business/Energy/Pages/default.aspx",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("rebate",     IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",  IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",      IncentiveType.GRANT),
    ("loan",       IncentiveType.LOAN),
    ("financing",  IncentiveType.LOAN),
    ("tax credit", IncentiveType.TAX_CREDIT),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",        "Clean Technology"),
    ("renewable",    "Clean Technology"),
    ("storage",      "Energy Storage"),
    ("electric veh", "EV Charging"),
    ("ev ",          "EV Charging"),
    ("heat pump",    "Energy Management"),
    ("efficiency",   "Energy Management"),
    ("manufacturing","Manufacturing"),
    ("industrial",   "Manufacturing"),
    ("agriculture",  "Agriculture"),
    ("school",       "Government & Nonprofit"),
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


class PennsylvaniaEnergyScraper(BaseScraper):
    """Scrapes Pennsylvania DEP/PUC/PEDA energy programs."""

    SOURCE_NAME = "pennsylvania_energy"
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
                self._log.debug("pa-energy index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("pa-energy detail failed", url=url, error=str(e))
        self._log.info("pa-energy scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)
        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None
        summary = ""
        for sel in ["main", ".main-content", "article", "#content"]:
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
            jurisdiction_name="Pennsylvania",
            managing_agency="Pennsylvania Department of Environmental Protection",
            agency_acronym="PA DEP",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"PA-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Pennsylvania Solar for Schools Grant Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Pennsylvania",
                managing_agency="Pennsylvania Department of Environmental Protection",
                agency_acronym="PA DEP",
                short_summary=(
                    "Provides up to $500,000 per project in grants to Pennsylvania K-12 "
                    "school districts and intermediate units for solar PV installations. "
                    "Awards cover up to 50% of project cost. Includes set-asides for "
                    "environmental justice areas and rural districts. Funded by the federal "
                    "Inflation Reduction Act and Pennsylvania state appropriations."
                ),
                detailed_summary=(
                    "Award structure\n"
                    "• Per-project cap: $500,000 (typical award $150K–$400K)\n"
                    "• Cost-share: up to 50% of eligible project costs\n"
                    "• Annual program budget: ~$25M (2024-2028 funding cycle)\n"
                    "• Cycles: 1-2 RFPs per year\n\n"
                    "Eligible applicants\n"
                    "• Pennsylvania public school districts (K-12)\n"
                    "• Intermediate units (IUs) and AVTS career-technical schools\n"
                    "• Charter schools and cyber charter schools\n"
                    "• Community colleges (some restrictions)\n\n"
                    "Eligible projects\n"
                    "• Rooftop solar PV systems\n"
                    "• Ground-mount solar PV (school-owned land)\n"
                    "• Solar canopy / parking-lot solar\n"
                    "• Battery energy storage paired with solar\n"
                    "• EV charging infrastructure paired with solar (limited)\n\n"
                    "Priority scoring\n"
                    "1. Districts in PA Environmental Justice Areas (per PA EJ mapping)\n"
                    "2. Rural districts and Title I-eligible LEAs\n"
                    "3. Districts with documented high energy intensity (>1.40 EUI)\n"
                    "4. Apprenticeship and prevailing wage commitments\n"
                    "5. Cost-effectiveness ($/kW awarded)\n\n"
                    "Stacking with federal credits (typical $400K rooftop project)\n"
                    "• PA Solar for Schools grant: $200,000 (50%)\n"
                    "• Federal §48 Direct Pay ITC (IRA elective payment for tax-exempts): 30% = $120K\n"
                    "• Federal §48 domestic content adder: +10% = $40K\n"
                    "• Federal §48 energy community adder (where applicable): +10% = $40K\n"
                    "District out-of-pocket can drop to $0–$40K on a $400K install."
                ),
                key_requirements=[
                    "Must be a Pennsylvania K-12 public school, IU, AVTS, or charter school",
                    "Project: solar PV (rooftop, ground-mount, or canopy), optionally with storage",
                    "Cost-share: up to 50% of eligible costs, max $500,000 per project",
                    "Application during open RFP cycle (1-2 per year, announced 60+ days in advance)",
                    "Stackable with federal §48 Direct Pay ITC + bonus adders for 80%+ total cost coverage",
                ],
                industry_categories=["Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=500000,
                source_url="https://www.dep.pa.gov/Citizens/EnergyAndClimate/Pages/Solar-for-Schools.aspx",
                program_code="PA-DEP-SOLAR-SCHOOLS",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Pennsylvania Energy Efficiency & Conservation Block Grant (EECBG) Pass-Through",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Pennsylvania",
                managing_agency="Pennsylvania Department of Environmental Protection",
                agency_acronym="PA DEP",
                short_summary=(
                    "Provides federal Energy Efficiency & Conservation Block Grant (EECBG) "
                    "funds to small Pennsylvania municipalities, counties, and tribes for "
                    "energy efficiency, renewable energy, and transportation projects. "
                    "Grants typically $50K-$250K per recipient. Applications open annually "
                    "via DEP. Coordinated with the federal DOE State Energy Program for "
                    "additional capacity."
                ),
                detailed_summary=(
                    "Program structure\n"
                    "EECBG is a federal formula grant administered by DOE's Office of State "
                    "and Community Energy Programs. PA receives ~$8M-$12M biennially and "
                    "passes most of it through to small local governments that don't qualify "
                    "for direct DOE EECBG awards (population under 35,000 / counties under 200K).\n\n"
                    "Eligible recipients\n"
                    "• Pennsylvania municipalities under 35,000 population\n"
                    "• Counties under 200,000 population\n"
                    "• Tribal governments\n"
                    "• Council of Governments (COGs) and regional planning bodies (limited)\n\n"
                    "Eligible projects\n"
                    "• Energy efficiency retrofits of municipal buildings (LED, HVAC, controls)\n"
                    "• Building envelope upgrades (insulation, windows)\n"
                    "• Solar PV on municipal facilities\n"
                    "• EV charging infrastructure (public-access only)\n"
                    "• LED street lighting conversions\n"
                    "• Energy audits and ASHRAE Level 1-2 assessments\n"
                    "• Energy management software / building automation\n\n"
                    "Award structure\n"
                    "• Typical award: $50,000–$250,000 per recipient\n"
                    "• Maximum award: $400,000\n"
                    "• Match requirement: 25% (cash or in-kind), waivable for distressed communities\n"
                    "• Annual application cycle, opens in spring\n\n"
                    "Application requirements\n"
                    "• Energy assessment or audit documentation\n"
                    "• Project scope, budget, and savings estimates\n"
                    "• Procurement plan (must follow PA municipal procurement rules)\n"
                    "• Resolution from the governing body authorizing the application\n"
                    "• Anti-lobbying and federal compliance certifications"
                ),
                key_requirements=[
                    "PA municipality (≤35K pop), county (≤200K pop), or tribal government",
                    "Project: building EE retrofit, municipal solar, EV charging, or LED street lighting",
                    "Match: 25% cash or in-kind (waivable for distressed communities)",
                    "Annual application cycle (spring open, fall awards)",
                    "Energy audit documentation required as part of application",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=400000,
                source_url="https://www.dep.pa.gov/Citizens/EnergyAndClimate/Pages/EECBG.aspx",
                program_code="PA-DEP-EECBG",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Act 129 Energy Efficiency — PECO/PPL/Duquesne Light/FirstEnergy Rebates",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Pennsylvania",
                managing_agency="Pennsylvania Public Utility Commission",
                agency_acronym="PA PUC",
                short_summary=(
                    "Pennsylvania Act 129 requires the state's seven largest electric "
                    "distribution companies (PECO, PPL, Duquesne Light, Met-Ed, Penelec, "
                    "Penn Power, West Penn Power) to deliver utility-funded efficiency "
                    "rebate programs. Coverage includes residential heat pump rebates "
                    "($300-$1,500), heat pump water heaters ($300-$700), smart thermostats "
                    "($50-$100), and commercial prescriptive + custom incentives."
                ),
                detailed_summary=(
                    "Phase IV (2021-2026) program scope\n"
                    "Each utility runs separate residential and C&I sub-programs. Common offers:\n\n"
                    "Residential heat pump rebates\n"
                    "• Air-source heat pump (ducted): $300-$1,500\n"
                    "• Cold-climate ASHP (PECO/PPL): $1,000-$1,800\n"
                    "• Ground-source/geothermal: $1,500-$2,500\n"
                    "• Heat pump water heater: $300-$700\n\n"
                    "Residential other\n"
                    "• ENERGY STAR smart thermostat: $50-$100\n"
                    "• Refrigerator/freezer recycling: $35-$50\n"
                    "• ENERGY STAR room AC: $25-$50\n"
                    "• ENERGY STAR dehumidifier: $25-$30\n\n"
                    "Income-qualified (LIURP — Low Income Usage Reduction Program)\n"
                    "• Free comprehensive home energy audit and weatherization\n"
                    "• Free heat pump installation (qualifying households)\n"
                    "• Hot water heater replacement, refrigerator replacement\n"
                    "• Eligibility: typically ≤150% Federal Poverty Level\n\n"
                    "Commercial & Industrial\n"
                    "• Prescriptive rebates: LED lighting, VFDs, HVAC, motors, refrigeration\n"
                    "• Custom incentives: $0.04-$0.07 per kWh of first-year savings\n"
                    "• Pre-approval required for projects > $25,000\n"
                    "• Free walk-through assessments for facilities > 50,000 sq ft\n\n"
                    "How to apply\n"
                    "Each utility runs its own portal. Find your utility:\n"
                    "• PECO Smart Ideas (peco.com/SmartIdeas)\n"
                    "• PPL E-Power (pplelectric.com/save-energy)\n"
                    "• Duquesne Light (DLCWattChoices.com)\n"
                    "• FirstEnergy/Met-Ed/Penelec/Penn Power/West Penn (energysavepa-home.com)\n\n"
                    "Stacking with federal credits (typical residential cold-climate heat pump)\n"
                    "• PA Act 129 utility rebate (PECO example): $1,500\n"
                    "• Federal §25C: 30% up to $2,000 = $2,000\n"
                    "• HEEHRA (income-qualified, post launch): up to $8,000\n"
                    "• Total potential savings: $3,500-$11,500 on a $10,000-$15,000 install"
                ),
                key_requirements=[
                    "Pennsylvania residential or commercial utility customer (PECO/PPL/Duquesne/FirstEnergy)",
                    "Equipment must meet program efficiency standards (ENERGY STAR or higher)",
                    "Each utility administers its own portal and rebate forms",
                    "Income-qualified (≤150% FPL) eligible for free LIURP weatherization",
                    "Commercial custom projects > $25K require pre-approval",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=2500,
                source_url="https://www.puc.pa.gov/electric/electricity-pa/act-129/",
                program_code="PA-PUC-ACT129",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="PEDA Alternative & Clean Energy Program (ACE) — Manufacturing & Industrial",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Pennsylvania",
                managing_agency="Pennsylvania Energy Development Authority",
                agency_acronym="PEDA",
                short_summary=(
                    "Provides grants and loans of up to $2 million for PA-based clean energy, "
                    "renewable energy manufacturing, alternative fuel infrastructure, and "
                    "industrial decarbonization projects. Administered by PEDA under the "
                    "Pennsylvania Department of Community and Economic Development (DCED). "
                    "Awards favor projects that create or retain Pennsylvania manufacturing jobs."
                ),
                detailed_summary=(
                    "Award structure\n"
                    "• Grants: up to $1,000,000 (cost-share typically 25-50%)\n"
                    "• Loans: up to $2,000,000 at below-market rates (term up to 10 years)\n"
                    "• Combined grant+loan packages possible for larger projects\n"
                    "• Annual program budget: $20M-$40M depending on appropriation\n\n"
                    "Eligible applicants\n"
                    "• PA-based for-profit businesses (LLC, S-Corp, C-Corp)\n"
                    "• Industrial development corporations (IDCs)\n"
                    "• Local governments (limited eligibility)\n"
                    "• Utilities (limited eligibility)\n\n"
                    "Eligible projects\n"
                    "• Solar/wind/biomass project development (utility-scale)\n"
                    "• Clean energy manufacturing (battery, solar panel, wind turbine components)\n"
                    "• Industrial decarbonization (electrification, heat recovery, hydrogen)\n"
                    "• Alternative fuel infrastructure (CNG, hydrogen, EV fleet charging)\n"
                    "• Combined heat & power (CHP) systems\n"
                    "• Energy storage (utility-scale and large-C&I)\n\n"
                    "Scoring criteria\n"
                    "1. Pennsylvania jobs created or retained (highest weight)\n"
                    "2. Capital investment leveraged ($ private + federal per $ state)\n"
                    "3. Energy production or savings (MWh, BTU, ton GHG abated)\n"
                    "4. Environmental justice / coal community impact\n"
                    "5. Project readiness (permits, site control, contractor selected)\n\n"
                    "Stacking strategy (typical $5M industrial decarb project)\n"
                    "• PEDA ACE grant: $1M (20%)\n"
                    "• PEDA ACE loan: $2M at 3% / 10-yr (40%)\n"
                    "• Federal §48C Advanced Energy Project Credit: 30% = $1.5M (after IRA)\n"
                    "• Federal §45X Advanced Manufacturing Production Credit (if eligible)\n"
                    "Project sponsor brings only $500K-$1M of own capital."
                ),
                key_requirements=[
                    "PA-based for-profit business, IDC, or qualifying public entity",
                    "Project: clean energy generation, manufacturing, decarbonization, or alt-fuel infrastructure",
                    "Grant cap $1M; loan cap $2M; combined packages available for large projects",
                    "Application during open RFP (typically 1-2 cycles per year)",
                    "Job creation/retention is highest-weighted scoring factor",
                ],
                industry_categories=["Clean Technology", "Manufacturing", "Energy Storage"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=2000000,
                source_url="https://dced.pa.gov/programs/alternative-clean-energy-program-ace/",
                program_code="PA-PEDA-ACE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Pennsylvania Driving PA Forward — Clean Diesel & EV Rebates",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Pennsylvania",
                managing_agency="Pennsylvania Department of Environmental Protection",
                agency_acronym="PA DEP",
                short_summary=(
                    "Provides rebates and grants under Pennsylvania's $118M Volkswagen "
                    "Environmental Mitigation Trust to replace older diesel vehicles with "
                    "cleaner alternatives and to deploy EV charging infrastructure. Covers "
                    "Class 8 trucks ($150K-$250K), school/transit buses ($150K-$320K), and "
                    "Level 2 / DC Fast Charging ($1.5K-$45K per port). Rolling applications."
                ),
                detailed_summary=(
                    "Vehicle replacement awards (Class 8 trucks)\n"
                    "• Diesel-to-diesel (newer engine): up to $40,000 per vehicle\n"
                    "• Diesel-to-CNG/propane: up to $90,000 per vehicle\n"
                    "• Diesel-to-EV (battery electric): up to $250,000 per vehicle\n"
                    "Eligible: trucks model year 1992-2009, Class 8 (heavy-duty), used for "
                    "commercial freight in PA.\n\n"
                    "School & transit bus replacement\n"
                    "• Diesel-to-newer diesel: up to $80,000 per bus\n"
                    "• Diesel-to-propane/CNG: up to $150,000 per bus\n"
                    "• Diesel-to-electric: up to $320,000 per bus\n"
                    "Eligible: school districts, transit agencies, public/private operators.\n\n"
                    "EV charging infrastructure\n"
                    "• Level 2 (workplace, multifamily, public): $1,500-$5,000 per port\n"
                    "• DC Fast Charging (≥50 kW): $25,000-$45,000 per port\n"
                    "• Bonus for sites in environmental justice areas: +20%\n"
                    "• Bonus for woman/minority/veteran-owned business sites: +10%\n"
                    "• Cost-share: 60-80% of equipment + installation cost\n\n"
                    "Eligible applicants for EV charging\n"
                    "• Local governments and tribal governments\n"
                    "• School districts\n"
                    "• Multifamily property owners\n"
                    "• Workplaces with 50+ employees (workplace charging)\n"
                    "• Private companies operating publicly-accessible chargers\n\n"
                    "Rolling applications\n"
                    "Applications accepted on a rolling basis until trust funds are exhausted. "
                    "DEP processes applications quarterly. Typical award decision: 60-120 days "
                    "from complete application. Equipment must be purchased and installed "
                    "within 12 months of award.\n\n"
                    "Stacking with federal funds\n"
                    "• Federal §30C Alternative Fuel Vehicle Refueling Property Credit: 30% up to $100K\n"
                    "• Federal Clean School Bus Program (EPA): up to $375K per bus\n"
                    "• Federal NEVI (National EV Infrastructure) for highway corridors: up to 80% match\n"
                    "Combined PA + federal can cover 80-100% of qualifying projects."
                ),
                key_requirements=[
                    "Vehicle replacement: Class 8 truck or school/transit bus, MY 1992-2009 diesel",
                    "EV charging: PA local govt, school district, multifamily, workplace ≥50 employees, or public operator",
                    "Equipment must be purchased and installed within 12 months of award",
                    "Bonus scoring for environmental justice areas and W/M/V-owned business sites",
                    "Rolling applications until VW trust funds exhausted (~$118M total)",
                ],
                industry_categories=["EV Charging", "Logistics", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=320000,
                source_url="https://www.dep.pa.gov/Citizens/GrantsLoansRebates/DrivingPAForward/Pages/default.aspx",
                program_code="PA-DEP-DRIVING-FORWARD",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
