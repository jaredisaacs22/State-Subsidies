# Session — 2026-04-28 — Backend Foundation Hardening (Pt. 2)

**Author:** Developer 1 (CEO)
**Branch:** `claude/consulting-framework-setup-ibuHt`
**PRs touched:** #44 (closed/merged), #45 (open, draft)
**Predecessor session:** 2026-04-27 (SS-002 close + SS-005 + first CI gates + `/api/health`)

---

## 1. What shipped this session

### Rate limiting (`middleware.ts` — new)
Edge-layer sliding-window rate limiter on the two routes that carry real cost or spam risk:

| Route             | Limit             | Why                                                  |
| ----------------- | ----------------- | ---------------------------------------------------- |
| `POST /api/chat`  | 10 req/min per IP | Each call hits Anthropic; budget protection          |
| `POST /api/track` | 100 req/min per IP | Cheap insert, but prevent flood of analytics events |

- Returns `429` + `Retry-After` + `X-RateLimit-Limit`/`Remaining`/`Reset` headers
- In-process `Map` store with LRU eviction bounded at 10 000 entries
- Only fires on `POST` — `GET` endpoints (`/api/health`, `/api/stats`) stay fully observable through partial outages
- In-file comment documents the Vercel KV / Upstash Redis swap path for multi-region production

### Production migration auto-deploy (`vercel.json` + `package.json`)
- New `vercel-build` script: `prisma generate` → `prisma migrate deploy` (only when `DATABASE_URL_UNPOOLED` is set) → `next build`
- Vercel deploys now auto-apply pending migrations before the new code goes live — no manual `db-init.yml` dispatch needed for schema changes
- Falls back safely to skip-migrate when the env var is absent (CI, local dev)
- Complements the CI drift gate (`ci.yml` `prisma-drift`), which catches schema drift at PR time. The two mechanisms are layered: drift gate prevents drift from merging; auto-deploy ensures merged migrations actually run.

### Documentation
- `docs/scope/tracks/CEO-track.md` §2b records this session's work
- `docs/scope/sessions/2026-04-28-foundation-hardening.md` (this file)

---

## 2. Strategic decisions made this session

1. **Local development pivot.** Continued web-Claude development was hitting subscription friction. Decision: clone repo locally, install Claude Code CLI, use API billing. The scope-docs-as-memory pattern (`docs/scope/tracks/CEO-track.md` + per-item scope files) means context survives across sessions without needing conversation history. GitHub is the persistent memory.

2. **Rate limiting architecture.** Chose Edge middleware over per-route handlers for two reasons: (a) zero coupling to route logic — limits can change without touching `/api/chat/route.ts`; (b) limits enforced before the expensive Anthropic call, not after. Accepted the in-process-store limitation as adequate for current scale; documented Redis upgrade in-file.

3. **Migration auto-deploy gating.** Chose `[ -n "$DATABASE_URL_UNPOOLED" ]` shell guard over a hardcoded `if [ "$VERCEL_ENV" = "production" ]` check. Rationale: the env var presence IS the meaningful signal — if it's set, we have a DB to migrate; if not, we don't. Avoids false negatives on Vercel preview deployments that also need migrations applied.

4. **Node 20 deprecation warning — deferred.** GitHub Actions warning about Node 20 → Node 24 is informational, not blocking. Bumping `actions/checkout`, `actions/setup-python`, etc. to newer majors is a hygiene PR for later, not a P0.

---

## 3. Current foundation health

