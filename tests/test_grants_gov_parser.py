"""
SS-002 §7.1 — Contract tests for Grants.gov parser.

These tests are golden-fixture driven. Each fixture row in
`fixtures/grants_gov/sample_opportunities.json` carries an `_expected`
block describing what the parser MUST produce. If the parser changes
behavior in a way that breaks the contract, these tests fail in CI
before any DB write step runs.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scrapers.grants_gov_scraper import GrantsGovScraper

FIXTURES = Path(__file__).parent / "fixtures" / "grants_gov" / "sample_opportunities.json"


@pytest.fixture(scope="module")
def opportunities() -> list[dict]:
    return json.loads(FIXTURES.read_text())


@pytest.fixture(scope="module")
def scraper() -> GrantsGovScraper:
    return GrantsGovScraper(mock=True)


def test_fixture_file_loads(opportunities):
    assert isinstance(opportunities, list) and len(opportunities) >= 5


def test_passing_opportunities_parse_to_scraped_incentive(opportunities, scraper):
    """Every fixture marked `passes_quality_gate: true` MUST yield a non-None ScrapedIncentive."""
    passing = [o for o in opportunities if o["_expected"]["passes_quality_gate"]]
    assert len(passing) >= 3, "fixture must contain at least 3 passing examples"
    for opp in passing:
        result = scraper._parse_opportunity({k: v for k, v in opp.items() if not k.startswith("_")})
        assert result is not None, f"parser returned None for passing fixture {opp['id']}"
        assert result.title == opp["title"]
        assert result.source_url.startswith("https://www.grants.gov")
        assert result.incentive_type.value == opp["_expected"].get("incentive_type", "GRANT")
        assert result.jurisdiction_level.value == "FEDERAL"
        assert len(result.short_summary) >= 100
        assert len(result.key_requirements) >= 1


def test_failing_opportunities_are_rejected(opportunities, scraper):
    """Every fixture marked `passes_quality_gate: false` MUST yield None (filtered out)."""
    failing = [o for o in opportunities if not o["_expected"]["passes_quality_gate"]]
    assert len(failing) >= 2, "fixture must contain at least 2 rejection examples"
    for opp in failing:
        result = scraper._parse_opportunity({k: v for k, v in opp.items() if not k.startswith("_")})
        assert result is None, f"parser should have rejected fixture {opp['id']} but returned {result}"


def test_industry_categories_inferred_correctly(opportunities, scraper):
    """Categories must contain expected keywords from the KEYWORD_CATEGORY_MAP."""
    for opp in opportunities:
        if not opp["_expected"]["passes_quality_gate"]:
            continue
        expected_cats = opp["_expected"].get("industry_categories_includes", [])
        if not expected_cats:
            continue
        result = scraper._parse_opportunity({k: v for k, v in opp.items() if not k.startswith("_")})
        for expected in expected_cats:
            assert expected in result.industry_categories, (
                f"{opp['id']}: expected category {expected!r} in {result.industry_categories}"
            )


def test_contact_text_in_agency_field_is_rejected_or_cleaned(scraper):
    """
    Regression test for dry-run #5 finding: api.grants.gov detail responses
    sometimes return contact-person text in agencyName ("Jose Berna\\nGrantor").
    Parser must either substitute a real agency from AGENCY_MAP or refuse the row.
    """
    # Case A: agencyCode known → AGENCY_MAP wins, contact text is ignored
    opp_a = {
        "id": "TEST-A",
        "number": "USDA-001",
        "title": "USDA Solar Demonstration Grant",
        "synopsis": (
            "USDA Rural Energy for America Program supports renewable energy "
            "and energy efficiency improvements for farms and rural small "
            "businesses. Grant covers 50% of project costs."
        ),
        "agencyCode": "USDA",
        "agencyName": "Jose Berna\nGrants Specialist",  # poison
        "awardCeiling": "1000000",
    }
    result_a = scraper._parse_opportunity(opp_a)
    assert result_a is not None
    assert result_a.managing_agency == "U.S. Department of Agriculture"
    assert "\n" not in result_a.managing_agency

    # Case B: agencyCode unknown + agencyName is contact text → row rejected
    opp_b = {
        "id": "TEST-B",
        "number": "MISC-001",
        "title": "Some Solar Innovation Grant",
        "synopsis": (
            "Funding to support solar innovation activities for small business "
            "applicants. Eligible expenses include equipment and installation."
        ),
        "agencyCode": "OBSCURE-AGENCY",
        "agencyName": "Nicole A Savoy\nGrantor",  # contact text, no map fallback
        "awardCeiling": "100000",
    }
    result_b = scraper._parse_opportunity(opp_b)
    assert result_b is None, "row with contact-text agency and no map fallback must be rejected"


def test_april_20_failure_class_blocked(scraper):
    """
    Regression test for the April 20 incident:
    "Federal grant opportunity:" prefixed boilerplate rows must be rejected.
    """
    poison = {
        "id": "POISON-001",
        "number": "X-0001",
        "title": "Federal grant opportunity: Innovation Hub",
        # Long enough to pass the synopsis-length gate — only the title prefix
        # gate should reject this row.
        "synopsis": (
            "This federal grant opportunity supports a broad range of solar and "
            "energy efficiency activities for small business and manufacturing "
            "applicants across the country. Eligible expenses include equipment, "
            "installation, and operations and maintenance costs."
        ),
        "agencyCode": "DOE",
        "awardCeiling": "100000",
    }
    assert scraper._parse_opportunity(poison) is None
