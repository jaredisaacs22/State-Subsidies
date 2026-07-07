-- Nonprofit/NGO expansion: who can apply + who funds it.
-- eligibleEntityTypes: BUSINESS | NONPROFIT | GOVERNMENT | TRIBAL | INDIVIDUAL
-- funderType:          GOVERNMENT | FOUNDATION | CORPORATE | UTILITY
-- Defaults backfill every existing row as a business program funded by
-- government — the seed then upserts accurate values per program.

-- AlterTable
ALTER TABLE "Incentive" ADD COLUMN     "eligibleEntityTypes" TEXT[] DEFAULT ARRAY['BUSINESS']::TEXT[],
ADD COLUMN     "funderType" TEXT NOT NULL DEFAULT 'GOVERNMENT';

-- CreateIndex
-- GIN index for TEXT[] containment (has/hasSome → @> / &&), same reasoning
-- as Incentive_industryCategories_gin.
CREATE INDEX "Incentive_eligibleEntityTypes_gin" ON "Incentive" USING GIN ("eligibleEntityTypes" array_ops);

-- CreateIndex
CREATE INDEX "Incentive_funderType_idx" ON "Incentive"("funderType");
