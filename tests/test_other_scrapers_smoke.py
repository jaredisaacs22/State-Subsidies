"""
SS-002 §7.1 — Smoke-level contract tests for HTML-based scrapers.

CARB / CalTrans CORE / WAZIP scrape HTML pages, not JSON APIs. Each
ships with a hardcoded MOCK_*_HTML string that mirrors the live page
structure. This test suite asserts that:

  1. mock=True returns at least 1 ScrapedIncentive
  2. Every returned row has the contractually-required fields populated
  3. Every returned row matches its source's jurisdiction level
  4. Every returned row has a non-boilerplate title

When a source is being promoted to live writes (SS-002 §9 step 7),
this file should be replaced with a 20-row golden-fixture suite for
that source — the same shape as `test_grants_gov_parser.py`.
"""

from __future__ import annotations

import pytest

from scrapers.carb_scraper import CARBScraper
from scrapers.caltrans_core_scraper import CalTransCOREScraper
from scrapers.ct_green_bank_scraper import CTGreenBankScraper
from scrapers.dsire_scraper import DSIREScraper
from scrapers.ira_credits_scraper import IRACreditsScraper
from scrapers.masscec_scraper import MassCECScraper
from scrapers.nj_clean_energy_scraper import NJCleanEnergyScraper
from scrapers.nyserda_scraper import NYSERDAScraper
from scrapers.usda_rural_development_scraper import USDAFuralDevelopmentScraper
from scrapers.wazip_scraper import WazipScraper
from scrapers.models import IncentiveType, JurisdictionLevel, ScrapedIncentive


SCRAPERS = [
    ("CARB",          CARBScraper,                    JurisdictionLevel.AGENCY),
    ("CalTrans CORE", CalTransCOREScraper,             JurisdictionLevel.STATE),
    ("WAZIP",         WazipScraper,                   JurisdictionLevel.AGENCY),
    ("DSIRE",         DSIREScraper,                   JurisdictionLevel.STATE),
    ("NYSERDA",       NYSERDAScraper,                 JurisdictionLevel.STATE),
    ("USDA RD",       USDAFuralDevelopmentScraper,    JurisdictionLevel.FEDERAL),
    ("MassCEC",       MassCECScraper,                 JurisdictionLevel.STATE),
    ("CT Green Bank", CTGreenBankScraper,             JurisdictionLevel.STATE),
    ("IRA Credits",   IRACreditsScraper,              JurisdictionLevel.FEDERAL),
    ("NJ Clean Energy", NJCleanEnergyScraper,         JurisdictionLevel.STATE),
]


@pytest.mark.parametrize("name,cls,expected_level", SCRAPERS, ids=[s[0] for s in SCRAPERS])
def test_mock_mode_returns_incentives(name, cls, expected_level):
    """Mock mode must return at least one valid ScrapedIncentive."""
    scraper = cls(mock=True)
    results = scraper.scrape()
    assert isinstance(results, list)
    assert len(results) >= 1, f"{name} mock mode returned no incentives"
    for inc in results:
        assert isinstance(inc, ScrapedIncentive), f"{name} returned non-ScrapedIncentive: {type(inc)}"


@pytest.mark.parametrize("name,cls,expected_level", SCRAPERS, ids=[s[0] for s in SCRAPERS])
def test_required_fields_populated(name, cls, expected_level):
    """Every row must have title, source_url, and at least one requirement."""
    scraper = cls(mock=True)
    for inc in scraper.scrape():
        assert inc.title and len(inc.title.strip()) >= 5, f"{name}: empty/short title: {inc.title!r}"
        assert inc.source_url and inc.source_url.startswith("http"), f"{name}: bad source_url: {inc.source_url!r}"
        assert inc.short_summary and len(inc.short_summary.strip()) >= 20, f"{name}: empty/short summary"
        assert inc.managing_agency, f"{name}: empty managing_agency"
        assert isinstance(inc.incentive_type, IncentiveType), f"{name}: incentive_type not enum"
        assert isinstance(inc.key_requirements, list) and len(inc.key_requirements) >= 1, f"{name}: no key_requirements"


@pytest.mark.parametrize("name,cls,expected_level", SCRAPERS, ids=[s[0] for s in SCRAPERS])
def test_jurisdiction_level_correct(name, cls, expected_level):
    """Each scraper's rows must report the correct jurisdiction level."""
    scraper = cls(mock=True)
    for inc in scraper.scrape():
        assert inc.jurisdiction_level == expected_level, (
            f"{name}: expected {expected_level}, got {inc.jurisdiction_level}"
        )


@pytest.mark.parametrize("name,cls,expected_level", SCRAPERS, ids=[s[0] for s in SCRAPERS])
def test_no_boilerplate_titles(name, cls, expected_level):
    """SS-002 §4 — no row may carry an April-20-class boilerplate title."""
    BOILERPLATE = ["federal grant opportunity:", "general business"]
    scraper = cls(mock=True)
    for inc in scraper.scrape():
        title_lower = inc.title.lower()
        for bad in BOILERPLATE:
            assert not title_lower.startswith(bad), (
                f"{name}: boilerplate title slipped through: {inc.title!r}"
            )
