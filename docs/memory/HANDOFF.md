# HANDOFF — Current State of StateSubsidies.com

**Last updated:** 2026-07-11 · **By:** doctrine-integration session (branch
`claude/ultrathink-scope-analysis-ahfvyt`)
**Rule:** this file describes reality. Verify against `git log` + the live site at session open;
fix drift before doing anything else. Update at every session close — no exceptions.

## What is live (main @ `762fc35`)

- Production on Vercel; Postgres (Neon) with pooled/unpooled split; migrations auto-deploy in
  `vercel-build`.
- ~27 scraper sources registered; Grants.gov promoted to live writes (6-cycle DRY_RUN ladder);
  recent additions: DSIRE, NYSERDA, USDA RD, MassCEC, CT Green Bank, IRA credits, PA/MN/AZ.
- Trust spine: provenance per row + ProvenancePanel + methodology page + DB-computed headline
  stats (SS-003/004/005 ✅). TrustRibbon still preview-only (not mounted).
- AI advisor with per-message disclaimer, safety rails, `ai_chat_turn` audit logs (SS-008 core ✅).
- Eval harness scaffold: 10/200 personas, manual dispatch only (SS-012 🟡).
- Nonprofits/NGO expansion shipped (#60); browse crash fixed + self-healing seed with Grants.gov
  purge (#61); `instrumentationHook` actually enabled in #62 (it had silently never run — see
  LESSONS #11).
- CI gates: pytest contracts, tsc, lint, Prisma drift, next build, `$XB+` grep.

## In flight

- **PR #63 MERGED 2026-07-11** (`c0fa942` on main): doctrine + memory system + runbooks +
  agents + `boot-probe` CI job (closed GAP-P1…P7, GAP-T1/B1). Owner approved full
  commit-and-deploy authority this date.
- **PR #64 MERGED + PROD-VERIFIED 2026-07-11** (`e9f3fe6`, health probe confirmed commit live):
  SS-006 eligibility rules engine — ratio retired, 40 vitest fixtures CI-gated.
- **Current branch (restarted from main):** Theme B increments 2–3 — `scrapers/batch_gate.py`
  (shape alarms GAP-D2 + tripwires GAP-D4), FOUNDATION enum parity (GAP-D6 instance), and the
  **LESSONS #16 regression fix**: the PR #51 fail→ok scheduler fix had regressed via a merge
  because it was never test-pinned; now refactored (`_run_scraper_list`) with 3 pytest pins.
  124/124 Python tests green.

## Next steps (from ROADMAP "order of operations")

1. ✅ Boot-and-probe CI (merged) · ✅ Theme C engine core (merged, prod-verified) ·
   ✅ Theme B alarms/tripwires (this branch).
2. **Theme B-1 — golden fixture + contract test per source** (GAP-D1): stamp the Grants.gov
   pattern across the other ~25 sources; needs live payload capture per source. **Next up.**
3. **Theme B-4 — cross-language parity test** (GAP-D6): Pydantic ↔ Prisma ↔ TS. One known
   drift instance (FOUNDATION) already found and fixed.
4. Theme F Playwright harness with console-error gate; then Theme A alarm surfaces (freshness
   banner, change narratives, TrustRibbon mount).

## Known open defects

- Browser console-error verification still missing (LESSONS #12 second half) — Theme F step 2.
- Root-level `scrape-report 4.json` / `scrape-report 6.json` litter (GAP-D8) — relocate/ignore
  in a housekeeping commit.

## Blocked on owner (Jared)

1. GitHub Settings → Branches → main: mark CI checks **Required** (GAP-T6).
2. Commit SME labeling hours for SS-012's 200-persona library (Theme D is ⏸ without this).
3. Schedule the first rollback drill (`docs/runbooks/rollback.md`).
4. SS-006 follow-ups needing humans: SME requirement-tiering (Theme C-1), golden program suite
   tagging (C-2), legal review of verdict copy (C-3, binding per spec).

## Session close checklist (copy into every close)

- [ ] "What will the user SEE changed?" — answered in writing above
- [ ] HANDOFF current-state + next steps updated
- [ ] New scars → LESSONS.md · new decisions → DECISIONS.md
- [ ] Stale docs found this session fixed this session
- [ ] Whole-branch review run before declaring a multi-task PR done
