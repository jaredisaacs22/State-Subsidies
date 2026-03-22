"""
Scraper Runner — CLI entry point for running all (or individual) scrapers.

Usage::

    # Run all scrapers in mock mode and print output
    python -m scrapers.runner --mock

    # Run a specific scraper
    python -m scrapers.runner --scraper wazip --mock

    # Run live (real HTTP)
    python -m scrapers.runner --scraper caltrans_core

    # Write output to a JSON file
    python -m scrapers.runner --mock --output incentives.json
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from typing import Any

import click
import structlog

from .carb_scraper import CARBScraper
from .caltrans_core_scraper import CalTransCOREScraper
from .grants_gov_scraper import GrantsGovScraper
from .wazip_scraper import WazipScraper

logger = structlog.get_logger()

# Registry: name → scraper class
SCRAPERS = {
    "caltrans_core": CalTransCOREScraper,
    "wazip":         WazipScraper,
    "carb":          CARBScraper,
    "grants_gov":    GrantsGovScraper,
}


def _serialize(obj: Any) -> Any:
    """JSON-serialise datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


@click.command()
@click.option("--scraper", default="all", help="Scraper to run: all | wazip | caltrans_core | carb | grants_gov")
@click.option("--mock/--live", default=True, help="Use mock data (default) or live HTTP")
@click.option("--output", default=None, help="Write results to a JSON file path")
def run(scraper: str, mock: bool, output: str | None):
    """Run the SubsidyFinder scraper pipeline."""
    targets = SCRAPERS if scraper == "all" else {scraper: SCRAPERS[scraper]}

    if scraper != "all" and scraper not in SCRAPERS:
        click.echo(f"Unknown scraper: {scraper}. Choices: {', '.join(SCRAPERS.keys())}", err=True)
        sys.exit(1)

    all_results = []

    for name, cls in targets.items():
        click.echo(f"\n→ Running {name} ({'mock' if mock else 'live'})…")
        try:
            instance = cls(mock=mock)
            results = instance.scrape()
            for r in results:
                click.echo(f"  ✓ {r.title}")
                click.echo(f"    Type: {r.incentive_type.value}")
                click.echo(f"    Max funding: ${r.funding_amount:,.0f}" if r.funding_amount else "    Max funding: Varies")
                click.echo(f"    Deadline: {r.deadline.strftime('%b %d, %Y') if r.deadline else 'Rolling'}")
                click.echo(f"    Requirements ({len(r.key_requirements)}):")
                for req in r.key_requirements[:3]:
                    click.echo(f"      • {req}")
                if len(r.key_requirements) > 3:
                    click.echo(f"      … +{len(r.key_requirements) - 3} more")

            all_results.extend([r.model_dump() for r in results])
        except Exception as exc:
            logger.error("scraper failed", scraper=name, error=str(exc))
            click.echo(f"  ✗ {name} failed: {exc}", err=True)

    if output:
        with open(output, "w") as f:
            json.dump(all_results, f, indent=2, default=_serialize)
        click.echo(f"\n✅ Wrote {len(all_results)} incentives to {output}")
    else:
        click.echo(f"\n✅ Total: {len(all_results)} incentives scraped.")


if __name__ == "__main__":
    run()
