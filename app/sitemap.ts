import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://statesubsidies.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base,                  lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/map`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    // /saved and /dashboard intentionally omitted — no crawlable content
  ];

  // Incentive detail pages
  try {
    const incentives = await prisma.incentive.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000, // cap to avoid timeout
    });

    const incentivePages: MetadataRoute.Sitemap = incentives.map((inc) => ({
      url: `${base}/incentives/${inc.slug}`,
      lastModified: inc.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...incentivePages];
  } catch {
    return staticPages;
  }
}
