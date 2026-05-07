"""
MassCEC Scraper
================
Scrapes the Massachusetts Clean Energy Center (MassCEC) program directory at:
  https://www.masscec.com/programs

MassCEC is the primary clean energy agency for Massachusetts, complementing
Mass Save (utility-administered). Programs cover offshore wind, workforce,
clean heating & cooling, storage, clean transportation, and innovation.

Access pattern
--------------
The /programs page serves server-rendered HTML with program summary cards.
Many detail pages include JSON-LD structured data (type: GovernmentService)
making extraction near-deterministic. Falls back to semantic HTML when
JSON-LD is absent.

Quality
-------
- STATE jurisdiction / Massachusetts
- Type from JSON-LD serviceType or title heuristics
- Mock mode: 4 realistic MassCEC fixtures
"""

from __future__ import annotations

import json
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

BASE = "https://www.masscec.com"
INDEX_URL = f"{BASE}/programs"

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("grant",     IncentiveType.GRANT),
    ("loan",      IncentiveType.LOAN),
    ("rebate",    IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive", IncentiveType.POINT_OF_SALE_REBATE),
    ("tax credit",IncentiveType.TAX_CREDIT),
    ("voucher",   IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",        "Clean Technology"),
    ("wind",         "Clean Technology"),
    ("offshore",     "Clean Technology"),
    ("storage",      "Energy Storage"),
    ("battery",      "Energy Storage"),
    ("electric veh", "EV Charging"),
    ("heat pump",    "Energy Management"),
    ("efficiency",   "Energy Management"),
    ("retrofit",     "Energy Management"),
    ("workforce",    "Government & Nonprofit"),
    ("innovation",   "Research & Development"),
    ("research",     "Research & Development"),
    ("community",    "Government & Nonprofit"),
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
    return found or ["Clean Technology"]


class MassCECScraper(BaseScraper):
    """Scrapes MassCEC program listings for Massachusetts clean energy incentives."""

    SOURCE_NAME = "masscec_programs"
    BASE_URL = INDEX_URL

    def __init__(self, mock: bool = False, max_programs: int = 60):
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
            self._log.warning("masscec index fetch failed", error=str(e))
            return []

        soup = self.parse(html)
        links: list[str] = []
        for a in soup.select("a[href]"):
            href = str(a.get("href", ""))
            if "/programs/" in href and not href.endswith("/programs/"):
                full = href if href.startswith("http") else f"{BASE}{href}"
                if full not in links:
                    links.append(full)

        if not links:
            self._log.warning("masscec: no program links found — structure may have changed")
            return []

        results: list[ScrapedIncentive] = []
        for url in links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("masscec detail failed", url=url, error=str(e))

        self._log.info("masscec scraped", links=len(links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        # Try JSON-LD first
        for script in soup.select("script[type='application/ld+json']"):
            try:
                data = json.loads(script.string or "")
                types = data.get("@type", [])
                if isinstance(types, str):
                    types = [types]
                if any(t in types for t in ("GovernmentService", "Service", "FinancialProduct")):
                    title = data.get("name", "").strip()
                    summary = (data.get("description") or "").strip()
                    if len(title) >= 5 and len(summary) >= 20:
                        return ScrapedIncentive(
                            title=title,
                            jurisdiction_level=JurisdictionLevel.STATE,
                            jurisdiction_name="Massachusetts",
                            managing_agency="Massachusetts Clean Energy Center",
                            agency_acronym="MassCEC",
                            short_summary=summary[:1500],
                            key_requirements=["See program website for full eligibility details"],
                            industry_categories=_infer_industries(title, summary),
                            incentive_type=_infer_type(title, summary),
                            source_url=url,
                            program_code=f"MASSCEC-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
                            status=IncentiveStatus.ACTIVE,
                            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
                            parse_confidence=ParseConfidence.HIGH,
                            scraper_source=self.SOURCE_NAME,
                        )
            except (json.JSONDecodeError, AttributeError):
                pass

        # Fallback: semantic HTML
        title = self.extract_text(soup, "h1")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".field-name-body", ".program-summary", "main", ".layout-container"]:
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
            jurisdiction_name="Massachusetts",
            managing_agency="Massachusetts Clean Energy Center",
            agency_acronym="MassCEC",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"MASSCEC-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="Offshore Wind Economic Development Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Massachusetts",
                managing_agency="Massachusetts Clean Energy Center",
                agency_acronym="MassCEC",
                short_summary=(
                    "Provides grants and technical assistance to Massachusetts companies "
                    "seeking to participate in the offshore wind supply chain. Supports "
                    "capital investment, workforce training, certifications, and industry "
                    "partnerships. Priority given to businesses that will create durable "
                    "Massachusetts jobs in offshore wind manufacturing and services."
                ),
                key_requirements=[
                    "Must be a Massachusetts-based business",
                    "Must demonstrate nexus to offshore wind supply chain",
                    "See program website for full eligibility details",
                ],
                industry_categories=["Clean Technology", "Manufacturing"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://www.masscec.com/programs/offshore-wind-economic-development",
                program_code="MASSCEC-OFFSHORE-WIND",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Clean Energy Internship Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Massachusetts",
                managing_agency="Massachusetts Clean Energy Center",
                agency_acronym="MassCEC",
                short_summary=(
                    "Connects students and recent graduates with paid internship "
                    "opportunities at Massachusetts clean energy companies. MassCEC "
                    "subsidizes 50% of intern wages (up to $6,000 per intern) directly "
                    "to the hiring company. Interns gain hands-on experience while "
                    "companies access a pipeline of clean energy talent."
                ),
                key_requirements=[
                    "Must be a Massachusetts-based clean energy company",
                    "Intern must be a Massachusetts college student or recent graduate",
                    "Internship must be paid (minimum wage or higher)",
                    "Must complete MassCEC application before intern start date",
                ],
                industry_categories=["Clean Technology", "Government & Nonprofit"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=6000,
                source_url="https://www.masscec.com/programs/clean-energy-internship-program",
                program_code="MASSCEC-INTERN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Residential Battery Storage Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Massachusetts",
                managing_agency="Massachusetts Clean Energy Center",
                agency_acronym="MassCEC",
                short_summary=(
                    "Offers rebates to Massachusetts homeowners who install qualifying "
                    "behind-the-meter battery storage systems. Rebate amounts depend on "
                    "battery capacity and income tier, with enhanced rebates available "
                    "for low-to-moderate income households and those in environmental "
                    "justice communities. Can be combined with solar installations."
                ),
                key_requirements=[
                    "Must be a Massachusetts homeowner",
                    "Battery system must meet minimum capacity requirements",
                    "Must be installed by a certified installer",
                    "Income-based adder available for households at or below 120% AMI",
                ],
                industry_categories=["Energy Storage", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=10000,
                source_url="https://www.masscec.com/programs/residential-battery-storage",
                program_code="MASSCEC-BATTERY",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Accelerating Clean Energy R&D (ACER) Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Massachusetts",
                managing_agency="Massachusetts Clean Energy Center",
                agency_acronym="MassCEC",
                short_summary=(
                    "Provides R&D funding to Massachusetts companies developing early-stage "
                    "clean energy technologies. Awards up to $250,000 for applied research "
                    "projects with a clear path to commercialization. Focus areas include "
                    "offshore wind components, advanced energy storage, building decarbonization, "
                    "and grid modernization technologies."
                ),
                key_requirements=[
                    "Must be a Massachusetts-based company or research institution",
                    "Technology must address a clean energy sector priority",
                    "Must demonstrate commercialization pathway and Massachusetts benefit",
                    "Matching funds or in-kind contributions encouraged",
                ],
                industry_categories=["Research & Development", "Clean Technology"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=250000,
                source_url="https://www.masscec.com/programs/acer",
                program_code="MASSCEC-ACER",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
