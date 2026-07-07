// Runs once when the Next.js Node.js server starts.
// Purges known-bad scraped records and auto-seeds the curated catalog.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { prisma } = await import("./lib/db");
    const { INCENTIVES } = await import("./lib/seedData");

    // 1. Purge uncurated Grants.gov NOFO dumps (raw HTML in titles, no
    //    quality review). Idempotent single query — cheap when nothing matches.
    const purged = await prisma.incentive.deleteMany({
      where: {
        OR: [
          { shortSummary: { startsWith: "Federal grant opportunity:" } },
          { scraperSource: "grants_gov_api" },
        ],
      },
    });
    if (purged.count > 0) console.log(`[seed] Purged ${purged.count} low-quality scraper records`);

    // 2. Seed check. A raw count is useless here — scraped records inflate it
    //    past INCENTIVES.length even when curated programs are missing.
    //    Instead check the LAST program in the catalog: the seed loop writes
    //    in order, so its presence means the most recent full seed completed.
    const sentinel = INCENTIVES[INCENTIVES.length - 1];
    const seeded = await prisma.incentive.findUnique({
      where: { slug: sentinel.slug },
      select: { id: true },
    });
    if (seeded) {
      await prisma.$disconnect();
      return;
    }

    console.log(`[seed] Catalog incomplete ("${sentinel.slug}" missing) — upserting ${INCENTIVES.length} programs...`);

    // Chunked parallel upserts: 583 sequential round-trips (~30-60s) would
    // blow past serverless init limits; chunks of 15 finish in a few seconds.
    // Individual failures are logged, not fatal — the sentinel stays missing
    // if the tail chunk fails, so the next cold start retries.
    const CHUNK = 15;
    for (let i = 0; i < INCENTIVES.length; i += CHUNK) {
      const results = await Promise.allSettled(
        INCENTIVES.slice(i, i + CHUNK).map((inc) =>
          prisma.incentive.upsert({
            where: { slug: inc.slug },
            update: inc,
            create: inc,
          })
        )
      );
      for (const r of results) {
        if (r.status === "rejected") console.error("[seed] Upsert failed:", r.reason);
      }
    }

    const newCount = await prisma.incentive.count();
    console.log(`[seed] Done — ${newCount} programs now in DB`);
    await prisma.$disconnect();
  } catch (e) {
    console.error("[seed] Auto-seed failed:", e);
  }
}
