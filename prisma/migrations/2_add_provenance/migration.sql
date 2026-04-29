-- SS-003: Provenance schema — source identity, parse quality, and human-review fields.
--
-- New columns on Incentive:
--   sourceDomain    — hostname extracted from sourceUrl; indexed for Trust Ribbon .gov count
--   sourceHash      — SHA-256 of stripped HTML (null until scrapers begin emitting it)
--   parseConfidence — HIGH/MEDIUM/LOW quality signal; LOW rows excluded from AI advisor (SS-008)
--   parseNotes      — optional human-readable reason for MEDIUM/LOW confidence
--   lastVerifiedAt  — nullable; set when a human reviewer confirms the row
--   lastVerifiedBy  — reviewer handle + role (e.g. "RQ (SME)")
--   firstSeenAt     — when the row was first observed (backfilled from createdAt)
--   lastSeenAt      — when the row was most recently observed (backfilled from scrapedAt/createdAt)
--
-- This migration is atomic: it adds the columns, indexes the new fields, AND
-- backfills existing rows in a single transaction. No separate script needed.

-- 1. Create the ParseConfidence enum type
CREATE TYPE "ParseConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- 2. Add columns to Incentive
--    Defaults are placeholders — the backfill UPDATE below replaces them with
--    real values for existing rows in the same migration transaction.
ALTER TABLE "Incentive"
  ADD COLUMN "sourceDomain"    VARCHAR(253)       NOT NULL DEFAULT '',
  ADD COLUMN "sourceHash"      CHAR(64),
  ADD COLUMN "parseConfidence" "ParseConfidence"  NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "parseNotes"      TEXT,
  ADD COLUMN "lastVerifiedAt"  TIMESTAMP(3),
  ADD COLUMN "lastVerifiedBy"  VARCHAR(64),
  ADD COLUMN "firstSeenAt"     TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSeenAt"      TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. Indexes (sourceDomain powers Trust Ribbon .gov count; parseConfidence gates AI advisor)
CREATE INDEX "Incentive_sourceDomain_idx"    ON "Incentive"("sourceDomain");
CREATE INDEX "Incentive_parseConfidence_idx" ON "Incentive"("parseConfidence");

-- 4. Backfill — populate sourceDomain, firstSeenAt, lastSeenAt for existing rows.
--    sourceDomain: extract hostname from sourceUrl (strip protocol + port + path).
--      Regex breakdown:
--        ^(?:https?://)?  — optional scheme
--        ([^/:?#\s]+)     — hostname (capture group 1)
--        .*$              — discard rest
--      Lowercased to match the convention scrapers use.
--    firstSeenAt: best-known first-observation date is the row's createdAt.
--    lastSeenAt:  best-known most-recent observation is scrapedAt, falling
--                 back to createdAt for rows that pre-date scrapedAt tracking.
UPDATE "Incentive"
SET
  "sourceDomain" = LOWER(
    regexp_replace("sourceUrl", '^(?:https?://)?([^/:?#\s]+).*$', '\1')
  ),
  "firstSeenAt"  = "createdAt",
  "lastSeenAt"   = COALESCE("scrapedAt", "createdAt")
WHERE "sourceUrl" IS NOT NULL AND "sourceUrl" <> '';
