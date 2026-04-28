# Scope Document — Changelog

Major revisions only. Per-commit history lives in `git log docs/scope/**`.

## 1.2.0 — 2026-04-28 (CEO)

Backend foundation hardening, part 2.

- **Rate limiting** — `middleware.ts` enforces 10 req/min on `POST /api/chat` (Anthropic budget protection) and 100 req/min on `POST /api/track` (flood protection). Returns 429 + `Retry-After` + `X-RateLimit-*` headers. Edge-runtime; in-process LRU store; Redis swap path documented in-file. Shipped in PR #45.
- **Production migration auto-deploy** — new `vercel-build` script in `package.json`, referenced from `vercel.json`. Runs `prisma migrate deploy` (via `DATABASE_URL_UNPOOLED`) before `next build` whenever the env var is set. Eliminates manual `db-init.yml` dispatch for schema changes. Shipped in PR #45.
- **Session record** — `docs/scope/sessions/2026-04-28-foundation-hardening.md` documents this session's decisions, current foundation health, and prioritized next steps.

## 1.1.0 — 2026-04-27 (CEO)

Backend foundation hardening, part 1.

- **SS-002 closed.** Grants.gov scraper graduated from DRY_RUN to live writes after 6 dry-run cycles. PR #42 merged.
- **SS-005 shipped.** `$4.2B+` hardcode replaced with live DB-computed headline stats (`percentile_cont` median + MAX). New `<Stat>` component + `fmtMoney()` helper. PR #44.
- **PR-time CI gates added.** `ci.yml` runs pytest, tsc, lint, grep gate (SS-005 §10), Prisma migration drift, and Next.js build sanity on every PR. PR #44.
- **`/api/health` endpoint added.** Always-200, returns `dbReachable`, `dbLatencyMs`, region, commit. PR #44.
- **CEO-track.md updated** to reflect SS-002 closure history.

## 1.0.0 — 2026-04-22 (COO)

Initial Scope Document of Record. Supersedes all prior ad-hoc audits and panel letters.

- Established `00-overview.md`, `01-benchmarks.md`, `README.md` index.
- Authored `SS-001` through `SS-012` at 10-section scientific-method rigor.
- Ratified 20-platform benchmark set.
- Expanded audience mandate to include individuals, households, students (HS / undergrad / grad / postdoc), researchers, veterans, seniors, tribal individuals, persons with disabilities.
- Absorbed the paused CEO scraper workstream into `SS-002`.
- Split tracks — `tracks/CEO-track.md`, `tracks/COO-track.md`.
- Seeded `experiments/` with the April 20 Grants.gov incident write-up and the SS-001 baseline-capture scaffold.
