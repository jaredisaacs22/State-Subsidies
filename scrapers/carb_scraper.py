"""
CARB Incentive Programs Scraper
=================================
Targets: CARB's main incentive/funding page and HVIP.
  - https://ww2.arb.ca.gov/our-work/programs/low-carbon-transportation-investments
  - https://www.californiahvip.org/

Uses BeautifulSoup to extract program cards and funding info.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from bs4 import BeautifulSoup

from .base_scraper import BaseScraper
from .models import IncentiveType, JurisdictionLevel, ScrapedIncentive

MOCK_CARB_HTML = """
<!DOCTYPE html>
<html>
<head><title>Low Carbon Transportation - CARB</title></head>
<body>
<main class="main-content">
  <h1 class="page-heading">Low Carbon Transportation Investments and AQIP</h1>

  <div class="program-description">
    <p>
      CARB administers the Low Carbon Transportation (LCT) program to fund clean
      vehicle and equipment projects that reduce greenhouse gas emissions and
      criteria pollutants, with a focus on disadvantaged communities.
    </p>
  </div>

  <div class="program-list">

    <div class="program-card" id="hvip">
      <h2 class="program-title">Hybrid and Zero-Emission Truck and Bus Voucher Incentive Project (HVIP)</h2>
      <div class="program-type-badge">Point-of-Sale Voucher</div>
      <div class="program-summary">
        <p>
          HVIP provides point-of-sale vouchers to reduce the purchase price of
          zero-emission and hybrid trucks, buses, and other commercial vehicles.
          Voucher amounts range from $4,000 to $300,000 depending on vehicle type
          and fleet equity status.
        </p>
      </div>
      <h3>Eligibility Requirements</h3>
      <ul class="eligibility-list">
        <li>Vehicle must appear on HVIP's approved vehicle list at time of voucher redemption</li>
        <li>Purchaser must be a California-based business, fleet operator, or public agency</li>
        <li>Vehicle must be registered and operated primarily in California</li>
        <li>Pre-approval required before vehicle purchase; no retroactive vouchers</li>
        <li>Small fleets (≤10 trucks) eligible for equity bonus up to $10,000</li>
        <li>Vehicle must remain in California for minimum 3 years after purchase</li>
      </ul>
      <div class="program-funding">
        <span class="max-amount">$300,000</span>
        <span class="deadline">Rolling — open until funds exhausted</span>
      </div>
      <a href="https://www.californiahvip.org" class="program-link">Apply / Learn More</a>
    </div>

    <div class="program-card" id="clean-cars">
      <h2 class="program-title">Clean Cars 4 All (CC4A)</h2>
      <div class="program-type-badge">Rebate</div>
      <div class="program-summary">
        <p>
          CC4A provides rebates to low-income Californians to scrap older,
          high-polluting vehicles and replace them with cleaner options, including
          zero-emission vehicles. Available in selected air districts.
        </p>
      </div>
      <h3>Eligibility Requirements</h3>
      <ul class="eligibility-list">
        <li>Vehicle owner must be income-qualified (at or below 225% of federal poverty level)</li>
        <li>Vehicle to be scrapped must be a 2000 or older model year</li>
        <li>Must reside in a participating air district (Bay Area, Greater LA, San Joaquin Valley, or Sacramento)</li>
        <li>Replacement vehicle must be zero-emission or plug-in hybrid</li>
      </ul>
      <div class="program-funding">
        <span class="max-amount">$12,000</span>
        <span class="deadline">Rolling — varies by air district</span>
      </div>
      <a href="https://www.cleanvehiclerebate.org/cc4a" class="program-link">Apply / Learn More</a>
    </div>

  </div>
