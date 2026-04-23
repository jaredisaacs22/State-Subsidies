-- CreateTable
CREATE TABLE "Incentive" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jurisdictionLevel" TEXT NOT NULL,
    "jurisdictionName" TEXT NOT NULL,
    "managingAgency" TEXT NOT NULL,
    "agencyAcronym" TEXT,
    "shortSummary" TEXT NOT NULL,
    "keyRequirements" TEXT NOT NULL,
    "industryCategories" TEXT NOT NULL,
    "incentiveType" TEXT NOT NULL,
    "fundingAmount" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "applicationOpenDate" TIMESTAMP(3),
    "sourceUrl" TEXT NOT NULL,
    "programCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "scrapedAt" TIMESTAMP(3),
    "scraperSource" TEXT,

    CONSTRAINT "Incentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "vid" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "ref" TEXT NOT NULL DEFAULT 'direct',
    "query" TEXT,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incentive_slug_key" ON "Incentive"("slug");

-- CreateIndex
CREATE INDEX "Incentive_jurisdictionLevel_idx" ON "Incentive"("jurisdictionLevel");

-- CreateIndex
CREATE INDEX "Incentive_incentiveType_idx" ON "Incentive"("incentiveType");

-- CreateIndex
CREATE INDEX "Incentive_status_idx" ON "Incentive"("status");

-- CreateIndex
CREATE INDEX "Incentive_deadline_idx" ON "Incentive"("deadline");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_type_idx" ON "PageView"("type");
