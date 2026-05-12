"""
New Jersey Clean Energy Program Scraper
=========================================
Scrapes the New Jersey Clean Energy Program (NJCEP) directory at:
  https://www.njcleanenergy.com/

NJCEP is New Jersey's statewide clean energy program administered by the
NJ Board of Public Utilities (NJBPU). Programs cover residential and
commercial energy efficiency, renewable energy, EV incentives, and
combined heat & power. NJ is a large Northeastern market with some of
the highest residential energy costs in the US.

Access pattern
--------------
Program pages are available at structured URLs. The main listing page
and per-program detail pages use consistent HTML. Several programs also
appear on the NJ BPU site (bpu.nj.gov) with overlapping URLs.

Quality
-------
- STATE jurisdiction / New Jersey
- Mock mode: 5 realistic NJCEP fixtures (residential, commercial, EV, CHP)
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

BASE = "https://www.njcleanenergy.com"
INDEX_URLS = [
    f"{BASE}/residential/home",
    f"{BASE}/commercial/home",
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
    ("renewable",   "Clean Technology"),
    ("wind",        "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("hvac",        "Energy Management"),
    ("chp",         "Energy Management"),
    ("combined heat","Energy Management"),
    ("commercial",  "Technology"),
    ("community",   "Government & Nonprofit"),
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


class NJCleanEnergyScraper(BaseScraper):
    """Scrapes NJ Clean Energy Program listings for New Jersey incentives."""

    SOURCE_NAME = "nj_clean_energy"
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
                    if (
                        href.startswith("/") or href.startswith(BASE)
                    ) and "/home" not in href and len(href) > 3:
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if full not in all_links and BASE in full:
                            all_links.append(full)
            except Exception as e:
                self._log.debug("njcep index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("njcep detail failed", url=url, error=str(e))

        self._log.info("njcep scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".field-items", "main", ".main-content", "#content"]:
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
            jurisdiction_name="New Jersey",
            managing_agency="New Jersey Clean Energy Program",
            agency_acronym="NJCEP",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"NJCEP-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="NJ Home Performance with ENERGY STAR",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New Jersey",
                managing_agency="New Jersey Clean Energy Program",
                agency_acronym="NJCEP",
                short_summary=(
                    "Provides rebates to New Jersey homeowners for comprehensive whole-home "
                    "energy efficiency upgrades. A certified Home Performance contractor "
                    "conducts a diagnostic assessment, then performs improvements such as "
                    "insulation, air sealing, HVAC upgrades, and duct sealing. Rebates are "
                    "based on the amount of energy savings achieved, up to $4,000 per project."
                ),
                key_requirements=[
                    "Must be a New Jersey homeowner (primary residence)",
                    "Must use a certified Home Performance with ENERGY STAR contractor",
                    "Pre- and post-assessment required to quantify energy savings",
                    "Rebate based on energy savings achieved (not just measures installed)",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=4000,
                source_url="https://www.njcleanenergy.com/residential/programs/home-performance-energy-star",
                program_code="NJCEP-HP-ESTAR",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="NJ Clean Energy Renewable Energy Incentive Program (REIP)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New Jersey",
                managing_agency="New Jersey Clean Energy Program",
                agency_acronym="NJCEP",
                short_summary=(
                    "Provides incentives for the installation of small residential renewable "
                    "energy systems including solar photovoltaic, solar hot water, and small "
                    "wind turbines. Incentives are available through the NJ Solar Incentive "
                    "Program and can be combined with the federal Residential Clean Energy "
                    "Credit (§25D). New Jersey also has one of the best net metering programs "
                    "in the country."
                ),
                key_requirements=[
                    "Must be a New Jersey homeowner",
                    "System must be installed by a licensed NJ electrical contractor",
                    "Solar system must be connected to the utility grid",
                    "Eligible technologies: solar PV, solar hot water, small wind",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                source_url="https://www.njcleanenergy.com/renewable-energy/programs/renewable-energy-incentive-program",
                program_code="NJCEP-REIP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="NJ EV Charger Incentive for Residential Customers",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New Jersey",
                managing_agency="New Jersey Clean Energy Program",
                agency_acronym="NJCEP",
                short_summary=(
                    "Provides rebates to New Jersey residents for purchasing and installing "
                    "Level 2 EV charging equipment at their home. Rebate of up to $500 for "
                    "qualifying ENERGY STAR-listed Level 2 chargers. Program complements "
                    "the federal EV charger tax credit (§30C) for additional savings. "
                    "Available to utility customers of participating NJ utilities."
                ),
                key_requirements=[
                    "Must be a New Jersey residential customer of a participating utility",
                    "Must purchase and install a qualifying ENERGY STAR Level 2 EV charger",
                    "Must have or plan to have an EV or PHEV",
                    "Installation must be performed by a licensed electrician",
                ],
                industry_categories=["EV Charging"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=500,
                source_url="https://www.njcleanenergy.com/residential/programs/ev-charger-incentives",
                program_code="NJCEP-EV-CHARGER",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="NJ Direct Install Program — Small Business Energy Efficiency",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New Jersey",
                managing_agency="New Jersey Clean Energy Program",
                agency_acronym="NJCEP",
                short_summary=(
                    "Provides free energy efficiency improvements to qualified small "
                    "businesses and nonprofits in New Jersey. A program-approved contractor "
                    "installs LED lighting, programmable thermostats, and HVAC controls "
                    "at no cost. Typical projects save 20-30% on energy bills. Businesses "
                    "with annual energy bills under $300,000 are generally eligible."
                ),
                key_requirements=[
                    "New Jersey-based small business or nonprofit",
                    "Annual energy bill must generally be under $300,000",
                    "Must be a customer of a participating NJ utility",
                    "Must allow a site assessment by a program-approved contractor",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://www.njcleanenergy.com/commercial-industrial/programs/direct-install",
                program_code="NJCEP-DIRECT-INSTALL",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="NJ Large Energy Users Program (LEUP) — C&I Incentives",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New Jersey",
                managing_agency="New Jersey Clean Energy Program",
                agency_acronym="NJCEP",
                short_summary=(
                    "Provides custom incentives to large commercial and industrial facilities "
                    "undertaking major energy efficiency projects. Incentives are based on "
                    "kWh and BTU savings achieved and can reach $1 million or more for "
                    "qualifying projects. Covers HVAC, lighting, motors, compressed air, "
                    "process improvements, and building envelope upgrades."
                ),
                key_requirements=[
                    "Must be a commercial or industrial customer of a participating NJ utility",
                    "Annual electricity usage typically above 100,000 kWh",
                    "Project must undergo M&V (Measurement and Verification) to confirm savings",
                    "Application must be submitted before project begins",
                ],
                industry_categories=["Energy Management", "Manufacturing"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=1000000,
                source_url="https://www.njcleanenergy.com/commercial-industrial/programs/large-energy-users-program",
                program_code="NJCEP-LEUP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