| Layer                     | State                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| **PR-time CI gates**      | ✅ pytest, tsc, lint, grep, prisma drift, next build (PR #44)         |
| **Production migrations** | ✅ Auto-deploy via `vercel-build` (PR #45)                            |
| **Schema drift safety**   | ✅ Caught at PR time + applied at deploy time (layered)               |
| **API abuse controls**    | ✅ Rate limits on `/api/chat` + `/api/track` (PR #45)                 |
| **Health observability**  | ✅ `/api/health` returns `dbReachable`, `dbLatencyMs`, region, commit |
| **Scraper reliability**   | ✅ Grants.gov live (DRY_RUN=0), 21/21 quality-gate passes              |
| **Live headline stats**   | ✅ `<Stat>` components driven by Postgres `percentile_cont` + MAX     |
| **Provenance fields**     | ❌ SS-003 — pending (next P0)                                          |
| **AI safety rails**       | ❌ SS-008 — pending                                                    |
| **Vitest test runner**    | ❌ Not configured (SS-005 §7.3 deferred)                               |
| **Auth / bookmarks**      | ❌ SS-009 — pending                                                    |

---

## 4. Next steps — in priority order

### P0 — SS-003 Provenance Schema + Per-Row Citation UX
**Why now:** Required for SS-001 Trust Ribbon ("from N .gov sources" needs `sourceDomain`); required for SS-008 (LOW-confidence rows must be filtered out of AI advisor).

**Sequence:**
1. Spin up local Postgres shadow DB: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev --name ss-shadow postgres:15`
2. Edit `prisma/schema.prisma` — add 8 new fields per SS-003 §4 + flip `keyRequirements`/`industryCategories` from JSON-string to `String[]`
3. `npx prisma migrate dev --name add_provenance` — generates SQL migration
4. Backfill script (`prisma/backfill-provenance.ts`): parse `sourceDomain` from `sourceUrl`, default `parseConfidence=MEDIUM`, convert JSON strings to arrays
5. Update scraper (`scrapers/grants_gov_api.py`, `scrapers/enricher.py`) to emit `sourceHash`, `parseConfidence`, `parseNotes`
6. Update `/api/stats` `govSourcesEstimate` to use indexed `sourceDomain` instead of `LIKE '%.gov%'`
7. Build `<ProvenancePanel>` component (detail page) + provenance line on `<IncentiveCard>`
8. Land as 3 separate PRs to keep diffs reviewable:
   - PR A: schema migration + backfill (no UI change)
   - PR B: scraper-side emission
   - PR C: UI — card line + ProvenancePanel

**Estimated effort:** 3–4 ED solo. Multi-day.

### P1 — SS-001 Hero + Trust Ribbon mounting
**Why blocked:** Gated on Okonkwo legal review per SS-001 §7.4 (defamation/false-advertising review of "Independent public directory" + "Not a government website" copy). Cannot ship unilaterally.

**When unblocked:** Mount existing `components/TrustRibbon.tsx` in `app/layout.tsx` under the 3px gradient. Update H1 to candidate A: *"Every public program you're eligible for — in one place."* Update subcopy to enumerate audiences.

**Estimated effort:** 0.5 ED once unblocked.

### P1 — SS-008 AI Disclaimer + Safety Rails
**Why now:** Once SS-003 ships, LOW-confidence rows exist in the DB. Without SS-008 they'd surface in the chat agent unfiltered.

**Sequence:**
1. Add `WHERE parseConfidence != 'LOW'` clause to chat tool's `search_incentives`
2. Add disclaimer copy block under chat input ("AI-generated guidance, not legal advice")
3. Inject "as of {asOf}" timestamp into AI responses for any program quoted
4. Add stop-list: AI must not say "you will receive funding," "guaranteed," "approved" — replace with hedged copy ("you appear eligible," "may qualify")

**Estimated effort:** 1–1.5 ED.

### P2 — Vitest setup + SS-005 §7.3 regression tests
**Why low:** `getDirectoryStats()` is currently exercised only via the `/api/stats` route in production. A regression would surface fast. But longer-term, unit tests are needed to gate refactors safely.

**Sequence:**
1. `npm install -D vitest @vitest/coverage-v8`
2. Add `vitest.config.ts` + `npm run test` script
3. Add `lib/__tests__/stats.test.ts` covering median computation, empty-DB fallback, large-number formatting
4. Wire `npm run test` into `ci.yml` as a 5th gate

**Estimated effort:** 1 ED.

### P2 — `actions/*` major-version bumps
Hygiene PR. Bundle with any other CI cleanup. Not urgent — GitHub's compatibility shim still works.

### P3 — SS-007 audience model expansion, SS-009 auth/bookmarks, SS-011 a11y/legal
Multi-week each. Defer until SS-003 + SS-008 land.

---

## 5. Open questions / panel topics

- **SS-003 confidence rubric:** What exact field-completeness rule maps to `HIGH` vs `MEDIUM`? Needs Hassan + Mei alignment before scraper-side emission lands. (SS-003 §9 step 1.)
- **Provenance backfill for legacy rows:** Some rows pre-date `lastSeenAt` tracking. Default to `firstSeenAt = scrapedAt`, `lastSeenAt = scrapedAt`? Document the convention in the migration commit message.
- **Vercel env var verification:** Has anyone confirmed `DATABASE_URL_UNPOOLED` is set in Vercel project settings for both production AND preview environments? The `vercel-build` script is silent if the var is missing — that's the correct behavior, but means a missing var would silently skip migrations on a preview deploy.

---

## 6. How to resume next session

Read these three files in order, in any new local Claude Code session:

1. `docs/scope/tracks/CEO-track.md` — full attribution history + active workstream state
2. This file (`docs/scope/sessions/2026-04-28-foundation-hardening.md`) — what just shipped
3. `docs/scope/items/SS-003-provenance-schema.md` — next P0 spec

That's it. No conversation history needed. The scope docs are the persistent memory.
