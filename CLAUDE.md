# CLAUDE.md — Repo Law for StateSubsidies.com

You are working on **StateSubsidies.com** — a public directory of government funding (grants, tax
credits, rebates, vouchers, loans) for **every U.S. person and entity**: individuals, students,
farmers, nonprofits, public entities, and businesses. The mission, in priority order:
**Trust** (every claim sourced, dated, auditable) → **Accuracy** (rules-based, reproducible) →
**Delight + learning**. The brand promise: *we won't guarantee you get the money; we guarantee we
won't hide a program from you.* If we cannot cite it, we do not print it.

## Read first, in order

1. `docs/memory/HANDOFF.md` — current state, in-flight work, blocked-on-owner list
2. `ROADMAP.md` — every workstream, status, next increment, acceptance criteria
3. `docs/doctrine/ENGINEERING_DOCTRINE.md` — how we build (repo law, one read, always applies)
4. `docs/memory/LESSONS.md` — this repo's own scars; do not re-earn them
5. `docs/scope/README.md` → SS-001…SS-012 — the product-quality specifications of record

Agents live in `.claude/agents/`. Runbooks in `docs/runbooks/`. Decisions in
`docs/memory/DECISIONS.md`. Gap inventory in `docs/doctrine/GAP_ANALYSIS.md`.

## Architecture in one paragraph

Next.js 14 App Router + TypeScript + Tailwind (`app/`, `components/`, `lib/`), Prisma over
Postgres (Neon/Vercel; **pooled `DATABASE_URL` for runtime, `DATABASE_URL_UNPOOLED` for
migrations/bulk writes — never mix them**). Python scrapers (`scrapers/`, one module per source,
Pydantic `ScrapedIncentive` → `db_writer.py`) run via GitHub Actions (`scraper.yml`) with a
`DRY_RUN` promotion ladder; optional Claude-Haiku enrichment (`enricher.py`); provenance
fingerprinting (`fingerprint.py`). AI advisor at `app/api/chat/route.ts` (Claude via
`@ai-sdk/anthropic`, tool-gated to `search_incentives`, per-message disclaimer, structured
`ai_chat_turn` audit logs). Eval harness scaffold in `evals/`. Deploys via Vercel
(`vercel-build` runs `prisma migrate deploy` first). CI gates in `.github/workflows/ci.yml`:
pytest scraper contracts, `tsc --noEmit`, lint, Prisma migration-drift, `next build`, `$XB+` grep
gate.

## Hard rules (each traces to a real incident — ours or an inherited scar)

1. **Never print an uncited number.** Headline figures come from the DB with an as-of date; a
   missing value renders as a labeled gap, never `0`, never "null", never an estimate.
2. **No invented eligibility.** Eligibility answers are rules-based and reproducible. The
   ratio-based checker is a known open defect (SS-006 / GAP-F2) — do not extend the ratio
   pattern to new surfaces.
3. **Migrations only.** Never `prisma db push` against a shared DB. Schema change ⇒ migration in
   the same PR (CI drift-gate enforces this; don't fight it).
4. **Scraper promotion follows the ladder.** New/changed sources go mock → `DRY_RUN` cycles →
   checklist inspection (`docs/scope/items/SS-002-promotion-checklist.md`) → live. On data
   pollution: `docs/runbooks/scraper-incident-purge-and-contain.md`.
5. **Validate before mutate.** Full-payload validation (zod on TS routes, Pydantic on Python)
   before the first DB write. One write path per logical operation.
6. **Every fix pins a test.** Root-cause → failing test → fix → pin → line in
   `docs/memory/LESSONS.md`. A green summary is not evidence; a pinned test is.
7. **Evidence-first claims.** "Deployed" means probed at the live URL; "works" means observed.
   Never repeat a doc's claim about code behavior without reading the actual entrypoint.
8. **Seed data stays distinguishable** from scraped data via provenance fields, forever.
9. **Secrets:** no hardcoded fallbacks (a `'51432'` fallback secret shipped once — never again).
   Env vars documented in `.env.example` with provenance.
10. **Side-effectful test/eval infrastructure never touches production data.** Scratch DBs,
    `DRY_RUN=1`, eval-only keys.

## Session protocol

**Open:** read `HANDOFF.md`, verify its claims against `git log`/the live site before trusting
them, pick up the roadmap's next increment unless directed otherwise.

**During:** ship end-to-end thin, then widen. Prefer the smallest visible slice. New module ⇒
typed + tested at birth. Touched an untested old route ⇒ characterization test first. Ask of
every I/O call: does it scale with data volume?

**Close (non-negotiable, in writing, in `HANDOFF.md`):**
1. **"What will the user SEE changed?"** — one sentence. If nothing: say "plumbing-only" out loud.
2. Update `HANDOFF.md` current-state + next steps + blocked-on-owner list.
3. New scar? → append `LESSONS.md`. New decision? → append `DECISIONS.md`. Stale doc noticed? →
   fix it this session, not "later".
4. Whole-branch review (`.claude/agents/whole-branch-reviewer.md`) before any multi-task PR is
   declared done.

## Commands

```bash
npm run dev              # local dev server
npx tsc --noEmit         # typecheck (CI gate)
npm run lint             # eslint (CI gate)
npm run build            # prisma generate + precompute stats + next build
python3 -m pytest tests/ -v          # scraper contract tests (CI gate)
python3 -m scrapers.runner --mock    # scrapers offline
python3 -m evals.runner --dry-run    # eval harness, no API calls
npm run db:migrate       # prisma migrate deploy (needs DATABASE_URL_UNPOOLED)
npm run db:seed          # seed curated programs
```
