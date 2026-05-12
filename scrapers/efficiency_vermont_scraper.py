"""
Efficiency Vermont Scraper
===========================
Scrapes the Efficiency Vermont program directory at:
  https://www.efficiencyvermont.com/

Efficiency Vermont is the United States' first statewide energy efficiency
utility, established in 2000 by the Vermont Public Utility Commission. It is
funded by an Energy Efficiency Charge on Vermont electric and natural gas
bills and is operated under a 20-year performance contract by VEIC, a
nonprofit. Vermont consistently ranks among the top 5 U.S. states for
energy efficiency program performance.

Quality
-------
- STATE jurisdiction / Vermont
- Mock mode: 5 realistic Efficiency Vermont fixtures (residential, commercial, ag, low-income, EV)
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

BASE = "https://www.efficiencyvermont.com"
INDEX_URLS = [
    f"{BASE}/rebates",
    f"{BASE}/services/business",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",       IncentiveType.GRANT),
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("commercial",  "Technology"),
    ("agriculture", "Agriculture"),
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


class EfficiencyVermontScraper(BaseScraper):
    """Scrapes Efficiency Vermont program listings."""

    SOURCE_NAME = "efficiency_vermont"
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
                            and any(seg in full for seg in ["/rebates", "/services", "/programs"])
                        ):
                            all_links.append(full)
            except Exception as e:
                self._log.debug("ev index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("ev detail failed", url=url, error=str(e))

        self._log.info("ev scraped", links=len(all_links), kept=len(results))
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
            jurisdiction_name="Vermont",
            managing_agency="Efficiency Vermont",
            agency_acronym="EV",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"EVT-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Efficiency Vermont — Cold Climate Heat Pump Rebate",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Vermont",
                managing_agency="Efficiency Vermont",
                agency_acronym="EVT",
                short_summary=(
                    "Rebates of up to $2,200 for Vermont homeowners installing qualifying "
                    "cold climate heat pump (ccHP) systems. Vermont's program is the gold "
                    "standard for cold-climate electrification: rebates apply to both ductless "
                    "mini-split and centrally-ducted whole-home systems. Income-qualified "
                    "households can receive up to $4,400 through Weatherization+Heat Pumps. "
                    "Stackable with the federal §25C credit."
                ),
                detailed_summary=(
                    "Rebate structure (whole-home / partial-home tiers)\n"
                    "• Single-zone ductless mini-split (whole-home replacement of fossil heating): "
                    "$700 per outdoor unit, up to $2,200\n"
                    "• Multi-zone ductless mini-split: $700 per outdoor unit, up to $2,100 (3 units)\n"
                    "• Centrally-ducted whole-home heat pump: $1,500-$2,200 depending on system size\n"
                    "• Air-to-water heat pumps: $1,200-$2,200 depending on capacity\n"
                    "Rebate doubles for income-qualified customers (≤80% Area Median Income).\n\n"
                    "Required performance specifications\n"
                    "All qualifying systems must meet Northeast Energy Efficiency Partnerships "
                    "(NEEP) cold-climate criteria:\n"
                    "• HSPF2 ≥ 8.5 (Region IV)\n"
                    "• Capacity at 5°F ≥ 70% of rated capacity\n"
                    "• COP at 5°F ≥ 1.75\n"
                    "Equipment must appear on the NEEP Cold-Climate Air-Source Heat Pump Specification list.\n\n"
                    "Installation requirements\n"
                    "• Installer must be a Heat Pump Network qualified contractor\n"
                    "• System must be sized using ACCA Manual J load calculation\n"
                    "• For whole-home rebates: ≥75% of home heated by the heat pump\n"
                    "• For partial-home rebates: meet minimum sized space coverage\n\n"
                    "Stacking with other programs\n"
                    "• Federal §25C Energy Efficient Home Improvement Credit: 30% of cost up to "
                    "$2,000 (heat pumps fall under the elevated heat pump sub-cap, not the $1,200 general cap)\n"
                    "• Vermont State Heat Pump Rebate (separate from EV): up to an additional $400\n"
                    "• Weatherize Vermont: stackable when paired with insulation/air sealing project\n"
                    "Maximum potential savings on a $12,000 ducted heat pump installation:\n"
                    "$2,200 (EV) + $400 (state) + $2,000 (federal) = $4,600 (~38% off)"
                ),
                key_requirements=[
                    "Must be a Vermont homeowner (or renter with landlord approval)",
                    "Equipment must meet NEEP cold-climate heat pump performance standards",
                    "Installer must be Heat Pump Network qualified",
                    "System must be sized using ACCA Manual J load calculation",
                    "Income-qualified households (≤80% AMI) receive doubled rebate amounts",
                ],
                industry_categories=["Energy Management", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=2200,
                source_url="https://www.efficiencyvermont.com/rebates/list/cold-climate-heat-pumps",
                program_code="EVT-COLD-CLIMATE-HP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Efficiency Vermont — Whole-Home Weatherization Incentive",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Vermont",
                managing_agency="Efficiency Vermont",
                agency_acronym="EVT",
                short_summary=(
                    "Provides up to $9,500 in incentives for Vermont homeowners and landlords "
                    "completing comprehensive home weatherization projects: insulation, air "
                    "sealing, duct sealing, and ventilation. Performance-based incentives reward "
                    "deeper energy savings. Income-qualified projects receive higher tiers. "
                    "Free pre- and post-installation energy assessments. Stackable with the "
                    "federal Energy Efficient Home Improvement Credit and HOMES rebates."
                ),
                detailed_summary=(
                    "Performance-based incentive structure\n"
                    "Incentives are tiered to modeled energy savings (estimated by an Efficiency "
                    "Vermont energy advisor using BPI building modeling tools):\n"
                    "• Standard track:\n"
                    "  - 10% modeled savings: $500\n"
                    "  - 20% modeled savings: $2,500\n"
                    "  - 30%+ modeled savings: $4,000\n"
                    "• Income-qualified track (≤80% AMI):\n"
                    "  - 10% savings: $1,500\n"
                    "  - 20% savings: $5,500\n"
                    "  - 30%+ savings: $9,500\n\n"
                    "What's covered\n"
                    "• Attic insulation (target R-49 to R-60)\n"
                    "• Wall insulation (target R-19 cavity insulation)\n"
                    "• Basement / crawlspace / rim joist insulation\n"
                    "• Air sealing (blower-door tested, target ≤4 ACH50)\n"
                    "• Duct sealing for forced-air systems\n"
                    "• Mechanical ventilation upgrades (HRV/ERV) for tightened homes\n\n"
                    "Process\n"
                    "1. Free Home Energy Visit by a BPI-certified Efficiency Vermont advisor\n"
                    "2. Energy advisor produces an Energy Improvement Plan with recommended scope, "
                    "modeled savings, and contractor estimates\n"
                    "3. Homeowner selects a Home Performance Network contractor\n"
                    "4. Project completed and quality-inspected by Efficiency Vermont\n"
                    "5. Incentive paid directly to homeowner OR applied as discount by contractor\n\n"
                    "Stacking\n"
                    "• Federal §25C credit: up to $1,200/year for insulation + air sealing\n"
                    "• Federal HOMES rebate (under HOMES Vermont, in implementation): potentially "
                    "stacks for additional $2,000-$4,000\n"
                    "• Vermont Heating Oil + Propane Conversion incentive: separate $500 rebate"
                ),
                key_requirements=[
                    "Must be a Vermont homeowner, landlord, or condo association",
                    "Project must use a Home Performance Network contractor",
                    "Pre-project Home Energy Visit (free) required to size incentive",
                    "Blower-door test required for air-sealing components",
                    "Income-qualified track requires household income ≤80% AMI",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=9500,
                source_url="https://www.efficiencyvermont.com/services/home-improvements/weatherization",
                program_code="EVT-WEATHERIZATION",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Efficiency Vermont — Business Energy Efficiency Incentive",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Vermont",
                managing_agency="Efficiency Vermont",
                agency_acronym="EVT",
                short_summary=(
                    "Provides custom and prescriptive incentives for Vermont businesses, "
                    "nonprofits, schools, and municipalities. Prescriptive rebates for LED, "
                    "HVAC, food service, and refrigeration equipment. Custom incentives "
                    "calculated at $0.06/kWh and $5.00/MMBtu of lifetime savings — among the "
                    "highest rates in the U.S. Free technical assistance, walk-through audits, "
                    "and ASHRAE Level 1-2 audits for facilities >25,000 sq ft."
                ),
                detailed_summary=(
                    "Incentive rates (among the highest in the country)\n"
                    "• Electric custom: $0.06 per kWh of lifetime energy savings, capped at "
                    "100% of incremental project cost\n"
                    "• Natural gas / fuel oil custom: $5.00 per MMBtu of lifetime savings\n"
                    "• Bonus: 10% additional incentive for projects in designated low- or "
                    "moderate-income communities\n"
                    "• Bonus: 5% additional for use of Vermont-headquartered contractors\n\n"
                    "Prescriptive rebates (no engineering review needed)\n"
                    "• LED tube replacements: $3-5 per lamp\n"
                    "• High-bay LED fixtures: $80-160 per fixture\n"
                    "• Variable frequency drives: $80 per HP\n"
                    "• Commercial heat pumps: $400-2,000 per ton\n"
                    "• Walk-in cooler/freezer ECM motors: $80-150 per motor\n"
                    "• Foodservice equipment (pizza ovens, fryers, dishwashers): $200-1,500/unit\n"
                    "• Anti-sweat heater controls: $200/unit\n\n"
                    "Free technical services\n"
                    "Efficiency Vermont assigns each business customer an Account Manager. "
                    "Free services include:\n"
                    "• Walk-through energy assessment for any size business\n"
                    "• ASHRAE Level 1-2 audit for facilities >25,000 sq ft\n"
                    "• Engineering studies (cost-shared 50%) for projects >$200,000\n"
                    "• Strategic Energy Management (SEM) coaching cohort program\n"
                    "• Procurement support for major equipment replacements\n\n"
                    "Project caps\n"
                    "• Single project: $300,000 incentive cap\n"
                    "• Annual customer cap: $600,000 across all projects\n"
                    "• Larger projects considered case-by-case via Efficiency Vermont's Strategic "
                    "Initiatives team"
                ),
                key_requirements=[
                    "Must be a Vermont business, nonprofit, school, or municipality",
                    "Custom projects require pre-approval before equipment purchase",
                    "Equipment must meet program technical specifications",
                    "Custom incentive cap: $300,000 per project, $600,000 per customer per year",
                    "Free walk-through assessment recommended before scoping major projects",
                ],
                industry_categories=["Energy Management", "Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=300000,
                source_url="https://www.efficiencyvermont.com/services/business",
                program_code="EVT-BIZ",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Efficiency Vermont — Income Eligible Weatherization (Free)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Vermont",
                managing_agency="Efficiency Vermont",
                agency_acronym="EVT",
                short_summary=(
                    "Provides 100% free home weatherization to Vermont households at or below "
                    "60% State Median Income. Coordinates with the federal Weatherization "
                    "Assistance Program (WAP) administered by Vermont's five Community Action "
                    "Agencies. Average value of services per home: $9,000-$12,000 — among the "
                    "highest per-household weatherization investment in the U.S. due to "
                    "Vermont's stringent cold-climate building requirements."
                ),
                detailed_summary=(
                    "Eligibility (2024 income limits, 60% Vermont SMI)\n"
                    "• 1 person: $40,584 / year\n"
                    "• 2 persons: $53,071 / year\n"
                    "• 3 persons: $65,557 / year\n"
                    "• 4 persons: $78,043 / year\n"
                    "• 5 persons: $90,529 / year\n"
                    "Renters are eligible with landlord approval; landlords typically co-fund "
                    "20-50% depending on the measure (e.g., 50% for window replacements).\n\n"
                    "Apply through your Community Action Agency\n"
                    "• Capstone Community Action — Central Vermont\n"
                    "• Champlain Valley Office of Economic Opportunity (CVOEO) — Chittenden County\n"
                    "• Northeast Kingdom Community Action (NEKCA) — Northeast Kingdom\n"
                    "• Southeast Vermont Community Action (SEVCA) — Southeast Vermont\n"
                    "• BROC Community Action — Rutland and Bennington Counties\n\n"
                    "Process\n"
                    "1. Apply at your local CAA office or online at heatfundvt.org\n"
                    "2. Free comprehensive home energy audit by a BPI-certified auditor\n"
                    "3. Approved measures installed at no cost — typically takes 30-60 days\n"
                    "4. Quality control inspection and post-work blower-door test\n\n"
                    "Typical measures delivered (avg $9,000-$12,000 per home)\n"
                    "• Air sealing — comprehensive blower-door directed sealing\n"
                    "• Attic insulation to R-60 (often blown cellulose)\n"
                    "• Wall insulation (dense-pack cellulose or spray foam where appropriate)\n"
                    "• Basement / crawlspace insulation and air sealing\n"
                    "• Duct sealing for forced-air systems\n"
                    "• Heating system tune-up or replacement (when existing fails health/safety)\n"
                    "• Hot water tank replacement (high-efficiency)\n"
                    "• LED lighting throughout home\n"
                    "• Health and safety: combustion safety testing, CO/smoke detectors, mold remediation"
                ),
                key_requirements=[
                    "Vermont household at or below 60% State Median Income",
                    "Apply through your Community Action Agency (5 statewide CAAs)",
                    "Renters eligible with landlord approval and co-funding",
                    "Free comprehensive energy audit, installation, and quality inspection",
                    "Typically takes 30-60 days from application to completion",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=12000,
                source_url="https://www.efficiencyvermont.com/services/home-improvements/income-eligible-services",
                program_code="EVT-INCOME-ELIGIBLE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Drive Electric Vermont — EV and EV Charger Incentives",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Vermont",
                managing_agency="Efficiency Vermont",
                agency_acronym="EVT",
                short_summary=(
                    "Drive Electric Vermont (operated jointly by Efficiency Vermont, the Vermont "
                    "Agency of Transportation, and Vermont utilities) provides incentives for new "
                    "and used EV purchases (up to $5,000) and Level 2 home EV chargers (up to "
                    "$500). Stackable with the federal §30D and §25E credits. Income-qualified "
                    "Vermonters can receive up to $7,500 in combined EV incentives."
                ),
                detailed_summary=(
                    "New EV purchase incentive\n"
                    "• Standard: $2,500 for BEVs, $1,500 for PHEVs (purchase or lease)\n"
                    "• Income-qualified (≤300% Federal Poverty Level): additional $2,500\n"
                    "Vehicle MSRP must be ≤$50,000 for sedans, ≤$70,000 for trucks/SUVs.\n\n"
                    "Used EV purchase incentive (Mileage Smart program)\n"
                    "• Standard: $2,500 toward used EV purchase from a dealer\n"
                    "• Income-qualified: $5,000 (up to 90% of vehicle cost)\n"
                    "Vehicle must be ≥2 model years old, priced ≤$25,000, and purchased from a "
                    "Vermont-licensed dealer.\n\n"
                    "Level 2 home charger rebate\n"
                    "• Up to $500 rebate (50% of equipment + installation cost)\n"
                    "• Must be ENERGY STAR-listed Level 2 EVSE\n"
                    "• Must be installed by a Vermont-licensed electrician\n"
                    "• Networked chargers eligible for additional utility-specific rebates "
                    "($75-$200 from Green Mountain Power, Burlington Electric Department, etc.)\n\n"
                    "Replace Your Ride (Income-Qualified)\n"
                    "Income-qualified Vermonters who scrap a 2015-or-older internal combustion "
                    "vehicle can receive an additional $5,000 incentive toward a new or used EV. "
                    "Combined with new-EV incentive: up to $10,000 for a new BEV.\n\n"
                    "Federal stacking (key examples)\n"
                    "• New BEV ($45K MSRP): $2,500 (DEV) + $5,000 (DEV income-qualified) + "
                    "$7,500 (federal §30D) = $15,000 total\n"
                    "• Used EV: $2,500 (DEV) + $4,000 (federal §25E, 30% up to cap) = $6,500\n"
                    "• Home charger: $500 (DEV) + $1,000 (federal §30C, 30% up to cap) + $200 "
                    "(utility) = $1,700 of a typical $2,500 install"
                ),
                key_requirements=[
                    "Must be a Vermont resident at time of vehicle purchase",
                    "New EV: MSRP cap $50K (sedans) / $70K (trucks/SUVs); BEV $2,500, PHEV $1,500",
                    "Used EV: ≥2 model years old, ≤$25K, dealer purchase, $2,500 standard rebate",
                    "Income-qualified (≤300% FPL): doubled rebates plus Replace Your Ride bonus",
                    "Home charger: $500 rebate, ENERGY STAR Level 2, licensed electrician install",
                ],
                industry_categories=["EV Charging", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=5000,
                source_url="https://www.driveelectricvt.com/incentives",
                program_code="EVT-DEV-INCENTIVES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
