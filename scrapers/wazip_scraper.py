"""
WAZIP (West Antelope & San Joaquin Valley) Off-Road Equipment Scraper
======================================================================
Target: https://www.valleyair.org/grant_programs/WAZIP/wazip_main.htm

Page structure (Valley Air District site):
  - Program name: <h1> or <h2> within .page-content
  - Summary paragraphs: <div.page-content> > p
  - Eligible equipment types: <ul> with id containing "equip" or adjacent to
    heading with "eligible" text
  - Funding tiers: often in a <table> with dollar amounts
  - Deadline: <p> or <div> containing "deadline" or "application period"
  - Program contact: <div.contact-info>

This scraper also ships with a MOCK mode for pipeline testing.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup

from .base_scraper import BaseScraper
from .models import IncentiveType, JurisdictionLevel, ScrapedIncentive

# ── Mock HTML mirroring the real Valley Air WAZIP page structure ─────────────
MOCK_WAZIP_HTML = """
<!DOCTYPE html>
<html lang="en">
<head><title>WAZIP - Valley Air District</title></head>
<body>
  <div class="page-content">
    <h1>WAZIP: Work Area Zero-emission Incentive Program for Off-Road Equipment</h1>

    <div class="program-summary">
      <p>
        The WAZIP program provides vouchers to San Joaquin Valley businesses and
        operators to replace older, high-polluting off-road equipment with newer,
        cleaner zero-emission (ZE) or near-zero-emission (NZE) models.
        Equipment categories include construction machinery, agricultural tractors,
        forklifts, and mobile generators.
      </p>
      <p>
        Voucher amounts cover up to 80% of the incremental cost difference between
        the scrap unit and the new ZE/NZE replacement, capped at the amounts shown
        in the funding table below. Funding is first-come, first-served until
        available funds are exhausted.
      </p>
    </div>

    <h2 id="eligibility">Eligibility Requirements</h2>
    <ul id="eligibility-requirements">
      <li>Equipment must be registered or primarily operated in the San Joaquin Valley Air Basin</li>
      <li>Existing (scrap) unit must be Tier 0, Tier 1, or Tier 2 diesel engine</li>
      <li>Scrap unit must have been owned and operated by applicant for at least 2 years prior to application</li>
      <li>Replacement must be zero-emission (ZE) or near-zero-emission (NZE) certified equipment</li>
      <li>Applicant must be a business, non-profit, or government entity — individual consumers not eligible</li>
      <li>Purchased equipment must remain in the Valley for a minimum of 5 years post-purchase</li>
      <li>Must be a mobile BESS unit if applying under the energy storage provision</li>
      <li>Applicants may not have an outstanding violation with the Valley Air District</li>
    </ul>

    <h2 id="funding">Funding Tiers</h2>
    <table class="funding-tiers" border="1">
      <thead>
        <tr>
          <th>Equipment Category</th>
          <th>Max Voucher Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Agricultural Tractor (&lt;75 hp)</td>
          <td>$50,000</td>
        </tr>
        <tr>
          <td>Agricultural Tractor (&ge;75 hp)</td>
          <td>$150,000</td>
        </tr>
        <tr>
          <td>Construction Equipment (Excavator, Loader)</td>
          <td>$250,000</td>
        </tr>
        <tr>
          <td>Forklift / Material Handler</td>
          <td>$75,000</td>
        </tr>
        <tr>
          <td>Mobile Generator / BESS Unit</td>
          <td>$500,000</td>
        </tr>
      </tbody>
    </table>

    <div class="program-dates">
      <p>
        <strong>Application Deadline:</strong>
        <span class="deadline">June 30, 2025</span>
      </p>
      <p>Applications accepted on a rolling basis until funds are exhausted or the deadline is reached.</p>
    </div>

    <div class="contact-info">
      <p>Contact: Valley Air District — Incentives Programs<br/>
      Phone: (559) 230-6000</p>
    </div>
  </div>
