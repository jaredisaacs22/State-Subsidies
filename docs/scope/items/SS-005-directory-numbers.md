# SS-005 — Kill Hard-Coded Numbers; Compute Every Headline Figure from the DB

**Priority:** P0 · **Owners:** Chen · Whitfield · Okafor · **Audit origin:** 3.2, §4, rec. #4
**Grade today:** D (at least one hard-coded indefensible number) · **Grade at ship target:** A
**Depends on:** SS-003 (per-row provenance), SS-004 (definitions section).

---

## 1. Finding ID
`SS-005` — audit §3.2 (CHEN-02, "stats API counts rows; $4.2B+ is in page.tsx:296") and rec. #4 ("Delete the hard-coded `$4.2B+` or compute it").

## 2. Hypothesis
*"Replacing every hard-coded site number with a live, dated, methodology-linked figure will not reduce perceived scale of the directory (controlled for copy) and will measurably increase `Methodology` click-through (evidence of trust-seeking behavior). Concretely: trust-proxy survey score rises ≥ 0.5 on a 5-point scale, and per-number methodology click rate settles at 1–3% (below that: under-surfacing; above: confusion)."*

Ship-block if trust-proxy falls or if users report the site feels "smaller" post-change in a moderated read.

## 3. Current state
- **Hard-coded `$4.2B+ Available`** at `app/page.tsx:296`. No source, no date, no link.
- **Other stats** on `/` come from `/api/stats` which does `prisma.incentive.groupBy({by: "jurisdictionLevel"})` — correct *shape*, but no `as of`, no link, no definition.
- **Map page** counts per state come from `/api/stats/states` (fixed in commit `3df62e5`); again correct but un-dated and un-defined.
- **`Largest active` / `Median award`** — not displayed anywhere today, but we have the data to compute them.
- **`updated X ago`** — not shown anywhere today; no `ScrapeRun` table to source it from (SS-002 adds this).

## 4. Target state
- **Zero hard-coded data numbers** anywhere in the frontend. Static copy (marketing) numbers are allowed only when dated in the copy itself ("as of launch, we had 4 sources" is fine; "4,000 programs" is not).
- **Every headline figure** — Programs, Federal, State, Local & Agency, Median award, Largest active, Sources — is rendered by a single `<Stat>` component taking `value`, `label`, `asOf`, and `methodologyAnchor`.
- **`as of` is computed from the query time**, not the build time.
- Cached with `unstable_cache` + `revalidate: 300` + `tags: ["directory-stats"]`. The writers (scraper → `ScrapeRun`) revalidate the tag on success.
- **No total-dollar-available figure** is shown until we can defend it. The substitute — *"Median award: $152K · Largest active: $25M"* — is *computable today* and defensible, and arguably more useful to a user than a cumulative billions figure.
- **Map page** uses per-state counts from `getStatesStats()` with the same `as of`.
- **Per-agency counts** on the home-page agency strip are live, via `getAgencyStats()`.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 7 | **USAspending.gov** | Every number has `as of`; updates visible within the hour | Same pattern | Obsessive recomputation budget; 5-min cache is enough |
| 12 | **Crunchbase** | Every count updates live; provenance inline | Live counts + provenance link | Sub-100ms freshness SLO; overkill for our workload |
| 4 | **Vanguard** | Restraint: only shows numbers that are defensible | Same discipline — no $4.2B until computable | Their monochrome minimalism |
| 1 | **Merrill** | Numbers footnoted; units and dates always present | Footnote-equivalent (`Methodology` link per number) | Legal-dense footnote prose |
| 14 | **Expedia** | Urgency numbers ("3 left at this price") with a timestamp | We display urgency only on closing-soon deadlines, always with source | Counter gamification |

## 6. Case studies
- **A — USAspending.gov headline counter (2020 refresh).** Added `as of` to the live counter; academic citations rose, FOIA requests on data pedigree fell. Lesson applied.
- **B — FiveThirtyEight "Last updated" timestamp on every forecast.** Became the standard reference for what "live" means in data journalism. Lesson applied.
- **C — Our own 04/21 audit (CHEN-02).** Internal audit flagged that two panels of the page draw from different universes. The audit stands as evidence that editorial/data mismatch is reader-visible.

## 7. Experiment / test design
- **7.1 — Trust-proxy survey (n=25).** Moderated. Show page before vs after. Prompt: *"On a 1–5 scale, how trustworthy do you find these numbers? Why?"* Success: mean Δ ≥ +0.5.
- **7.2 — Methodology click-through tracking (28 days).** Target landing: 1–3% of stat impressions click through. Below: under-surfaced; above: we're confusing users.
- **7.3 — Recomputation correctness check (infra).** Golden assertions in a pytest + Next-level Vitest that given a seeded DB of N rows, `getDirectoryStats()` returns exactly the expected counts. Prevents silent regressions from schema changes.

