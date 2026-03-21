"""
Grants.gov API Scraper
=======================
Grants.gov exposes a public JSON API (no key needed) for searching all federal
grant opportunities. This scraper pulls active OPEN opportunities and maps them
to our ScrapedIncentive model.

API docs: https://www.grants.gov/web/grants/s2s/grantor/getOpportunities.html
Endpoint: https://api.grants.gov/v1/api/search
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from .base_scraper import BaseScraper
from .models import IncentiveType, JurisdictionLevel, ScrapedIncentive

# Industry keyword → our category mapping
KEYWORD_CATEGORY_MAP = {
    "energy": "Energy Management",
    "solar": "Energy Management",
    "wind": "Energy Management",
    "battery": "Energy Management",
    "emissions": "Clean Technology",
    "climate": "Clean Technology",
    "zero emission": "Clean Technology",
    "electric vehicle": "Fleet",
    "fleet": "Fleet",
    "transit": "Public Transit",
    "transportation": "Logistics",
    "truck": "Logistics",
    "construction": "Construction",
    "manufacturing": "Manufacturing",
    "agriculture": "Agriculture",
    "farm": "Agriculture",
}

# Agency acronym normalization
AGENCY_MAP = {
    "DOE": "U.S. Department of Energy",
    "EPA": "U.S. Environmental Protection Agency",
    "DOT": "U.S. Department of Transportation",
    "USDA": "U.S. Department of Agriculture",
    "HUD": "U.S. Department of Housing and Urban Development",
    "SBA": "U.S. Small Business Administration",
}


class GrantsGovScraper(BaseScraper):
    """
    Pulls active federal grant opportunities from the Grants.gov public API.
    Filters to business/industry-relevant categories.
    """

    SOURCE_NAME = "grants_gov_api"
    BASE_URL = "https://apply07.grants.gov/grantsws/rest/opportunities/search"

    # Categories we care about (Grants.gov uses numeric codes)
    # 0=Recovery, 8=Energy, 14=Science and Technology, etc.
    TARGET_CATEGORIES = ["B", "C", "O"]  # B=Business/Commerce, C=Community Dev, O=Other

    def __init__(self, mock: bool = False, max_results: int = 20):
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

        try:
            # Grants.gov search API (POST with JSON body)
            import httpx
            payload = {
                "keyword": "business energy clean technology fleet",
                "oppStatuses": "posted",
                "rows": self.max_results,
                "sortBy": "openDate|desc",
            }
            response = self._client.post(
                "https://apply07.grants.gov/grantsws/rest/opportunities/search",
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            opportunities = data.get("oppHits", [])
            self._log.info("Grants.gov returned", count=len(opportunities))

            for opp in opportunities:
                incentive = self._parse_opportunity(opp)
                if incentive:
                    results.append(incentive)
        except Exception as e:
            self._log.error("Grants.gov API failed", error=str(e))

        return results

    def _parse_opportunity(self, opp: dict) -> Optional[ScrapedIncentive]:
        try:
            title = opp.get("title", "").strip()
            if not title:
                return None

            synopsis = opp.get("synopsis", "") or opp.get("description", "") or ""
            synopsis = re.sub(r"\s+", " ", synopsis).strip()
            if len(synopsis) > 500:
                synopsis = synopsis[:500] + "…"

            # Infer categories from title + synopsis text
            combined = (title + " " + synopsis).lower()
            categories = list({
                v for k, v in KEYWORD_CATEGORY_MAP.items() if k in combined
            }) or ["General Business"]

            # Funding amount
            award_floor = opp.get("awardFloor")
            award_ceiling = opp.get("awardCeiling")
            funding = None
            if award_ceiling:
                try:
                    funding = float(str(award_ceiling).replace(",", "").replace("$", ""))
                except ValueError:
                    pass
            elif award_floor:
                try:
                    funding = float(str(award_floor).replace(",", "").replace("$", ""))
                except ValueError:
                    pass

            # Deadline
            close_date_str = opp.get("closeDate", "") or ""
            deadline = None
            if close_date_str:
                try:
                    deadline = datetime.strptime(close_date_str, "%m%d%Y")
                except ValueError:
                    pass

            # Agency
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
                short_summary=synopsis or f"Federal grant opportunity: {title}",
                key_requirements=[
                    "Must be an eligible applicant as defined in the opportunity synopsis",
                    "Application must be submitted through Grants.gov by the posted deadline",
                    "Comply with all federal requirements including SAM.gov registration",
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
                title="Small Business Innovation Research (SBIR) — DOE Energy Efficiency",
                jurisdiction_level=JurisdictionLevel.FEDERAL,
                jurisdiction_name="United States",
                managing_agency="U.S. Department of Energy",
                agency_acronym="DOE",
                short_summary=(
                    "The DOE SBIR program provides funding for small businesses to conduct "
                    "R&D in energy efficiency and renewable energy. Phase I awards up to "
                    "$200,000; Phase II awards up to $1.5M for commercialization."
                ),
                key_requirements=[
                    "Applicant must be a U.S. small business (< 500 employees)",
                    "Principal Investigator must be primarily employed by the applicant",
                    "Project must address a DOE-defined research topic",
                    "Must register in SAM.gov before submitting",
                ],
                industry_categories=["Energy Management", "Manufacturing", "Clean Technology"],
                incentive_type=IncentiveType.GRANT,
                funding_amount=1500000,
                deadline=datetime(2025, 6, 15),
                source_url="https://science.osti.gov/sbir",
                program_code="DOE-SBIR-2025",
                scraper_source=self.SOURCE_NAME,
            )
        ]
