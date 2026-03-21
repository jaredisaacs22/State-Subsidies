"""
AI Enricher — uses the Anthropic Claude API to:
  1. Normalize messy scraped text into clean summaries
  2. Extract structured key requirements from raw HTML text
  3. Infer industry categories and incentive type from raw content
  4. Flag duplicate programs

Set ANTHROPIC_API_KEY in .env to enable. Falls back gracefully if not set.
"""

from __future__ import annotations

import os
import json
import re
from typing import Optional

import structlog

from .models import ScrapedIncentive, IncentiveType, JurisdictionLevel

logger = structlog.get_logger()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"  # fast + cheap for enrichment


def enrich(incentive: ScrapedIncentive, raw_text: str = "") -> ScrapedIncentive:
    """
    Optionally enrich a scraped incentive using Claude.
    If no API key is set, returns the incentive unchanged.
    """
    if not ANTHROPIC_API_KEY:
        logger.debug("No ANTHROPIC_API_KEY — skipping AI enrichment")
        return incentive

    try:
        return _claude_enrich(incentive, raw_text)
    except Exception as e:
        logger.warning("AI enrichment failed, using raw data", error=str(e))
        return incentive


def _claude_enrich(incentive: ScrapedIncentive, raw_text: str) -> ScrapedIncentive:
    """Call Claude to extract structured fields from raw scraped content."""
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    content_for_claude = raw_text or (
        f"Title: {incentive.title}\n"
        f"Summary: {incentive.short_summary}\n"
        f"Requirements: {chr(10).join(incentive.key_requirements)}"
    )

    prompt = f"""You are an expert at extracting structured information from government grant/incentive program pages.

Given the following content from a government incentive program page, extract:
1. A clean 2-3 sentence summary (shortSummary)
2. A list of 4-8 ultra-concise eligibility requirements as bullet points (keyRequirements)
3. The most relevant industry categories from this list: Agriculture, Clean Technology, Construction, Energy Management, Fleet, Infrastructure, Logistics, Manufacturing, Public Transit
4. The incentive type: GRANT, TAX_CREDIT, POINT_OF_SALE_REBATE, SUBSIDY, LOAN, or VOUCHER

Return ONLY valid JSON in this exact format:
{{
  "shortSummary": "...",
  "keyRequirements": ["...", "...", "..."],
  "industryCategories": ["...", "..."],
  "incentiveType": "..."
}}

Content:
{content_for_claude[:3000]}"""

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text.strip()

    # Extract JSON from response
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        logger.warning("Claude did not return valid JSON")
        return incentive

    extracted = json.loads(json_match.group(0))

    # Apply enriched fields
    if extracted.get("shortSummary"):
        incentive = incentive.model_copy(update={"short_summary": extracted["shortSummary"]})
    if extracted.get("keyRequirements"):
        incentive = incentive.model_copy(update={"key_requirements": extracted["keyRequirements"]})
    if extracted.get("industryCategories"):
        incentive = incentive.model_copy(update={"industry_categories": extracted["industryCategories"]})
    if extracted.get("incentiveType"):
        try:
            itype = IncentiveType(extracted["incentiveType"])
            incentive = incentive.model_copy(update={"incentive_type": itype})
        except ValueError:
            pass

    logger.info("AI enrichment applied", title=incentive.title)
    return incentive
