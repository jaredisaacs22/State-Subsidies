/**
 * SS-004 — Methodology Page (v1 panel-review draft)
 *
 * Single canonical URL covering the 8 sections specified in
 * `docs/scope/items/SS-004-methodology-page.md §4`. All copy here is
 * legal-review-candidate per SS-004 §8 — Okonkwo to review before final.
 *
 * Live data: #sources and the headline counts in #how-we-count are
 * computed from the DB at request time (force-dynamic for accuracy).
 */

import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min cache — matches #how-we-count copy

export const metadata: Metadata = {
  title: "Methodology — How We Source & Verify Programs",
  description:
    "How StateSubsidies finds, verifies, and publishes U.S. government incentive programs. " +
    "Sources, verification process, correction policy, and AI advisor disclosure.",
  alternates: { canonical: "https://statesubsidies.com/methodology" },
  openGraph: {
    title: "Methodology — How We Source & Verify Programs | StateSubsidies",
    description: "How we find, verify, and publish government incentive programs.",
    url: "https://statesubsidies.com/methodology",
    type: "article",
  },
};

const LEGAL = {
  entity: "StateSubsidies.com",
  contactEmail: "corrections@statesubsidies.com",
  repoUrl: "https://github.com/jaredisaacs22/state-subsidies",
};

type SourceStat = {
  source: string;
  count: number;
};

