# SS-001 — Hero + Persistent Trust Ribbon Rebuild

**Priority:** P0 · **Owners:** Aristov · Reeves · Kenji · Okonkwo · **Audit origin:** 3.1, 3.2, rec. #5
**Grade today:** B− · **Grade at ship target:** A
**Depends on:** SS-002 (live directory counts), SS-004 (Methodology page URL), SS-005 (computed numbers), SS-007 (audience copy), SS-011 (legal pass).

---

## 1. Finding ID
`SS-001` — covers the Home hero + the global shell's missing Trust Ribbon and the H1 rewrite that audit recommendation #5 called for.

## 2. Hypothesis
*"Replacing the current hero + global shell with (a) a persistent Trust Ribbon under the header, (b) an audience-neutral, promise-bounded H1, and (c) a dated, methodology-linked stats strip with all numbers computed from the DB will — measured over a 28-day window — raise first-session time-on-site by ≥ 20%, raise first-click rate on the primary CTA by ≥ 15%, and cut the 10-second bounce rate by ≥ 25%, with no statistically significant drop in downstream conversion (AI chat start, card click)."*

If none of those three metrics move beyond threshold we roll back, do not claim success, and re-hypothesize.

## 3. Current state (measured where possible)
- **Header:** `app/layout.tsx:22-42`. 3px gradient (navy→teal→navy) + sticky white/95 bar, three nav items, LogoMark.
- **Hero:** `app/page.tsx:252-319`. H1 *"Find government money for your business"* at `app/page.tsx:263`; subcopy references "every state and federal agency"; `BusinessIntakeChat` two-card selector (Quick AI / Tailored AI); keyword search; agency strip (USDA, IRS, DOE, EPA, SBA, HUD, CARB, NYSERDA, EDA + more); stats strip with *"$4.2B+ Available"* hard-coded at `app/page.tsx:296`.
- **Trust ribbon:** does not exist. Footer disclaimer only (`app/layout.tsx:86-93`).
- **Audience exclusion:** H1 excludes every non-business audience that `AudienceSelector` (`components/AudienceSelector.tsx:26-83`) purports to serve — and excludes entirely the new audiences added by the 04/22 COO mandate (individuals, students, researchers, households).
- **Competing CTAs above the fold:** two AI cards + keyword search + audience selector (just below fold) + filter sidebar (desktop) = "five things fight for the first click" (audit §3.2).
- **Baseline metrics:** *unmeasured — Task 0 of §9 is to capture them.* No Vercel Analytics funnels defined; no Clarity/Hotjar; no scroll heatmap.

## 4. Target state
Above the fold, in strict order:

1. **Trust Ribbon** (persistent, server-rendered) immediately below the 3px gradient. Exact copy in §8. Numbers computed from `getDirectoryStats()`; `updated` timestamp from last-successful-scrape record; Methodology link goes to `/methodology` (SS-004).
2. **Rewritten H1 (audience-neutral):** see §8 for three drafts to A/B test. Baseline candidate A: *"Every public program you're eligible for — in one place."*
3. **Subcopy** promise-bounded: see §8. Includes the "free forever" line and the "people, households, farms, schools, nonprofits, governments, and businesses" enumeration the new audience mandate requires.
4. **Single primary action** — a full-width intake input with one button *"Find My Programs"*. Quick AI / Tailored AI collapse into a secondary chooser that appears *after* the user taps the input, not before.
5. **Agency strip, now interactive:** each chip shows its live program count (SS-005), links to a filtered results URL, footer reads *"+ N more agencies · methodology →"* linking to SS-004.
6. **Stats strip — all numbers computed + dated + cite-linked** (SS-005). `$4.2B+ Available` is removed until computable. Median award and largest active are computed today and replace it.

**Wow dimension:** the Trust Ribbon is alive (counts/timestamps actually move across reloads), the H1 greets every audience on the new mandate, the primary action is singular and inviting, every number has a citation trail one click away. No competitor does all four together.

## 5. Top-20 benchmark matrix (SS-001 only)

