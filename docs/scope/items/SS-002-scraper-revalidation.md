# SS-002 — Scraper Re-validation + Vercel Env Scope Fix

**Priority:** P0 · **Owners:** Chen · Tanaka · Quiroz · Lindqvist · **Audit origin:** 3.11, rec. #1
**Grade today:** C− · **Grade at ship target:** A−
**Depends on:** SS-010 (`vercel.json` hardening) is coupled; SS-012 (eval harness) is the gate before any live write.

This item folds in the CEO-track tactical workstream that was paused on 04/21. It is kept here because scope authority is unified; the CEO can still drive execution but the quality gates are specified here.

---

## 1. Finding ID
`SS-002` — derived from audit §3.11 (data layer), rec. #1 (*"Unlock the scrapers or remove the claim"*).

## 2. Hypothesis
*"Flipping scrapers live in a specific four-step order — (1) correct the Vercel/Actions env-var scope, (2) point the scraper workflow at the unpooled Postgres URL, (3) ship a dry-run canary + per-source re-qualification, (4) gate on the SS-012 eval harness — will return the directory to live ingest with **zero new records failing quality gates** over the first 30 days, and will grow active program count by ≥ 40% in 60 days without a second purge event."*

If we experience any quality-gate bypass (a "Federal grant opportunity:" row class repeats) or a silent write failure in the Actions log, we revert to mock and stop.

## 3. Current state
- **All nine scrapers locked to `--mock`** per commit `13535fe` (04/20/2026) after the *"Federal grant opportunity: …"* boilerplate incident.
- **Three competing workflows** under `.github/workflows/`:
  - `scrape.yml` — weekly, hard-coded `--mock`, uses `secrets.DATABASE_URL` (pooled). Safe but useless.
  - `scraper.yml` — every 6 hours, `--live`, uses `secrets.DATABASE_URL`. **Silently failing** against the pooler on bulk upserts.
  - `db-init.yml` — manual, seeds via Prisma; uses `secrets.DATABASE_URL_UNPOOLED`. This is the only workflow reliably writing.
- **Two URL kinds** (Vercel Postgres / Neon convention):
  - `DATABASE_URL` — pooled (PgBouncer, port 6543). Correct for Next.js short queries. Cuts long transactions.
  - `DATABASE_URL_UNPOOLED` — direct (port 5432). Required for `psycopg2` bulk writes, `prisma db push`, migration deploy.
- **Enricher key present** (`ANTHROPIC_API_KEY` used at `scrapers/enricher.py:24` with `claude-haiku-4-5-20251001`). If missing, enrichment is a safe no-op.
- **Quality gate** exists in `scrapers/db_writer.py:_passes_quality_gate` (called in `insert_new_only`); the April incident slipped through because the gate rule for "Federal grant opportunity:" prefix did not exist at the time.
- **Seed purge block** at `prisma/seed.ts:6890-6901` is load-bearing; panel recommends it stay permanent.
- **No eval harness** wired to the scraper CI. Ingest today is "commit and hope."

## 4. Target state
- **`scraper.yml`** re-points at `DATABASE_URL_UNPOOLED` and carries `SCRAPER_MOCK_MODE=false` only after (a) Vercel/Actions env scope is audited green, (b) SS-012 eval harness is wired as a CI gate, (c) per-source dry-run artifacts are inspected for 3 consecutive runs.
- **Per-source re-qualification ladder** (Grants.gov → CARB → CalTrans → WAZIP → next five), one source at a time, each gated on clean dry-runs + eval pass + panel review.
- **New `ScrapeRun` model** records every run's outcome (`source`, `startedAt`, `finishedAt`, `status`, `rowsConsidered`, `rowsInserted`, `rowsSkipped`, `qualityGateRejections`, `durationMs`). Consumed by SS-001 Trust Ribbon (`updated X ago`) and SS-005 (headline numbers).
- **Quality gates** are source-agnostic (e.g., required: non-empty `agency`, unique `programCode` or deterministic slug, title lacking boilerplate prefixes, at least one real requirement ≥ 8 chars) **plus** source-specific rules (e.g., Grants.gov: `opp_number` present, deadline parseable, funding_type mapped).
- **Dry-run default** — new scrapers always ship with `DRY_RUN=1` first, artifact-reviewed, then promoted.

