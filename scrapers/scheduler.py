"""
Background Scheduler
=====================
Runs all scrapers on a configurable interval, enriches results with Claude,
and writes them to the database. Designed to run as a long-lived background
process alongside the Next.js dev/production server.

Usage::

    # Run once immediately, then every 6 hours
    python -m scrapers.scheduler

    # Run once and exit (useful for cron jobs)
    python -m scrapers.scheduler --once

    # Custom interval
    python -m scrapers.scheduler --interval 3600
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import structlog
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env")

from .carb_scraper import CARBScraper
from .caltrans_core_scraper import CalTransCOREScraper
from .db_writer import bulk_upsert
from .enricher import enrich
from .grants_gov_scraper import GrantsGovScraper
from .wazip_scraper import WazipScraper

logger = structlog.get_logger()

# Use mock mode unless SCRAPER_MOCK_MODE=false in .env
MOCK_MODE = os.getenv("SCRAPER_MOCK_MODE", "true").lower() != "false"

# Default interval: 6 hours
DEFAULT_INTERVAL_SECONDS = 6 * 60 * 60


def run_all_scrapers(mock: bool = MOCK_MODE) -> dict:
    """Run all registered scrapers, enrich results, write to DB."""
    start = time.time()
    mode = "mock" if mock else "LIVE"
    logger.info(f"Starting scrape run ({mode})", timestamp=datetime.utcnow().isoformat())

    all_incentives = []
    scraper_stats = {}

    scrapers = [
        ("WAZIP", WazipScraper(mock=mock)),
        ("CalTrans CORE", CalTransCOREScraper(mock=mock)),
        ("CARB", CARBScraper(mock=mock)),
        ("Grants.gov", GrantsGovScraper(mock=mock)),
    ]

    for name, scraper in scrapers:
        try:
            logger.info(f"Running {name} scraper")
            results = scraper.scrape()

            # AI enrichment (no-op if no API key)
            enriched = []
            for r in results:
                enriched.append(enrich(r))

            all_incentives.extend(enriched)
            scraper_stats[name] = {"found": len(results), "status": "ok"}
            logger.info(f"{name} scraper complete", found=len(results))
        except Exception as e:
            logger.error(f"{name} scraper failed", error=str(e))
            scraper_stats[name] = {"found": 0, "status": f"error: {e}"}

    # Write to DB
    if all_incentives:
        db_stats = bulk_upsert(all_incentives)
    else:
        db_stats = {"inserted": 0, "updated": 0, "errors": 0}

    elapsed = round(time.time() - start, 1)
    summary = {
        "timestamp": datetime.utcnow().isoformat(),
        "mode": mode,
        "total_found": len(all_incentives),
        "db": db_stats,
        "scrapers": scraper_stats,
        "elapsed_seconds": elapsed,
    }

    logger.info("Scrape run complete", **summary)
    return summary


def main():
    parser = argparse.ArgumentParser(description="SubsidyFinder background scraper scheduler")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_SECONDS,
                        help="Interval in seconds between runs (default: 21600 = 6h)")
    parser.add_argument("--live", action="store_true", help="Use live scrapers (not mock)")
    args = parser.parse_args()

    mock = not args.live

    print(f"\n{'='*60}")
    print(f"  SubsidyFinder Background Scheduler")
    print(f"  Mode: {'LIVE scraping' if not mock else 'Mock data'}")
    print(f"  Interval: {args.interval}s ({args.interval // 3600}h {(args.interval % 3600) // 60}m)")
    print(f"  AI Enrichment: {'ON (Claude API)' if os.getenv('ANTHROPIC_API_KEY') else 'OFF (no API key)'}")
    print(f"{'='*60}\n")

    # Run immediately on start
    summary = run_all_scrapers(mock=mock)
    print(f"\n✓ First run complete: {summary['total_found']} incentives found, "
          f"{summary['db']['inserted']} inserted, {summary['db']['updated']} updated\n")

    if args.once:
        return

    # Loop
    while True:
        next_run = time.time() + args.interval
        next_run_str = datetime.fromtimestamp(next_run).strftime("%H:%M:%S")
        print(f"Next run at {next_run_str} (in {args.interval // 3600}h)...")

        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nScheduler stopped by user.")
            sys.exit(0)

        summary = run_all_scrapers(mock=mock)
        print(f"✓ Run complete: {summary['total_found']} found, "
              f"{summary['db']['inserted']} new, {summary['db']['updated']} updated")


if __name__ == "__main__":
    main()
