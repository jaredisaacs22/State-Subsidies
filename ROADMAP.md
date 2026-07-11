# ROADMAP — StateSubsidies.com

**Updated:** 2026-07-11 · **Baseline:** `main` @ `762fc35` · **Owner:** Jared (CEO)
**How to read:** every workstream is a lettered theme with a status, the *next visible
increment*, and acceptance criteria. Statuses were verified against code on the update date —
if you change reality, change this file in the same PR. Scope items (SS-###) remain the
specifications; this board is where their execution state lives. Gap IDs reference
`docs/doctrine/GAP_ANALYSIS.md`.

**Status legend:** ✅ shipped · 🟡 partial · 🔴 not started · ⏸ blocked (see blocked-on list)

---

## Theme A — Trust spine (SS-003, SS-004, SS-005)

**Status: ✅ core shipped · 🟡 alarm surfaces missing**
Provenance schema + panel, methodology page, DB-computed headline stats with grep gate: live.

Next increments, in order:
1. **Site-level freshness banner** (GAP-F4): "Directory data as of {newest scrape} · oldest live
   source {n} days" computed from `ScrapeRun`/provenance. *Accept:* visible on every page,
   value from DB, never hardcoded.
2. **Change narratives** (GAP-F5): when headline stats move > a set threshold between scrapes, a
   dated one-line "why" appears near the stats strip. *Accept:* the note is data-driven and
   auditable to a ScrapeRun/purge event.
3. **Mount the TrustRibbon** (GAP-F3): graduate from `/preview/trust-ribbon` to the real layout
   per SS-001. *Accept:* ribbon live on production home, SS-001 §10 metrics captured.

## Theme B — Data contracts & scraper integrity (SS-002 continuation)

**Status: 🟡 discipline exists for 1 of ~27 sources**
The Grants.gov pattern (golden fixture + contract test + quality gates + promotion ladder) is
proven. It must become the *stamp* applied to every source.

Next increments:
1. **Golden fixture + required-fields contract test per source** (GAP-D1). Batch by API-based
   sources first (highest volume), HTML scrapers second. *Accept:* every source in
   `runner.py SCRAPERS` has a fixture dir + contract test; CI runs them all.
2. **Shape-change alarm** (GAP-D2): live run hard-fails on 0 parsed rows or >50% required-field
   nulls per source. *Accept:* a seeded bad fixture proves the run fails loud.
3. **Ingest tripwires** (GAP-D4): past-deadline-but-ACTIVE, fundingAmount outliers, dead
   sourceUrl ⇒ row quarantined, run annotated. *Accept:* tripwire unit tests + quarantine count
   in scrape report.
4. **Cross-language contract test** (GAP-D6): one parity test asserting
   `ScrapedIncentive` (Pydantic) fields ↔ Prisma schema ↔ `lib/types.ts` stay in sync.
   *Accept:* removing a field from any one of the three fails CI.
5. **Enricher provenance** (GAP-D5): AI-enriched fields marked as derived; sampled
   human-verification loop documented. *Accept:* a row can always answer "scraped fact or AI
   paraphrase?" per field.

## Theme C — Eligibility rules engine (SS-006) — **the open P0**

**Status: 🔴 checker still ratio-based (`components/EligibilityChecker.tsx` — verified 2026-07-11)**
The ratio score mathematically lies on compound requirements; this is the largest live gap
between the brand promise and the product (GAP-F2).

Next increments:
1. Rules schema per program (ALL-of / ANY-of / disqualifier), stored as data, not code.
2. Deterministic evaluator with worked-example tests (given answers X ⇒ verdict Y, pinned).
3. Three-state honest output: **Likely eligible / Not eligible (which rule failed) /
   Can't tell (which answer is missing)** — never a percentage.
*Accept:* SS-006 §10 gates; no surface renders a ratio; evaluator is reproducible and cited.

## Theme D — AI advisor & eval gate (SS-008 ✅ core · SS-012 🟡 scaffold)

Next increments:
1. **Persona library 10 → 200 with SME labels** (GAP-T3) — ⏸ *blocked on owner: SME hours.*
2. Wire eval as a `pull_request: paths:` gate on prompt/model changes once IRR ≥ 0.75.
3. Publish first scorecard at `/methodology#ai-advisor`.
*Accept:* a seeded "bad prompt" PR is blocked by the gate; scorecard public.

## Theme E — Audience completeness (SS-007)

**Status: 🟡 nonprofits shipped (#60); individuals/students/farmers surfaces unverified**
Next increments: audit audience model vs the six first-class audiences (00-overview §2); ship
the missing audience landing surfaces; empty states per audience. *Accept:* each audience sees
itself in H1/personas/empty states per SS-007.

## Theme F — Frontend verification harness (new — GAP-F1)

**Status: 🟡 boot-probe shipped 2026-07-11 · browser suite still 🔴**
Next increments, in order:
1. ✅ **Boot-and-probe CI job** (GAP-T1/B1, shipped 2026-07-11): `ci.yml` `boot-probe` job —
   migrates a scratch Postgres, builds, boots `next start`, asserts health + dbReachable,
   proves the instrumentation self-seed fires (pins LESSONS #11), relational list/detail
   probe, and 200s on `/`, a detail page, and `/methodology`.
2. Playwright suite with **absolute console-error gate** (zero tolerated errors from test #1).
3. UX contracts: empty-state text, deep links, banned-jargon grep, disclaimer presence,
   layout budget (GAP-F7/F8).
4. **First-time-user tour harness** (GAP-F6): scripted persona walkthroughs with screenshots
   (`.claude/agents/ux-first-time-user.md` drives it manually until automated).
*Accept:* PR cannot merge with a console error or a dead deep link; tour screenshots reviewed
each release wave.

## Theme G — Accounts & durable user state (SS-009)

**Status: 🔴 by design — persistence before stateful features (doctrine §2.2)**
Order is law: durable store + auth first → then saved programs sync → then alerts. Until then
the UI must honestly label bookmarks as this-device-only (GAP-B4 verify).
*Accept:* no sync/alert promise ships before the store survives a deploy.

## Theme H — Release engineering & observability (SS-010 continuation)

Next increments:
1. Deploy-verification liturgy as runbook now (`docs/runbooks/deploy-verification.md` ✅ this
   PR), automated post-deploy probe job next (GAP-T4).
2. Rollback documented + drilled (GAP-T5, runbook ✅ this PR — first drill pending).
3. Error observability: pick and wire an error tracker; alert on prod 5xx (GAP-B3).
4. Zod schemas on every API input (GAP-B2).
5. ⏸ *Owner:* mark CI checks Required in repo settings (GAP-T6).
*Accept:* a deploy claim is a probe transcript; a rollback has been executed once on purpose.

## Theme I — Accessibility, language & legal (SS-011)

**Status: 🔴 scoped, not started.** WCAG 2.2 AA audit, grade-9 reading level, UDAAP/implied-
guarantee copy pass, display-language seam audit (GAP-F7/F10).
*Accept:* SS-011 §10 gates; banned-jargon grep in CI.

## Theme J — Process, memory & agents (this PR)

**Status: ✅ shipped 2026-07-11.** CLAUDE.md, ROADMAP.md, doctrine, gap analysis,
`docs/memory/` (HANDOFF/LESSONS/DECISIONS), `docs/runbooks/` (4), `.claude/agents/` (4).
Standing rules: HANDOFF updated every close; LESSONS continuous; stale docs fixed on sight.

## Theme K — Growth & breadth (deferred until A–F green)

Full-text search · email alerts (needs Theme G) · admin curation UI · public API · i18n ·
additional scraper sources beyond current 27. Deliberately parked — see GAP_ANALYSIS §7 so
these stay decisions, not ambient guilt.

---

## The order of operations (if you only read one section)

1. ✅ **F1 boot-and-probe CI** (shipped 2026-07-11)
2. **Theme C eligibility engine** (the open trust P0) — **you are here**
3. **Theme B contracts for all sources** (prevents the next data incident)
4. **Theme F browser harness** (makes UX regressions impossible to ship silently)
5. **Theme A alarm surfaces** (freshness banner + change narratives + TrustRibbon mount)
6. Then D (eval gate, once SME hours land) → H → G → E → I → K.

## Blocked on owner (mirrored in `docs/memory/HANDOFF.md`)

1. GitHub Settings → Branches → main: mark CI checks **Required** (GAP-T6)
2. Commit SME labeling hours for SS-012 personas (Theme D is ⏸ without it)
3. Quarterly rollback drill scheduling (Theme H)
