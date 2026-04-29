/**
 * SS-001 Trust Ribbon — building block for the persistent header strip.
 *
 * STATUS: standalone component. Not yet mounted in `app/layout.tsx` —
 * SS-001 owners (Aristov, Reeves) decide where it goes once the hero
 * rewrite specification is finalized. For now, viewable at
 * `/preview/trust-ribbon`.
 *
 * Data sources:
 *   - `/api/stats`               total program count
 *   - `/api/stats/last-scrape`   most recent ScrapeRun finishedAt
 *
 * Server component — no client-side JS required, no loading flicker.
 */

import { prisma } from "@/lib/db";

type Stats = {
  total: number;
  govSourcesEstimate: number;
  lastScrapedAt: Date | null;
};

async function loadStats(): Promise<Stats> {
  try {
    const [total, latest, govSourcesEstimate] = await Promise.all([
      prisma.incentive.count({ where: { status: "ACTIVE" } }),
      prisma.scrapeRun
        .findFirst({ orderBy: { finishedAt: "desc" } })
        .catch(() => null), // ScrapeRun may not exist yet on a fresh DB
      // SS-003: distinct .gov source domains via indexed sourceDomain field.
      prisma.incentive
        .findMany({
          where: { status: "ACTIVE", sourceDomain: { endsWith: ".gov" } },
          select: { sourceDomain: true },
          distinct: ["sourceDomain"],
        })
        .then((rows) => rows.length),
    ]);
    return {
      total,
      govSourcesEstimate,
      lastScrapedAt: latest?.finishedAt ?? null,
    };
  } catch {
    return { total: 0, govSourcesEstimate: 0, lastScrapedAt: null };
  }
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "never";
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (mins >= 1) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  return "just now";
}

export async function TrustRibbon() {
  const { total, govSourcesEstimate, lastScrapedAt } = await loadStats();

  return (
    <div
      role="region"
      aria-label="Site provenance"
      className="w-full bg-slate-50 border-b border-slate-200 text-xs text-slate-600"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-slate-700">
          Independent public directory.
        </span>
        <span aria-hidden="true">·</span>
        <span>Not a government website.</span>
        <span aria-hidden="true">·</span>
        <span>Free.</span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="text-slate-900">{total.toLocaleString()}</strong>{" "}
          verified programs
        </span>
        {govSourcesEstimate > 0 && (
          <>
            <span aria-hidden="true">from</span>
            <span>
              <strong className="text-slate-900">{govSourcesEstimate}</strong>{" "}
              .gov sources
            </span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span>
          updated{" "}
          <strong className="text-slate-900">
            {formatRelativeTime(lastScrapedAt)}
          </strong>
        </span>
        <span aria-hidden="true">·</span>
        <a
          href="/methodology"
          className="text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded-sm"
        >
          Methodology
        </a>
      </div>
    </div>
  );
}

export default TrustRibbon;
