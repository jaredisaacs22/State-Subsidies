# CEO Track — Attributed History & Active Workstream

**Identity:** Developer 1 — **CEO** (confirmed as core memory by COO on 04/21/2026).
**Primary remit:** tactical execution of the directory — scraper reliability, env + infra, bulk program additions, deploy cadence.
**Relationship to scope:** executes against specifications owned by the COO-track. Exceptions must be recorded (see §4).

---

## 1. Attributed history (what you have driven to date)

These are the commits and actions where CEO-track was the originating voice on this shared repo. Attribution inferred from recent commit log + last two sessions' instructions.

- **04/20/2026** — `13535fe` *Purge bad Grants.gov records + lock scraper to mock mode.* Correct containment of the boilerplate-rows incident. Panel signed off.
- **04/20/2026** — `4c57365` *Add 32 new programs + fix Grants.gov scraper quality gates.* Breadth push across states.
- **04/20/2026** — `abbf3e2` *Improve db-init workflow: clearer secret error, Node 24 opt-in.* Infra hygiene.
- **04/19/2026** — state-coverage pushes (`d715e2e` 16-state add; `ed52617` 530-program seed); source-URL redirect proxy; runtime auto-seed via `instrumentation.ts`.
- **04/21/2026** — requested unified-panel response on "how do I unlock scrapers + fix Vercel env scope?" (transcript message 70). Panel returned a 6-step plan (recorded in §3 below). No code landed before COO paused the workstream.

## 2b. Active workstream — 04/28/2026 session

**Title:** *Backend foundation hardening — rate limiting + production migration auto-deploy*
**Status:** **SHIPPED 04/28/2026.**

### Rate limiting (middleware.ts — new file)
- `POST /api/chat`: **10 req/min per IP** — each call invokes Anthropic; without this a single abusive client could exhaust the entire API budget.
- `POST /api/track`: **100 req/min per IP** — prevents event-flood DB writes.
- In-process sliding window with LRU eviction capped at 10 000 entries. Returns `429` + `Retry-After` + `X-RateLimit-*` headers so well-behaved clients can self-throttle.
- Architecture: Next.js Edge middleware runs before route handlers; zero overhead on the happy path. Comment in-file documents the Vercel KV / Upstash Redis upgrade path for multi-region deployments.

### Production migration auto-deploy (vercel.json + package.json)
- New `vercel-build` script in `package.json`: generates the Prisma client, then runs `prisma migrate deploy` **only when `DATABASE_URL_UNPOOLED` is set** (i.e., Vercel production/preview), then `next build`.
- `vercel.json` `buildCommand` now points to `npm run vercel-build` instead of the inline command.
- Effect: Vercel deploys automatically apply any pending migrations before the new app code goes live — no manual `db-init.yml` dispatch needed for schema changes. Falls back safely to skip-migrate when the env var is absent (CI, local dev).
- CI drift gate (`ci.yml` `prisma-drift` job) continues to catch un-migrated schema changes at PR time — the two mechanisms are complementary.

---

## 2. Active workstream — RESUMED & SHIPPED (04/27/2026)

**Title:** *Unlock scrapers + fix Vercel env scope* — originally 6 steps from the 04/21 unified-panel response.
**Status:** **SHIPPED on 04/27/2026.** Tracked under SS-002. Grants.gov scraper graduated from DRY_RUN to live writes after 6 dry-run cycles cleaned up parser quality (boilerplate filter, agency-map fallback chain, contact-text rejection, detail-endpoint fallback chain). Final validation run produced 21/21 rows passing the quality gate, 34/34 detail fetches succeeded, zero contact-text agency pollution. PR #42 merged 04/27/2026 flips `DRY_RUN=0` in `.github/workflows/scraper.yml`.

**Foundation hardening shipped alongside (PR #44):**
- First-time CI gates on `pull_request`: pytest contract tests (SS-002 §7.1), `tsc --noEmit`, `next lint`, prisma migration-drift gate (SS-010), Next.js build sanity, SS-005 §10 grep gate.
- These were all *missing* before this session — a parser regression or schema drift could have merged silently.

**Why this took 6 cycles:** each dry-run revealed a new failure class: stub rows from HTML scrapers, dead URLs (WAZIP/CARB 404s), wrong API endpoint, detail-endpoint fallback chain needed, contact-text in `agencyName`. Each fix landed as a separate PR with its own contract test. The contract-test suite is now in CI, so the same class of bugs cannot regress without being caught at PR time.

## 2a. Migration of CEO workstream into scope (historical)

The paused 6-step plan has been absorbed, preserved, and upgraded into:

- **[SS-002](../items/SS-002-scraper-revalidation.md)** — Scraper re-validation + Vercel env scope fix. Carries every element of the original 6-step plan, plus dry-run canaries, a new `ScrapeRun` model, and a coupling to SS-012 (eval harness) as a CI gate.
- **[SS-010](../items/SS-010-build-and-release-hardening.md)** — Replaces `vercel.json`'s `--accept-data-loss` with `prisma migrate deploy`, adds migration-review CI, and establishes the rollback SLOs the CEO track will operate under.
- **[SS-003](../items/SS-003-provenance-schema.md)** — adds provenance fields the scrapers will emit going forward (`sourceHash`, `parseConfidence`, etc.). Coupled with SS-002.

The original 6-step plan is reproduced verbatim below for audit, and is now deprecated in favor of SS-002.

### Original (deprecated) 6-step plan

1. **Fix the Vercel env var scope first.** `DATABASE_URL_UNPOOLED` scoped to Production + Preview; confirm `ANTHROPIC_API_KEY` present; verify with `vercel env pull`.
2. **Point `scraper.yml` at `DATABASE_URL_UNPOOLED`.** Align `scrape.yml` similarly.
3. **Harden `vercel.json`** — replace `--accept-data-loss` with `prisma migrate deploy`; land an initial migration.
4. **Re-qualify scrapers one source at a time.** Grants.gov first, with dry-run + artifact inspection; then CARB → CalTrans → WAZIP.
5. **Wire eval harness before any live flip.** Minimum 20 golden fixtures per source.
6. **Keep the `prisma/seed.ts:6890-6901` purge block permanent** as a belt-and-suspenders safety net.

These steps are **still correct**. They are now tracked under SS-002 with gates, owners, and metrics; resume by working SS-002, not this original plan.

## 4. Exception log (tactical overrides of COO scope)

No entries yet. Any future exception must be written here with:

- Date.
- Scope item being overridden.
- Reason (security hotfix, legal hotfix, data-quality incident).
- Remediation target date.
- COO sign-off signature (or note of post-hoc notification).

Empty log is the expected steady state.

## 5. Authority of this file

- CEO may edit this file freely.
- Scope item linkage (§3) should not be broken without a PR reviewed by COO.
- Exception log (§4) entries are append-only and never deleted.

---

*Last updated: 04/28/2026. Rate limiting (middleware.ts) + production migration auto-deploy (vercel.json) shipped in PR #45. Next CEO-track tactical work: SS-001 H1 + Trust Ribbon mounting (gated on Okonkwo legal review per SS-001 §7.4), then SS-003 provenance schema migration.*