async function loadSourceStats(): Promise<{
  totalActive: number;
  perSource: SourceStat[];
  lastSuccessfulScrape: Date | null;
}> {
  try {
    const [totalActive, perSource, latestScrape] = await Promise.all([
      prisma.incentive.count({ where: { status: "ACTIVE" } }),
      prisma.incentive.groupBy({
        by: ["scraperSource"],
        where: { status: "ACTIVE", scraperSource: { not: null } },
        _count: { _all: true },
      }),
      prisma.scrapeRun
        .findFirst({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" } })
        .catch(() => null),
    ]);

    return {
      totalActive,
      perSource: perSource
        .map((row) => ({
          source: row.scraperSource ?? "unknown",
          count: row._count._all,
        }))
        .sort((a, b) => b.count - a.count),
      lastSuccessfulScrape: latestScrape?.finishedAt ?? null,
    };
  } catch {
    return { totalActive: 0, perSource: [], lastSuccessfulScrape: null };
  }
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-t border-slate-200 first:border-t-0">
      <h2 className="text-xl font-semibold text-slate-900 mb-3">
        <a href={`#${id}`} className="hover:text-indigo-600">
          {title}
        </a>
      </h2>
      <div className="prose prose-slate max-w-none text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default async function MethodologyPage() {
  const { totalActive, perSource, lastSuccessfulScrape } = await loadSourceStats();
  const updated = lastSuccessfulScrape
    ? lastSuccessfulScrape.toISOString().slice(0, 10)
    : "never (pre-live promotion)";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          v1 panel-review draft · last updated {updated}
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Methodology</h1>
        <p className="text-sm text-slate-600 mt-3 max-w-prose">
          How StateSubsidies.com finds programs, decides what counts, verifies
          sources, and publishes corrections. This page is permanent. Linkable
          by section: every heading is a fragment URL.
        </p>

        <nav aria-label="Section index" className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <a className="text-indigo-600 hover:underline" href="#what-we-are">What we are</a>
          <a className="text-indigo-600 hover:underline" href="#what-we-promise">What we promise</a>
          <a className="text-indigo-600 hover:underline" href="#sources">Sources</a>
          <a className="text-indigo-600 hover:underline" href="#how-we-verify">How we verify</a>
          <a className="text-indigo-600 hover:underline" href="#how-we-count">How we count</a>
          <a className="text-indigo-600 hover:underline" href="#corrections">Corrections</a>
          <a className="text-indigo-600 hover:underline" href="#ai-advisor">AI advisor</a>
          <a className="text-indigo-600 hover:underline" href="#privacy-and-independence">Privacy &amp; independence</a>
        </nav>
      </header>

      <Section id="what-we-are" title="What we are">
        <p>
          <strong>StateSubsidies.com is an independent directory</strong> of public
          funding programs available to people, households, students, farmers,
          nonprofits, schools, governments, and businesses in the United States.
          We are <strong>not</strong> a government website, <strong>not</strong>{" "}
          affiliated with any federal or state agency, and <strong>not</strong>{" "}
          compensated by any program we list.
        </p>
        <p>
          The directory is operated by {LEGAL.entity}. Questions,
          corrections, and press: <code>{LEGAL.contactEmail}</code>. Our
          methodology is public and versioned at{" "}
          <a className="text-indigo-600 underline" href={LEGAL.repoUrl}>
            {LEGAL.repoUrl}
          </a>
          .
        </p>
      </Section>

      <Section id="what-we-promise" title="What we promise (and don't)">
        <p>
          We will show you every public program for which you plausibly qualify,
          across every state, agency, and level of government, updated on a
          cadence we publish (see <a href="#sources" className="text-indigo-600 underline">Sources</a>),
          with source links, free forever.
        </p>
        <p>
          We will <strong>not</strong> hide a program from you because of
          commercial interest; we do not take commercial interest. We will
          <strong> not</strong> guarantee you get the money — no responsible
          source can. We <strong>do</strong> guarantee we won&apos;t hide a program
          from you.
        </p>
      </Section>

      <Section id="sources" title="Sources">
        <p>
          The directory is currently composed of <strong>{totalActive.toLocaleString()}</strong>{" "}
          active programs ingested from the sources below. Live ingest cadence
          per source is published transparently; programs out of date past their
          deadline are auto-marked closed.
        </p>
        <p>
          Most-recent successful scrape: <code>{updated}</code>.
        </p>
        {perSource.length > 0 ? (
          <table className="text-sm border-collapse w-full mt-3">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-3 py-2 border border-slate-200">Source</th>
                <th className="text-right px-3 py-2 border border-slate-200">Active programs</th>
              </tr>
            </thead>
            <tbody>
              {perSource.map((s) => (
                <tr key={s.source}>
                  <td className="px-3 py-2 border border-slate-200 font-mono text-xs">{s.source}</td>
                  <td className="text-right px-3 py-2 border border-slate-200">{s.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500 italic">
            Per-source counts will populate once the scraper graduates from
            DRY_RUN to live writes (see SS-002 promotion checklist).
          </p>
        )}
      </Section>

      <Section id="how-we-verify" title="How we verify">
        <p>
          Each row carries a parse-confidence label (planned: HIGH / MEDIUM / LOW
          per <code>SS-003</code>). HIGH means our parser matched every required
          field on the source page. MEDIUM means at least one field was inferred.
          LOW means a real gap; we tell you what was inferred and link straight
          to the source.
        </p>
        <p>
          Source-agnostic gates reject any row whose title begins with boilerplate
          like &ldquo;Federal grant opportunity:&rdquo;, whose summary is shorter than
          the legibility threshold (~120 characters), whose funding amount is
          missing, or whose category vector is empty. These gates run in CI on
          every parser change (see <code>tests/test_grants_gov_parser.py</code>).
        </p>
        <p>
          Human review is the second line of defense. A row is marked &ldquo;verified&rdquo;
          only when a reviewer has confirmed the listing within the last 180 days.
        </p>
      </Section>

      <Section id="how-we-count" title="How we count">
        <p>
          Every headline number on the home page resolves here.
        </p>
        <ul className="list-disc pl-6">
          <li>
            <strong>&ldquo;Active programs&rdquo;</strong> means{" "}
            <code>status = ACTIVE</code> and (the application deadline is in the
            future, or the deadline is null/rolling). Computed at query time,
            cached 5 minutes.
          </li>
          <li>
            <strong>&ldquo;.gov sources&rdquo;</strong> means the count of distinct
            managing-agency strings whose <code>sourceUrl</code> contains{" "}
            <code>.gov</code>. This undercounts state quasi-government agencies
            on <code>.com</code> domains; we err on the side of strict.
          </li>
          <li>
            <strong>&ldquo;Updated X ago&rdquo;</strong> in the Trust Ribbon is the
            finish time of the most recent <em>successful</em> scrape run across
            all sources (status SUCCESS in the <code>ScrapeRun</code> log).
          </li>
        </ul>
      </Section>

      <Section id="corrections" title="Corrections">
        <p>
          Found a mistake? Tell us at{" "}
          <code>{LEGAL.contactEmail}</code>. We acknowledge corrections within
          two business days and either correct, dispute (with reasoning), or
          escalate within seven.
        </p>
        <p>
          Public incident log:
        </p>
        <ul className="list-disc pl-6">
          <li>
            <strong>2026-04-20 — Grants.gov boilerplate row incident.</strong> 21 rows
            with the title prefix &ldquo;Federal grant opportunity:&rdquo; were
            ingested before our boilerplate-prefix filter existed. Contained
            same day; gate now in CI. Full incident write-up at{" "}
            <code>docs/scope/experiments/SS-002-scraper-incidents.md</code>.
          </li>
        </ul>
      </Section>

      <Section id="ai-advisor" title="AI advisor">
        <p>
          The chat assistant is Anthropic&rsquo;s Claude Sonnet 4.6, accessed via
          the <code>@ai-sdk/anthropic</code> SDK. It searches our directory by
          calling a single tool, <code>search_incentives</code>, against the
          same data the public site sees. Every program it cites in a response
          is a row in the directory — it cannot invent programs.
        </p>
        <p>
          The assistant <strong>does not</strong> give legal, tax, or financial
          advice. It does not file your application. It does not know your
          finances. If you ask it a question outside its scope (e.g.,
          <em> &ldquo;will I be approved?&rdquo;</em>), it is instructed to
          decline and suggest the source of authority.
        </p>
        <p>
          Quality is measured against a 200-persona eval set with ground-truth
          expected programs (planned per <code>SS-012</code>); accuracy and
          safety thresholds gate every model or prompt change. The current
          eval is a 10-persona scaffold (<code>evals/personas/</code>); SME
          labeling is in progress.
        </p>
      </Section>

      <Section id="privacy-and-independence" title="Privacy & independence">
        <p>
          We collect anonymous page-view counts and search queries to improve
          the directory (Vercel Analytics + a <code>PageView</code> table in our
          PostgreSQL database). We do <strong>not</strong> use third-party ad
          trackers, do <strong>not</strong> sell or share data, and do{" "}
          <strong>not</strong> tie usage to user identity. There is no login.
        </p>
        <p>
          This site is independently operated and self-funded.
          We take no money from any program we list. We take no government
          sponsorship. We have no affiliate revenue. If that changes, we will
          say so here, dated.
        </p>
      </Section>

      <footer className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500">
        <p>
          <Link href="/" className="text-indigo-600 underline">← Back to home</Link> ·
          Source: <a className="text-indigo-600 underline" href={LEGAL.repoUrl}>{LEGAL.repoUrl}</a>
        </p>
      </footer>
    </main>
  );
}
