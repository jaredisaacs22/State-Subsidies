# SS-010 — Build & Release Hardening

**Priority:** P1 · **Owners:** Tanaka · Chen · **Audit origin:** 3.12, rec. #10
**Grade today:** D (production build includes `--accept-data-loss`) · **Grade at ship target:** A−
**Depends on:** coupled with SS-002 (live scrapers require this to land first); SS-009 (migrations for account schema).

---

## 1. Finding ID
`SS-010` — audit §3.12 (`vercel.json` runs `prisma db push --accept-data-loss && next build`); rec. #10.

## 2. Hypothesis
*"Replacing `prisma db push --accept-data-loss` with `prisma migrate deploy`, adding per-commit migration review, per-deploy schema drift detection, and a < 60 s rollback playbook will eliminate entire classes of accidental data loss and materially reduce time-to-recovery for any production incident."*

Binary gate: we should be able to demonstrate a staged rollback from a bad deploy in under 60 seconds. If we cannot, we have not shipped this item.

## 3. Current state
- `vercel.json:2` — `buildCommand = "prisma generate && prisma db push --accept-data-loss && next build"`. On every deploy. If `seed.ts` ever diverges from the live schema in a destructive direction, the deploy silently drops data.
- No `prisma/migrations/` folder exists; schema history is carried entirely in `schema.prisma` and `seed.ts`.
- `instrumentation.ts` re-seeds at runtime idempotently. That's clever, but it isn't a substitute for migrations.
- No structured error logs; Sentry/Vercel Analytics wired but unreviewed.
- No rate limits on any API route (audit §3.12).
- Build does not cache between Vercel deploys well (deps not pinned to lockfile in Prisma generate path).

## 4. Target state
- **Migrations as code.** Initial baseline: `prisma migrate dev --name init` run locally, migrations committed. Every subsequent schema change goes via `prisma migrate dev --name feature-x`; no direct `db push` in production.
- **`vercel.json`** updated:
  ```json
  {
    "buildCommand": "prisma generate && prisma migrate deploy && next build",
    "installCommand": "npm install",
    "framework": "nextjs"
  }
  ```
  with a preview-step that runs `prisma migrate diff` and fails the build if the deployed schema drifts from the one in code.
- **Per-PR migration review gate.** A GitHub Actions job runs `prisma migrate diff --from-schema-datasource` against a dev DB; PRs touching `prisma/**` get labeled `migration:yes` and require Tanaka (SRE) or Chen (data) to approve.
- **Rate limits on public API routes.** `middleware.ts` with Upstash Ratelimit (SS-008 uses this too). `/api/chat`, `/api/track`, `/api/bookmarks/*` rate-limited by IP + session.
- **Observability.**
  - Sentry instrumented with release tags.
  - Structured logs via Pino; all errors have a correlation ID.
  - A `/internal/healthz` endpoint reports DB connectivity, last scrape time, cache status.
  - Dashboard gains a "Deploy log" strip showing last N deploys + their durations + any errors.
- **Rollback playbook.** Documented in `docs/runbooks/rollback.md`. Three flavors:
  - **Flag revert** (60 s) — for UI changes behind feature flags.
  - **Redeploy previous SHA** (< 3 min) — for app-code regressions.
  - **Migration rollback** (< 15 min) — for schema regressions; always reversible because every migration has an explicit `DOWN`.
- **Secrets rotation.** Scheduled 90-day rotation for `ANTHROPIC_API_KEY`, `DATABASE_URL` family, and `DASHBOARD_SECRET`. Script + checklist in the runbook.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 5 | **Stripe** | Strict migration review, canary deploys, blameless incident reviews | Migration-review gate; incident postmortems | Their multi-region deploy complexity |
| 1 | **Merrill** | Disciplined change-control; defined rollback SLOs | Rollback SLOs (60 s / 3 min / 15 min) | Their change-advisory-board overhead |
| 20 | **Linear** | Release notes + deploy log visible to all engineers | Public-inside deploy strip on dashboard | Not applicable |
| 7 | **USAspending.gov** | Public incident log per dataset | Public incident log in SS-004 | Bureaucratic post-mortem templates |
| — | **GrantWatch (floor)** | No visible release discipline | Nothing to borrow | Their opacity is the floor we exceed on day one |

