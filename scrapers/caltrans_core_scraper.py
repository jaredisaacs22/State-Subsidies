"""
CalTrans CORE Program Scraper
==============================
Target: https://dot.ca.gov/programs/rail-and-mass-transportation/core

Page structure (as of 2024):
  - Page title: <h1.page-title>
  - Program description: <div.container--content> > p (first 3 paragraphs)
  - Eligibility / requirements: <ul> inside <div.container--content>
  - Grant amounts: Embedded in <p> or <table> elements
  - Apply link: <a> with text matching "apply" or "application"

This scraper runs in MOCK mode by default — it returns realistic hardcoded
data that reflects the real CORE page structure so you can test the pipeline
without live HTTP calls. Set `mock=False` to hit the live URL.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup

from .base_scraper import BaseScraper
from .models import (
    IncentiveType,
    JurisdictionLevel,
    ScrapedIncentive,
)

# ── Mock HTML that mirrors the real CalTrans CORE page structure ─────────────
MOCK_CORE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head><title>CORE - CalTrans</title></head>
<body>
  <main id="main-content">
    <h1 class="page-title">
      California Opportunity for Resilient Energy (CORE) Program
    </h1>

    <div class="container--content">
      <p class="program-intro">
        The CORE Program provides capital funding to California transit agencies and
        eligible operators for the procurement of zero-emission vehicles (ZEVs) and
        associated charging or fueling infrastructure. The program is designed to
        accelerate fleet electrification and reduce greenhouse gas (GHG) emissions
        across the state's public transportation network.
      </p>
      <p>
        Grants are awarded on a competitive basis. Funding cycles open annually,
        with up to $25 million available per fiscal year. Projects are scored on
        GHG reduction potential, equity, and operational readiness.
      </p>
      <p>
        Awardees must comply with California's prevailing wage laws and
        Buy America requirements for federally funded portions of the project.
      </p>

      <h2 id="eligibility">Eligibility Requirements</h2>
      <ul id="eligibility-list">
        <li>Applicant must be a California public transit agency or qualified private operator under contract with a public agency</li>
        <li>Vehicles procured must be zero-emission (battery-electric or hydrogen fuel cell)</li>
        <li>Charging or fueling infrastructure must directly support the procured ZE fleet</li>
        <li>Minimum 3-year operational commitment in California post-award</li>
        <li>Applications must include a Climate Action Plan or equivalent sustainability document</li>
        <li>Cost-share of at least 20% required from non-state funding sources</li>
        <li>Prevailing wage requirements apply to all construction and installation activities</li>
      </ul>

      <h2 id="funding">Funding Details</h2>
      <table class="funding-table">
        <tr>
          <th>Category</th><th>Max Grant Amount</th>
        </tr>
        <tr>
          <td>Zero-Emission Bus Procurement</td>
          <td>$25,000,000</td>
        </tr>
        <tr>
          <td>Charging Infrastructure</td>
          <td>$5,000,000</td>
        </tr>
      </table>

      <p id="deadline-info">
        Application deadline: <strong class="deadline-date">March 31, 2025</strong>.
        Application window opens October 1, 2024.
      </p>

      <a href="/programs/rail-and-mass-transportation/core/apply" class="btn-apply">
        Apply for CORE Funding
      </a>
    </div>
  </main>
</body>
</html>
"""


