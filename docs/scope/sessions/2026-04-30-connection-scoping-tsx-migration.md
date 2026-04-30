# 2026-04-30 — Connection scoping + tsx migration

**CEO session. Focus: root-cause "Initialize Database fails exit code 1" loop.**

---

## Problem statement

User reported that the **Initialize Database** workflow has been failing for weeks with `exit code 1` and a deprecation banner about Node 20 being forced onto Node 24. The deprecation message was a red herring — it's a runner annotation appearing alongside the real error, not the cause.

Real cause was a feedback loop:
1. ts-node 10.9 has known intermittent failures on Node 22+ (transpile-only seed jobs crash)
2. We pinned all workflows to Node 20 to work around it (PR #50, 2026-04-29)
3. GitHub deprecated Node 20 on 2025-09-19, so Node 20 jobs are now forced onto Node 24
4. ts-node crashes on Node 24 too → exit 1 → user sees the failure again

## Resolution

Replaced `ts-node` with `tsx` (esbuild-based, used by the modern TS ecosystem since 2023). Moved all workflows to Node 22. Dropped the `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env var — no longer needed once we're on supported Node.

**Changes shipped in PR #51:**
- `.env.example`: documented 5 missing env vars (`DATABASE_URL_UNPOOLED`, `ANTHROPIC_API_KEY`, `DASHBOARD_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN`)
- `prisma/seed.ts`: fixed unused-imports bug (caPrograms + otherPrograms = 32 programs were being dropped silently)
- `scrapers/scheduler.py`: fixed fail→ok status overwrite (scraper failures appeared successful)
- `DEPLOY.md`: rewrote for current architecture
- `README.md`: removed stale SQLite references
- `db-init.yml`, `migrate-baseline.yml`: pinned to Node 20 (intermediate fix; tsx commit goes further)

**Changes pending on branch (commit `4f3a535`, needs new PR):**
- `package.json`: ts-node@10.9 → tsx@4; `db:seed` script simplified
- All 6 workflows: Node 20 → Node 22; dropped `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`
- `db-init.yml` seed step: `npx ts-node ...` → `npx tsx prisma/seed.ts`

## Default branch + branch sprawl

Repo default was set to `claude/subsidies-discovery-platform-oAFoU` (an intermediate branch from earlier sprint cycles), which is why so many `claude/*` branches accumulated — PRs were targeting that branch instead of main, then never cleaned up. User flipped default to `main` mid-session.

**Stale branches identified for deletion (need GitHub UI — local proxy denies remote delete):**
- `claude/add-state-subsidy-programs-HIwHz` (134 behind, 0 ahead)
- `claude/api-audit-hardening` (82 behind, 0 ahead)
- `claude/fix-subsidy-categories-ecmp7` (139 behind, 0 ahead)
- `fix/db-init-node-version` (0 ahead — PR #50 source)
- `claude/subsidies-discovery-platform-oAFoU` (ex-default; only deletable now that default is main)

Keep: `main`, `claude/consulting-framework-setup-ibuHt` (carries the tsx commit until merged).

## Verification (local)

- `npx tsx --version` → `4.21.0` on Node 22.22.2 ✓
- `npx tsc --noEmit` clean ✓
- `npx prisma generate` clean ✓
- tsx loads `prisma/seed.ts` imports without error; spreads 16 + 16 program records ✓

## Constraints surfaced this session

- GitHub MCP server disconnected mid-session — couldn't merge PRs, comment, or watch CI directly. Future sessions: reconnect at start.
- Local git proxy denies branch-delete operations (HTTP 403) — branch cleanup must go through GitHub UI.
- No Vercel/Anthropic API tokens — env-var setup in those dashboards stays manual.

## Next session pickup

1. Open new PR from `claude/consulting-framework-setup-ibuHt` → `main` containing only commit `4f3a535` (the tsx migration). PR #51 was merged before this commit was added.
2. After merge, run **Initialize Database** workflow. With tsx + Node 22 + secret set, it should succeed.
3. Resume the SS-008 remaining work: row-ID citations, deterministic tier (depends on SS-006), full abuse rails (Upstash Redis), eval gate (SS-012), legal sign-off.
4. Or pick up SS-003 phase 2: `keyRequirements` / `industryCategories` JSON-string → native array migration (touches 5 query call sites).
