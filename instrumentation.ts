// Runs once when the Next.js Node.js server starts.
// Auto-seeds the database if the program count is below the expected total.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { prisma } = await import("./lib/db");
    const count = await prisma.incentive.count();

    if (count >= 530) {
      await prisma.$disconnect();
      return;
    }

    console.log(`[seed] ${count} programs in DB — upserting to 530...`);
    const { INCENTIVES } = await import("./lib/seedData");

    for (const inc of INCENTIVES) {
      await prisma.incentive.upsert({
        where: { slug: inc.slug },
        update: inc,
        create: inc,
      });
    }

    const newCount = await prisma.incentive.count();
    console.log(`[seed] Done — ${newCount} programs now in DB`);
    await prisma.$disconnect();
  } catch (e) {
    console.error("[seed] Auto-seed failed:", e);
  }
}
