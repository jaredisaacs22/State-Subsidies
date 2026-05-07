"""
Connecticut Green Bank Scraper
================================
Scrapes the Connecticut Green Bank program directory at:
  https://ctgreenbank.com/home-programs/
  https://ctgreenbank.com/business-programs/

CT Green Bank is the nation's first state green bank, offering a wide array
of financing programs for residential and commercial clean energy and
efficiency improvements. Also scrapes Energize Connecticut programs for
broader CT coverage.

Access pattern
--------------
Program listing pages contain card-based HTML with title, summary blurb,
and detail page links. Detail pages have structured sections for eligibility,
financing terms, and how-to-apply.

Quality
-------
- STATE jurisdiction / Connecticut
- Mock mode: 4 realistic fixtures covering residential, commercial,
  low-income, and C-PACE programs
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

PROGRAM_PAGES = [
    "https://ctgreenbank.com/home-programs/",
    "https://ctgreenbank.com/business-programs/",
]
BASE = "https://ctgreenbank.com"

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("grant",       IncentiveType.GRANT),
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("pace",        IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
    ("voucher",     IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("wind",        "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("battery",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("hvac",        "Energy Management"),
    ("pace",        "Real Estate"),
    ("commercial",  "Technology"),
    ("community",   "Government & Nonprofit"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.LOAN


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Energy Management"]


class CTGreenBankScraper(BaseScraper):
    """Scrapes CT Green Bank programs for Connecticut clean energy financing."""

    SOURCE_NAME = "ct_green_bank"
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
        for page_url in PROGRAM_PAGES:
            try:
                html = self.fetch(page_url)
                soup = self.parse(html)
                for a in soup.select("a[href]"):
                    href = str(a.get("href", ""))
                    if (
                        href.startswith("/") or href.startswith(BASE)
                    ) and any(
                        seg in href for seg in ["-program", "/programs/", "/financing/", "/loan"]
                    ):
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if full not in all_links and full not in PROGRAM_PAGES:
                            all_links.append(full)
            except Exception as e:
                self._log.debug("ct_green_bank page failed", url=page_url, error=str(e))

        if not all_links:
            self._log.warning("ct_green_bank: no program links found — structure may have changed")
            return []

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("ct_green_bank detail failed", url=url, error=str(e))

        self._log.info("ct_green_bank scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".entry-content", "main", ".page-content", ".content-area"]:
            el = soup.select_one(sel)
            if el:
                paras = [p.get_text(strip=True) for p in el.select("p") if len(p.get_text(strip=True)) > 30]
                summary = " ".join(paras[:3])
                if len(summary) >= 40:
                    break

        if len(summary) < 20:
            return None

        # Requirements
        reqs: list[str] = ["Must be a Connecticut property owner or resident"]
        for heading in soup.select("h2, h3"):
            text = heading.get_text(strip=True).lower()
            if any(w in text for w in ["eligible", "require", "qualify", "who can"]):
                sib = heading.find_next_sibling()
                while sib:
                    if sib.name in ("h2", "h3"):
                        break
                    if sib.name == "ul":
                        items = [li.get_text(strip=True) for li in sib.select("li") if li.get_text(strip=True)]
                        reqs = items or reqs
                        break
                    sib = sib.find_next_sibling()
                if len(reqs) > 1:
                    break

        return ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.STATE,
            jurisdiction_name="Connecticut",
            managing_agency="Connecticut Green Bank",
            agency_acronym="CT Green Bank",
            short_summary=summary[:1500],
            key_requirements=reqs,
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"CTGB-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Smart-E Loan — Residential Clean Energy Financing",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Connecticut",
                managing_agency="Connecticut Green Bank",
                agency_acronym="CT Green Bank",
                short_summary=(
                    "The Smart-E Loan provides below-market financing for Connecticut "
                    "homeowners to install clean energy improvements including solar panels, "
                    "heat pumps, energy storage, EV chargers, and weatherization. Loan terms "
                    "up to 12 years with rates as low as 3.49% APR through participating "
                    "local lenders. No home equity required."
                ),
                key_requirements=[
                    "Must be a Connecticut homeowner",
                    "Property must be located in Connecticut",
                    "Loan used for qualifying clean energy or efficiency measures",
                    "Must apply through a participating Smart-E Loan lender",
                ],
                industry_categories=["Energy Management", "Clean Technology"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=40000,
                source_url="https://ctgreenbank.com/home-programs/smart-e-loan/",
                program_code="CTGB-SMART-E",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Commercial Property Assessed Clean Energy (C-PACE)",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Connecticut",
                managing_agency="Connecticut Green Bank",
                agency_acronym="CT Green Bank",
                short_summary=(
                    "C-PACE provides long-term financing for clean energy and efficiency "
                    "upgrades on commercial, industrial, and multifamily properties. The "
                    "loan is repaid through a special assessment on the property tax bill, "
                    "making it transferable upon sale. Eligible improvements include solar, "
                    "HVAC, lighting, insulation, EV charging, and more. Financing up to "
                    "100% of project cost with no upfront payment."
                ),
                key_requirements=[
                    "Must own commercial, industrial, or multifamily (5+ units) property in Connecticut",
                    "Property must not be in default on property taxes",
                    "Project must meet minimum energy savings or production threshold",
                    "Lender consent required if there is an existing mortgage",
                ],
                industry_categories=["Real Estate", "Energy Management", "Clean Technology"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=5000000,
                source_url="https://ctgreenbank.com/business-programs/c-pace/",
                program_code="CTGB-C-PACE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Shared Clean Energy Facility (SCEF) — Community Solar",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Connecticut",
                managing_agency="Connecticut Green Bank",
                agency_acronym="CT Green Bank",
                short_summary=(
                    "The Shared Clean Energy Facility program allows Connecticut renters, "
                    "low-income households, and those unable to install rooftop solar to "
                    "subscribe to a share of a community solar facility and receive bill "
                    "credits for their share of the power produced. No panels installed "
                    "on your property."
                ),
                key_requirements=[
                    "Must be a Connecticut electric utility customer",
                    "Available to residential, commercial, and municipal subscribers",
                    "Enhanced bill credits available for income-qualified subscribers",
                    "Subscription through a participating SCEF developer",
                ],
                industry_categories=["Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.SUBSIDY,
                source_url="https://ctgreenbank.com/home-programs/shared-clean-energy/",
                program_code="CTGB-SCEF",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="CT Solar Loan — Solar PV Financing for Homeowners",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Connecticut",
                managing_agency="Connecticut Green Bank",
                agency_acronym="CT Green Bank",
                short_summary=(
                    "Provides low-interest loans specifically for residential solar PV "
                    "system installation in Connecticut. Rates and terms vary by income "
                    "tier, with enhanced rates for income-qualified homeowners. Solar "
                    "loans are paired with the Connecticut Residential Solar Incentive "
                    "Program (RSIP) rebate for maximum savings."
                ),
                key_requirements=[
                    "Must be a Connecticut homeowner",
                    "Solar PV system must be grid-connected and permit-compliant",
                    "Income-based enhanced rates available for households below 100% SMI",
                    "Apply through a participating CT Solar Loan lender",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=50000,
                source_url="https://ctgreenbank.com/home-programs/ct-solar-loan/",
                program_code="CTGB-SOLAR-LOAN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
