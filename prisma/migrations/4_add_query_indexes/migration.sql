-- Audit-driven indexes. Every WHERE/ORDER BY field on the Incentive model
-- without an index gets one here. The GIN index is required for any query
-- on the industryCategories TEXT[] column (has/hasSome operators);
-- PostgreSQL cannot use a B-tree for array-containment operators.
--
-- All operations are CREATE INDEX IF NOT EXISTS, so the migration is
-- idempotent and safe to re-run.

CREATE INDEX IF NOT EXISTS "Incentive_jurisdictionName_idx"
  ON "Incentive" ("jurisdictionName");

CREATE INDEX IF NOT EXISTS "Incentive_isVerified_idx"
  ON "Incentive" ("isVerified");

CREATE INDEX IF NOT EXISTS "Incentive_fundingAmount_idx"
  ON "Incentive" ("fundingAmount");

CREATE INDEX IF NOT EXISTS "Incentive_status_jurisdictionLevel_idx"
  ON "Incentive" ("status", "jurisdictionLevel");

CREATE INDEX IF NOT EXISTS "Incentive_status_parseConfidence_idx"
  ON "Incentive" ("status", "parseConfidence");

-- GIN index for TEXT[] containment operators (has / hasSome → @> / &&).
-- Without this, every query filtering by industryCategory does a full
-- sequential scan of the entire Incentive table.
CREATE INDEX IF NOT EXISTS "Incentive_industryCategories_gin"
  ON "Incentive" USING GIN ("industryCategories");
