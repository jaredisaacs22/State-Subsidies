"""
Illinois Energy Now / ComEd / Nicor Gas Scraper
================================================
Scrapes the Illinois Energy Now (IEN) and utility-administered program listings:
  https://www.illinoisenergynow.com/
  https://www.comed.com/WaysToSave/
  https://www.nicorgasenergysaver.com/

Illinois Energy Now is the state's primary energy efficiency program portal,
administered under the Illinois Energy Efficiency Portfolio Standard (EEPS).
Programs are delivered through the state's major utilities (ComEd for electric,
Nicor Gas, Peoples Gas for natural gas) and coordinated by the Illinois Commerce
Commission (ICC). Illinois is the Midwest's largest energy efficiency market.

Quality
-------
- STATE jurisdiction / Illinois
- Mock mode: 5 realistic IEN fixtures (residential, commercial, industrial, solar, EV)
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

BASE = "https://www.illinoisenergynow.com"
INDEX_URLS = [
    f"{BASE}/residential",
    f"{BASE}/business",
]

TYPE_CLUES: list[tuple[str, IncentiveType]] = [
    ("rebate",      IncentiveType.POINT_OF_SALE_REBATE),
    ("incentive",   IncentiveType.POINT_OF_SALE_REBATE),
    ("grant",       IncentiveType.GRANT),
    ("loan",        IncentiveType.LOAN),
    ("financing",   IncentiveType.LOAN),
    ("tax credit",  IncentiveType.TAX_CREDIT),
    ("voucher",     IncentiveType.VOUCHER),
]

INDUSTRY_CLUES: list[tuple[str, str]] = [
    ("solar",       "Clean Technology"),
    ("renewable",   "Clean Technology"),
    ("storage",     "Energy Storage"),
    ("battery",     "Energy Storage"),
    ("electric veh","EV Charging"),
    ("ev ",         "EV Charging"),
    ("heat pump",   "Energy Management"),
    ("efficiency",  "Energy Management"),
    ("weatheriz",   "Energy Management"),
    ("hvac",        "Energy Management"),
    ("lighting",    "Energy Management"),
    ("insulation",  "Energy Management"),
    ("industrial",  "Manufacturing"),
    ("commercial",  "Technology"),
    ("low-income",  "Government & Nonprofit"),
]


def _infer_type(title: str, summary: str) -> IncentiveType:
    blob = (title + " " + summary).lower()
    for kw, t in TYPE_CLUES:
        if kw in blob:
            return t
    return IncentiveType.POINT_OF_SALE_REBATE


def _infer_industries(title: str, summary: str) -> list[str]:
    blob = (title + " " + summary).lower()
    found: list[str] = []
    for kw, cat in INDUSTRY_CLUES:
        if kw in blob and cat not in found:
            found.append(cat)
    return found or ["Energy Management"]


class IllinoisEnergyScraper(BaseScraper):
    """Scrapes Illinois Energy Now program listings for Illinois incentives."""

    SOURCE_NAME = "illinois_energy_now"
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
        for index_url in INDEX_URLS:
            try:
                html = self.fetch(index_url)
                soup = self.parse(html)
                for a in soup.select("a[href]"):
                    href = str(a.get("href", ""))
                    if (href.startswith("/") or href.startswith(BASE)) and len(href) > 3:
                        full = href if href.startswith("http") else f"{BASE}{href}"
                        if (
                            full not in all_links
                            and BASE in full
                            and full not in INDEX_URLS
                        ):
                            all_links.append(full)
            except Exception as e:
                self._log.debug("ien index failed", url=index_url, error=str(e))

        results: list[ScrapedIncentive] = []
        for url in all_links[: self.max_programs]:
            try:
                inc = self._scrape_detail(url)
                if inc:
                    results.append(inc)
            except Exception as e:
                self._log.debug("ien detail failed", url=url, error=str(e))

        self._log.info("ien scraped", links=len(all_links), kept=len(results))
        return results

    def _scrape_detail(self, url: str) -> Optional[ScrapedIncentive]:
        html = self.fetch(url)
        soup = self.parse(html)

        title = self.extract_text(soup, "h1") or self.extract_text(soup, "h2")
        if len(title) < 5:
            return None

        summary = ""
        for sel in [".field-items", "main", ".main-content", "#content"]:
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
            jurisdiction_name="Illinois",
            managing_agency="Illinois Energy Now",
            agency_acronym="IEN",
            short_summary=summary[:1500],
            key_requirements=["See program website for full eligibility details"],
            industry_categories=_infer_industries(title, summary),
            incentive_type=_infer_type(title, summary),
            source_url=url,
            program_code=f"IEN-{re.sub(r'[^a-z0-9]', '-', title.lower())[:28]}",
            status=IncentiveStatus.ACTIVE,
            source_hash=compute_source_hash(f"{title}|{summary}|{url}"),
            parse_confidence=ParseConfidence.MEDIUM,
            scraper_source=self.SOURCE_NAME,
        )

    def _mock_results(self) -> list[ScrapedIncentive]:
        return [
            ScrapedIncentive(
                title="ComEd — Residential Rebates for Energy Efficient Equipment",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Illinois",
                managing_agency="Illinois Energy Now",
                agency_acronym="IEN",
                short_summary=(
                    "ComEd's Illinois Energy Now residential program provides rebates to "
                    "northern Illinois homeowners and renters for installing qualifying "
                    "energy-efficient equipment. Rebates are available for smart thermostats "
                    "($100), LED lighting kits (up to $50), ENERGY STAR room air conditioners "
                    "($50), and advanced power strips ($10 each, limit 2). Income-qualified "
                    "customers may be eligible for additional appliance rebates."
                ),
                key_requirements=[
                    "Must be a residential ComEd electric customer in northern Illinois",
                    "Equipment must be ENERGY STAR certified or meet program efficiency standards",
                    "Must submit rebate application within 90 days of purchase",
                    "Income-qualified customers may apply for enhanced appliance rebates",
                    "Limit of one rebate per equipment type per customer per year",
                ],
                industry_categories=["Energy Management"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=100,
                source_url="https://www.comed.com/WaysToSave/ForYourHome/Pages/ResidentialRebates.aspx",
                program_code="IEN-COMED-RES-REBATES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Illinois Shines — Solar for All and Adjustable Block Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Illinois",
                managing_agency="Illinois Energy Now",
                agency_acronym="IEN",
                short_summary=(
                    "Illinois Shines (the Adjustable Block Program) provides incentives for "
                    "rooftop and community solar installations through Illinois Renewable "
                    "Energy Credits (IRECs). Residential and small commercial systems receive "
                    "upfront payments based on 15-year projected production. The Solar for All "
                    "sub-program specifically targets low-income households and environmental "
                    "justice communities with enhanced incentives and no-cost solar options."
                ),
                key_requirements=[
                    "Must be an Illinois resident or small business owner",
                    "Solar system must be installed by a registered Illinois Shines Approved Vendor",
                    "System must be interconnected with ComEd or Ameren Illinois",
                    "Low-income households may qualify for Solar for All at no cost",
                    "Community solar subscriptions available for renters and those unable to install rooftop solar",
                ],
                industry_categories=["Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                source_url="https://illinoisshines.com/",
                program_code="IEN-ILLINOIS-SHINES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="ComEd — Business Energy Efficiency Rebate Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Illinois",
                managing_agency="Illinois Energy Now",
                agency_acronym="IEN",
                short_summary=(
                    "Illinois Energy Now business program provides prescriptive and custom "
                    "incentives to commercial and industrial ComEd customers for energy "
                    "efficiency improvements. Prescriptive rebates are available for LED "
                    "lighting, HVAC, motors, variable frequency drives, and refrigeration. "
                    "Custom incentives are calculated at $0.09/kWh of first-year savings for "
                    "non-standard measures. Pre-approval required for projects over $25,000."
                ),
                key_requirements=[
                    "Must be a commercial or industrial ComEd customer in northern Illinois",
                    "Equipment must meet program technical specifications",
                    "Custom projects over $25,000 require pre-approval before installation",
                    "Post-installation verification required for custom incentives",
                    "Application must be submitted within 180 days of installation",
                ],
                industry_categories=["Energy Management", "Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                source_url="https://www.comed.com/WaysToSave/ForYourBusiness/Pages/BusinessRebates.aspx",
                program_code="IEN-COMED-BIZ-REBATES",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Illinois Climate Bank — Clean Energy Jobs Act Funding",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Illinois",
                managing_agency="Illinois Energy Now",
                agency_acronym="IEN",
                short_summary=(
                    "The Illinois Climate and Equitable Jobs Act (CEJA, 2021) created the "
                    "Illinois Climate Bank to finance clean energy projects. The bank provides "
                    "loans, loan guarantees, and credit enhancements for solar, wind, storage, "
                    "energy efficiency, and clean transportation projects. Specific programs "
                    "target environmental justice communities and low-income areas. Projects "
                    "can receive below-market financing up to $5 million per project."
                ),
                key_requirements=[
                    "Must be an Illinois-based project or business",
                    "Project must be in a qualifying clean energy sector (solar, wind, storage, EV, efficiency)",
                    "Environmental justice community projects receive priority consideration",
                    "Projects must meet prevailing wage and apprenticeship requirements",
                    "Application reviewed by Illinois Climate Bank investment committee",
                ],
                industry_categories=["Clean Technology", "Energy Storage", "Government & Nonprofit"],
                incentive_type=IncentiveType.LOAN,
                funding_amount=5000000,
                source_url="https://www.illinoisclimatebank.com/",
                program_code="IEN-CLIMATE-BANK",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
            ScrapedIncentive(
                title="Illinois Electric Vehicle Rebate Program",
                jurisdiction_level=JurisdictionLevel.STATE,
                jurisdiction_name="Illinois",
                managing_agency="Illinois Energy Now",
                agency_acronym="IEN",
                short_summary=(
                    "Illinois provides a $4,000 rebate for the purchase or lease of a new "
                    "qualifying battery electric or plug-in hybrid vehicle. Income-qualified "
                    "buyers (below 400% of federal poverty level) receive an additional "
                    "$2,000 bonus rebate for a total of $6,000. The program is administered "
                    "by the Illinois Environmental Protection Agency (IEPA) under the Climate "
                    "and Equitable Jobs Act. Stackable with federal §30D credit."
                ),
                key_requirements=[
                    "Must be an Illinois resident at time of purchase or lease",
                    "Vehicle must be a new BEV or PHEV with MSRP at or below $55,000",
                    "Standard rebate: $4,000; income-qualified (≤400% FPL): $6,000",
                    "Vehicle must be registered and primarily operated in Illinois",
                    "Application submitted to IEPA within 90 days of purchase/lease",
                ],
                industry_categories=["EV Charging", "Clean Technology"],
                incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
                funding_amount=4000,
                source_url="https://www2.illinois.gov/epa/topics/energy/electric-vehicles/Pages/ev-rebate.aspx",
                program_code="IEN-EV-REBATE",
                scraper_source=self.SOURCE_NAME,
                parse_confidence=ParseConfidence.HIGH,
            ),
        ]
