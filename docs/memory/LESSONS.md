# LESSONS — The Losses Ledger

Append-only. Every entry: date · what happened · the one-line mechanism · what pins it now.
Never delete; supersede with a dated note. Imported (non-local) doctrine lives in
`docs/doctrine/ENGINEERING_DOCTRINE.md`; this file is **this repo's own scars**, so nobody
re-earns them. Seeded 2026-07-11 from full git/scope-doc archaeology (115 commits, PRs #1–#62).

| # | Date | Scar | Mechanism (one line) | Pinned by |
|---|---|---|---|---|
| 1 | 2026-04-20 | Grants.gov boilerplate rows polluted the live directory | HTML scraper wrote generic "Federal grant opportunity:" stubs as real programs | Purge + mock-lock (`13535fe`); `BOILERPLATE_TITLE_PREFIXES` gate + contract tests in CI (PR #27); playbook: `docs/runbooks/scraper-incident-purge-and-contain.md` |
| 2 | 2026-04-2x | Contact-text landed in `agencyName` | Detail-endpoint fallback chain surfaced a contact block where the agency string was expected | Rejection gate + test (PR #40, `0e7b75b`) |
| 3 | 2026-04-27 | WAZIP/CARB scrapers pointed at dead URLs (404) | Source pages moved; nothing verified URL liveness before live mode | Live mode disabled per-source (PR #37); liveness check is part of promotion checklist Stage 1 |
| 4 | 2026-04-30 | `seed.ts` silently dropped 32 curated programs | `caPrograms`/`otherPrograms` imported but never spread into the array — no count assertion | Fix in PR #51; lesson: seed scripts assert expected row counts |
| 5 | 2026-04-30 | Scraper failures logged as `status: "ok"` | Success-path code inside the `except` block overwrote the fail status | Fix in PR #51 (`scheduler.py`); lesson: never share status-write code between paths |
| 6 | 2026-04-25 | Hardcoded fallback secret `'51432'` in analytics route | "Temporary" fallback shipped; endpoint was open to anyone who read the source | Removed (PR #23) — 503 when `DASHBOARD_SECRET` unset; CLAUDE.md hard rule 9 |
| 7 | 2026-04-2x | `$4.2B+` headline was invented, unsourced, undated | Marketing copy hardcoded in `page.tsx`; nothing computed it | SS-005: DB-computed stats + `$XB+` grep gate in `ci.yml` |
| 8 | 2026-04-30 | CI "Initialize Database" failed in a recurring loop | `ts-node@10.9` broken on Node 22+; the Node-20 pin was a band-aid that GitHub's Node-20 deprecation ripped off | tsx@4 migration, all workflows on Node 22 (scope CHANGELOG 1.4.0) |
| 9 | 2026-04-xx | Pooled vs unpooled connection mis-scoping broke migrations/bulk writes | One `DATABASE_URL` used for jobs that need a direct connection | `DATABASE_URL_UNPOOLED` split, documented in `.env.example` + `DEPLOY.md`; `-pooler` guard in `db_writer.py` |
| 10 | 2026-04-xx | Build command could destroy data | `prisma db push --accept-data-loss` ran on every Vercel build | `vercel-build` uses `migrate deploy`; CI drift gate; CLAUDE.md hard rule 3 |
| 11 | 2026-07-10 | Startup purge/seed **never ran for weeks** while believed active | `instrumentation.ts` existed but `instrumentationHook` was never enabled in `next.config.mjs` — code present ≠ code executing | Enabled in #62; **pinned 2026-07-11:** CI `boot-probe` job fails unless the self-seed actually populates the API on a scratch DB. GAP-B6 still moves mutation out of boot long-term |
| 12 | 2026-07-10 | Browse page crashed in production | Router crash surfaced by real traffic, not by any test — we have zero browser tests | Fixed in #61; **half-pinned 2026-07-11:** `boot-probe` job catches boot/render crashes on `/`, detail, `/methodology`. Client-side console errors still unpinned until Theme F Playwright gate — **open** |
| 13 | 2026-04-30 | Repo default branch pointed at a stale `claude/*` working branch | Default never re-pointed after early sessions; new PRs targeted stale history | Repointed to `main`; lesson: branch hygiene is release engineering |
| 14 | 2026-04-25 | Eligibility ratio lies on compound requirements | `yesCount/length` scores a hard-requirement miss as "85% match" | **Not yet pinned — open defect** (SS-006 / GAP-F2 / Theme C). The checker still ships ratio math as of 2026-07-11 |
| 15 | 2026-07-11 | README roadmap had drifted stale-to-wrong (listed shipped work as todo) | Genesis doc never pruned as practice diverged | README now points at `ROADMAP.md`; doctrine §6.4: fix stale docs on sight |

## Open scars (unpinned — close these, then move the row above)

- **#12** — boot layer pinned (CI `boot-probe`, 2026-07-11); browser console-error layer still
  open (Theme F step 2).
- **#14** — ratio-based eligibility still live (Theme C).
