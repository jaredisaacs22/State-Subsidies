-- SS-002: ScrapeRun audit table
-- Records every scraper execution for observability, Trust Ribbon, and incident forensics.

CREATE TABLE IF NOT EXISTS "ScrapeRun" (
    "id"                    TEXT        NOT NULL,
    "source"                TEXT        NOT NULL,
    "startedAt"             TIMESTAMP(3) NOT NULL,
    "finishedAt"            TIMESTAMP(3) NOT NULL,
    "status"                TEXT        NOT NULL,
    "rowsConsidered"        INTEGER     NOT NULL,
    "rowsInserted"          INTEGER     NOT NULL,
    "rowsUpdated"           INTEGER     NOT NULL,
    "rowsSkipped"           INTEGER     NOT NULL,
    "qualityGateRejections" INTEGER     NOT NULL,
    "durationMs"            INTEGER     NOT NULL,
    "notes"                 TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScrapeRun_source_finishedAt_idx"
    ON "ScrapeRun"("source", "finishedAt");
