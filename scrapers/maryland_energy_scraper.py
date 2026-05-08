"""
Maryland Energy Administration Scraper
=======================================
Scrapes the Maryland Energy Administration (MEA) program directory at:
  https://energy.maryland.gov/

MEA administers Maryland's energy efficiency, renewable energy, and clean
transportation incentives. Programs are funded through the EmPOWER Maryland
Energy Efficiency Act, Regional Greenhouse Gas Initiative (RGGI) proceeds,
and federal formula grants. Maryland is a Mid-Atlantic market with strong
renewable portfolio standards (RPS) and aggressive 2035 clean energy goals.

Quality
-------
- STATE jurisdiction / Maryland
- Mock mode: 5 realistic MEA fixtures (residential, commercial, EV, solar, grants)
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

BASE = "https://energy.maryland.gov"
INDEX_URLS = [
    f"{BASE}/pages/home.aspx",
    f"{BASE}/residential/pages/default.aspx",
    f"{BASE}/business/pages/default.aspx",
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
    ("renewable",   "Clean Technology"),
    ("wind",        "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("battery",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("hvac",        "Energy Management"),
    ("empower",     "Energy Management"),
    ("commercial",  "Technology"),
    ("agriculture", "Agriculture"),
    ("nonprofit",   "Government & Nonprofit"),
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


class MarylandEnergyScraper(BaseScraper):
    """Scrapes Maryland Energy Administration program listings."""

    SOURCE_NAME = "maryland_energy"
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
                            and "pages" in full.lower()
                            and full not in INDEX_URLS
                        ):
                            all_links.append(full)
            except Exception as e:
                self._log.debug("mea index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("mea detail failed", url=url, error=str(e))

        self._log.info("mea scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".siteContent", "main", "#content", ".ms-rtestate-field"]:
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
            jurisdiction_name="Maryland",
            managing_agency="Maryland Energy Administration",
            agency_acronym="MEA",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"MEA-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Maryland EmPOWER — Residential Energy Efficiency Rebates",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Maryland",
                managing_agency="Maryland Energy Administration",
                agency_acronym="MEA",
                short_summary=(
                    "The EmPOWER Maryland program provides rebates to residential customers "
                    "of BGE, Pepco, Delmarva Power, and other Maryland utilities for "
                    "qualifying energy efficiency upgrades. Covers heat pumps, heat pump "
                    "water heaters, smart thermostats, insulation, air sealing, and LED "
                    "lighting. Enhanced incentives available for income-qualified households "
                    "through the EmPOWER Low-Income Energy Efficiency Program (LIEEP)."
                ),
                key_requirements=[
                    "Must be a residential customer of a participating Maryland utility",
                    "Equipment must meet minimum efficiency ratings (ENERGY STAR or higher)",
                    "Application must be submitted within 90 days of installation",
                    "Income-qualified households may be eligible for enhanced LIEEP rebates",
                    "Must use an approved contractor for HVAC and insulation measures",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=2000,
                source_url="https://energy.maryland.gov/residential/pages/empower_maryland.aspx",
                program_code="MEA-EMPOWER-RES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Maryland Residential Clean Energy Grant Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Maryland",
                managing_agency="Maryland Energy Administration",
                agency_acronym="MEA",
                short_summary=(
                    "Provides grants to Maryland homeowners for installing qualifying solar "
                    "photovoltaic, solar water heating, geothermal heat pump, and small wind "
                    "systems. Grant amounts are $1,000 for solar water heating, $3,000 for "
                    "geothermal heat pumps, and vary for solar PV based on system size. "
                    "Can be combined with the federal Residential Clean Energy Credit (§25D). "
                    "Funded through RGGI (Regional Greenhouse Gas Initiative) proceeds."
                ),
                key_requirements=[
                    "Must be a Maryland homeowner (primary or secondary residence)",
                    "System must be installed by a licensed Maryland contractor",
                    "Solar PV systems must be grid-connected and net-metered",
                    "Application must be submitted within 12 months of installation",
                    "Geothermal systems must meet minimum COP/EER efficiency standards",
                ],
                industry_categories=["Clean Technology", "Energy Management"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=3000,
                source_url="https://energy.maryland.gov/residential/pages/incentives_for_clean_energy.aspx",
                program_code="MEA-RES-CLEAN-ENERGY",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Maryland Electric Vehicle Supply Equipment (EVSE) Rebate",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Maryland",
                managing_agency="Maryland Energy Administration",
                agency_acronym="MEA",
                short_summary=(
                    "Provides rebates to Maryland residents and businesses for purchasing "
                    "and installing Level 2 EV charging equipment. Residential rebate: up "
                    "to $700 (40% of cost). Commercial/multifamily rebate: up to $4,000 "
                    "per port (40% of cost). Complements the federal §30C EV charger tax "
                    "credit. Applications accepted on a first-come, first-served basis "
                    "while funding lasts each fiscal year."
                ),
                key_requirements=[
                    "Must be a Maryland resident or business owner",
                    "Charger must be a qualifying Level 2 EVSE (ENERGY STAR listed preferred)",
                    "Residential: up to $700 (40% of purchase and installation cost)",
                    "Commercial/multifamily: up to $4,000 per port (40% of cost)",
                    "Application must be submitted within 6 months of installation",
                ],
                industry_categories=["EV Charging"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=4000,
                source_url="https://energy.maryland.gov/transportation/pages/ev_charging.aspx",
                program_code="MEA-EVSE-REBATE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Maryland Energy Storage Income Tax Credit",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Maryland",
                managing_agency="Maryland Energy Administration",
                agency_acronym="MEA",
                short_summary=(
                    "Maryland's Energy Storage Income Tax Credit provides a 30% state income "
                    "tax credit (up to $5,000 for residential, up to $75,000 for commercial) "
                    "for installing battery storage systems. Available to residential and "
                    "commercial taxpayers. Systems must be at least 3 kWh capacity and "
                    "installed at a Maryland property. Total annual program cap of $750,000; "
                    "applications processed first-come, first-served."
                ),
                key_requirements=[
                    "System must be installed at a Maryland residential or commercial property",
                    "Battery storage capacity must be at least 3 kWh",
                    "Residential credit: 30% of cost, up to $5,000",
                    "Commercial credit: 30% of cost, up to $75,000",
                    "Annual program cap applies; apply early each fiscal year",
                ],
                industry_categories=["Energy Storage", "Clean Technology"],
                incentive_type=IncentiveType.TAX_CREDIT,
                funding_amount=5000,
                source_url="https://energy.maryland.gov/residential/pages/energy_storage_tax_credit.aspx",
                program_code="MEA-STORAGE-TAX-CREDIT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Maryland Jane E. Lawton Conservation Loan Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Maryland",
                managing_agency="Maryland Energy Administration",
                agency_acronym="MEA",
                short_summary=(
                    "Provides low-interest loans to Maryland local governments, nonprofits, "
                    "and public school systems for energy efficiency projects and renewable "
                    "energy installations. Loan amounts from $50,000 to $5 million at "
                    "below-market interest rates. Projects must reduce energy consumption "
                    "and demonstrate cost-effectiveness. Eligible projects include HVAC "
                    "upgrades, LED lighting, building envelope improvements, and solar PV."
                ),
                key_requirements=[
                    "Applicant must be a Maryland local government, school system, or 501(c)(3) nonprofit",
                    "Minimum loan: $50,000; maximum loan: $5,000,000",
                    "Project must achieve measurable energy savings",
                    "Simple payback period must be demonstrated in application",
                    "Loan secured by project energy savings or other collateral",
                ],
                industry_categories=["Energy Management", "Government & Nonprofit"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=5000000,
                source_url="https://energy.maryland.gov/business/pages/lawton_loan.aspx",
                program_code="MEA-LAWTON-LOAN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
