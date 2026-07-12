# Gap Analysis — StateSubsidies.com vs. the Doctrine Bar

**Date:** 2026-07-11 · **Baseline:** `main` @ `762fc35` (115 commits, PRs through #62)
**Method:** every gap below was verified against the actual code/workflows this date — not
assumed from docs. Each gap carries an ID (`GAP-<layer><n>`), a priority, and the doctrine rule
it violates (`ENGINEERING_DOCTRINE.md §`). Workstreams that close these live in `ROADMAP.md`.

Priorities: **P0** = trust/correctness exposure, do now · **P1** = do within the next few
workstreams · **P2** = nice-to-have / deliberate deferral.

---

## 1. What we already have (credit where due — don't rebuild these)

- Provenance schema per row + `ProvenancePanel` + `fingerprint.py` (SS-003 ✅)
- DB-computed headline stats + `$XB+` grep gate in CI (SS-005 ✅)
- Methodology page (SS-004 ✅), AI per-message disclaimer + safety rails (SS-008 core ✅)
- CI gates: pytest scraper contracts, `tsc --noEmit`, lint, Prisma migration-drift gate,
  `next build` sanity (SS-010 core ✅)
- Rate limiting on `/api/chat` + `/api/track` (middleware.ts ✅)
- `prisma migrate deploy` in `vercel-build`; `--accept-data-loss` gone ✅
- Scraper discipline: `DRY_RUN` ladder, promotion checklist, boilerplate/contact-text gates,
  Grants.gov golden fixtures, `ScrapeRun` model ✅
- Eval harness scaffold: runner + 10 personas + manual-dispatch workflow (SS-012 scaffold ✅)
- `/api/health`, structured `ai_chat_turn` audit logs, componentized frontend with display maps

This is a genuinely strong foundation — most retrospective platforms earned these *after* their
incidents. The gaps below are what separates this baseline from the A/A+ target state.

---

## 2. Backend gaps

| ID | Pri | Gap | Doctrine |
|---|---|---|---|
| GAP-B1 | ~~P0~~ | **CLOSED 2026-07-11** — `ci.yml` `boot-probe` job: scratch Postgres + migrate + build + `next start` + health/dbReachable/self-seed/relational/page probes. | §4.1 |
| GAP-B2 | **P0** | **Zod validation is not systematic on API inputs.** zod is a dependency but route handlers validate ad-hoc (`safeInt` patches). Every route input gets a schema; validate before any DB call. | §2.4, §0.7 |
| GAP-B3 | P1 | **No error observability.** `console.error` in catch blocks only; no error tracker, no alerting when prod routes 500. A silent-failure platform is a trust bomb. | §5.1 |
| GAP-B4 | P1 | **SS-009 absent: no auth, no durable user state.** Bookmarks/alerts are localStorage-only. Fine *if labeled honestly* — verify the UI says "this device only"; build the durable store before promising more. | §2.2 |
| GAP-B5 | P1 | **Rate-limit store is in-process on Edge** — resets per instance/region, so limits are per-pod not per-user. Documented Redis/Upstash upgrade path exists; execute it when abuse or multi-region matters. | §2.4 |
| GAP-B6 | P2 | **`instrumentation.ts` self-healing seed/purge runs at boot** — startup mutation is a footgun (it also silently *didn't run* for weeks before #62). Long-term: move purge/seed to explicit workflows; keep boot idempotent-read-only. | §5.4 |
| GAP-B7 | P2 | Scale posture unaudited: no pagination contract on `/api/incentives` growth path, no query-plan review for the 50k-program future. | §2.6 |

## 3. Frontend gaps

| ID | Pri | Gap | Doctrine |
|---|---|---|---|
| GAP-F1 | **P0** | **Zero browser tests.** No Playwright, no console-error gate, no deep-link checks, no empty-state assertions. The entire experienced-UX layer is unverified on every merge. | §4.2–4.4 |
| GAP-F2 | ~~P0~~ | **CORE CLOSED 2026-07-11** — ratio math replaced by the deterministic rules engine (`lib/eligibility.ts`, 40 CI-pinned fixtures); no percentage renders anywhere. Open remainder (SME tiering, golden suite, legal copy review) tracked as Theme C follow-ups. | §0.1 |
| GAP-F3 | P1 | **TrustRibbon built but never mounted** — lives only at `/preview/trust-ribbon`. SS-001's visible half is undelivered; the trust surface the scope leads with isn't on the page. | §6.2 |
| GAP-F4 | P1 | **No site-level freshness banner** ("data as of…", oldest-source age). FreshnessBadge exists per-card; the alarm-grade surface is missing. | §1.3 |
| GAP-F5 | P1 | **No change narratives for headline numbers.** When a scrape/purge moves the stats strip materially, nothing tells the user why. | §3.2 |
| GAP-F6 | P1 | **No first-time-user tour harness** walking each audience persona through the site with screenshots. | §4.4 |
| GAP-F7 | P1 | Display-language seam unaudited: verify no raw enum (`POINT_OF_SALE_REBATE`, `HIGH`) reaches the UI unmapped; add a banned-jargon grep to CI once audited. | §3.2 |
| GAP-F8 | P2 | Layout-budget + page-height bounds as tests (blocked on GAP-F1 harness existing). | §3.4 |
| GAP-F9 | P2 | Data-driven-UI audit: confirm filter/category/audience lists derive from data, not hardcoded arrays. | §3.3 |
| GAP-F10 | P2 | WCAG 2.2 AA + grade-9 plain-language audit (SS-011) — scoped, not started. | §3.2 |

## 4. Data pipeline gaps

| ID | Pri | Gap | Doctrine |
|---|---|---|---|
| GAP-D1 | **P0** | **~25 of ~27 sources have no golden fixture or per-source contract test** — only Grants.gov does (plus smoke tests for CARB/CalTrans/WAZIP). Every unwatched source is a future April-20 incident. | §1.1 |
| GAP-D2 | ~~P0~~ | **CLOSED 2026-07-11** — `scrapers/batch_gate.py`: ok-with-zero-rows raises a per-source shape alarm (ScrapeRun marked FAIL); >50% batch quality-gate failure aborts ALL writes. Pytest-pinned. | §1.1 |
| GAP-D3 | **P0** | **No worked-example regression test on headline-stat formulas** (`precompute-stats.ts`, `/api/stats`). The exact class that overstated another platform's flagship number by 70%. | §1.5 |
| GAP-D4 | ~~P1~~ | **CLOSED 2026-07-11** — `batch_gate.row_tripwires`/`normalize_row`: non-positive or >$50B funding and non-https URLs quarantined; past-deadline-ACTIVE normalized to CLOSED (mirrors the daily rule). Pytest-pinned. | §1.4 |
| GAP-D5 | P1 | **Enricher output is unaudited AI text.** Claude-Haiku-written fields carry no distinct provenance mark and no sampled human-verification loop. Derived claims must be distinguishable from scraped facts. | §1.2 |
| GAP-D6 | P1 | **Cross-language contract untested:** `scrapers/models.py` (Pydantic) vs `prisma/schema.prisma` vs `lib/types.ts` are three hand-synced vocabularies with no parity test. A field added in one and missed in another renders blank in production (this exact failure shipped elsewhere). | §6.6 |
| GAP-D7 | P1 | **Seed-vs-scraped separation unverified:** confirm every seed row is distinguishable via provenance and that headline stats are honest about synthetic rows. | §1.7 |
| GAP-D8 | P2 | Root-level artifact litter (`scrape-report 4.json`, `scrape-report 6.json` — spaces in names, committed at repo root). Reports belong in an ignored/artifacts path. | §6.4 |
| GAP-D9 | P2 | Stats have two compute paths (build-time precompute + live API) — good redundancy; make the cross-check a relational test instead of a coincidence. | §4.5 |

## 5. Testing & CI/CD gaps

| ID | Pri | Gap | Doctrine |
|---|---|---|---|
| GAP-T1 | ~~P0~~ | **CLOSED 2026-07-11** (= GAP-B1) — `boot-probe` job in `ci.yml`. | §4.1 |
| GAP-T2 | P1 | **Zero TS/JS unit tests** — all tests are Python. `lib/utils.ts` formatters, `parseDetailedSummary`, eligibility logic: untested. | §4.10 |
| GAP-T3 | P1 | **SS-012 eval harness is not a gate** (manual dispatch, 10/200 personas, scaffold labels). The blocker is SME labeling hours — a human-gated ask that must be filed/scheduled now, per doctrine. | §6.5 |
| GAP-T4 | P1 | **Deploy verification is manual and unwritten** — no post-deploy probe script/job asserting deployed commit + sane stats. | §5.1 |
| GAP-T5 | P1 | **Rollback undocumented and undrilled** (Vercel instant rollback + migration-compat rules). | §5.2 |
| GAP-T6 | P1 | Verify required checks are marked **Required** in GitHub repo settings (cannot be confirmed from the repo; owner action). | §5.3 |
| GAP-T7 | P2 | ESLint runs warning-permissive; tighten to `--max-warnings 0` once clean. | §4.10 |

## 6. Process / memory / agents gaps — closed by this PR

| ID | Was | Now |
|---|---|---|
| GAP-P1 | No `CLAUDE.md`/repo law — every session started cold, re-deriving context | `CLAUDE.md` (read-first order, hard rules, session protocol) |
| GAP-P2 | No living roadmap (README's was stale-to-wrong; scope items lack a status board) | `ROADMAP.md` — themes with status + acceptance criteria |
| GAP-P3 | No memory system — no handoff doc, no lessons ledger, no decision log | `docs/memory/` (HANDOFF, LESSONS seeded with our 14 real scars, DECISIONS) |
| GAP-P4 | No runbooks — deploy verification, incident response, DB ops, rollback lived in heads and scattered scope items | `docs/runbooks/` (4 runbooks; promotion checklist referenced in place) |
| GAP-P5 | No agent definitions — review/audit rituals unautomatable | `.claude/agents/` (whole-branch-reviewer, data-integrity-auditor, ux-first-time-user, docs-reality-checker) |
| GAP-P6 | Session records split across `docs/sessions/` and `docs/scope/sessions/` | Convention going forward: `docs/memory/HANDOFF.md` is current state; dated session records consolidate under `docs/scope/sessions/` |
| GAP-P7 | Stale README (roadmap section predated Postgres/Grants.gov work it lists as todo) | README docs map + pointer to `ROADMAP.md` |

## 7. Nice-to-haves (explicitly deferred, so they stop being ambient guilt)

- Full-text search (tsvector) — after directory breadth justifies it
- Email alerts — **blocked on SS-009 durable accounts** (persistence before stateful features)
- Admin curation UI — after provenance-stamped manual-edit path is designed
- Multi-region rate limiting (Redis) — on abuse evidence
- Public API for the directory — after data contracts (GAP-D1/D2) are green
- i18n / Spanish-language surfaces — scope-level decision for the owner

## 8. The blocked-on-owner list (standing section — mirror in HANDOFF.md)

1. **GAP-T6:** mark CI checks Required in GitHub settings (Settings → Branches → main).
2. **GAP-T3:** SS-012 needs SME labeling hours committed (200 personas, ≥0.75 κ) — the eval gate
   cannot ship without a human calendar decision.
3. Confirm Vercel + GitHub secrets remain scoped per `DEPLOY.md` after any dashboard changes.
