"""
USDA Rural Development Scraper
================================
Scrapes the USDA Rural Development program directory at:
  https://www.rd.usda.gov/programs-services/all-programs

USDA RD runs ~50 core programs across housing, business, utilities, and
community facilities — available to rural residents and businesses in
all 50 states. Adds our first substantial non-energy, non-CA coverage.

Access pattern
--------------
The /all-programs page lists every active RD program as a set of
section headings + anchor links. Each link resolves to a per-program
detail page with consistent HTML structure:
  - <h1> → title
  - .field-items > .field-item → summary paragraphs
  - .view-display-id-block_program_details → eligible populations, rates, max amounts

Quality
-------
- Federal jurisdiction (FEDERAL / United States)
- Type inferred from program title (Loan, Grant, Guarantee)
- Funding amounts extracted from max loan/grant ceilings in the detail page
- Mock mode: 5 realistic fixtures covering major RD programs

This scraper runs after Grants.gov in the scheduler. Both emit FEDERAL
jurisdiction, but RD programs target rural audiences specifically —
the "Eligible sectors / rural" tag surfaces them to the right users.
"""

from __future__ import annotations

import re
from datetime import datetime
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

BASE = "https://www.rd.usda.gov"
INDEX_URL = f"{BASE}/programs-services/all-programs"

