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
-- The backfill script (prisma/backfill-provenance.ts) must be run immediately after
-- this migration to populate sourceDomain, firstSeenAt, and lastSeenAt on existing rows.

-- 1. Create the ParseConfidence enum type
CREATE TYPE "ParseConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- 2. Add columns to Incentive
--    sourceDomain defaults to '' — backfill populates real hostnames for all existing rows.
--    parseConfidence defaults to MEDIUM — conservative for all pre-provenance rows.
--    firstSeenAt / lastSeenAt default to CURRENT_TIMESTAMP — backfill corrects to createdAt/scrapedAt.
ALTER TABLE "Incentive"
  ADD COLUMN "sourceDomain"    VARCHAR(253)       NOT NULL DEFAULT '',
  ADD COLUMN "sourceHash"      CHAR(64),
  ADD COLUMN "parseConfidence" "ParseConfidence"  NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "parseNotes"      TEXT,
  ADD COLUMN "lastVerifiedAt"  TIMESTAMP(3),
  ADD COLUMN "lastVerifiedBy"  VARCHAR(64),
  ADD COLUMN "firstSeenAt"     TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSeenAt"      TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. Indexes
CREATE INDEX "Incentive_sourceDomain_idx"    ON "Incentive"("sourceDomain");
CREATE INDEX "Incentive_parseConfidence_idx" ON "Incentive"("parseConfidence");