## 5. Top-20 benchmark matrix (SS-002)

| # | Platform | What they do (this dimension) | What we borrow | What we avoid |
|---|---|---|---|---|
| 7 | **USAspending.gov** | Every dataset has an ingest cadence + source disclosure + diff log. | Publish our ingest cadence per source; diff log of new/updated/removed rows per run. | Their federal-scale ETL; ours is smaller and does not need a 500-column pipeline. |
| 12 | **Crunchbase** | Per-field provenance (source + date) on company data. | Source + date per row (coupled with SS-003). | Their crowdsourced augmentation model. |
| 10 | **Data.gov / Regulations.gov** | Federal data discovery with versioned datasets. | Versioned dataset concept applied to our `ScrapeRun` log. | Their download-centric UX. |
| 5 | **Stripe (ingest discipline)** | Strict contract tests on every partner integration. | Pytest contract tests against scraper parsers (fixtures as source of truth). | Their closed-SaaS ecosystem. |
| — | **GrantWatch (floor)** | Commercial directory — does not publish ingest methodology. | Nothing. They are our "floor" benchmark. | Opaque ingest is the failure mode we're rejecting. |

## 6. Case studies
- **A — Healthcare.gov 2013 ingest failure / 2014 re-arch.** Pre-launch ingest pipeline did not have canary gates; hours of downtime + incorrect insurer data for thousands of users. 2014 rebuild added per-source canaries + dry-runs. Lesson applied: our ladder approach and dry-run artifact review.
- **B — FiveThirtyEight polling ingest, 2016+.** Public methodology posts treat each source's ingest as versioned, with a "pollster grade" acting as parse confidence. Lesson applied: `parseConfidence` field from SS-003 and a published per-source grade.
- **C — Bloomberg Terminal data engineering (public practice).** Requires canary + shadow write before any new feed goes live. Lesson applied: shadow-write pattern (write to a `staging_incentives` table, compare to live, then promote).
- **D — Our own April 20 incident.** The right move was the purge. The wrong thing was that there was no canary to stop it upstream. This case study lives in our repo; we will not repeat it.

## 7. Experiment / test design
- **7.1 — Contract tests (pytest).** Golden fixtures per source (20+ rows). Parser must produce exact expected outputs. Runs in CI before any DB write step. Threshold: 100% pass; one fail blocks promotion.
- **7.2 — Dry-run artifact review.** For each source promoted to live, 3 consecutive dry runs produce `/tmp/scrape-report.json` uploaded as an Actions artifact. Human review by Chen (data eng) + Quiroz (SME) before the workflow is flipped live.
- **7.3 — Eval-coupled gate.** SS-012 eval harness is a **required CI check** on every PR that touches `scrapers/**`.
- **7.4 — Production observation window (30 days after flip per source).** Metric: `qualityGateRejections` / `rowsConsidered` ratio. Trip threshold: > 5% → auto-revert via a kill switch; < 5% → proceed.
- **7.5 — Abuse/cost observation.** Claude enrichment token spend tracked per run and published to dashboard (SS-005 surfacing optional).

**Stop-for-harm:** any row published that reproduces the April 20 failure class (boilerplate titles, `industryCategories=["General Business"]` on Grants.gov) triggers immediate re-lock to mock + incident write-up.

## 8. Samples / artifacts

### Env-scope configuration (the real unblocker)

**GitHub → Settings → Secrets and variables → Actions:**
| Secret | Present today | Required value |
|---|---|---|
| `DATABASE_URL` | yes (pooled) | keep |
| `DATABASE_URL_UNPOOLED` | required | Neon/Vercel "direct" URL (no `-pooler`, port 5432) |
| `ANTHROPIC_API_KEY` | required | production key |

