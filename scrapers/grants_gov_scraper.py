"""
Grants.gov API Scraper
=======================
Grants.gov exposes a public JSON API (no key needed) for searching all federal
grant opportunities. This scraper pulls active OPEN opportunities and maps them
to our ScrapedIncentive model.

Quality gates are enforced to avoid vague boilerplate entries:
- Synopsis must be at least 100 characters
- Award ceiling must be present and > $10,000
- Title must not be generic/administrative
- Must match business-relevant keyword categories

API docs: https://www.grants.gov/web/grants/s2s/grantor/getOpportunities.html
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from .base_scraper import BaseScraper
from .models import IncentiveType, JurisdictionLevel, ScrapedIncentive

KEYWORD_CATEGORY_MAP = {
    "energy efficiency": "Energy Management",
    "solar": "Clean Technology",
    "wind energy": "Clean Technology",
    "battery storage": "Energy Storage",
    "emissions reduction": "Clean Technology",
    "greenhouse gas": "Clean Technology",
    "zero emission": "Fleet",
    "electric vehicle": "Fleet",
    "ev charging": "EV Charging",
    "charging infrastructure": "EV Charging",
    "fleet": "Fleet",
    "transit": "Public Transit",
    "freight": "Logistics",
    "truck": "Logistics",
    "construction": "Construction",
    "manufacturing": "Manufacturing",
    "agriculture": "Agriculture",
    "farm": "Agriculture",
    "small business": "Technology",
    "innovation": "Research & Development",
    "research": "Research & Development",
    "workforce": "Government & Nonprofit",
    "community development": "Government & Nonprofit",
    "broadband": "Telecommunications",
    "water": "Water & Utilities",
    "wastewater": "Water & Utilities",
    "housing": "Real Estate",
    "health": "Healthcare",
}

AGENCY_MAP = {
    "DOE": "U.S. Department of Energy",
    "EPA": "U.S. Environmental Protection Agency",
    "DOT": "U.S. Department of Transportation",
    "USDA": "U.S. Department of Agriculture",
    "HUD": "U.S. Department of Housing and Urban Development",
    "SBA": "U.S. Small Business Administration",
    "DOC": "U.S. Department of Commerce",
    "EDA": "U.S. Economic Development Administration",
    "NIST": "National Institute of Standards and Technology",
    "NSF": "National Science Foundation",
}

# Skip titles containing these — usually admin/planning grants not useful for businesses
SKIP_TITLE_KEYWORDS = [
    "planning only", "administrative", "indirect cost", "capacity building only",
    "conference", "symposium", "workshop only", "training only",
]

MIN_SYNOPSIS_LENGTH = 120
MIN_AWARD_AMOUNT = 10_000


class GrantsGovScraper(BaseScraper):
    """
    Pulls active federal grant opportunities from the Grants.gov public API.
    Enforces quality gates to ensure only specific, useful programs are stored.
    """

    SOURCE_NAME = "grants_gov_api"
    BASE_URL = "https://apply07.grants.gov/grantsws/rest/opportunities/search"

    def __init__(self, mock: bool = False, max_results: int = 50):
        super().__init__()
        self.mock = mock
        self.max_results = max_results

    def scrape(self) -> list[ScrapedIncentive]:
        if self.mock:
            return self._mock_results()
        return self._scrape_live()

    def _scrape_live(self) -> list[ScrapedIncentive]:
        self._log.info("Fetching from Grants.gov API")
        results: list[ScrapedIncentive] = []

        # Run targeted searches for specific business-relevant topics
        search_terms = [
            "small business energy efficiency grant",
            "clean energy manufacturing grant",
            "electric vehicle fleet grant",
            "agricultural efficiency grant",
            "workforce development manufacturing",
            "broadband infrastructure rural",
            "economic development business",
        ]

        seen_ids: set[str] = set()

        for term in search_terms:
            try:
                payload = {
                    "keyword": term,
                    "oppStatuses": "posted",
                    "rows": 20,
                    "sortBy": "openDate|desc",
                }
                response = self._client.post(self.BASE_URL, json=payload, timeout=30)
                response.raise_for_status()
                data = response.json()

                for opp in data.get("oppHits", []):
                    opp_id = str(opp.get("id", ""))
                    if opp_id in seen_ids:
                        continue
                    seen_ids.add(opp_id)

                    incentive = self._parse_opportunity(opp)
                    if incentive:
                        results.append(incentive)

                self._log.info("Grants.gov term results", term=term, found=len(results))

            except Exception as e:
                self._log.error("Grants.gov search failed", term=term, error=str(e))

        self._log.info("Grants.gov total after quality filter", count=len(results))
        return results

    def _passes_quality_gate(self, title: str, synopsis: str, funding: Optional[float]) -> tuple[bool, str]:
        """Returns (passes, reason_if_rejected)."""
        if len(synopsis) < MIN_SYNOPSIS_LENGTH:
            return False, f"synopsis too short ({len(synopsis)} chars)"

        if funding is None or funding < MIN_AWARD_AMOUNT:
            return False, f"no usable award amount (got {funding})"

        title_lower = title.lower()
        if any(kw in title_lower for kw in SKIP_TITLE_KEYWORDS):
            return False, f"title matches skip keyword"

        # Must match at least one business-relevant category
        combined = (title + " " + synopsis).lower()
        if not any(k in combined for k in KEYWORD_CATEGORY_MAP):
            return False, "no matching business category keywords"

        return True, ""

    def _parse_opportunity(self, opp: dict) -> Optional[ScrapedIncentive]:
        try:
            title = opp.get("title", "").strip()
            if not title:
                return None

            synopsis = opp.get("synopsis", "") or opp.get("description", "") or ""
            synopsis = re.sub(r"\s+", " ", synopsis).strip()

            # Funding
            funding = None
            for field in ("awardCeiling", "awardFloor", "estimatedFunding"):
                raw = opp.get(field)
                if raw:
                    try:
                        val = float(str(raw).replace(",", "").replace("$", ""))
                        if val > 0:
                            funding = val
                            break
                    except ValueError:
                        pass

            # Quality gate — reject vague entries before building the object
            passes, reason = self._passes_quality_gate(title, synopsis, funding)
            if not passes:
                self._log.debug("Rejected opportunity", title=title[:60], reason=reason)
                return None

            # Truncate synopsis to 500 chars for the short_summary field
            short_summary = synopsis[:500] + "…" if len(synopsis) > 500 else synopsis

            # Categories
            combined = (title + " " + synopsis).lower()
            categories = list({v for k, v in KEYWORD_CATEGORY_MAP.items() if k in combined})
            if not categories:
                categories = ["Government & Nonprofit"]

            # Deadline
            deadline = None
            close_date_str = opp.get("closeDate", "") or ""
            if close_date_str:
                for fmt in ("%m%d%Y", "%Y-%m-%d", "%m/%d/%Y"):
                    try:
                        deadline = datetime.strptime(close_date_str, fmt)
                        break
                    except ValueError:
                        pass

            agency_code = opp.get("agencyCode", "")
            agency_name = AGENCY_MAP.get(agency_code, opp.get("agencyName", "Federal Agency"))
            opp_number = opp.get("number", "")
            source_url = f"https://www.grants.gov/web/grants/view-opportunity.html?oppId={opp.get('id', '')}"

            return ScrapedIncentive(
                title=title,
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency=agency_name,
                agency_acronym=agency_code or None,
                short_summary=short_summary,
                key_requirements=[
                    "Must be an eligible applicant as defined in the opportunity listing",
                    "Application must be submitted through Grants.gov by the posted deadline",
                    "SAM.gov registration required prior to application",
                    "Review full Notice of Funding Opportunity (NOFO) for detailed requirements",
                ],
                industry_categories=categories,
                incentive_type=IncentiveType.GRANT,
                funding_amount=funding,
                deadline=deadline,
                source_url=source_url,
                program_code=opp_number or None,
                scraper_source=self.SOURCE_NAME,
            )
        except Exception as e:
            self._log.warning("Failed to parse opportunity", error=str(e))
            return None

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="DOE Small Business Innovation Research — Energy Efficiency Phase II",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Energy",
                agency_acronym="DOE",
                short_summary=(
                    "DOE SBIR Phase II awards up to $1.5M for small businesses commercializing "
                    "energy efficiency and renewable energy technologies developed in Phase I. "
                    "Eligible areas include building efficiency, industrial processes, grid modernization, "
                    "and advanced manufacturing. Phase II projects must demonstrate clear commercialization path."
                ),
                key_requirements=[
                    "Must have completed a qualifying DOE SBIR Phase I award",
                    "Applicant must be a U.S. small business with fewer than 500 employees",
                    "Principal Investigator must be primarily employed by the applicant company",
                    "SAM.gov registration required; project must address a DOE research topic",
                ],
                industry_categories=["Energy Management", "Manufacturing", "Clean Technology", "Research & Development"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=1500000,
                deadline=datetime(2026, 6, 15),
                source_url="https://science.osti.gov/sbir",
                program_code="DOE-SBIR-P2",
                scraper_source=self.SOURCE_NAME,
            )
        ]
