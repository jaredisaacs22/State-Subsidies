"""
DB Writer — writes scraped & enriched incentives to the PostgreSQL database.
Uses the same DATABASE_URL as the Next.js app so data appears immediately.

Requires: psycopg2-binary (listed in requirements.txt)
"""

from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime

import psycopg2
import psycopg2.extras
import structlog

from .models import ScrapedIncentive

logger = structlog.get_logger()

_DATABASE_URL = os.getenv("DATABASE_URL", "")


def _get_conn():
    """Open a psycopg2 connection. Raises clearly if DATABASE_URL is missing or SQLite."""
    url = _DATABASE_URL
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    if url.startswith("file:") or url.startswith("sqlite"):
        raise RuntimeError(
            "DATABASE_URL points to a SQLite file, but PostgreSQL is required for the "
            "scraper DB writer. Set DATABASE_URL to a postgresql:// connection string."
        )
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)


def _slugify(text: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^\w\s-]", "", text.lower()).replace(" ", "-")).strip("-")


def upsert_incentive(incentive: ScrapedIncentive) -> str:
    """
    Insert or update an incentive record. Returns the record id.
    Uses slug as the upsert key via ON CONFLICT — atomic and race-condition safe.
    """
    slug = incentive.slug or _slugify(incentive.title)
    record_id = str(uuid.uuid4()).replace("-", "")[:25]
    now = datetime.utcnow()

    conn = _get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO "Incentive" (
                        id, "createdAt", "updatedAt",
                        title, slug,
                        "jurisdictionLevel", "jurisdictionName",
                        "managingAgency", "agencyAcronym",
                        "shortSummary", "keyRequirements",
                        "industryCategories", "incentiveType",
                        "fundingAmount", deadline, "applicationOpenDate",
                        "sourceUrl", "programCode",
                        status, "isVerified",
                        "scrapedAt", "scraperSource"
                    ) VALUES (
                        %s, %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s
                    )
                    ON CONFLICT (slug) DO UPDATE SET
                        "updatedAt"           = EXCLUDED."updatedAt",
                        title                 = EXCLUDED.title,
                        "jurisdictionLevel"   = EXCLUDED."jurisdictionLevel",
                        "jurisdictionName"    = EXCLUDED."jurisdictionName",
                        "managingAgency"      = EXCLUDED."managingAgency",
                        "agencyAcronym"       = EXCLUDED."agencyAcronym",
                        "shortSummary"        = EXCLUDED."shortSummary",
                        "keyRequirements"     = EXCLUDED."keyRequirements",
                        "industryCategories"  = EXCLUDED."industryCategories",
                        "incentiveType"       = EXCLUDED."incentiveType",
                        "fundingAmount"       = EXCLUDED."fundingAmount",
                        deadline              = EXCLUDED.deadline,
                        "applicationOpenDate" = EXCLUDED."applicationOpenDate",
                        "sourceUrl"           = EXCLUDED."sourceUrl",
                        "programCode"         = EXCLUDED."programCode",
                        "scrapedAt"           = EXCLUDED."scrapedAt",
                        "scraperSource"       = EXCLUDED."scraperSource"
                    RETURNING id
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
                        incentive.deadline,
                        incentive.application_open_date,
                        incentive.source_url,
                        incentive.program_code,
                        incentive.status.value,
                        False,
                        now,
                        incentive.scraper_source,
                    ),
                )
                row = cur.fetchone()
                returned_id = row["id"] if row else record_id

        logger.info("Upserted incentive", slug=slug, id=returned_id)
        return returned_id
    finally:
        conn.close()


def _passes_quality_gate(incentive: ScrapedIncentive) -> bool:
    """
    Minimum quality bar for a newly discovered program.
    Rejects empty/stub records that add no value to the database.
    """
    if not incentive.title or len(incentive.title.strip()) < 5:
        return False
    if not incentive.short_summary or len(incentive.short_summary.strip()) < 20:
        return False
    if not incentive.source_url or not incentive.source_url.startswith("http"):
        return False
    if not incentive.key_requirements or len(incentive.key_requirements) < 1:
        return False
    return True


