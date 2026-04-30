-- SS-003 phase 2: Convert JSON-string columns to native PostgreSQL TEXT[] arrays.
--
-- keyRequirements and industryCategories were stored as JSON-serialised strings
-- (e.g. '["Agriculture","Fleet"]'). This migration converts them to first-class
-- PostgreSQL TEXT[] columns so Prisma can use native array filters (has / hasSome)
-- instead of substring-contains workarounds.
--
-- The USING clause converts each existing row via json_array_elements_text, which
-- correctly handles both well-formed JSON arrays and the empty-string edge case.

ALTER TABLE "Incentive"
  ALTER COLUMN "keyRequirements" TYPE TEXT[]
    USING CASE
      WHEN "keyRequirements" = '' OR "keyRequirements" IS NULL
        THEN ARRAY[]::TEXT[]
      ELSE ARRAY(SELECT json_array_elements_text("keyRequirements"::json))
    END,
  ALTER COLUMN "industryCategories" TYPE TEXT[]
    USING CASE
      WHEN "industryCategories" = '' OR "industryCategories" IS NULL
        THEN ARRAY[]::TEXT[]
      ELSE ARRAY(SELECT json_array_elements_text("industryCategories"::json))
    END;
