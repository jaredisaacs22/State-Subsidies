"""
Theme B (GAP-D2/D4) — batch shape alarms + row tripwires.
Also pins LESSONS #5/#16: the scheduler fail→ok overwrite regression.
"""

from datetime import datetime, timedelta

import pytest

from scrapers.batch_gate import (
    BATCH_REJECTION_ABORT_RATIO,
    MAX_PLAUSIBLE_FUNDING_USD,
    apply_tripwires,
    batch_alarms,
    normalize_row,
    row_tripwires,
)
from scrapers.models import (
    IncentiveStatus,
    IncentiveType,
    JurisdictionLevel,
    ScrapedIncentive,
)
from scrapers.scheduler import _run_scraper_list


def make_incentive(**overrides) -> ScrapedIncentive:
    base = dict(
        title="Solar Rebate Program",
        jurisdiction_level=JurisdictionLevel.STATE,
        jurisdiction_name="California",
        managing_agency="California Energy Commission",
        short_summary="A rebate for residential solar installations covering panels and inverters.",
        key_requirements=["Own the home", "Install qualifying panels"],
        industry_categories=["Energy"],
        incentive_type=IncentiveType.POINT_OF_SALE_REBATE,
        source_url="https://www.energy.ca.gov/solar-rebate",
    )
    base.update(overrides)
    return ScrapedIncentive(**base)


# ── Row tripwires (GAP-D4) ──────────────────────────────────────────────────

class TestRowTripwires:
    def test_clean_row_trips_nothing(self):
        assert row_tripwires(make_incentive(funding_amount=250_000.0)) == []

    def test_missing_funding_amount_is_fine(self):
        # None is an honest labeled gap — never a tripwire.
        assert row_tripwires(make_incentive(funding_amount=None)) == []

    def test_zero_funding_quarantined(self):
        # 0 is a parse artifact masquerading as data (no invented zeros).
        assert "funding_amount_not_positive" in row_tripwires(
            make_incentive(funding_amount=0.0)
        )

    def test_negative_funding_quarantined(self):
        assert "funding_amount_not_positive" in row_tripwires(
            make_incentive(funding_amount=-500.0)
        )

    def test_implausibly_large_funding_quarantined(self):
        assert "funding_amount_above_plausible_cap" in row_tripwires(
            make_incentive(funding_amount=MAX_PLAUSIBLE_FUNDING_USD * 2)
        )

    def test_http_source_url_quarantined(self):
        assert "source_url_not_https" in row_tripwires(
            make_incentive(source_url="http://www.energy.ca.gov/solar")
        )


# ── Normalization (mirrors refresh_expired_statuses) ───────────────────────

class TestNormalizeRow:
    def test_past_deadline_active_becomes_closed(self):
        inc = make_incentive(deadline=datetime.utcnow() - timedelta(days=3))
        notes = normalize_row(inc, datetime.utcnow())
        assert inc.status == IncentiveStatus.CLOSED
        assert notes == ["status_normalized_active_to_closed_past_deadline"]

    def test_future_deadline_stays_active(self):
        inc = make_incentive(deadline=datetime.utcnow() + timedelta(days=30))
        assert normalize_row(inc, datetime.utcnow()) == []
        assert inc.status == IncentiveStatus.ACTIVE

    def test_no_deadline_untouched(self):
        inc = make_incentive(deadline=None)
        assert normalize_row(inc, datetime.utcnow()) == []
        assert inc.status == IncentiveStatus.ACTIVE


# ── Batch partition ─────────────────────────────────────────────────────────

class TestApplyTripwires:
    def test_partition_and_reasons(self):
        clean_inc = make_incentive()
        bad_inc = make_incentive(title="Broken Row", funding_amount=-1.0)
        clean, quarantined = apply_tripwires([clean_inc, bad_inc])
        assert clean == [clean_inc]
        assert len(quarantined) == 1
        assert quarantined[0]["title"] == "Broken Row"
        assert quarantined[0]["reasons"] == ["funding_amount_not_positive"]


