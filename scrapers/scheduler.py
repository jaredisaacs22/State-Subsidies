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
from .db_writer import insert_new_only, record_scrape_run, refresh_expired_statuses
from .enricher import enrich
from .grants_gov_scraper import GrantsGovScraper
from .wazip_scraper import WazipScraper

logger = structlog.get_logger()

MOCK_MODE = os.getenv("SCRAPER_MOCK_MODE", "true").lower() != "false"
# DRY_RUN=1 writes a JSON report artifact instead of touching the DB.
# All new scraper CI jobs default to DRY_RUN=1 until per-source qualification is complete.
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"

DEFAULT_DISCOVER_INTERVAL = 6 * 60 * 60   # 6 hours — find new programs
DEFAULT_REFRESH_INTERVAL  = 24 * 60 * 60  # 24 hours — update existing status


def _run_scrapers(mock: bool) -> list:
    """Run all scrapers and return enriched results."""
    all_incentives = []
    scrapers = [
        ("WAZIP",         WazipScraper(mock=mock)),
        ("CalTrans CORE", CalTransCOREScraper(mock=mock)),
        ("CARB",          CARBScraper(mock=mock)),
        ("Grants.gov",    GrantsGovScraper(mock=mock)),
    ]
    for name, scraper in scrapers:
        try:
            results = scraper.scrape()
            enriched = [enrich(r) for r in results]
            all_incentives.extend(enriched)
            logger.info(f"{name} scraped", found=len(results))
        except Exception as e:
            logger.error(f"{name} scraper failed", error=str(e))
    return all_incentives


def _write_dry_run_report(incentives: list, report_path: str = "/tmp/scrape-report.json") -> None:
    """Serialize scraped records to a JSON artifact for human review (DRY_RUN mode)."""
    import json

    report = [
        {
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
        }
        for inc in incentives
    ]
    Path(report_path).write_text(json.dumps(report, indent=2, default=str))
    logger.info("DRY_RUN report written", path=report_path, rows=len(report))


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

    incentives = _run_scrapers(mock)

    if dry_run:
        _write_dry_run_report(incentives)
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