**Stop-for-harm:** if moderated test says "feels smaller / less impressive" without compensating trust lift, we rewrite the surrounding copy (not the numbers) rather than revert.

## 8. Samples / artifacts

### Delete the number

`app/page.tsx:296` — remove the hard-coded `$4.2B+ Available` block entirely. Replace with the `<Stat>` grid below.

### `<Stat>` component

```tsx
// components/Stat.tsx
export function Stat({
  value, label, asOf, methodologyAnchor,
}: {
  value: string;
  label: string;
  asOf: Date;
  methodologyAnchor: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-[10px] text-slate-500">
        as of <time dateTime={asOf.toISOString()}>{formatShort(asOf)}</time>
        {" · "}
        <a href={`/methodology#${methodologyAnchor}`} className="underline">Methodology</a>
      </span>
    </div>
  );
}
```

### Stats strip usage

```tsx
// app/page.tsx (excerpt)
const s = await getDirectoryStats();
<div className="grid grid-cols-6 gap-6">
  <Stat value={s.totalActive.toLocaleString()} label="Programs"       asOf={s.asOf} methodologyAnchor="how-we-count" />
  <Stat value={s.federal.toLocaleString()}     label="Federal"        asOf={s.asOf} methodologyAnchor="how-we-count" />
  <Stat value={s.state.toLocaleString()}       label="State"          asOf={s.asOf} methodologyAnchor="how-we-count" />
  <Stat value={s.localAgency.toLocaleString()} label="Local & Agency" asOf={s.asOf} methodologyAnchor="how-we-count" />
  <Stat value={fmtMoney(s.largestActive)}      label="Largest active" asOf={s.asOf} methodologyAnchor="how-we-count" />
  <Stat value={fmtMoney(s.medianAward)}        label="Median award"   asOf={s.asOf} methodologyAnchor="how-we-count" />
</div>
```

### Canonical SQL for each metric (copied verbatim onto `/methodology#how-we-count`)

```sql
-- totalActive
SELECT COUNT(*) FROM "Incentive" WHERE status = 'ACTIVE';

-- federal / state / localAgency
SELECT "jurisdictionLevel", COUNT(*)
FROM "Incentive" WHERE status = 'ACTIVE'
GROUP BY "jurisdictionLevel";

-- medianAward, largestActive
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY "maxPerApplicant") AS median,
  MAX("maxPerApplicant") AS largest
FROM "Incentive"
WHERE status = 'ACTIVE' AND "maxPerApplicant" IS NOT NULL;

-- sourceCount (SS-003)
SELECT COUNT(DISTINCT "sourceDomain")
FROM "Incentive" WHERE status = 'ACTIVE';

-- lastScrape (SS-002)
SELECT MAX("finishedAt")
FROM "ScrapeRun" WHERE status = 'SUCCESS';
```

## 9. Step-by-step process-flow map

1. **Build `getDirectoryStats()`** shared util (SS-001 already references it). Coupled. **K.** included in SS-001.
2. **Build `<Stat>` component + `fmtMoney` helper.** **A + K.** 0.5 ED.
3. **Replace `$4.2B+` + strip** on `/`. **K.** 0.5 ED.
4. **Propagate `<Stat>` to `/map` state panel** and incident-card counts. **K.** 0.5 ED.
5. **Author `#how-we-count` section** of `/methodology` with the SQL above (SS-004 coupling). **O + K.** 0.5 ED.
6. **Vitest regression tests** on `getDirectoryStats()` against seeded DB. **K.** 0.5 ED.
7. **Moderated trust-proxy survey (Test 7.1).** **Mei.** 5 cal-days.
8. **Ship** behind a single boolean flag (`LIVE_NUMBERS_ENABLED=true`) for emergency rollback. **K.** 0.25 ED.
9. **Monitor Test 7.2** click-through rate for 28 days.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- Zero hard-coded data numbers in `app/**/*.tsx`. CI grep-gate: `grep -rE '\$[0-9.]+B\+' app/` returns empty.
- Trust-proxy survey Δ ≥ +0.5.
- Methodology click-through rate 1–3%.
- No regression in primary CTA click-rate (< 5%).

**Rollback:** flag flip + redeploy; SQL remains fine; we simply revert the stats strip visuals if needed.

**Institutional memory:** `experiments/SS-005-numbers.md` — store the survey transcripts and the exact SQL at each revision (so the `/methodology` definitions and the code never drift).
