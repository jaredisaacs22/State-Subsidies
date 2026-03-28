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
from .db_writer import insert_new_only, refresh_expired_statuses
from .enricher import enrich
from .grants_gov_scraper import GrantsGovScraper
from .wazip_scraper import WazipScraper

logger = structlog.get_logger()

MOCK_MODE = os.getenv("SCRAPER_MOCK_MODE", "true").lower() != "false"

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


def discover_new_programs(mock: bool = MOCK_MODE) -> dict:
    """
    Scrape for new programs and insert only those that:
      1. Don't already exist in the DB (by slug)
      2. Pass the quality gate (has summary, source URL, and at least one requirement)
    """
    start = time.time()
    logger.info("Discovery run starting", mode="mock" if mock else "live")

    incentives = _run_scrapers(mock)
    stats = insert_new_only(incentives) if incentives else {"inserted": 0, "skipped": 0, "rejected": 0, "errors": 0}

    elapsed = round(time.time() - start, 1)
    summary = {
        "type": "discovery",
        "timestamp": datetime.utcnow().isoformat(),
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

    print(f"\n{'='*60}")
    print(f"  StateSubsidies Background Scheduler")
    print(f"  Scraper mode : {'LIVE' if not mock else 'mock'}")
    print(f"  Discovery    : every {args.discover_interval // 3600}h — new programs only")
    print(f"  Status check : every {args.refresh_interval // 3600}h — mark expired CLOSED")
    print(f"  AI Enrich    : {'ON' if os.getenv('ANTHROPIC_API_KEY') else 'OFF (no API key)'}")
    print(f"{'='*60}\n")

    if args.once:
        d = discover_new_programs(mock)
        r = refresh_statuses()
        print(f"Discovery : {d['inserted']} inserted, {d['skipped']} skipped existing, {d['rejected']} rejected by quality gate")
        print(f"Refresh   : {r.get('closed', 0)} programs marked CLOSED")
        return

    # Run both immediately on startup
    d = discover_new_programs(mock)
    r = refresh_statuses()
    print(f"Startup discovery : {d['inserted']} new, {d['skipped']} skipped, {d['rejected']} rejected quality gate")
    print(f"Startup refresh   : {r.get('closed', 0)} programs marked CLOSED\n")

    # Discovery thread — every 6h
    threading.Thread(
        target=_loop,
        args=(lambda: discover_new_programs(mock), args.discover_interval, "DISCOVERY"),
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