# keyword → type mapping (checked against downcased title)
TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("grant",     IncentiveType.GRANT),
    ("tax credit",IncentiveType.TAX_CREDIT),
    ("loan",      IncentiveType.LOAN),
    ("guarantee", IncentiveType.LOAN),
    ("voucher",   IncentiveType.VOUCHER),
    ("rebate",    IncentiveType.POINT_OF_SALE_REBATE),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("energy",          "Energy Management"),
    ("solar",           "Clean Technology"),
    ("biogas",          "Clean Technology"),
    ("renewable",       "Clean Technology"),
    ("electric",        "EV Charging"),
    ("housing",         "Real Estate"),
    ("home",            "Real Estate"),
    ("homeownership",   "Real Estate"),
    ("water",           "Water & Utilities"),
    ("wastewater",      "Water & Utilities"),
    ("broadband",       "Telecommunications"),
    ("telecommun",      "Telecommunications"),
    ("business",        "Technology"),
    ("industry",        "Manufacturing"),
    ("manufacturing",   "Manufacturing"),
    ("agricultural",    "Agriculture"),
    ("farm",            "Agriculture"),
    ("community",       "Government & Nonprofit"),
    ("health",          "Healthcare"),
    ("hospital",        "Healthcare"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.LOAN  # USDA RD defaults to loan programs


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Government & Nonprofit"]


def _extract_funding(text: str) -> Optional[float]:
    """Pull the largest dollar amount from a text block."""
    matches = re.findall(r"\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion))?", text, re.I)
    best: Optional[float] = None
    for m in matches:
        raw = m.lstrip("$").replace(",", "")
        factor = 1.0
        if "billion" in m.lower():
            factor = 1_000_000_000
        elif "million" in m.lower():
            factor = 1_000_000
        try:
            val = float(re.sub(r"(?i)(million|billion)", "", raw).strip()) * factor
            if best is None or val > best:
                best = val
        except ValueError:
            pass
    return best


class USDAFuralDevelopmentScraper(BaseScraper):
    """Scrapes USDA Rural Development program listings."""

    SOURCE_NAME = "usda_rural_development"
    BASE_URL = INDEX_URL

    def __init__(self, mock: bool = False, max_programs: int = 100):
        super().__init__()
        self.mock = mock
        self.max_programs = max_programs

    def scrape(self) -> list[ScrapedIncentive]:
        if self.mock:
            return self._mock_results()
        return self._scrape_live()

    def _scrape_live(self) -> list[ScrapedIncentive]:
        try:
            html = self.fetch(INDEX_URL)
        except Exception as e:
            self._log.warning("usda_rd index fetch failed", error=str(e))
            return []

        soup = self.parse(html)
        program_links: list[str] = []

        # The all-programs page organises links under section headings.
        # Collect all <a> tags under the main content area whose href
        # starts with /programs-services/ (excludes nav links).
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            if href.startswith("/programs-services/") and href != "/programs-services/all-programs":
                full = f"{BASE}{href}"
                if full not in program_links:
                    program_links.append(full)

        if not program_links:
            self._log.warning("usda_rd: no program links found — index page structure may have changed")
            return []

        results: list[ScrapedIncentive] = []
        for url in program_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("usda_rd detail failed", url=url, error=str(e))
        self._log.info("usda_rd scraped", links=len(program_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1")
        if len(title) < 5:
            return None

        # Summary from the first 3 <p> tags in the main content area
        summary = ""
        for selector in [".field-items", ".layout-container", "main", "#main-content"]:
            if soup.select_one(selector):
                summary = self.extract_paragraphs(soup, selector)
                break
        if len(summary) < 20:
            summary = self.extract_text(soup, "meta[name='description']")

        if len(summary) < 20:
            return None

        funding = _extract_funding(html)
        inc_type = _infer_type(title, summary)
        industries = _infer_industries(title, summary)

        # Build requirements from common RD detail blocks
        reqs: list[str] = ["Must be located in a rural area as defined by USDA Rural Development"]
        detail_text = soup.get_text(" ", strip=True)
        if "income" in detail_text.lower():
            reqs.append("Income limits may apply — see program details")
        if "citizen" in detail_text.lower() or "legal" in detail_text.lower():
            reqs.append("Applicant must be a U.S. citizen or qualified alien")
        if "matching" in detail_text.lower():
            reqs.append("Matching funds may be required — see program details")

        return ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.FEDERAL,
            jurisdiction_name="United States",
            managing_agency="U.S. Department of Agriculture",
            agency_acronym="USDA",
            short_summary=summary[:1500],
            key_requirements=reqs,
            industry_categories=industries,
            incentive_type=inc_type,
            funding_amount=funding,
            source_url=url,
            program_code=f"USDA-RD-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Rural Energy for America Program (REAP) Renewable Energy & Energy Efficiency",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Agriculture",
                agency_acronym="USDA",
                short_summary=(
                    "Provides guaranteed loan financing and grant funding to agricultural "
                    "producers and rural small businesses for renewable energy systems or to "
                    "make energy efficiency improvements. Priority is given to projects with "
                    "the greatest potential for energy savings and applicants who have not "
                    "previously received a REAP grant. Grant amounts range from $2,500 to "
                    "$500,000; loan guarantees up to $25 million."
                ),
                key_requirements=[
                    "Must be located in a rural area as defined by USDA Rural Development",
                    "Applicant must be an agricultural producer or rural small business",
                    "Project must be in the United States, its territories, or DC",
                    "Grant recipients must have matching funds for at least 75% of project cost",
                ],
                industry_categories=["Clean Technology", "Energy Management", "Agriculture"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=500000,
                source_url="https://www.rd.usda.gov/programs-services/energy-programs/rural-energy-america-program-renewable-energy-systems-energy-efficiency-improvement-guaranteed-loans",
                program_code="USDA-RD-REAP",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Single Family Housing Direct Home Loans — Section 502",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Agriculture",
                agency_acronym="USDA",
                short_summary=(
                    "Provides payment assistance to low- and very-low-income applicants "
                    "to help them obtain decent, safe, and sanitary housing in eligible "
                    "rural areas. Payment assistance is a type of subsidy that reduces "
                    "the mortgage payment for a short time. Applicants must be without "
                    "decent, safe, and sanitary housing and be unable to obtain a loan "
                    "from other credit sources at affordable terms."
                ),
                key_requirements=[
                    "Must be located in a rural area as defined by USDA Rural Development",
                    "Applicant must be a U.S. citizen or qualified alien",
                    "Applicant income must not exceed 80% of the area median income",
                    "Must be unable to obtain credit from other sources at reasonable terms",
                ],
                industry_categories=["Real Estate"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=700000,
                source_url="https://www.rd.usda.gov/programs-services/single-family-housing-programs/single-family-housing-direct-home-loans",
                program_code="USDA-RD-502",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Business & Industry Loan Guarantees",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Agriculture",
                agency_acronym="USDA",
                short_summary=(
                    "Bolsters the availability of private credit by guaranteeing loans for "
                    "rural businesses and those creating jobs in rural communities. "
                    "Guarantee rates up to 80% with loan amounts up to $25 million "
                    "(up to $40M for innovative energy companies). Eligible uses include "
                    "real estate, equipment purchase, debt refinancing, and working capital."
                ),
                key_requirements=[
                    "Must be located in a rural area as defined by USDA Rural Development",
                    "For-profit, nonprofit, and cooperative businesses are eligible",
                    "Must create or save jobs in a rural area",
                    "Loan must be from an eligible lender (bank, credit union, CDFI)",
                ],
                industry_categories=["Technology", "Manufacturing", "Government & Nonprofit"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=25000000,
                source_url="https://www.rd.usda.gov/programs-services/business-programs/business-industry-loan-guarantees",
                program_code="USDA-RD-BI",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Water & Waste Disposal Loan & Grant Program",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Agriculture",
                agency_acronym="USDA",
                short_summary=(
                    "Provides funding for clean and reliable drinking water systems, "
                    "sanitary sewage disposal, sanitary solid waste disposal, and storm "
                    "water drainage to households and businesses in rural areas. "
                    "Grants up to 75% of eligible project costs; remaining funded through "
                    "low-interest direct loans with terms up to 40 years."
                ),
                key_requirements=[
                    "Must be located in a rural area as defined by USDA Rural Development",
                    "Eligible entities include municipalities, counties, special-purpose districts",
                    "Income limits and project feasibility analysis required",
                    "Applicant must have legal authority to operate the water/waste system",
                ],
                industry_categories=["Water & Utilities", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=5000000,
                source_url="https://www.rd.usda.gov/programs-services/water-environmental-programs/water-waste-disposal-loan-grant-program",
                program_code="USDA-RD-WW",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="ReConnect Rural Broadband Program",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Agriculture",
                agency_acronym="USDA",
                short_summary=(
                    "Provides grants and loans to facilitate broadband deployment in rural "
                    "areas lacking sufficient access to reliable broadband service at speeds "
                    "of 100 Mbps downstream/20 Mbps upstream. Funding may be used for "
                    "construction, improvement, or acquisition of facilities to provide "
                    "broadband service in rural areas. Grant amounts up to $25 million."
                ),
                key_requirements=[
                    "Must be located in a rural area as defined by USDA Rural Development",
                    "Service area must lack sufficient broadband (below 100/20 Mbps threshold)",
                    "Must provide service to all locations in proposed service area",
                    "25% matching funds required for grants",
                ],
                industry_categories=["Telecommunications"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=25000000,
                source_url="https://www.rd.usda.gov/programs-services/telecommunications-programs/reconnect-program",
                program_code="USDA-RD-RECONNECT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
