# DECISIONS — Engineering Decision Log

Append-only, dated, with reasons — so divergence is deliberate and revisitable, never emergent.
When two surfaces are intentionally different, the difference is recorded here (doctrine §6.6).
Seeded 2026-07-11 with decisions recovered from git history and scope documents.

| Date | Decision | Reason / trade-off | Revisit when |
|---|---|---|---|
| 2026-04-2x | **Next.js + Prisma + Postgres; Python for scrapers** | TS for product surface velocity; Python/BeautifulSoup/Playwright is the right scraping toolchain. Cost: two vocabularies — pinned by the cross-language contract test (GAP-D6, Theme B4) | If scraper logic starts needing product-side types |
| 2026-04-25 | **Structured `console.info` logs over a DB table for AI chat audit** | Queryable/exportable via Vercel log search (`event:ai_chat_turn`), survives rollbacks, defers audit-table schema until SS-012 replay needs are concrete | When SS-012 eval gate needs persistent replay storage |
| 2026-04-28 | **In-process LRU rate limiting in Edge middleware** | Zero-dependency budget protection now; per-instance reset is acceptable at current traffic. Redis/Upstash upgrade path documented in-file | On abuse evidence or multi-region rollout (GAP-B5) |
| 2026-04-28 | **`prisma migrate deploy` inside `vercel-build`** | Deploys self-apply pending migrations; CI drift-gate is the complementary catch for un-migrated schema changes. The conditional env-var skip is deliberate — the pairing must not be half-removed | If a migration ever needs manual staging |
| 2026-04-30 | **tsx over ts-node in all workflows; Node 22** | ts-node broken on Node 22+; the Node-20 pin was a doomed band-aid | — |
| 2026-04-xx | **DRY_RUN promotion ladder per scraper source** | Six dry-run cycles on Grants.gov each caught a new failure class before any DB write | Never — this is permanent law |
| 2026-05–07 | **Runtime self-healing seed/purge in `instrumentation.ts`** | Chosen so a fresh/polluted DB heals on boot without manual dispatch. Known footgun: boot-time mutation, and it silently didn't run for weeks (LESSONS #11) | Theme H — move mutation to explicit workflows (GAP-B6) |
| 2026-07-11 | **Adopted the Engineering Doctrine** (`docs/doctrine/`) distilled from five external production retrospectives; source docs retired after distillation | Import scars without re-earning them; doctrine file is self-contained by design | Doctrine amendments via PR with a dated entry here |
| 2026-07-11 | **Memory system + agents live in-repo** (`docs/memory/`, `.claude/agents/`) not in chat context | Session context dies; files survive. HANDOFF verified-then-trusted at every open | — |
| 2026-07-11 | **Roadmap order fixed: boot-probe CI → eligibility engine → data contracts → browser harness** before any breadth work | Verification holes and the open trust P0 outrank new features (doctrine §0.4 visible-increment rule still applies within each) | Owner re-prioritization, recorded here |
| 2026-07-11 | **Eligibility requirements derive from `keyRequirements` as all-MUST in code — no `IncentiveRequirement` table yet** | SS-006 §9 step 2 names all-MUST the conservative default; persisting a table of all-MUST rows adds a migration with zero user-visible benefit until SME tiering exists. Engine supports all three tiers, so the table lands as a pure data upgrade | When SME tiering hours are committed (Theme C follow-up 1) |
| 2026-07-11 | **Vitest as the TS test runner** (`npm test`, wired into CI typecheck job) | SS-006 §7.1 names Vitest explicitly; zero-config with our tsconfig; opens GAP-T2 (TS unit tests) with the smallest footprint | — |
