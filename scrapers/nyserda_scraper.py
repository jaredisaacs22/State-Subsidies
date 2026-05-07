"""
NYSERDA Scraper
================
Scrapes the New York State Energy Research and Development Authority (NYSERDA)
program directory at:
  https://www.nyserda.ny.gov/All-Programs

NYSERDA is the most complete single-state energy authority in the US, with
~80 active programs covering residential efficiency, clean heating and cooling,
EV incentives, solar, commercial retrofits, workforce, and innovation grants.
Adds substantive New York coverage.

Access pattern
--------------
The /All-Programs page returns server-rendered HTML with program cards in a
consistent <ul> or grid layout. Each card has a title and a link to a detail
page. The detail page has consistent section headings:
  - "Who Is Eligible" / "Eligibility"
  - "What It Is" / "About"
  - "How Much Can I Get" → funding amounts

We skip programs whose titles indicate internal administrative grants
(e.g. "Request for Proposals") since those are procurements, not applicant
programs.

Quality
-------
- STATE jurisdiction / New York
- Type inferred from "What It Is" description and title keywords
- Mock mode: 5 real, high-impact NYSERDA programs as realistic fixtures
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

BASE = "https://www.nyserda.ny.gov"
INDEX_URL = f"{BASE}/All-Programs"

SKIP_TITLE_PATTERNS = [
    "request for proposal",
    "rfp",
    "request for information",
    "rfi",
    "solicitation",
    "expression of interest",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("tax credit",   IncentiveType.TAX_CREDIT),
    ("rebate",       IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",    IncentiveType.POINT_OF_SALE_REBATE),
    ("loan",         IncentiveType.LOAN),
    ("financing",    IncentiveType.LOAN),
    ("grant",        IncentiveType.GRANT),
    ("voucher",      IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("wind",        "Clean Technology"),
    ("clean energ", "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("battery",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("drive clean", "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("hvac",        "Energy Management"),
    ("retrofit",    "Energy Management"),
    ("building",    "Real Estate"),
    ("commercial",  "Technology"),
    ("workforce",   "Government & Nonprofit"),
    ("innovation",  "Research & Development"),
    ("research",    "Research & Development"),
    ("agri",        "Agriculture"),
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


def _extract_funding(text: str) -> Optional[float]:
    """Pull the largest dollar ceiling from a text block."""
    matches = re.findall(r"\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand))?", text, re.I)
    best: Optional[float] = None
    for m in matches:
        raw = m.lstrip("$").replace(",", "")
        mult = 1.0
        if "billion" in m.lower():
            mult = 1_000_000_000
        elif "million" in m.lower():
            mult = 1_000_000
        elif "thousand" in m.lower():
            mult = 1_000
        try:
            val = float(re.sub(r"(?i)(billion|million|thousand)", "", raw).strip()) * mult
            if best is None or val > best:
                best = val
        except ValueError:
            pass
    return best


def _should_skip(title: str) -> bool:
    t = title.lower()
    return any(p in t for p in SKIP_TITLE_PATTERNS)


class NYSERDAScraper(BaseScraper):
    """Scrapes NYSERDA program listings for New York energy incentives."""

    SOURCE_NAME = "nyserda_programs"
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
            self._log.warning("nyserda index fetch failed", error=str(e))
            return []

        soup = self.parse(html)
        links: list[str] = []

        for a in soup.select("a[href]"):
            href = str(a.get("href", ""))
            # NYSERDA program links contain /All-Programs/ in the path
            if "/All-Programs/" in href and href not in links:
                full = href if href.startswith("http") else f"{BASE}{href}"
                links.append(full)

        if not links:
            self._log.warning("nyserda: no program links found — page structure may have changed")
            return []

        results: list[ScrapedIncentive] = []
        for url in links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("nyserda detail failed", url=url, error=str(e))

        self._log.info("nyserda scraped", links=len(links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1")
        if len(title) < 5 or _should_skip(title):
            return None

        # NYSERDA detail pages have a consistent three-section layout:
        # "What It Is" / "Who Is Eligible" / "How Much Can I Get"
        # Try multiple selectors to be resilient to markup changes.
        summary = ""
        for sel in [".field-name-body", ".field-items", "main .content", ".main-content", "main"]:
            el = soup.select_one(sel)
            if el:
                paras = [p.get_text(strip=True) for p in el.select("p") if len(p.get_text(strip=True)) > 30]
                summary = " ".join(paras[:3])
                if len(summary) >= 60:
                    break

        if len(summary) < 20:
            return None

        # Requirements: look for a section containing eligibility
        reqs: list[str] = []
        for heading in soup.select("h2, h3"):
            text = heading.get_text(strip=True).lower()
            if "eligible" in text or "who" in text or "require" in text:
                sibling = heading.find_next_sibling()
                while sibling:
                    if sibling.name in ("h2", "h3"):
                        break
                    if sibling.name == "ul":
                        reqs = [li.get_text(strip=True) for li in sibling.select("li") if li.get_text(strip=True)]
                        break
                    if sibling.name == "p" and sibling.get_text(strip=True):
                        reqs.append(sibling.get_text(strip=True))
                    sibling = sibling.find_next_sibling()
                if reqs:
                    break

        if not reqs:
            reqs = ["See program website for full eligibility details"]

        funding = _extract_funding(html)
        inc_type = _infer_type(title, summary)
        industries = _infer_industries(title, summary)

        return ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.STATE,
            jurisdiction_name="New York",
            managing_agency="New York State Energy Research and Development Authority",
            agency_acronym="NYSERDA",
            short_summary=summary[:1500],
            key_requirements=reqs[:8],
            industry_categories=industries,
            incentive_type=inc_type,
            funding_amount=funding,
            source_url=url,
            program_code=f"NYSERDA-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="NY-Sun Residential Incentive Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New York",
                managing_agency="New York State Energy Research and Development Authority",
                agency_acronym="NYSERDA",
                short_summary=(
                    "NY-Sun provides per-watt incentives for residential and small commercial "
                    "solar PV systems in New York. Incentive levels are regionally set and "
                    "step down as deployment milestones are reached. Bonus adders are "
                    "available for low-to-moderate income customers and paired battery "
                    "storage installations."
                ),
                key_requirements=[
                    "Must be a residential property owner or small commercial customer",
                    "System must be installed by a NYSERDA-approved contractor",
                    "New York utility customer (ConEd, National Grid, NYSEG, RG&E, etc.)",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                source_url="https://www.nyserda.ny.gov/All-Programs/NY-Sun",
                program_code="NYSERDA-NY-SUN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Drive Clean Rebate — Electric and Plug-In Hybrid Vehicle Rebate",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New York",
                managing_agency="New York State Energy Research and Development Authority",
                agency_acronym="NYSERDA",
                short_summary=(
                    "The Drive Clean Rebate provides point-of-sale rebates for the purchase "
                    "or lease of qualifying new battery electric (BEV) or plug-in hybrid "
                    "electric (PHEV) vehicles from participating dealers. Rebate amounts "
                    "range from $500 (PHEVs) to $2,000 (BEVs with > 200 mile range), "
                    "applied directly at the dealership."
                ),
                key_requirements=[
                    "Vehicle must be a qualifying new BEV or PHEV",
                    "Must be purchased or leased from a participating New York dealer",
                    "Rebate is applied at point-of-sale — no application required",
                    "Income limits do not apply for the standard rebate tier",
                ],
                industry_categories=["EV Charging"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=2000,
                source_url="https://www.nyserda.ny.gov/All-Programs/Drive-Clean-Rebate",
                program_code="NYSERDA-DRIVE-CLEAN",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="EmPower+ Low-Income Weatherization Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New York",
                managing_agency="New York State Energy Research and Development Authority",
                agency_acronym="NYSERDA",
                short_summary=(
                    "EmPower+ provides no-cost energy efficiency upgrades to income-eligible "
                    "households including insulation, air sealing, LED lighting, ENERGY STAR "
                    "appliances, and efficient heating systems. Qualifying households earning "
                    "up to 80% of the State Median Income pay nothing for these improvements."
                ),
                key_requirements=[
                    "Household income must not exceed 80% of New York State Median Income",
                    "Must be a utility customer in a participating NYS utility territory",
                    "Home must be the primary residence",
                    "Renters may qualify with landlord consent",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://www.nyserda.ny.gov/All-Programs/EmPower-New-York-Program",
                program_code="NYSERDA-EMPOWER",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Clean Heat Program — Heat Pump Rebates",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New York",
                managing_agency="New York State Energy Research and Development Authority",
                agency_acronym="NYSERDA",
                short_summary=(
                    "Provides residential and small commercial customers with rebates for "
                    "switching to air-source or ground-source heat pumps for heating and "
                    "cooling. Rebates are available through participating local utilities "
                    "and can be combined with the federal Inflation Reduction Act heat pump "
                    "tax credit and the Mass Save HEAT Loan equivalent."
                ),
                key_requirements=[
                    "Must be a residential or small commercial electric utility customer",
                    "Heat pump must meet minimum efficiency requirements (HSPF2 ≥ 7.2 or COP ≥ 2.5)",
                    "Must be installed by a participating contractor",
                    "Rebate is applied at time of installation",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=5000,
                source_url="https://www.nyserda.ny.gov/All-Programs/Clean-Heat",
                program_code="NYSERDA-CLEAN-HEAT",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Flexible Technical Assistance (FlexTech) Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="New York",
                managing_agency="New York State Energy Research and Development Authority",
                agency_acronym="NYSERDA",
                short_summary=(
                    "FlexTech provides cost-shared energy studies for commercial, industrial, "
                    "and institutional energy users. NYSERDA contributes 50% of the cost of "
                    "technical studies to identify energy savings opportunities, renewable "
                    "energy systems, and combined heat and power (CHP) projects. Studies "
                    "are performed by NYSERDA-approved consultants."
                ),
                key_requirements=[
                    "Must be a commercial, industrial, or institutional energy user",
                    "Must be a New York utility customer",
                    "Study must be performed by a NYSERDA-approved FlexTech consultant",
                    "Applicant pays at minimum 50% of the study cost",
                ],
                industry_categories=["Energy Management", "Technology"],
                incentive_type=IncentiveType.GRANT,
                source_url="https://www.nyserda.ny.gov/All-Programs/FlexTech-Program",
                program_code="NYSERDA-FLEXTECH",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
