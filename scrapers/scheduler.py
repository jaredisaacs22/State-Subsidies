"""
Background Scheduler
=====================
Two separate loops:

  • Discovery (every 6 hours) — runs all scrapers looking for NEW programs.
    Only inserts programs that don't already exist AND pass a quality gate.
    Existing records are NOT updated during discovery runs.

  • Status refresh (every 24 hours) — marks programs as CLOSED when their
    deadline has passed.

Usage::

    # Run both loops continuously (default)
    python -m scrapers.scheduler

    # Run discovery + refresh once and exit
    python -m scrapers.scheduler --once

    # Run live scrapers (not mock)
    python -m scrapers.scheduler --live

    # Custom intervals
    python -m scrapers.scheduler --discover-interval 3600 --refresh-interval 43200
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import threading
from datetime import datetime
from pathlib import Path

import structlog
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from .carb_scraper import CARBScraper
from .caltrans_core_scraper import CalTransCOREScraper
from .ct_green_bank_scraper import CTGreenBankScraper
from .db_writer import insert_new_only, record_scrape_run, refresh_expired_statuses
from .dsire_scraper import DSIREScraper
from .enricher import enrich
from .grants_gov_scraper import GrantsGovScraper
from .masscec_scraper import MassCECScraper
from .nyserda_scraper import NYSERDAScraper
from .usda_rural_development_scraper import USDAFuralDevelopmentScraper
from .wazip_scraper import WazipScraper

logger = structlog.get_logger()

MOCK_MODE = os.getenv("SCRAPER_MOCK_MODE", "true").lower() != "false"
# DRY_RUN=1 writes a JSON report artifact instead of touching the DB.
# All new scraper CI jobs default to DRY_RUN=1 until per-source qualification is complete.
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"

DEFAULT_DISCOVER_INTERVAL = 6 * 60 * 60   # 6 hours — find new programs
DEFAULT_REFRESH_INTERVAL  = 24 * 60 * 60  # 24 hours — update existing status


def _unwrap_error(e: Exception) -> str:
    """
    Tenacity wraps the real error in RetryError. Unwrap it to surface the
    underlying HTTP status code or exception class. Without this, every
    scraper failure shows up as "RetryError[<Future raised HTTPStatusError>]"
    in the artifact and we have to guess what actually went wrong.
    """
    if hasattr(e, "last_attempt"):
        try:
            inner = e.last_attempt.exception()  # type: ignore[attr-defined]
            response = getattr(inner, "response", None)
            if response is not None:
                status = getattr(response, "status_code", "?")
                url = str(getattr(response, "url", "?"))
                return f"HTTP {status} from {url} :: {type(inner).__name__}"
            return f"{type(inner).__name__}: {inner}"
        except Exception:
            pass
    return f"{type(e).__name__}: {e}"


def _run_scrapers(mock: bool) -> tuple[list, dict]:
    """
    Run all scrapers and return (enriched results, per-source counts).
    Per-source counts include success / fail / row counts so silent failures
    are visible in the dry-run report and the workflow stdout.
    """
    all_incentives = []
    counts: dict[str, dict] = {}
    scrapers = [
        ("WAZIP",         WazipScraper(mock=mock)),
        ("CalTrans CORE", CalTransCOREScraper(mock=mock)),
        ("CARB",          CARBScraper(mock=mock)),
        ("Grants.gov",    GrantsGovScraper(mock=mock)),
        ("DSIRE",         DSIREScraper(mock=mock)),
        ("USDA RD",       USDAFuralDevelopmentScraper(mock=mock)),
        ("NYSERDA",       NYSERDAScraper(mock=mock)),
        ("MassCEC",       MassCECScraper(mock=mock)),
        ("CT Green Bank", CTGreenBankScraper(mock=mock)),
    ]
    for name, scraper in scrapers:
        try:
            results = scraper.scrape()
            enriched = [enrich(r) for r in results]
            all_incentives.extend(enriched)
            entry: dict = {"status": "ok", "rows": len(results), "error": None}
            # Surface scraper-specific diagnostics if the scraper exposes them
            if hasattr(scraper, "_diagnostics"):
                entry["diagnostics"] = scraper._diagnostics  # type: ignore[attr-defined]
            counts[name] = entry
            logger.info(f"{name} scraped", found=len(results))
            print(f"  {name:<14} ✓  {len(results)} row(s)")
        except Exception as e:
            unwrapped = _unwrap_error(e)
            counts[name] = {"status": "fail", "rows": 0, "error": unwrapped}
            logger.error(f"{name} scraper failed", error=unwrapped)
            print(f"  {name:<14} ✗  FAILED: {unwrapped}")
            counts[name] = {"status": "ok", "rows": len(results), "error": None}
            logger.info(f"{name} scraped", found=len(results))
            print(f"  {name:<14} ✓  {len(results)} row(s)")
        except Exception as e:
            counts[name] = {"status": "fail", "rows": 0, "error": str(e)}
            logger.error(f"{name} scraper failed", error=str(e))
            print(f"  {name:<14} ✗  FAILED: {e}")
    return all_incentives, counts


def _quality_gate_check(inc) -> tuple[bool, list[str]]:
    """
    Source-agnostic quality gate matching db_writer._passes_quality_gate.
    Returns (would_pass, list_of_reasons_if_fail). Used to annotate dry-run reports.
    """
    reasons: list[str] = []
    title = (inc.title or "").strip()
    summary = (inc.short_summary or "").strip()
    if len(title) < 5:
        reasons.append("title<5_chars")
    if len(summary) < 20:
        reasons.append("summary<20_chars")
    if not inc.source_url or not inc.source_url.startswith("http"):
        reasons.append("bad_source_url")
    if not inc.key_requirements or len(inc.key_requirements) < 1:
        reasons.append("no_requirements")
    return (len(reasons) == 0), reasons


def _write_dry_run_report(
    incentives: list,
    counts: dict,
    report_path: str = "/tmp/scrape-report.json",
) -> None:
    """Serialize scraped records to a JSON artifact for human review (DRY_RUN mode).

    Annotates each row with `_qualityGate` so the artifact reviewer sees which
    rows would actually be written to the DB vs filtered. Adds a summary section
    so silent scraper failures are visible at the top of the artifact.
    """
    import json

    rows = []
    pass_count = 0
    for inc in incentives:
        passes, reasons = _quality_gate_check(inc)
        if passes:
            pass_count += 1
        rows.append({
            "title": inc.title,
            "slug": inc.slug,
            "jurisdictionLevel": inc.jurisdiction_level.value if hasattr(inc.jurisdiction_level, "value") else str(inc.jurisdiction_level),
            "jurisdictionName": inc.jurisdiction_name,
            "managingAgency": inc.managing_agency,
            "incentiveType": inc.incentive_type.value if hasattr(inc.incentive_type, "value") else str(inc.incentive_type),
            "shortSummary": inc.short_summary,
            "sourceUrl": inc.source_url,
            "keyRequirements": inc.key_requirements,
            "industryCategories": inc.industry_categories,
            "fundingAmount": inc.funding_amount,
            "_qualityGate": {"pass": passes, "reasons": reasons},
        })

    report = {
        "_summary": {
            "perSource": counts,
            "totalScraped": len(incentives),
            "qualityGatePass": pass_count,
            "qualityGateFail": len(incentives) - pass_count,
        },
        "rows": rows,
    }
    Path(report_path).write_text(json.dumps(report, indent=2, default=str))
    logger.info(
        "DRY_RUN report written",
        path=report_path,
        rows=len(rows),
        gate_pass=pass_count,
        gate_fail=len(rows) - pass_count,
    )
    print(f"\nDry-run summary: {pass_count}/{len(rows)} rows would pass quality gate")
    if pass_count < len(rows):
        print(f"  ⚠  {len(rows) - pass_count} row(s) would be REJECTED — inspect _qualityGate.reasons in {report_path}")


def discover_new_programs(mock: bool = MOCK_MODE, dry_run: bool = DRY_RUN) -> dict:
    """
    Scrape for new programs and insert only those that:
      1. Don't already exist in the DB (by slug)
      2. Pass the quality gate (has summary, source URL, and at least one requirement)

    When dry_run=True, writes /tmp/scrape-report.json instead of touching the DB.
    """
    from datetime import datetime as dt
    started_at = dt.utcnow()
    start = time.time()
    logger.info("Discovery run starting", mode="mock" if mock else "live", dry_run=dry_run)

    incentives, per_source_counts = _run_scrapers(mock)

    if dry_run:
        _write_dry_run_report(incentives, per_source_counts)
        stats = {"inserted": 0, "skipped": 0, "rejected": 0, "errors": 0, "dry_run": True}
    else:
        stats = insert_new_only(incentives) if incentives else {"inserted": 0, "skipped": 0, "rejected": 0, "errors": 0}
        try:
            record_scrape_run(
                source="all",
                stats={**stats, "scraped": len(incentives)},
                started_at=started_at,
                status="FAIL" if stats.get("errors", 0) > 0 else "SUCCESS",
            )
        except Exception as e:
            logger.warning("Could not record ScrapeRun", error=str(e))

    elapsed = round(time.time() - start, 1)
    summary = {
        "type": "discovery",
        "timestamp": dt.utcnow().isoformat(),
        "scraped": len(incentives),
        **stats,
        "elapsed_seconds": elapsed,
    }
    logger.info("Discovery run complete", **summary)
    return summary


def refresh_statuses() -> dict:
    """
    Mark programs with past deadlines as CLOSED.
    No scraping — only updates existing DB records.
    """
    logger.info("Status refresh starting")
    stats = refresh_expired_statuses()
    logger.info("Status refresh complete", **stats)
    return {"type": "refresh", "timestamp": datetime.utcnow().isoformat(), **stats}


def _loop(fn, interval_seconds: int, label: str):
    """Sleep for interval_seconds then run fn, forever."""
    while True:
        time.sleep(interval_seconds)
        try:
            result = fn()
            next_dt = datetime.fromtimestamp(time.time() + interval_seconds).strftime("%H:%M")
            print(f"[{label}] done — next at {next_dt}  |  {result}")
        except Exception as e:
            logger.error(f"{label} loop error", error=str(e))


def main():
    parser = argparse.ArgumentParser(description="StateSubsidies background scheduler")
    parser.add_argument("--once",              action="store_true",
                        help="Run discovery + refresh once and exit")
    parser.add_argument("--discover-interval", type=int, default=DEFAULT_DISCOVER_INTERVAL,
                        help="Seconds between discovery runs (default: 21600 = 6h)")
    parser.add_argument("--refresh-interval",  type=int, default=DEFAULT_REFRESH_INTERVAL,
                        help="Seconds between status refresh runs (default: 86400 = 24h)")
    parser.add_argument("--live",              action="store_true",
                        help="Use live scrapers instead of mock data")
    args = parser.parse_args()

    mock = not args.live

    dry_run = DRY_RUN

    print(f"\n{'='*60}")
    print(f"  StateSubsidies Background Scheduler")
    print(f"  Scraper mode : {'LIVE' if not mock else 'mock'}")
    print(f"  Dry-run      : {'YES — writing /tmp/scrape-report.json (no DB writes)' if dry_run else 'NO — writing to DB'}")
    print(f"  Discovery    : every {args.discover_interval // 3600}h — new programs only")
    print(f"  Status check : every {args.refresh_interval // 3600}h — mark expired CLOSED")
    print(f"  AI Enrich    : {'ON' if os.getenv('ANTHROPIC_API_KEY') else 'OFF (no API key)'}")
    print(f"{'='*60}\n")

    if args.once:
        d = discover_new_programs(mock, dry_run=dry_run)
        r = refresh_statuses()
        print(f"Discovery : {d['inserted']} inserted, {d['skipped']} skipped existing, {d['rejected']} rejected by quality gate")
        print(f"Refresh   : {r.get('closed', 0)} programs marked CLOSED")
        return

    # Run both immediately on startup
    d = discover_new_programs(mock, dry_run=dry_run)
    r = refresh_statuses()
    if dry_run:
        print(f"Startup discovery (DRY RUN) : {d['scraped']} scraped — see /tmp/scrape-report.json")
    else:
        print(f"Startup discovery : {d['inserted']} new, {d['skipped']} skipped, {d['rejected']} rejected quality gate")
    print(f"Startup refresh   : {r.get('closed', 0)} programs marked CLOSED\n")

    # Discovery thread — every 6h
    threading.Thread(
        target=_loop,
        args=(lambda: discover_new_programs(mock, dry_run=dry_run), args.discover_interval, "DISCOVERY"),
        daemon=True,
    ).start()

    # Refresh thread — every 24h
    threading.Thread(
        target=_loop,
        args=(refresh_statuses, args.refresh_interval, "REFRESH"),
        daemon=True,
    ).start()

    print("Scheduler running. Press Ctrl+C to stop.\n")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nScheduler stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
