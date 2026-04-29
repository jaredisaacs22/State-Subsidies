"""
Pydantic models shared across all scrapers.
These mirror the Prisma schema so scraped data maps directly to the DB.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator
import re
from urllib.parse import urlparse


class JurisdictionLevel(str, Enum):
    FEDERAL = "FEDERAL"
    STATE = "STATE"
    CITY = "CITY"
    AGENCY = "AGENCY"


class IncentiveType(str, Enum):
    GRANT = "GRANT"
    TAX_CREDIT = "TAX_CREDIT"
    POINT_OF_SALE_REBATE = "POINT_OF_SALE_REBATE"
    SUBSIDY = "SUBSIDY"
    LOAN = "LOAN"
    VOUCHER = "VOUCHER"


class IncentiveStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    UPCOMING = "UPCOMING"
    SUSPENDED = "SUSPENDED"


# SS-003: parse quality signal. Mirrors the Prisma ParseConfidence enum.
class ParseConfidence(str, Enum):
    HIGH   = "HIGH"
    MEDIUM = "MEDIUM"
    LOW    = "LOW"


class ScrapedIncentive(BaseModel):
    """A raw incentive record returned by a scraper before DB upsert."""

    title: str
    slug: Optional[str] = None  # auto-generated if not provided

    jurisdiction_level: JurisdictionLevel
    jurisdiction_name: str  # e.g. "California", "United States"

    managing_agency: str
    agency_acronym: Optional[str] = None

    short_summary: str
    key_requirements: list[str]
    industry_categories: list[str]

    incentive_type: IncentiveType

    funding_amount: Optional[float] = None  # max USD
    deadline: Optional[datetime] = None
    application_open_date: Optional[datetime] = None

    source_url: str
    # SS-003: derived automatically from source_url; scrapers need not set it.
    source_domain: str = ""
    program_code: Optional[str] = None
    status: IncentiveStatus = IncentiveStatus.ACTIVE

    # SS-003 provenance fields
    source_hash:      Optional[str] = None              # SHA-256 hex of stripped source
    parse_confidence: ParseConfidence = ParseConfidence.MEDIUM
    parse_notes:      Optional[str] = None              # reason for MEDIUM/LOW

    scraper_source: Optional[str] = None

    @field_validator("slug", mode="before")
    @classmethod
    def auto_slug(cls, v: Optional[str], info) -> str:
        if v:
            return v
        title = info.data.get("title", "")
        return re.sub(r"-+", "-", re.sub(r"[^\w\s-]", "", title.lower()).replace(" ", "-")).strip("-")

    @field_validator("key_requirements", "industry_categories", mode="before")
    @classmethod
    def ensure_list(cls, v) -> list:
        if isinstance(v, str):
            # Handle bullet-point or newline-separated text
            lines = [l.strip().lstrip("•·-–—*").strip() for l in v.splitlines() if l.strip()]
            return [l for l in lines if l]
        return v

    @model_validator(mode="after")
    def derive_source_domain(self) -> "ScrapedIncentive":
        """Extract hostname from source_url when source_domain is not explicitly set."""
        if not self.source_domain and self.source_url:
            try:
                self.source_domain = urlparse(self.source_url).hostname or ""
            except Exception:
                self.source_domain = ""
        return self