## 6. Case studies
- **A — Knight Capital 2012 incident.** A deploy without a proper rollback playbook burned $440M in 45 minutes. Lesson applied: rollback-first design.
- **B — GitHub 2018 database incident.** Schema migration + failover went wrong; recovery took 24h. Postmortem published. Lesson applied: every migration has an `UP` and `DOWN`; every schema change has a tested rollback path in staging.
- **C — Vercel / Next.js 2023 ISR cache invalidation incidents (public).** Outcomes depended on whether the team had tags-based invalidation. Lesson applied: we use `revalidateTag("directory-stats")` (SS-005) so scraper success can invalidate without redeploy.
- **D — Our own April 20 incident.** Absence of canary on scraper ingest. Lesson applied: SS-002's dry-run + this item's rollback doctrine are two sides of one fix.

## 7. Experiment / test design
- **7.1 — Migration drill.** In staging, apply a deliberately destructive migration, then roll back. Measure time; target < 15 min. Run quarterly.
- **7.2 — Rollback drill.** Deliberately ship a known-broken commit behind a flag; revert; measure time; target < 60 s. Run monthly.
- **7.3 — Rate-limit stress.** Simulate 50k req/min across endpoints; confirm 429 behavior; confirm no DB saturation.
- **7.4 — Healthcheck probe.** External synthetic check pings `/internal/healthz` every 60 s; page on failure; SLO 99.9% monthly.

**Stop-for-harm:** if a monthly rollback drill exceeds the SLO, we freeze feature work until we hit the target.

## 8. Samples / artifacts

### `vercel.json` replacement

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### CI job — migration review

```yaml
# .github/workflows/migration-review.yml
name: Migration Review
on: { pull_request: { paths: [ "prisma/**" ] } }
jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: npm ci
      - run: npx prisma migrate diff --from-url ${{ secrets.DATABASE_URL_UNPOOLED }} --to-schema-datamodel prisma/schema.prisma > /tmp/migration.diff
      - uses: actions/upload-artifact@v4
        with: { name: migration-diff, path: /tmp/migration.diff }
      - name: Require review label
        uses: actions/labeler@v5
        with: { configuration-path: .github/labeler.yml }
```

### Healthcheck

```ts
// app/internal/healthz/route.ts
import { prisma } from "@/lib/prisma";
import { getDirectoryStats } from "@/lib/stats";

export async function GET() {
  try {
    const [ok, stats] = await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      getDirectoryStats(),
    ]);
    return Response.json({
      ok: true,
      db: ok ? "up" : "down",
      lastScrape: stats.lastScrape,
      totalActive: stats.totalActive,
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

### Rollback runbook (skeleton for `docs/runbooks/rollback.md`)

```
# Rollback Runbook

Pick the lowest-impact revert that fits the failure.

## Flavor 1 — Flag revert (< 60 s)
1. GrowthBook / Vercel Feature Flags → toggle flag off.
2. Confirm via ?flag-status query; record SHA of flag state change.

## Flavor 2 — Redeploy previous SHA (< 3 min)
1. Vercel dashboard → Project → Deployments → pick last known-good.
2. "Promote to Production". Confirm traffic cutover in < 60 s.

## Flavor 3 — Migration rollback (< 15 min)
1. Apply DOWN migration from prisma/migrations/<name>/migration.sql.
2. Confirm schema via `prisma migrate status`.
3. Redeploy previous app SHA (Flavor 2).
4. Write incident to /methodology#corrections.
```

## 9. Step-by-step process-flow map

1. **Author initial migration baseline.** `prisma migrate dev --name init`. Commit `prisma/migrations/`. **K.** 0.5 ED.
2. **Update `vercel.json`** to `migrate deploy`. **K.** 0.25 ED.
3. **Add migration-review workflow.** **K.** 0.5 ED.
4. **Add rate-limit middleware** (Upstash). **K.** 1 ED.
5. **Add observability** (Sentry release tags, Pino logs, `/internal/healthz`). **K.** 1 ED.
6. **Add deploy log strip** to the dashboard. **K.** 0.5 ED.
7. **Write rollback runbook.** **K + Chen.** 0.5 ED.
8. **Run rollback drill + migration drill.** **K.** 0.5 ED.
9. **Secrets rotation schedule + script.** **K.** 0.5 ED.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- `vercel.json` no longer contains `--accept-data-loss`.
- All migrations in `prisma/migrations/` with `UP` and a tested `DOWN`.
- Monthly rollback drill ≤ 60 s on flags, ≤ 3 min on redeploy.
- Quarterly migration drill ≤ 15 min.
- `/internal/healthz` 99.9% monthly SLO.
- Rate-limit middleware in place on `/api/chat`, `/api/track`, `/api/bookmarks/*`.

**Rollback:** this item's outputs are themselves the rollback machinery; a failure to land is a work continuation, not a reverse.

**Institutional memory:** `experiments/SS-010-release.md` — a short monthly entry: drill times, incidents, rotation confirmations.
