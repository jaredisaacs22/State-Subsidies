# SS-002 — Per-Source Promotion Checklist

**Authority:** `SS-002 §9 step 7–8` and `§10 success metrics`.
**Owner:** CEO (tactical execution).
**Use this every time** a source graduates from `DRY_RUN=1` → live writes.

---

## Pre-flight (one-time, already complete)

- [x] `ScrapeRun` model + migration landed (PR #24)
- [x] `DRY_RUN` flag in `scrapers/scheduler.py` (PR #24)
- [x] `migrate-baseline` + `db-init` workflows passing (PR #25, #26)
- [x] Boilerplate-prefix gate (`BOILERPLATE_TITLE_PREFIXES`) (PR #27)
- [x] Pytest contract tests blocking `scraper.yml` (PR #27)
- [x] 20-row golden fixtures for Grants.gov (PR #28)
- [x] Smoke contract tests for CARB / CalTrans / WAZIP (PR #28)

## Per-source promotion ladder

For each source — Grants.gov first, then CARB → CalTrans → WAZIP:

### Stage 1 — Three clean dry-runs (CI-only, no DB writes)

- [ ] Run `Scraper — Pull Live Incentive Data` workflow from `main`, **manual dispatch**, default mode (`live`)
- [ ] Confirm contract-tests step passes (the new `pytest tests/` step)
- [ ] Download `scrape-report-<run_id>.json` artifact
- [ ] Inspect rows for source `<X>`:
  - [ ] No row whose title starts with "Federal grant opportunity:" or "General Business"
  - [ ] No row with `shortSummary` shorter than 100 chars
  - [ ] No row with `industryCategories=["General Business"]`
  - [ ] All rows have `sourceUrl` starting with `https://`
  - [ ] All rows have `keyRequirements` array of length ≥ 1
- [ ] Repeat 2 more times (3 dry-runs total over 3 different cron windows OR 3 manual dispatches spaced ≥ 1 hour)

**Trip threshold:** any row that violates the inspection criteria above → re-lock to mock, file an entry in `docs/scope/experiments/SS-002-scraper-incidents.md`, do NOT proceed to Stage 2.

### Stage 2 — Promote to live writes

- [ ] On a feature branch, edit `.github/workflows/scraper.yml`:
  - Change `DRY_RUN: "1"` → `DRY_RUN: "0"` **for this source only**.
    Until per-source split is implemented, this means the whole job goes live —
    so do this only when ALL four sources have passed Stage 1.
  - (Future: split into `scraper-grants-gov.yml`, `scraper-carb.yml`, etc.,
    each with its own `--sources` filter. Not required for first cutover.)
- [ ] Open PR; ensure contract tests pass on PR
- [ ] Merge PR
- [ ] Manually dispatch one live run from `main`
- [ ] Confirm in DB: `SELECT count(*) FROM "ScrapeRun" ORDER BY "finishedAt" DESC LIMIT 1` — should show `status='SUCCESS'`, `rowsInserted` > 0
- [ ] Confirm `/api/stats/last-scrape` returns the new run on the deployed Vercel preview/prod

### Stage 3 — 30-day observation window

- [ ] Each cron run, log into the GitHub Actions tab and verify the workflow stayed green
- [ ] On day 7, query `SELECT source, count(*), sum("qualityGateRejections")::float / sum("rowsConsidered") AS rejection_ratio FROM "ScrapeRun" GROUP BY source` — confirm < 5% (`SS-002 §7.4` threshold)
- [ ] On day 30, repeat the rejection-ratio query — confirm still < 5%
- [ ] If at any point the ratio exceeds 5%: re-lock to mock, file incident, halt promotion ladder

### Rollback (stop-for-harm)

If a row matches an incident class (April 20 boilerplate; `industryCategories=["General Business"]` on Grants.gov; etc.):

1. Open `.github/workflows/scraper.yml`, set `DRY_RUN: "1"` (or `SCRAPER_MOCK_MODE: "true"`)
2. Commit + push to `main` directly (~30 seconds)
3. Run `prisma/seed.ts` purge block — already permanent, will sweep poisoned rows on next seed
4. File an incident entry in `docs/scope/experiments/SS-002-scraper-incidents.md` with: root cause, contained-at time, remediation commit SHA, and **"what gate would have caught this"**

---

## Success metrics (SS-002 §10)

Ship-block on **all** of:
- Contract tests pass at every CI run (already enforced — `pytest tests/` blocking)
- Eval harness (SS-012) pass at every CI run *(future — not yet implemented)*
- 30-day per-source rejection ratio < 5%
- Zero repeats of the April 20 failure class
- Active program count grows ≥ 40% within 60 days of first source going live

---

*Last updated: 2026-04-25 by Jared (CEO) session.*