class CalTransCOREScraper(BaseScraper):
    """
    Scraper for the CalTrans CORE Zero-Emission Transit Capital Program.

    In MOCK mode (default), parses the bundled ``MOCK_CORE_HTML`` to demonstrate
    the extraction logic. In live mode, fetches the real CalTrans page.
    """

    SOURCE_NAME = "caltrans_core_scraper"
    BASE_URL = "https://dot.ca.gov/programs/rail-and-mass-transportation/core"

    def __init__(self, mock: bool = True):
        super().__init__()
        self.mock = mock

    # ── Public API ────────────────────────────────────────────────────────

    def scrape(self) -> list[ScrapedIncentive]:
        html = MOCK_CORE_HTML if self.mock else self.fetch(self.BASE_URL)
        return self._parse_page(html, source_url=self.BASE_URL)

    # ── Extraction Logic ──────────────────────────────────────────────────

    def _parse_page(self, html: str, source_url: str) -> list[ScrapedIncentive]:
        soup = self.parse(html)

        title = self._extract_title(soup)
        summary = self._extract_summary(soup)
        requirements = self._extract_requirements(soup)
        funding_amount = self._extract_max_funding(soup)
        deadline = self._extract_deadline(soup)

        # SS-002 §4 — do not emit stub rows when the live page didn't match
        # our extractors. Better to return zero than to ship a row with
        # empty summary + empty requirements that the DB-side quality gate
        # would just reject.
        if not summary.strip() or len(summary.strip()) < 20 or not requirements:
            self._log.warning(
                "incomplete extraction — skipping CalTrans CORE row",
                summary_chars=len(summary.strip()),
                requirements_count=len(requirements),
            )
            return []

        incentive = ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.STATE,
            jurisdiction_name="California",
            managing_agency="California Department of Transportation",
            agency_acronym="CalTrans",
            short_summary=summary,
            key_requirements=requirements,
            industry_categories=["Public Transit", "Fleet", "Infrastructure", "Clean Technology"],
            incentive_type=IncentiveType.GRANT,
            funding_amount=funding_amount,
            deadline=deadline,
            application_open_date=datetime(2024, 10, 1),
            source_url=source_url,
            program_code="CORE-2024",
            scraper_source=self.SOURCE_NAME,
        )

        return [incentive]

    # ── Field Extractors ──────────────────────────────────────────────────

    def _extract_title(self, soup: BeautifulSoup) -> str:
        return self.extract_text(soup, "h1.page-title") or "CalTrans CORE Program"

    def _extract_summary(self, soup: BeautifulSoup) -> str:
        """Grab the first 3 paragraphs from the content block."""
        intro = self.extract_text(soup, "p.program-intro")
        if intro:
            return intro
        return self.extract_paragraphs(soup, "div.container--content")

    def _extract_requirements(self, soup: BeautifulSoup) -> list[str]:
        """Extract the eligibility <ul> items."""
        reqs = self.extract_bullets(soup, "#eligibility-list")
        if not reqs:
            # Fallback: any <ul> under the eligibility heading
            h2 = soup.find("h2", id="eligibility")
            if h2:
                ul = h2.find_next("ul")
                if ul:
                    reqs = [li.get_text(strip=True) for li in ul.find_all("li")]
        return reqs

    def _extract_max_funding(self, soup: BeautifulSoup) -> Optional[float]:
        """
        Parse the first dollar amount in the funding table.
        Returns the amount as a float, or None if not found.
        """
        table = soup.select_one("table.funding-table")
        if not table:
            return None

        for td in table.select("td"):
            text = td.get_text(strip=True)
            match = re.search(r"\$([0-9,]+)", text)
            if match:
                try:
                    return float(match.group(1).replace(",", ""))
                except ValueError:
                    continue
        return None

    def _extract_deadline(self, soup: BeautifulSoup) -> Optional[datetime]:
        """
        Extract deadline from: <strong class="deadline-date">March 31, 2025</strong>
        Falls back to parsing any date-like string near "deadline" text.
        """
        el = soup.select_one("strong.deadline-date")
        if el:
            return self._parse_date(el.get_text(strip=True))

        # Fallback: scan paragraphs for "deadline" keyword
        for p in soup.select("p"):
            text = p.get_text()
            if "deadline" in text.lower():
                match = re.search(
                    r"(January|February|March|April|May|June|July|August|September|October|November|December)"
                    r"\s+\d{1,2},?\s+\d{4}",
                    text,
                )
                if match:
                    return self._parse_date(match.group(0))
        return None

    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        formats = ["%B %d, %Y", "%B %d %Y", "%m/%d/%Y", "%Y-%m-%d"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        return None