</body>
</html>
"""


class WazipScraper(BaseScraper):
    """
    Scraper for the WAZIP Off-Road Equipment Replacement Program
    (San Joaquin Valley Air Pollution Control District).

    In MOCK mode (default), parses ``MOCK_WAZIP_HTML``.
    Set ``mock=False`` to hit the live site.
    """

    SOURCE_NAME = "wazip_scraper"
    BASE_URL = "https://www.valleyair.org/grant_programs/WAZIP/wazip_main.htm"

    def __init__(self, mock: bool = True):
        super().__init__()
        self.mock = mock

    # ── Public API ────────────────────────────────────────────────────────

    def scrape(self) -> list[ScrapedIncentive]:
        if not self.mock:
            # SS-002: live URL https://www.valleyair.org/grant_programs/WAZIP/wazip_main/
            # returned HTTP 404 in 2026-04 dry-runs. The Valley Air District
            # restructured their site and the WAZIP path no longer exists.
            # Until the new URL is identified and selectors re-validated,
            # live mode is disabled. Mock mode remains active for tests.
            self._log.warning("WAZIP live URL is dead (HTTP 404); skipping live scrape")
            return []
        html = MOCK_WAZIP_HTML
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
        # our extractors. Same rule as CalTrans CORE: better zero than empty.
        if not summary.strip() or len(summary.strip()) < 20 or not requirements:
            self._log.warning(
                "incomplete extraction — skipping WAZIP row",
                summary_chars=len(summary.strip()),
                requirements_count=len(requirements),
            )
            return []

        incentive = ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.AGENCY,
            jurisdiction_name="San Joaquin Valley, CA",
            managing_agency="San Joaquin Valley Air Pollution Control District",
            agency_acronym="WAZIP",
            short_summary=summary,
            key_requirements=requirements,
            industry_categories=["Construction", "Agriculture", "Logistics", "Fleet"],
            incentive_type=IncentiveType.VOUCHER,
            funding_amount=funding_amount,
            deadline=deadline,
            source_url=source_url,
            program_code="WAZIP-2024",
            scraper_source=self.SOURCE_NAME,
        )

        return [incentive]

    # ── Field Extractors ──────────────────────────────────────────────────

    def _extract_title(self, soup: BeautifulSoup) -> str:
        h1 = soup.select_one("h1")
        if h1:
            # Strip "WAZIP: " prefix if present for cleaner title
            text = h1.get_text(strip=True)
            return re.sub(r"^WAZIP:\s*", "WAZIP ", text)
        return "WAZIP Off-Road Equipment Replacement Program"

    def _extract_summary(self, soup: BeautifulSoup) -> str:
        """Extract first two <p> tags from .program-summary."""
        container = soup.select_one("div.program-summary")
        if container:
            paras = [p.get_text(strip=True) for p in container.select("p")]
            return " ".join(paras[:2])
        return self.extract_paragraphs(soup, "div.page-content")

    def _extract_requirements(self, soup: BeautifulSoup) -> list[str]:
        """Extract eligibility <li> items."""
        reqs = self.extract_bullets(soup, "#eligibility-requirements")
        if not reqs:
            h2 = soup.find("h2", id="eligibility")
            if h2:
                ul = h2.find_next("ul")
                if ul:
                    reqs = [li.get_text(strip=True) for li in ul.find_all("li")]
        return reqs

    def _extract_max_funding(self, soup: BeautifulSoup) -> Optional[float]:
        """
        Read the funding tiers table and return the highest dollar amount.
        WAZIP often has multiple tiers; we return the max.
        """
        table = soup.select_one("table.funding-tiers")
        if not table:
            table = soup.select_one("table")
        if not table:
            return None

        amounts: list[float] = []
        for td in table.select("td"):
            text = td.get_text(strip=True)
            match = re.search(r"\$([0-9,]+)", text)
            if match:
                try:
                    amounts.append(float(match.group(1).replace(",", "")))
                except ValueError:
                    continue

        return max(amounts) if amounts else None

    def _extract_deadline(self, soup: BeautifulSoup) -> Optional[datetime]:
        """Extract deadline from <span class="deadline"> or surrounding text."""
        el = soup.select_one("span.deadline")
        if el:
            return self._parse_date(el.get_text(strip=True))

        for p in soup.select("p"):
            text = p.get_text()
            if "deadline" in text.lower():
                match = re.search(
                    r"(January|February|March|April|May|June|July|August|"
                    r"September|October|November|December)\s+\d{1,2},?\s+\d{4}",
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
