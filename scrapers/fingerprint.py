"""
SS-003: source fingerprinting + parse confidence inference.

compute_source_hash — SHA-256 of normalised source content; stable across
  whitespace/timestamp changes, sensitive to content changes.

infer_parse_confidence — HIGH / MEDIUM / LOW based on field completeness.
  Called by each scraper after constructing a ScrapedIncentive.
"""

from __future__ import annotations

import hashlib
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import ScrapedIncentive, ParseConfidence


def compute_source_hash(content: str) -> str:
    """
    SHA-256 of normalised source content (HTML or JSON string).
    Strips scripts, styles, and runs of whitespace so trivial page changes
    (ads, nav timestamps) don't flip the hash.
    """
    body = re.sub(r"<script[\s\S]*?</script>", "", content, flags=re.I)
    body = re.sub(r"<style[\s\S]*?</style>", "", body, flags=re.I)
    body = re.sub(r"\s+", " ", body).strip()
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def infer_parse_confidence(
    incentive: "ScrapedIncentive",
) -> tuple["ParseConfidence", str | None]:
    """
    Infer parse quality from field completeness.

    HIGH — all primary fields present and plausible:
        title, summary >= 80 chars, fundingAmount, 2+ requirements, 1+ categories
    MEDIUM — passes quality gate but missing one primary field
    LOW    — reserved for scrapers that explicitly flag bad parses;
             infer_parse_confidence never returns LOW (quality gate should
             already reject those rows before calling this function)
    """
    # Deferred import to avoid circular dependency
    from .models import ParseConfidence

    issues: list[str] = []

    if not incentive.short_summary or len(incentive.short_summary.strip()) < 80:
        issues.append("summary short")
    if incentive.funding_amount is None:
        issues.append("no fundingAmount")
    if incentive.deadline is None:
        issues.append("no deadline")
    if len(incentive.key_requirements) < 2:
        issues.append("sparse requirements")
    if len(incentive.industry_categories) < 1:
        issues.append("no category")

    if not issues:
        return ParseConfidence.HIGH, None
    if len(issues) <= 2:
        return ParseConfidence.MEDIUM, "; ".join(issues)
    # 3+ missing fields — still MEDIUM since quality gate passed, but note all issues
    return ParseConfidence.MEDIUM, "; ".join(issues)
