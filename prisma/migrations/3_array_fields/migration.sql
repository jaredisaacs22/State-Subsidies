-- SS-003 phase 2: Convert JSON-string columns to native PostgreSQL TEXT[] arrays.
--
-- keyRequirements and industryCategories were stored as JSON-serialised strings
-- (e.g. '["Agriculture","Fleet"]'). This migration converts them to first-class
-- PostgreSQL TEXT[] columns so Prisma can use native array filters (has / hasSome)
-- instead of substring-contains workarounds.

-- Step 1: Add temporary columns for the new arrays
ALTER TABLE "Incentive"
  ADD COLUMN "keyRequirements_temp" TEXT[],
  ADD COLUMN "industryCategories_temp" TEXT[];

-- Step 2: Populate temp columns by converting from JSON strings
UPDATE "Incentive" SET
  "keyRequirements_temp" = CASE
    WHEN "keyRequirements" = '' OR "keyRequirements" IS NULL
      THEN ARRAY[]::TEXT[]
    ELSE (
      SELECT ARRAY_AGG(value::text)
      FROM json_array_elements("keyRequirements"::json) AS t(value)
    )
  END,
  "industryCategories_temp" = CASE
    WHEN "industryCategories" = '' OR "industryCategories" IS NULL
      THEN ARRAY[]::TEXT[]
    ELSE (
      SELECT ARRAY_AGG(value::text)
      FROM json_array_elements("industryCategories"::json) AS t(value)
    )
  END;

-- Step 3: Drop old columns and rename temp columns
ALTER TABLE "Incentive"
  DROP COLUMN "keyRequirements",
  DROP COLUMN "industryCategories",
  RENAME COLUMN "keyRequirements_temp" TO "keyRequirements",
  RENAME COLUMN "industryCategories_temp" TO "industryCategories";
