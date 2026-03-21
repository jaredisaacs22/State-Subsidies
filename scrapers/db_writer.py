"""
DB Writer — writes scraped & enriched incentives to the SQLite database.
Uses the same DATABASE_URL as the Next.js app so data appears immediately.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog

from .models import ScrapedIncentive

logger = structlog.get_logger()

# Resolve the DB path from DATABASE_URL env var (e.g. "file:./subsidies.db")
# Prisma resolves relative paths from its own schema.prisma directory (prisma/)
_raw_url = os.getenv("DATABASE_URL", "file:./subsidies.db")
_db_path_str = _raw_url.replace("file:", "")
_project_root = Path(__file__).parent.parent
# Try prisma/ subdir first (Prisma default), then project root
_prisma_path = (_project_root / "prisma" / Path(_db_path_str).name).resolve()
_root_path = (_project_root / _db_path_str).resolve()
DB_PATH = _prisma_path if _prisma_path.exists() else _root_path


def _slugify(text: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^\w\s-]", "", text.lower()).replace(" ", "-")).strip("-")


def upsert_incentive(incentive: ScrapedIncentive) -> str:
    """
    Insert or update an incentive record. Returns the record id.
    Uses slug as the upsert key.
    """
    slug = incentive.slug or _slugify(incentive.title)

    conn = sqlite3.connect(str(DB_PATH))
    try:
        cur = conn.cursor()

        # Check if exists
        cur.execute("SELECT id FROM Incentive WHERE slug = ?", (slug,))
        row = cur.fetchone()

        now = datetime.utcnow().isoformat() + "Z"
        deadline_str = incentive.deadline.isoformat() + "Z" if incentive.deadline else None
        open_date_str = incentive.application_open_date.isoformat() + "Z" if incentive.application_open_date else None

        if row:
            record_id = row[0]
            cur.execute(
                """
                UPDATE Incentive SET
                  updatedAt = ?,
                  title = ?,
                  jurisdictionLevel = ?,
                  jurisdictionName = ?,
                  managingAgency = ?,
                  agencyAcronym = ?,
                  shortSummary = ?,
                  keyRequirements = ?,
                  industryCategories = ?,
                  incentiveType = ?,
                  fundingAmount = ?,
                  deadline = ?,
                  applicationOpenDate = ?,
                  sourceUrl = ?,
                  programCode = ?,
                  scrapedAt = ?,
                  scraperSource = ?
                WHERE id = ?
                """,
                (
                    now,
                    incentive.title,
                    incentive.jurisdiction_level.value,
                    incentive.jurisdiction_name,
                    incentive.managing_agency,
                    incentive.agency_acronym,
                    incentive.short_summary,
                    json.dumps(incentive.key_requirements),
                    json.dumps(incentive.industry_categories),
                    incentive.incentive_type.value,
                    incentive.funding_amount,
                    deadline_str,
                    open_date_str,
                    incentive.source_url,
                    incentive.program_code,
                    now,
                    incentive.scraper_source,
                    record_id,
                ),
            )
            logger.info("Updated incentive", slug=slug)
        else:
            import uuid
            record_id = str(uuid.uuid4()).replace("-", "")[:25]
            cur.execute(
                """
                INSERT INTO Incentive (
                  id, createdAt, updatedAt, title, slug,
                  jurisdictionLevel, jurisdictionName,
                  managingAgency, agencyAcronym,
                  shortSummary, keyRequirements,
                  industryCategories, incentiveType,
                  fundingAmount, deadline, applicationOpenDate,
                  sourceUrl, programCode, status, isVerified,
                  scrapedAt, scraperSource
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    record_id, now, now,
                    incentive.title, slug,
                    incentive.jurisdiction_level.value,
                    incentive.jurisdiction_name,
                    incentive.managing_agency,
                    incentive.agency_acronym,
                    incentive.short_summary,
                    json.dumps(incentive.key_requirements),
                    json.dumps(incentive.industry_categories),
                    incentive.incentive_type.value,
                    incentive.funding_amount,
                    deadline_str,
                    open_date_str,
                    incentive.source_url,
                    incentive.program_code,
                    incentive.status.value,
                    0,  # isVerified = false for scraped records
                    now,
                    incentive.scraper_source,
                ),
            )
            logger.info("Inserted new incentive", slug=slug)

        conn.commit()
        return record_id
    finally:
        conn.close()


def bulk_upsert(incentives: list[ScrapedIncentive]) -> dict:
    """Upsert a list of incentives. Returns stats."""
    inserted = 0
    updated = 0
    errors = 0

    for incentive in incentives:
        try:
            slug = incentive.slug or _slugify(incentive.title)
            conn = sqlite3.connect(str(DB_PATH))
            cur = conn.cursor()
            cur.execute("SELECT id FROM Incentive WHERE slug = ?", (slug,))
            exists = cur.fetchone() is not None
            conn.close()

            upsert_incentive(incentive)
            if exists:
                updated += 1
            else:
                inserted += 1
        except Exception as e:
            logger.error("Failed to upsert", title=incentive.title, error=str(e))
            errors += 1

    return {"inserted": inserted, "updated": updated, "errors": errors}