def insert_new_only(incentives: list[ScrapedIncentive]) -> dict:
    """
    Insert programs that don't already exist in the DB AND pass the quality gate.
    Existing slugs are silently skipped (no updates).
    Returns stats: inserted, skipped, rejected, errors.
    """
    inserted = 0
    skipped = 0
    rejected = 0
    errors = 0

    slugs = [i.slug or _slugify(i.title) for i in incentives]

    # Pre-fetch existing slugs in one query
    existing_slugs: set[str] = set()
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                cur.execute('SELECT slug FROM "Incentive" WHERE slug = ANY(%s)', (slugs,))
                existing_slugs = {row["slug"] for row in cur.fetchall()}
        conn.close()
    except Exception as e:
        logger.warning("Could not pre-fetch existing slugs", error=str(e))

    for incentive in incentives:
        slug = incentive.slug or _slugify(incentive.title)

        if slug in existing_slugs:
            skipped += 1
            continue

        if not _passes_quality_gate(incentive):
            logger.debug("Quality gate rejected", title=incentive.title)
            rejected += 1
            continue

        try:
            upsert_incentive(incentive)
            inserted += 1
        except Exception as e:
            logger.error("Failed to insert", title=incentive.title, error=str(e))
            errors += 1

    return {"inserted": inserted, "skipped": skipped, "rejected": rejected, "errors": errors}


def refresh_expired_statuses() -> dict:
    """
    Mark ACTIVE programs whose deadline has passed as CLOSED.
    Run once per day — no scraping required.
    """
    closed = 0
    errors = 0
    now = datetime.utcnow()

    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE "Incentive"
                    SET status = 'CLOSED', "updatedAt" = %s
                    WHERE status = 'ACTIVE'
                      AND deadline IS NOT NULL
                      AND deadline < %s
                    """,
                    (now, now),
                )
                closed = cur.rowcount
        conn.close()
        logger.info("Expired status refresh", closed=closed)
    except Exception as e:
        logger.error("refresh_expired_statuses failed", error=str(e))
        errors += 1

    return {"closed": closed, "errors": errors}


def record_scrape_run(
    source: str,
    stats: dict,
    started_at: datetime,
    status: str = "SUCCESS",
    notes: str | None = None,
) -> str:
    """
    Write one ScrapeRun record to the DB. Returns the inserted id.
    stats keys: rowsConsidered (or scraped), rowsInserted (or inserted),
    rowsUpdated (or updated), rowsSkipped (or skipped), qualityGateRejections (or rejected).
    """
    finished_at = datetime.utcnow()
    duration_ms = int((finished_at - started_at).total_seconds() * 1000)
    record_id = str(uuid.uuid4()).replace("-", "")[:25]

    conn = _get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO "ScrapeRun" (
                        id, source, "startedAt", "finishedAt", status,
                        "rowsConsidered", "rowsInserted", "rowsUpdated",
                        "rowsSkipped", "qualityGateRejections", "durationMs", notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        record_id,
                        source,
                        started_at,
                        finished_at,
                        status,
                        stats.get("rowsConsidered", stats.get("scraped", 0)),
                        stats.get("rowsInserted", stats.get("inserted", 0)),
                        stats.get("rowsUpdated", stats.get("updated", 0)),
                        stats.get("rowsSkipped", stats.get("skipped", 0)),
                        stats.get("qualityGateRejections", stats.get("rejected", 0)),
                        duration_ms,
                        notes,
                    ),
                )
        logger.info("ScrapeRun recorded", source=source, status=status, duration_ms=duration_ms)
        return record_id
    except Exception as e:
        logger.warning("Failed to record ScrapeRun", source=source, error=str(e))
        return record_id
    finally:
        conn.close()


def bulk_upsert(incentives: list[ScrapedIncentive]) -> dict:
    """Upsert a list of incentives. Returns stats dict with inserted/updated/errors counts."""
    inserted = 0
    updated = 0
    errors = 0

    # Track which slugs existed before the batch to distinguish inserts vs updates
    slugs = [i.slug or _slugify(i.title) for i in incentives]
    existing_slugs: set[str] = set()

    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT slug FROM "Incentive" WHERE slug = ANY(%s)',
                    (slugs,),
                )
                existing_slugs = {row["slug"] for row in cur.fetchall()}
        conn.close()
    except Exception as e:
        logger.warning("Could not pre-fetch existing slugs", error=str(e))

    for incentive in incentives:
        slug = incentive.slug or _slugify(incentive.title)
        try:
            upsert_incentive(incentive)
            if slug in existing_slugs:
                updated += 1
            else:
                inserted += 1
        except Exception as e:
            logger.error("Failed to upsert", title=incentive.title, error=str(e))
            errors += 1

    return {"inserted": inserted, "updated": updated, "errors": errors}
