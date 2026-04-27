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

# SS-002 §4 — source-agnostic boilerplate prefix block.
# These are titles the April 20 incident produced. They must never reach the DB.
BOILERPLATE_TITLE_PREFIXES = [
    "federal grant opportunity:",
    "federal grant opportunity",
    "general business",
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

    # Detail endpoints to try in order. The first one that returns a 2xx
    # response with a parseable "synopsis" or "synopsisDesc" field becomes
    # the chosen endpoint for the rest of the run. Lets us recover from
    # API restructuring without code change.
    DETAIL_ENDPOINTS = [
        # Apply07 grantsws (S2S-style; what we tried first)
        {
            "url": "https://apply07.grants.gov/grantsws/rest/opportunity/details",
            "method": "POST",
            "id_field": "oppId",
            "id_type": int,
        },
        # api.grants.gov public v1 — current public API
        {
            "url": "https://api.grants.gov/v1/api/fetchOpportunity",
            "method": "POST",
            "id_field": "opportunityId",
            "id_type": int,
        },
        # www.grants.gov mirror of grantsws (occasionally works when apply07 doesn't)
        {
            "url": "https://www.grants.gov/grantsws/rest/opportunity/details",
            "method": "POST",
            "id_field": "oppId",
            "id_type": int,
        },
    ]

    def _try_detail_endpoint(self, endpoint: dict, opp_id: str) -> tuple[dict | None, str]:
        """
        Try one detail endpoint. Returns (parsed_json or None, diagnostic_msg).
        Diagnostic msg captures status/response preview when call fails.
        """
        try:
            payload_id = endpoint["id_type"](opp_id)
        except (ValueError, TypeError):
            return None, f"id_cast_failed (id={opp_id!r})"

        payload = {endpoint["id_field"]: payload_id}
        try:
            if endpoint["method"] == "POST":
                response = self._client.post(endpoint["url"], json=payload, timeout=20)
            else:
                response = self._client.get(endpoint["url"], params=payload, timeout=20)
            status = response.status_code
            if status >= 400:
                preview = (response.text or "")[:120].replace("\n", " ")
                return None, f"HTTP {status} preview={preview!r}"
            try:
                data = response.json()
            except Exception as e:
                preview = (response.text or "")[:120].replace("\n", " ")
                return None, f"json_parse_failed: {e} preview={preview!r}"
            # Reject empty / non-dict responses
            if not isinstance(data, dict) or not data:
                return None, f"empty_response (type={type(data).__name__})"
            # Newer api.grants.gov wraps in "data": {...}
            if "data" in data and isinstance(data["data"], dict):
                data = data["data"]
            return data, "ok"
        except Exception as e:
            return None, f"{type(e).__name__}: {e}"

    def _fetch_detail(self, opp_id: str, diag_state: dict) -> dict:
        """
        Fetch the full opportunity detail. Walks DETAIL_ENDPOINTS in order;
        once one succeeds, sticks with it via diag_state['chosen_endpoint'].
        """
        # Stick with whichever endpoint last worked
        chosen = diag_state.get("chosen_endpoint")
        if chosen is not None:
            data, msg = self._try_detail_endpoint(chosen, opp_id)
            if data:
                return data
            # Chosen endpoint suddenly broke — fall through to retry all

        for ep in self.DETAIL_ENDPOINTS:
            data, msg = self._try_detail_endpoint(ep, opp_id)
            if data:
                diag_state["chosen_endpoint"] = ep
                diag_state["chosen_endpoint_url"] = ep["url"]
                return data
            # Capture first failure reason per endpoint for the artifact
            key = f"endpoint_first_error::{ep['url']}"
            if key not in diag_state:
                diag_state[key] = msg

        return {}

    def _merge_detail_into_opp(self, opp: dict, detail: dict) -> dict:
        """
        Pull the fields _parse_opportunity needs from the detail response
        and overlay them onto the search-result dict.

        The shape varies by endpoint:
          - apply07/grantsws → {"synopsis": {"synopsisDesc": ...}}
          - api.grants.gov v1 → {"opportunity": {"description": ...}}  (varies)
          - sometimes flat → {"synopsisDesc": ...} or {"description": ...}
        We probe a few field paths to be robust to all of them.
        """
        merged = dict(opp)

        synopsis_block = (
            detail.get("synopsis")
            or detail.get("opportunity")
            or detail
            or {}
        )
        if not isinstance(synopsis_block, dict):
            synopsis_block = {}

        # Synopsis text
        for path in ("synopsisDesc", "description", "synopsis", "summary"):
            val = synopsis_block.get(path) or detail.get(path)
            if val and isinstance(val, str) and val.strip():
                merged["synopsis"] = val
                break

        # Funding
        for field in ("awardCeiling", "awardFloor", "estimatedFunding"):
            val = synopsis_block.get(field) or detail.get(field)
            if val and not merged.get(field):
                merged[field] = val

        # Agency
        for field in ("agencyCode", "agencyName"):
            val = synopsis_block.get(field) or detail.get(field)
            if val and not merged.get(field):
                merged[field] = val

        # Close date
        close = synopsis_block.get("responseDate") or detail.get("closeDate")
        if close and not merged.get("closeDate"):
            merged["closeDate"] = close

        return merged

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
        # Diagnostics surfaced into the dry-run artifact so reviewers can
        # tell "API returned 0" vs "API returned N, parser rejected all N".
        per_term: dict[str, dict] = {}
        total_raw_hits = 0
        total_parsed = 0
        detail_fetch_failed = 0
        detail_fetch_succeeded = 0
        # Detail-endpoint state — survives across opp IDs so we stick with
        # the first endpoint that works AND capture per-endpoint failure
        # reasons in the artifact.
        detail_diag: dict = {}

        for term in search_terms:
            term_diag = {"raw_hits": 0, "new_ids": 0, "parsed": 0, "error": None}
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

                opp_hits = data.get("oppHits", [])
                term_diag["raw_hits"] = len(opp_hits)
                total_raw_hits += len(opp_hits)

                for opp in opp_hits:
                    opp_id = str(opp.get("id", ""))
                    if opp_id in seen_ids:
                        continue
                    seen_ids.add(opp_id)
                    term_diag["new_ids"] += 1

                    # /search returns title+id only. Fetch detail to get synopsis.
                    detail = self._fetch_detail(opp_id, detail_diag)
                    if detail:
                        detail_fetch_succeeded += 1
                        opp = self._merge_detail_into_opp(opp, detail)
                    else:
                        detail_fetch_failed += 1

                    incentive = self._parse_opportunity(opp)
                    if incentive:
                        results.append(incentive)
                        term_diag["parsed"] += 1
                        total_parsed += 1

                self._log.info("Grants.gov term results",
                               term=term,
                               raw=term_diag["raw_hits"],
                               parsed=term_diag["parsed"])

            except Exception as e:
                term_diag["error"] = f"{type(e).__name__}: {e}"
                self._log.error("Grants.gov search failed", term=term, error=str(e))

            per_term[term] = term_diag

        # Attach diagnostics for the artifact summary
        self._diagnostics = {
            "total_raw_hits": total_raw_hits,
            "unique_ids": len(seen_ids),
            "detail_fetch_succeeded": detail_fetch_succeeded,
            "detail_fetch_failed": detail_fetch_failed,
            "detail_endpoint_chosen": detail_diag.get("chosen_endpoint_url"),
            "detail_endpoint_first_errors": {
                k.split("::", 1)[1]: v
                for k, v in detail_diag.items()
                if k.startswith("endpoint_first_error::")
            },
            "total_parsed": total_parsed,
            "rejected_by_quality_gate": len(seen_ids) - total_parsed,
            "per_term": per_term,
        }

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

        if any(title_lower.startswith(p) for p in BOILERPLATE_TITLE_PREFIXES):
            return False, f"title is boilerplate (April 20 regression class)"

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
