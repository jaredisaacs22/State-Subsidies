-- SS-003 phase 2: Convert keyRequirements and industryCategories from TEXT (JSON string)
-- to native TEXT[] (PostgreSQL array).
--
-- Uses ADD+UPDATE+DROP+RENAME rather than ALTER TYPE ... USING so the migration is safe on
-- both the empty shadow database (drift CI) and on a production table with existing rows.
-- json_array_elements_text (not json_array_elements) strips JSON string quotes, giving clean
-- values like 'Agriculture' rather than '"Agriculture"'.

-- 1. Add new NOT NULL TEXT[] columns. Temporary DEFAULT lets this succeed on non-empty tables.
ALTER TABLE "Incentive"
  ADD COLUMN "keyRequirements_new"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "industryCategories_new" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2. Populate from existing JSON strings. Zero rows updated on empty CI shadow DB.
UPDATE "Incentive"
SET
  "keyRequirements_new"    = ARRAY(SELECT json_array_elements_text("keyRequirements"::json)),
  "industryCategories_new" = ARRAY(SELECT json_array_elements_text("industryCategories"::json));

-- 3. Drop the old TEXT columns.
ALTER TABLE "Incentive"
  DROP COLUMN "keyRequirements",
  DROP COLUMN "industryCategories";

-- 4. Rename new columns. PostgreSQL requires RENAME COLUMN in its own ALTER TABLE statement.
ALTER TABLE "Incentive" RENAME COLUMN "keyRequirements_new"    TO "keyRequirements";
ALTER TABLE "Incentive" RENAME COLUMN "industryCategories_new" TO "industryCategories";

-- 5. Drop temporary DEFAULT so final state matches schema.prisma String[] (no @default):
--    TEXT[] NOT NULL with no default value.
ALTER TABLE "Incentive"
  ALTER COLUMN "keyRequirements"    DROP DEFAULT,
  ALTER COLUMN "industryCategories" DROP DEFAULT;