| # | Platform | What they do (this dimension) | What we borrow | What we avoid |
|---|---|---|---|---|
| 6 | **login.gov** | Persistent "An official website…" strip, agency seal, HTTPS indicator. | Persistent non-dismissable shell element. | We are not government; strip must lead with "Independent · Not a government website." |
| 7 | **USAspending.gov** | Live headline counter with `as of` timestamp; methodology link on every figure. | Live counter + `as of` + per-figure methodology link. | Their hero is austere to dryness. Our voice can be warmer without losing the rigor. |
| 5 | **Stripe.com** | H1 *"Financial infrastructure for the internet"* — audience-unbounded, promise-bounded. | The audience-unbounded + promise-bounded sentence shape. | Their density is for developers; we cannot assume any technical literacy. |
| 1 | **Merrill Edge** | Persistent SIPC/FDIC disclosure; pricing-table footnotes. | Persistent disclosure pattern. | Visual chrome is heavier than our brand warrants. |
| 17 | **Rewiring America IRA Calculator** | Single ZIP input, single CTA, estimate-bounded. | Single input + single CTA pattern. | They promise a dollar number; we promise a *program match list*. |
| 15 | **TurboTax** | Empathetic but bounded H1 (*"We'll do your taxes for you, guaranteed."*). | Empathetic register. | We do **not** use "guaranteed." Okonkwo's standing flag. |
| 19 | **Apple.com (iPhone)** | White space, weight hierarchy, one verb above the fold. | Single-verb rule. | Their reverence is for devices; ours is for a public good — warmer register. |
| 20 | **Linear.app** | Hero teaches on scroll; each section answers one question. | Learn-on-scroll "How it works" below the fold. | Linear assumes experts; we assume nothing. |
| 8 | **GOV.UK** | Reading-age grade 9 enforced; task-first titles. | Grade-9 target, task-first titles site-wide. | Monochrome too sober for our "wow" bar. |

## 6. Case studies (documented prior art)

- **A — Healthcare.gov 2013→2014 rewrite (USDS / 18F).** Replaced the Oct-2013 hero with a ZIP + household-size single-input flow. Abandonment dropped from ~70% to ~15% in the Nov 2013 – Feb 2014 window (public GAO reporting). Lesson: single primary input above the fold, everything else demoted.
- **B — Rewiring America IRA Calculator (2023 launch).** Replaced a policy-explainer hero with ZIP-entry calculator. Reached ~2M sessions and ~300k completed calculations inside six months (Rewiring America public updates, NYT 2023 coverage). Direct domain overlap; pattern is demonstrably transferable.
- **C — Stripe Atlas (2016).** Launch hero *"Start your US business from anywhere."* Audience-unbounded, promise-bounded. 40k+ companies across 140+ countries inside 5 years (Stripe public updates). Lesson: the sentence shape of the H1.
- **D — USAspending.gov 2020 redesign.** Added `as of` timestamps and Methodology links to every figure on the homepage. Treasury OIG cited this as a material contributor to rising academic citation and reduced FOIA requests on the data's pedigree. Lesson: every number dated, every number sourced.

## 7. Experiment / test design

- **7.1 — 5-second recall test (n=50 per arm).** Tool: UsabilityHub or Maze. Ask *"What does this site do? Who is it for?"* Success: ≥ 80% of new-hero respondents name (a) "finds government money / public programs" **and** (b) at least two audiences beyond small business.
- **7.2 — Moderated SUS (n=25).** Five personas × 5 sessions each (small business, nonprofit, farmer, school admin, **student — new mandate**). Success: SUS ≥ 85 on new-hero path; 78 is the pass floor.
- **7.3 — Production A/B (28 days).** Tool: GrowthBook or Vercel A/B. 50/50 holdout. Power = 0.8, α = 0.05, MDE = 15% on primary CTA click-rate → ~4,000 visitors/arm. Sanity-check achievability in Task 0.
- **7.4 — Legal review — binary gate.** Okonkwo signs off on final copy for implied-guarantee / UDAAP. No launch without pass.

**Stop-for-harm:** any of: AI-chat-start rate drops > 10%; card-click rate drops > 10%; SUS < 78. Trip → halt, diagnose, revert.

## 8. Samples / artifacts (concrete)

### H1 variants (for 5-second test)
- **A.** *"Every public program you're eligible for — in one place."*
- **B.** *"Government grants, tax credits, scholarships, and rebates — find the ones you qualify for."*
- **C.** *"Find the public money you qualify for, in under a minute."*

### Subcopy (legal-review candidate)
> *"2,847 verified programs from 43 .gov sources. For people, households, students, farmers, schools, nonprofits, governments, and businesses. Filter by state, situation, or goal — or tell us what you need and we'll match you. Free forever."*

### Trust Ribbon copy (legal-review candidate)
> *"Independent public directory. Not a government website. Free. **2,847** verified programs from **43** .gov sources · updated **2 hours ago**. [Methodology](/methodology)."*

### Stats strip replacement for `$4.2B+ Available`
```
Programs     Federal     State     Local & Agency     Largest active     Median award
  2,847        314        2,103         430               $25M              $152K
                                                          as of Apr 21      as of Apr 21
                                                          Methodology       Methodology
```

### Code sample — `<TrustRibbon />` (abridged but directionally final)