</main>
</body>
</html>
"""


class CARBScraper(BaseScraper):
    """
    Scraper for CARB Low Carbon Transportation incentive programs.
    Extracts all program cards from the CARB incentives page.
    """

    SOURCE_NAME = "carb_scraper"
    BASE_URL = "https://ww2.arb.ca.gov/our-work/programs/low-carbon-transportation-investments"

    INCENTIVE_TYPE_MAP = {
        "voucher": IncentiveType.VOUCHER,
        "rebate": IncentiveType.POINT_OF_SALE_REBATE,
        "grant": IncentiveType.GRANT,
        "tax credit": IncentiveType.TAX_CREDIT,
        "loan": IncentiveType.LOAN,
        "subsidy": IncentiveType.SUBSIDY,
    }

    def __init__(self, mock: bool = True):
        super().__init__()
        self.mock = mock

    def scrape(self) -> list[ScrapedIncentive]:
        if not self.mock:
            # SS-002: live URL https://ww2.arb.ca.gov/our-work/programs/low-carbon-transportation-investments
            # returned HTTP 404 in 2026-04 dry-runs. CARB restructured the
            # programs site. Until a stable replacement URL + selectors are
            # validated, live mode is disabled. Mock mode remains active.
            self._log.warning("CARB live URL is dead (HTTP 404); skipping live scrape")
            return []
        html = MOCK_CARB_HTML
        return self._parse_page(html)

    def _parse_page(self, html: str) -> list[ScrapedIncentive]:
        soup = self.parse(html)
        results = []

        cards = soup.select("div.program-card")
        if not cards:
            # Fallback: try to parse as a single program page
            results.append(self._parse_single_program(soup))
        else:
            for card in cards:
                incentive = self._parse_card(card)
                if incentive:
                    results.append(incentive)

        return [r for r in results if r is not None]

    def _parse_card(self, card: BeautifulSoup) -> Optional[ScrapedIncentive]:
        try:
            title = self.extract_text(card, "h2.program-title") or self.extract_text(card, "h2")
            if not title:
                return None

            # Incentive type
            type_badge = self.extract_text(card, "div.program-type-badge").lower()
            incentive_type = IncentiveType.GRANT
            for keyword, itype in self.INCENTIVE_TYPE_MAP.items():
                if keyword in type_badge:
                    incentive_type = itype
                    break

            # Summary
            summary = self.extract_paragraphs(card, "div.program-summary")

            # Requirements
            requirements = self.extract_bullets(card, "ul.eligibility-list")

            # Funding amount
            amount_el = card.select_one("span.max-amount")
            funding = None
            if amount_el:
                match = re.search(r"\$([0-9,]+)", amount_el.get_text())
                if match:
                    funding = float(match.group(1).replace(",", ""))

            # Source URL
            link_el = card.select_one("a.program-link")
            source_url = link_el["href"] if link_el else self.BASE_URL

            return ScrapedIncentive(
                title=title,
                jurisdiction_level=JurisdictionLevel.AGENCY,
                jurisdiction_name="California",
                managing_agency="California Air Resources Board",
                agency_acronym="CARB",
                short_summary=summary or f"CARB incentive program: {title}",
                key_requirements=requirements or ["See official CARB page for requirements"],
                industry_categories=["Fleet", "Clean Technology", "Logistics"],
                incentive_type=incentive_type,
                funding_amount=funding,
                source_url=str(source_url),
                scraper_source=self.SOURCE_NAME,
            )
        except Exception as e:
            self._log.warning("Failed to parse CARB card", error=str(e))
            return None

    def _parse_single_program(self, soup: BeautifulSoup) -> Optional[ScrapedIncentive]:
        title = self.extract_text(soup, "h1.page-heading") or "CARB LCT Program"
        summary = self.extract_paragraphs(soup, "div.program-description")
        requirements = self.extract_bullets(soup, "ul.eligibility-list")
        return ScrapedIncentive(
            title=title,
            jurisdiction_level=JurisdictionLevel.AGENCY,
            jurisdiction_name="California",
            managing_agency="California Air Resources Board",
            agency_acronym="CARB",
            short_summary=summary or title,
            key_requirements=requirements or [],
            industry_categories=["Fleet", "Clean Technology"],
            incentive_type=IncentiveType.GRANT,
            source_url=self.BASE_URL,
            scraper_source=self.SOURCE_NAME,
        )