**Vercel → Project → Settings → Environment Variables** (the "Vercel scope" the CEO-track was blocked on):
- `DATABASE_URL` pooled → scoped to **Production + Preview**.
- `DATABASE_URL_UNPOOLED` direct → scoped to **Production + Preview + Development**.
- `ANTHROPIC_API_KEY` → **Production + Preview**.

### `.github/workflows/scraper.yml` patch (pending SS-012 eval gate)

```yaml
      - name: Run scrapers
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_UNPOOLED }}   # was: DATABASE_URL
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SCRAPER_MOCK_MODE: "false"
          DRY_RUN: "1"                                          # default dry-run
        run: python3 -m scrapers.scheduler --once --live
```

A separate `scraper-live.yml` job is introduced per source once the source graduates from dry-run (removes `DRY_RUN` and narrows `--sources` to just that one).

### `scrapers/scheduler.py` dry-run flag

```python
# scrapers/scheduler.py (excerpt)
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"

if DRY_RUN:
    write_report_to_artifact(results, "/tmp/scrape-report.json")
else:
    stats = bulk_upsert(results)
    record_scrape_run(source, stats)
```

### New Prisma model (shared with SS-003)

```prisma
model ScrapeRun {
  id                     String   @id @default(cuid())
  source                 String   // "grants_gov_api", "carb", "caltrans_core", ...
  startedAt              DateTime
  finishedAt             DateTime
  status                 String   // "SUCCESS" | "FAIL" | "PARTIAL"
  rowsConsidered         Int
  rowsInserted           Int
  rowsUpdated            Int
  rowsSkipped            Int
  qualityGateRejections  Int
  durationMs             Int
  notes                  String?
  @@index([source, finishedAt])
}
```

## 9. Step-by-step process-flow map

1. **Env audit** (GitHub Actions secrets + Vercel scope). **CEO-track dashboard task.** 0.5 ED.
2. **Land `ScrapeRun` Prisma model** + migration + `record_scrape_run()` helper. **K + H.** 0.5 ED.
3. **Implement `DRY_RUN=1` flag** in `scrapers/scheduler.py` + `bulk_upsert`. **H.** 0.5 ED.
4. **Author 20-row golden fixtures per source** (start with Grants.gov). **Q + H.** 1 ED.
5. **Contract tests** (`pytest` against parsers) wired to `scraper.yml` as blocking step. **H + E.** 1 ED.
6. **SS-012 eval harness** linked as a second blocking check. **E + Q.** depends on SS-012.
7. **Flip Grants.gov only to `DRY_RUN=1` live workflow**; 3 consecutive clean runs. **H.** 3 cal-days.
8. **Promote Grants.gov to live writes** (remove `DRY_RUN`, keep `insert_new_only`). **H.** 0.5 ED.
9. **30-day observation window** on Grants.gov. **H monitors; auto-revert on trip.**
10. **Repeat 4–9 for CARB → CalTrans → WAZIP → next five.**
11. **Harden `vercel.json`** (SS-010) must land before any live writes — coupled dependency.
12. **Publish ingest methodology** on SS-004 Methodology page.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- Contract tests: 100% pass at every CI run.
- Eval harness (SS-012) pass at every CI run.
- 30-day per-source rejection ratio < 5%.
- Zero repeats of the April 20 failure class.
- Active program count grows ≥ 40% within 60 days of first source going live, with no row failing SS-003 provenance completeness.

**Rollback:** `SCRAPER_MOCK_MODE=true` re-commit (30 s), seed purge block remains the final safety net. `ScrapeRun` table retains forensic history; no data loss.

**Incident playbook:** `experiments/SS-002-scraper-incidents.md` (scaffold seeded in §experiments). Every incident: root cause, contained-at time, remediation commit SHA, "what gate would have caught this" column that must be filled.