```tsx
// components/TrustRibbon.tsx
import Link from "next/link";
import { getDirectoryStats } from "@/lib/stats";
import { relative } from "@/lib/time";

export async function TrustRibbon() {
  const { totalActive, sourceCount, lastScrape } = await getDirectoryStats();
  return (
    <div
      role="status"
      aria-label="Directory status"
      className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[12px] text-slate-700"
    >
      <span className="font-semibold">Independent public directory.</span>
      <span>Not a government website.</span>
      <span>Free.</span>
      <span>
        <strong>{totalActive.toLocaleString()}</strong> verified programs from{" "}
        <strong>{sourceCount}</strong> .gov sources
      </span>
      <span>
        updated <time dateTime={lastScrape.toISOString()}>{relative(lastScrape)}</time>
      </span>
      <Link href="/methodology" className="underline underline-offset-2">Methodology</Link>
    </div>
  );
}
```

### Code sample — `getDirectoryStats()`

```ts
// lib/stats.ts
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getDirectoryStats = unstable_cache(
  async () => {
    const [totalActive, federal, state, localAgency, sources, lastScrape, fundingStats] =
      await Promise.all([
        prisma.incentive.count({ where: { status: "ACTIVE" } }),
        prisma.incentive.count({ where: { jurisdictionLevel: "FEDERAL", status: "ACTIVE" } }),
        prisma.incentive.count({ where: { jurisdictionLevel: "STATE", status: "ACTIVE" } }),
        prisma.incentive.count({ where: { jurisdictionLevel: { in: ["LOCAL", "AGENCY"] }, status: "ACTIVE" } }),
        prisma.incentive.groupBy({ by: ["sourceDomain"], _count: true }).then(r => r.length),
        prisma.scrapeRun.findFirst({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" } }),
        prisma.$queryRaw<{ median: number; largest: number }[]>`
          SELECT percentile_cont(0.5) within group (order by max_per_applicant) AS median,
                 MAX(max_per_applicant) AS largest
          FROM "Incentive" WHERE status = 'ACTIVE' AND max_per_applicant IS NOT NULL`,
      ]);
    return {
      totalActive, federal, state, localAgency,
      sourceCount: sources,
      lastScrape: lastScrape?.finishedAt ?? new Date(0),
      medianAward: fundingStats[0]?.median ?? null,
      largestActive: fundingStats[0]?.largest ?? null,
    };
  },
  ["directory-stats"],
  { revalidate: 300, tags: ["directory-stats"] }
);
```

## 9. Step-by-step process-flow map

Owner initials per item; ED = engineer-day; cal-day = calendar-day.

1. **Baseline capture (Task 0).** Enable Vercel Analytics funnels + Microsoft Clarity free tier. Record 14 days of current-hero metrics. **K.** 0.5 ED + 14 cal-days wait.
2. **Build `getDirectoryStats()`** + `ScrapeRun` model + `sourceDomain` column (coupled with SS-003 provenance migration; see that item for schema specifics). **K + H.** 0.5 ED.
3. **Build `<TrustRibbon />`** — a11y-reviewed, reduced-motion-safe, SSR-cached. **A + K.** 1 ED.
4. **Draft three H1 variants + ribbon copy + stats-strip layout.** Grade-9 reading age per GOV.UK. **R + Stn + Rmn.** 0.5 ED.
5. **Legal review (binding gate).** **Okon.** 0.5 ED.
6. **5-second test (Test 7.1).** **Mei.** 3 cal-days.
7. **Moderated SUS (Test 7.2).** Five personas, incl. **student** per new mandate. **Mei + Rmn.** 5–7 cal-days.
8. **Build new hero** with winning H1. **A + K.** 1.5 ED.
9. **Ship behind 50/50 flag** (GrowthBook). **K.** 0.5 ED.
10. **28-day A/B window.** No changes during. **K monitors.**
11. **Readout + decision gate.** Pass → ramp 100%. Fail → revert flag + write outcome to `experiments/SS-001-hero.md`. **Panel + COO.** 0.5 ED.
12. **Methodology page (SS-004) must ship concurrently** because the Trust Ribbon links to it. This is a coupled dependency, not a downstream nicety.

**Critical path:** ~28–35 cal-days end-to-end, ~7 ED of work. The A/B window is the long pole and is non-compressible.

## 10. Success metrics · rollback · ship-block

**Ship-block on all three:**
- +20% first-session time-on-site (new visitors).
- +15% primary-CTA click rate.
- −25% 10-second bounce rate.
- **And** no > 10% drop on AI-chat start or card-click.
- **And** SUS ≥ 85 on moderated test.

**Rollback:** one feature-flag revert; < 60 s; no redeploy needed. SHA to revert to is pinned at step 9 and recorded in the experiments log.

**Institutional memory:** Outcome (pass or fail) is written with raw numbers into `experiments/SS-001-hero.md`. This is the file we re-read before the 2027 redesign so we don't repeat a failed pattern.
