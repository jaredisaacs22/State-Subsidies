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

## 2. Active workstream — PAUSED

**Title:** *Unlock scrapers + fix Vercel env scope* — originally 6 steps from the 04/21 unified-panel response.
**Status:** **PAUSED on 04/21/2026** by COO mandate. No edits, PRs, Vercel env changes, or GitHub-secret rotations may be performed under this workstream until the COO explicitly resumes it, or until this workstream is re-authored as scope item `SS-002` (which it has been — see §3).

**Why the pause:** the COO's position is that tactical execution without a ratified scope invites regressions. The scope document at `docs/scope/**` is the unified source of truth. Anything tactical gets folded into an SS-###.

## 3. Migration of CEO workstream into scope

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

*Last updated: 04/22/2026. CEO pause holds until scope v1.0 P0 items are resolved or CEO explicitly resumes with COO sign-off.*
