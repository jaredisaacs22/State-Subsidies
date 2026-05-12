"""
Oregon Energy Trust Scraper
============================
Scrapes the Oregon Energy Trust (OET) program directory at:
  https://www.energytrust.org/

Oregon Energy Trust is an independent nonprofit that manages energy efficiency
and renewable energy programs for Oregon utility customers of Pacific Power,
Portland General Electric, NW Natural, and Cascade Natural Gas. It is one of
the most active state-level clean energy program administrators in the Pacific NW.

Programs cover residential and commercial efficiency, solar, storage, EV, and
agriculture. Oregon also has a statewide Residential Energy Tax Credit program.

Quality
-------
- STATE jurisdiction / Oregon
- Mock mode: 5 realistic OET fixtures (residential, commercial, solar, ag, EV)
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

BASE = "https://www.energytrust.org"
INDEX_URLS = [
    f"{BASE}/residential/",
    f"{BASE}/businesses/",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("cash incentive",  IncentiveType.POINT_OF_SALE_REBATE),
    ("rebate",          IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",       IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",           IncentiveType.GRANT),
    ("loan",            IncentiveType.LOAN),
    ("financing",       IncentiveType.LOAN),
    ("tax credit",      IncentiveType.TAX_CREDIT),
    ("voucher",         IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",           "Clean Technology"),
    ("renewable",       "Clean Technology"),
    ("storage",         "Energy Storage"),
    ("battery",         "Energy Storage"),
    ("electric veh",    "EV Charging"),
    ("ev ",             "EV Charging"),
    ("heat pump",       "Energy Management"),
    ("efficiency",      "Energy Management"),
    ("weatheriz",       "Energy Management"),
    ("insulation",      "Energy Management"),
    ("hvac",            "Energy Management"),
    ("lighting",        "Energy Management"),
    ("agriculture",     "Agriculture"),
    ("irrigation",      "Agriculture"),
    ("commercial",      "Technology"),
    ("industrial",      "Manufacturing"),
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


class OregonEnergyTrustScraper(BaseScraper):
    """Scrapes Oregon Energy Trust program listings."""

    SOURCE_NAME = "oregon_energy_trust"
    BASE_URL = BASE

    def __init__(self, mock: bool = False, max_programs: int = 60):
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
                            and any(seg in full for seg in ["/programs/", "/incentives/", "/rebates/", "/solutions/"])
                        ):
                            all_links.append(full)
            except Exception as e:
                self._log.debug("oet index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("oet detail failed", url=url, error=str(e))

        self._log.info("oet scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".entry-content", ".page-content", "main", "#content"]:
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
            jurisdiction_name="Oregon",
            managing_agency="Oregon Energy Trust",
            agency_acronym="OET",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"OET-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Oregon Energy Trust — Residential Heat Pump Cash Incentive",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Oregon",
                managing_agency="Oregon Energy Trust",
                agency_acronym="OET",
                short_summary=(
                    "Provides cash incentives to Oregon residential customers of Pacific Power "
                    "or Portland General Electric for installing qualifying heat pump systems. "
                    "Incentives up to $1,500 for ducted heat pumps and up to $1,000 for "
                    "ductless mini-split systems, depending on efficiency rating and utility. "
                    "Must be installed by a Trade Ally contractor. Income-qualified customers "
                    "may be eligible for enhanced incentives through the Income Qualified program."
                ),
                key_requirements=[
                    "Must be a residential customer of Pacific Power or Portland General Electric",
                    "Heat pump must meet minimum efficiency requirements (HSPF/SEER thresholds)",
                    "Must use an Oregon Energy Trust Trade Ally contractor",
                    "Application must be submitted within 90 days of installation",
                    "Income-qualified households may receive enhanced incentive amounts",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=1500,
                source_url="https://www.energytrust.org/residential/incentives/heat-pumps/",
                program_code="OET-RES-HEAT-PUMP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Oregon Energy Trust — Solar Electric (PV) Incentive Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Oregon",
                managing_agency="Oregon Energy Trust",
                agency_acronym="OET",
                short_summary=(
                    "Offers cash incentives to Oregon homeowners for installing grid-connected "
                    "solar photovoltaic systems. Incentive is $0.25 per watt of installed "
                    "capacity, up to $2,400 per system. Can be combined with the federal "
                    "Residential Clean Energy Credit (§25D) for maximum savings. Systems must "
                    "be installed by an Oregon Energy Trust Solar Trade Ally and meet minimum "
                    "quality and equipment standards."
                ),
                key_requirements=[
                    "Must be a customer of Pacific Power or Portland General Electric",
                    "Solar PV system must be grid-connected and permit-compliant",
                    "Must use an Oregon Energy Trust Solar Trade Ally contractor",
                    "System must meet minimum panel efficiency and inverter requirements",
                    "Incentive: $0.25/watt, up to $2,400 maximum per residential system",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=2400,
                source_url="https://www.energytrust.org/residential/incentives/solar-electricity/",
                program_code="OET-RES-SOLAR-PV",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Oregon Energy Trust — Small Business Direct Install",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Oregon",
                managing_agency="Oregon Energy Trust",
                agency_acronym="OET",
                short_summary=(
                    "Provides free energy efficiency upgrades to qualifying small commercial "
                    "and nonprofit customers in Oregon. A program-approved contractor assesses "
                    "the facility and installs LED lighting, occupancy sensors, and other "
                    "low-cost measures at no charge. Businesses with annual energy bills under "
                    "$30,000 are typically eligible. Projects typically save 15-25% on lighting "
                    "and plug load energy costs."
                ),
                key_requirements=[
                    "Must be a commercial or nonprofit customer of Pacific Power or PGE",
                    "Annual electricity bill generally must be under $30,000",
                    "Must allow a site assessment and installation by a program contractor",
                    "Tenant customers must have landlord permission for installations",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://www.energytrust.org/businesses/solutions/direct-install/",
                program_code="OET-BIZ-DIRECT-INSTALL",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Oregon Energy Trust — Agriculture Energy Efficiency Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Oregon",
                managing_agency="Oregon Energy Trust",
                agency_acronym="OET",
                short_summary=(
                    "Provides cash incentives and technical assistance to Oregon agricultural "
                    "operations for energy efficiency improvements. Covers irrigation pump "
                    "efficiency upgrades, variable frequency drives (VFDs), lighting, HVAC, "
                    "cold storage, and grain drying improvements. Custom project incentives "
                    "available for larger operations based on verified kWh savings. Free energy "
                    "assessments available to all agricultural customers."
                ),
                key_requirements=[
                    "Must be an agricultural customer of Pacific Power or Portland General Electric",
                    "Qualifying measures: irrigation pumps, VFDs, lighting, cold storage equipment",
                    "Custom incentives require pre-approval and post-installation verification",
                    "Free energy assessment available before project to estimate incentive amount",
                ],
                industry_categories=["Agriculture", "Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                source_url="https://www.energytrust.org/businesses/agriculture/",
                program_code="OET-AG-EFFICIENCY",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Oregon Energy Trust — Home Energy Score & Weatherization Incentives",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Oregon",
                managing_agency="Oregon Energy Trust",
                agency_acronym="OET",
                short_summary=(
                    "Provides cash incentives for whole-home weatherization improvements "
                    "including insulation, air sealing, duct sealing, and window upgrades. "
                    "A Home Energy Score assessment (up to $100 incentive) identifies the "
                    "best efficiency upgrades for the home. Rebates for attic insulation up "
                    "to $600, wall insulation up to $800, and air sealing up to $300. "
                    "Can be combined with heat pump and water heater incentives."
                ),
                key_requirements=[
                    "Must be a residential customer of Pacific Power or Portland General Electric",
                    "Improvements must be installed by an OET Trade Ally contractor",
                    "Home must be the customer's primary or secondary Oregon residence",
                    "Insulation must meet minimum R-value requirements per measure",
                    "Home Energy Score assessment recommended before larger projects",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=800,
                source_url="https://www.energytrust.org/residential/incentives/insulation-and-weatherization/",
                program_code="OET-RES-WEATHERIZATION",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
