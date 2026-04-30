# Scope Document — Changelog

Major revisions only. Per-commit history lives in `git log docs/scope/**`.

## 1.4.1 — 2026-04-30 (CEO) — SS-008 row-ID citations

- **Tool result includes `id`.** `search_incentives` now returns the database `id` for each row alongside title/slug/etc., so the model has access to a stable, auditable handle for every program it cites.
- **System prompt updated.** Combined safety rules 3 + 4 into one rule that explicitly notes the audit trail: "every program you name must have come from a search_incentives call — each tool result includes a stable `id` field that lets us audit your citations after the fact."
- **Per-turn audit log.** `app/api/chat/route.ts` emits one structured `console.info({event:"ai_chat_turn", ...})` line per chat request capturing: mode, IP, last user message (truncated 500 chars), all `search_incentives` calls (params + matched IDs), final unique matched IDs, response character count, duration. Vercel log search filter `event:ai_chat_turn` returns the full citation receipt for any past turn — no new DB table, no new dependencies.
- **Why structured logs over a DB table.** Lets us defer the audit-table schema decision until SS-012 eval gate concretizes its replay needs. Logs are queryable, exportable, and survive code rollbacks. When/if eval needs persistent storage, the JSON shape is already stable and easy to backfill from logs.

## 1.4.0 — 2026-04-30 (CEO) — connection scoping + tsx migration

Root-causes the recurring "Initialize Database fails with exit code 1" loop and unblocks the workflow plan.

- **CI Node toolchain — permanent fix.** Replaced `ts-node@10.9` (broken on Node 22+) with `tsx@4` (esbuild-based). Moved all 6 workflows from Node 20 → Node 22 (current LTS). Dropped the `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` band-aid. The Node-20 pin was only ever a workaround for ts-node; once GitHub deprecated Node 20, jobs were forced onto Node 24 → ts-node crashed again. tsx removes the dependency entirely. On branch `claude/consulting-framework-setup-ibuHt` (commit `4f3a535`); needs new PR — PR #51 was merged before this commit landed.
- **Connection scoping.** `.env.example` now documents `DATABASE_URL_UNPOOLED`, `ANTHROPIC_API_KEY`, `DASHBOARD_SECRET`, `UPSTASH_REDIS_REST_URL/TOKEN` with provenance for each. Previously undocumented → silent misconfiguration on first deploy. (PR #51)
- **`prisma/seed.ts` import bug fix.** `caPrograms` (16) and `otherPrograms` (16) were imported but never spread into the `incentives` array — seed silently dropped 32 curated state programs. (PR #51)
- **`scrapers/scheduler.py` fail/ok overwrite bug fix.** Inside the `except` block, success-path code overwrote `status: "fail"` with `status: "ok"`, making scraper failures appear successful in logs. (PR #51)
- **`DEPLOY.md` rewrite.** Old version told you to use `db push` and only documented `DATABASE_URL`. New version covers required Vercel env vars (Production + Preview), GitHub Actions secrets list, the Migrate Baseline one-time step, and a sanity checklist for diagnosing first-deploy failures. (PR #51)
- **Default branch repointed.** Repo default was `claude/subsidies-discovery-platform-oAFoU` (a stale intermediate branch) — flipped to `main`. Five stale `claude/*` branches identified for deletion via GitHub UI.

## 1.3.0 — 2026-04-28 (CEO) — continued session

SS-003 and SS-008 non-gated pieces.

- **SS-003 PR A** — Provenance schema: `ParseConfidence` enum + 8 new fields on Incentive; migration `2_add_provenance`; backfill script; `lib/types.ts` updated; TrustRibbon upgraded to indexed `sourceDomain` filter.
- **SS-003 PR B** — Scraper provenance emission: `fingerprint.py` (`compute_source_hash`, `infer_parse_confidence`); `ScrapedIncentive` gains `source_domain`, `source_hash`, `parse_confidence`, `parse_notes`; `db_writer.py` writes all new fields.
- **SS-003 PR C** — `ProvenancePanel` component (detail page) + compact card provenance line (domain · confidence).
- **SS-008 (non-gated)** — `AIDisclaimer` per-message component; system prompt safety rails (prohibited words, legal/tax reroute); `parseConfidence != LOW` filter on AI search; env-var exposure fixed in not-configured UI.

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
