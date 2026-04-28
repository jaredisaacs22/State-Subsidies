/**
 * SS-003 backfill — run once immediately after migration 2_add_provenance.
 *
 * Populates on every existing Incentive row:
 *   sourceDomain  — hostname extracted from sourceUrl
 *   firstSeenAt   — createdAt (best proxy for first observation)
 *   lastSeenAt    — scrapedAt ?? createdAt (most recent confirmed observation)
 *
 * parseConfidence already defaults to MEDIUM in the migration; no change needed.
 * sourceHash stays null until scrapers begin computing and emitting it (SS-003 PR B).
 *
 * Run:
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS"}' prisma/backfill-provenance.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH = 200;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    // Malformed URL — leave empty; will be fixed when scraper re-fetches the row.
    return "";
  }
}

async function main() {
  let cursor: string | undefined;
  let total = 0;
  let batches = 0;

  console.log("Starting SS-003 provenance backfill…");

  while (true) {
    const rows = await prisma.incentive.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, sourceUrl: true, createdAt: true, scrapedAt: true },
    });

    if (rows.length === 0) break;

    await Promise.all(
      rows.map((row) =>
        prisma.incentive.update({
          where: { id: row.id },
          data: {
            sourceDomain: extractDomain(row.sourceUrl),
            firstSeenAt:  row.createdAt,
            lastSeenAt:   row.scrapedAt ?? row.createdAt,
          },
        })
      )
    );

    cursor = rows[rows.length - 1].id;
    total += rows.length;
    batches++;
    console.log(`  batch ${batches}: processed ${total} rows`);
  }

  console.log(`Done. ${total} rows backfilled.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
