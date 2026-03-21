"""
Pydantic models shared across all scrapers.
These mirror the Prisma schema so scraped data maps directly to the DB.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, HttpUrl, field_validator
import re


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
    program_code: Optional[str] = None
    status: IncentiveStatus = IncentiveStatus.ACTIVE

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