# ── Batch shape alarms (GAP-D2) ─────────────────────────────────────────────

class TestBatchAlarms:
    def test_ok_source_with_zero_rows_raises_alarm_without_abort(self):
        abort, alarms = batch_alarms(
            {"Grants.gov": {"status": "ok", "rows": 0}}, total_rows=10, quality_gate_failures=0
        )
        assert alarms == ["shape_alarm_zero_rows:Grants.gov"]
        assert abort is False  # other sources' healthy rows still write

    def test_failed_source_with_zero_rows_is_not_double_alarmed(self):
        abort, alarms = batch_alarms(
            {"WAZIP": {"status": "fail", "rows": 0}}, total_rows=10, quality_gate_failures=0
        )
        assert alarms == []
        assert abort is False

    def test_majority_gate_failure_aborts_all_writes(self):
        abort, alarms = batch_alarms({}, total_rows=10, quality_gate_failures=6)
        assert abort is True
        assert alarms == ["shape_alarm_batch_rejection_ratio:6/10"]

    def test_exactly_at_ratio_does_not_abort(self):
        at_ratio = int(10 * BATCH_REJECTION_ABORT_RATIO)
        abort, _ = batch_alarms({}, total_rows=10, quality_gate_failures=at_ratio)
        assert abort is False

    def test_empty_batch_no_division_error(self):
        abort, alarms = batch_alarms({}, total_rows=0, quality_gate_failures=0)
        assert abort is False
        assert alarms == []


# ── LESSONS #5/#16 pin — the fail→ok overwrite must never ship a third time ─

class _FakeScraper:
    def __init__(self, results=None, error=None):
        self._results = results or []
        self._error = error

    def scrape(self):
        if self._error:
            raise self._error
        return self._results


class TestRunScraperListFailIsolation:
    def test_failed_scraper_stays_failed(self):
        """PR #51 fixed this; a merge regressed it because no test pinned it."""
        _, counts = _run_scraper_list([("Broken", _FakeScraper(error=RuntimeError("boom")))])
        assert counts["Broken"]["status"] == "fail"
        assert "boom" in counts["Broken"]["error"]

    def test_first_scraper_failure_does_not_kill_the_run(self):
        """The regressed code raised NameError inside except when the FIRST
        scraper failed (referencing `results` before assignment), killing the
        whole discovery run for every remaining source."""
        good = _FakeScraper(results=[make_incentive()])
        rows, counts = _run_scraper_list(
            [("Broken", _FakeScraper(error=RuntimeError("boom"))), ("Good", good)]
        )
        assert counts["Broken"]["status"] == "fail"
        assert counts["Good"] == {"status": "ok", "rows": 1, "error": None}
        assert len(rows) == 1

    def test_mixed_order_success_then_failure(self):
        """The regressed code also stamped a FAILED source 'ok' with the
        PREVIOUS source's row count (stale loop variable)."""
        good = _FakeScraper(results=[make_incentive(), make_incentive(title="Second Program X")])
        _, counts = _run_scraper_list(
            [("Good", good), ("Broken", _FakeScraper(error=RuntimeError("later boom")))]
        )
        assert counts["Good"]["rows"] == 2
        assert counts["Broken"]["status"] == "fail"
        assert counts["Broken"]["rows"] == 0


# ── GAP-D6 vocabulary parity smoke ──────────────────────────────────────────

def test_jurisdiction_levels_match_prisma_enum():
    """The Python vocabulary drifted behind Prisma once (FOUNDATION missing
    after PR #60). Full three-way parity testing is Theme B-4; this pins the
    known drift instance."""
    assert {l.value for l in JurisdictionLevel} == {
        "FEDERAL", "STATE", "CITY", "AGENCY", "FOUNDATION",
    }
