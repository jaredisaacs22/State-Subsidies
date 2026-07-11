# Engineering Doctrine — StateSubsidies.com

**Adopted:** 2026-07-11 · **Status:** Repo law. `CLAUDE.md` points here; every session inherits these rules.
**Provenance:** Distilled from five engineering retrospectives of mature production platforms
("Scope Docs 1–5", retired after distillation — this file is the permanent, self-contained record).
Every rule below was paid for in production somewhere. The scars are genericized; the rules are
applied specifically to this codebase.

**How this relates to `docs/scope/`:** the Scope Document (SS-001…SS-012) says *what* we build and
*what quality bar* it must hit. This doctrine says *how* we build — the engineering habits that make
the scope achievable without re-learning other people's incidents. When they conflict, scope wins on
product decisions, doctrine wins on engineering practice.

---

## 0. The Prime Directives (apply to every layer)

1. **Trust is the product.** Every number traceable to a source; every claim cited and dated; a
   missing value renders as a labeled gap, never `0`, never an estimate, never `null` printed as
   text. This was already our scope mandate (00-overview §1) — the retrospectives confirm it is
   also the correct *engineering* posture: the platforms that won trust were the ones where every
   figure reconciled digit-exact to a source the user already trusted.
2. **Treat every upstream source as an adversary.** Government sites and APIs will flip numeric
   columns to percent-strings, rename fields to snake_case, add title rows, change encodings,
   serve typo dates, and 404 without notice. All of those actually happened upstream of the
   retrospective platforms — and our own history already includes boilerplate-row pollution,
   contact-text in `agencyName`, and dead source URLs (see `docs/memory/LESSONS.md`). Parse
   tolerantly, validate aggressively, and pin every fix with a test.
3. **The incident loop is always the same:** root-cause to a one-line mechanism → write the
   failing test → fix → pin → write the runbook/lessons line. The losing pattern is trusting a
   green summary. A fix without a pinned test is a fix that will ship again.
4. **Ship one visible increment every session.** Plumbing does not demo. The single biggest
   process failure across all five retrospectives was the "visibility crisis": weeks of real,
   invisible work until the owner asked *"when am I going to start seeing results?"* Every session
   close answers, in writing, **"what will the user SEE changed?"** Engineering-only sessions are
   allowed but must say so out loud in the handoff.
5. **A test suite that isn't green doesn't exist.** Carried red fixtures make "is the suite
   green?" unanswerable and mask real regressions. Zero-red is a precondition, not a milestone.
   Pay down test debt the week it appears.
6. **Mechanical gates beat judgment calls.** Every recurring class of mistake gets converted into
   something the build physically cannot pass: grep gates, contract tests, drift checks,
   console-error gates. Our SS-005 `$XB+` grep gate is the house pattern — extend it, don't
   re-litigate solved problems in review.
7. **Validate everything before mutating anything.** A rejected field discovered *after* a state
   change leaves half-mutated poison (one platform had a `"NaN"` string poison a store so every
   subsequent read 500'd). Full-payload validation happens before the first write, in scrapers'
   `db_writer`, in API routes, and in any future account/bookmark backend.
8. **Fix pipeline flaws at the pipeline level.** A workflow that can silently no-op while
   reporting success (it happened: a promote gate evaluated false and "succeeded" while shipping
   a stale image) is a design flaw, not operator error. "Remember to do X" runbook lines are a
   stopgap; the real fix makes the pipeline fail loud.

---

## 1. Data layer doctrine (scrapers → Postgres)

The data pipeline is the real product and the hardest part. Ours is:
`scrapers/*.py` → `models.ScrapedIncentive` (Pydantic) → `db_writer.py` → Prisma/Postgres →
API routes → UI.

### 1.1 A data contract exists from the day a source is first ingested
Every scraper source gets, at introduction (not retroactively):
- **Required-fields assertion** — which fields must be present and non-empty for a row to be
  eligible for writes (we have quality gates for Grants.gov; every source needs them).
- **A golden fixture from the real payload** — a checked-in sample of the actual API/HTML response
  (`tests/fixtures/<source>/`), with a contract test that parses it and asserts the parsed shape.
  Today only Grants.gov has this; the other ~25 sources have smoke tests at best. That is the
  single largest data-layer gap (GAP-D1).
- **A shape-change alarm** — when a live scrape parses 0 rows, or a required field goes null
  across >50% of rows, the run must FAIL, not write an empty/degraded batch. "Parser quietly kept
  zero columns for weeks" is a real scar from the retrospectives.

### 1.2 Deterministic identity and provenance on every row
- Row identity derives from source-document identity (`sourceHash` via `fingerprint.py`), never
  auto-increment semantics, never wall-clock. Re-scrapes of unchanged sources must not mint new
  rows or churn `lastSeenAt`-adjacent fields meaninglessly.
- Provenance is non-negotiable per row: `sourceUrl`, `sourceDomain`, `sourceHash`,
  `parseConfidence`, `firstSeenAt`, `lastSeenAt`, `lastVerifiedAt/By` (SS-003, shipped). New data
  paths (enricher edits, manual curation, future admin UI) must stamp provenance the same way —
  an AI-enriched field is a *derived* claim and must be distinguishable from a scraped fact.

### 1.3 Freshness is an alarm, not a value in a column
- Rank freshness by the **data date** (program deadlines, source-page dates), not file/scrape
  mtime — mtimes lie after copies and re-runs.
- Staleness must be *visible to the user and the owner on the surface itself*: the
  `FreshnessBadge` per card is right; a site-level "data as of / oldest live source" indicator is
  the doctrine-complete version (GAP-F4). Every silent-staleness incident in the retrospectives
  was found late, during a failure — a visible banner converts those to same-day fixes.

### 1.4 Tripwires on every load-bearing field
Fields with known relationships get mechanical sanity checks at ingest:
- `deadline` in the past ⇒ status must not be `ACTIVE`.
- `fundingAmount` outliers (e.g. > $50B or < $0) ⇒ quarantine the row, don't write it.
- `sourceUrl` must be `https://` and resolvable at promotion time.
- Title/summary boilerplate prefixes ⇒ reject (already shipped after the April 20 incident —
  keep extending the list as new classes appear).
The equivalent scar: a port code sat in a money column for weeks (59% of values wrong) because
nothing checked that the numbers *related* to each other.

### 1.5 Goldens pin REPRODUCIBILITY, not TRUTH
Before pinning any golden fixture or anchor number, a human verifies a sample against the live
source page **by eye**, and any headline figure gets an independent recomputation. A golden can
freeze a bug forever — it happened twice on one platform, where golden files certified a
fee-masquerading-as-duty bug all the way into a leadership demo. For us concretely:
- Any change to headline stats (`scripts/precompute-stats.ts`, `/api/stats`) requires a
  worked-example regression test computed by hand from a known small dataset **at introduction**.
  A double-counting bug in a headline formula overstated a platform's flagship figure by ~70%
  ($24.7M claimed vs $14.6M real) because no worked example protected it.
- When promoting a scraper source, eyeball N real rows against their live source pages
  (the SS-002 promotion checklist Stage 1 inspection — keep it forever).

### 1.6 One boundary normalizer per messy key, from day one
Keys arrive as `14`, `14.0`, `"14"`, `"14.0"` — one platform fixed the same key-mismatch bug four
separate times before centralizing a normalizer. Our equivalents: state codes vs state names,
jurisdiction strings, slugs, agency names, entity types. Normalization helpers live in ONE place
(`lib/utils.ts` on the TS side, one shared module on the Python side) and every comparison goes
through them. Never inline-normalize at a call site.

### 1.7 Seed data and scraped data never blur
Curated seed rows (`prisma/seed*.ts`) and scraped rows coexist in one table. Provenance fields
must make them distinguishable forever, and any statistic or user-facing count must be honest
about what it includes. Demo/placeholder data is physically separate, flagged, and watermarked —
never interleaved silently with live rows. (Seed rows haunting joins, grains, and UI bugs for the
life of a platform is a documented multi-month scar.)

### 1.8 Purge-and-contain is a rehearsed playbook, not an improvisation
The April 20 Grants.gov incident was handled correctly (freeze → purge → mock-lock → gate). That
playbook is now written down at `docs/runbooks/scraper-incident-purge-and-contain.md`. Follow it;
improve it after every use.

### 1.9 Stream, don't slurp
Any bulk operation (full-table backfills, large scrape batches, export generation) is written
assuming a hard memory ceiling, even when developed on a machine with headroom — batch writes,
iterate cursors, never load an entire table or a multi-MB payload as one in-memory object. A
whole-file DB apply OOM-killed a live pod on one platform; serverless functions have the same
shape of ceiling.

---

## 2. Backend / API doctrine (Next.js API routes)

### 2.1 Thin API over the data; conclusions computed server-side
Routes stay thin readers/writers over Prisma. The **payload carries conclusions, not
ingredients**: any rule computed client-side will eventually disagree with the server (a
suppression rule re-implemented date-insensitively in a UI hid rows forever). If the UI needs a
verdict (eligibility, freshness state, match strength), the API computes it and the UI renders it.

### 2.2 Persistence before stateful features
Do not ship a workflow feature (accounts, saved searches, alerts, application tracking) on
storage that a deploy can wipe or a browser can lose, beyond the current clearly-labeled
localStorage bookmarks. In-memory/ephemeral state destroyed user trust faster than features built
it on two of the five platforms. SS-009 (auth + real bookmark/alert backend) builds the store
first, ships the feature when persistence is durable. Label honestly until then ("saved on this
device only").

### 2.3 Event-sourced user actions, single write path
When SS-009 lands: user decisions (saves, alerts, dismissals) are an append-only event log with
deterministic IDs (idempotent re-submits), derived current-state views, and exactly ONE write
path. A platform that let a second write path coexist with an event log spent three releases
fixing interactions between them.

### 2.4 Validation and mutation discipline
Full-payload validation (zod on every API input — we have zod, use it on every route) before the
first DB write. Copy-on-read semantics for anything cached. One commit point per logical
operation.

### 2.5 Caching pattern of the house
*Derive once, key by source identity, stamp volatile bits fresh per call.* Our
`precompute-stats.ts` build-time snapshot is this pattern; extend it (per-state aggregates,
map data) rather than inventing new caching shapes. This exact pattern took hot paths from
1.6s → 70ms and 26s → 0.02s elsewhere.

### 2.6 Scale-shaped code review question
Every review asks: **"does this I/O call scale with request volume or data volume?"** N+1 lookups
per row and unbounded scans of growing tables/logs both shipped and sat unnoticed on a mature
platform. With ~530 programs everything looks fast; write for the 50,000-program directory the
scope demands.

### 2.7 Module size discipline
Split any module at ~1,500 lines — route groups, extracted libs, per-domain files. A 7,489-line
single app file and an 11,500-line single HTML file were the two most expensive artifacts in the
retrospectives; both crossed the line one "small addition" at a time. No file in this repo is
close yet; the rule exists so none ever is.

### 2.8 Auth is app-level, not edge-level, when it arrives
When accounts land, authorization checks live in the app (middleware + route-level), not solely
in a hosting-platform gate. Gate protected assets by **path prefix**, never by file-extension
lists (extension gates were bypassed three separate times on one platform: `.csv`, then `.gz`,
then `.html`).

---

## 3. Frontend / UI doctrine (Next.js App Router + Tailwind)

We already have the architecture two platforms wished they had (componentized, routed, one
formatter module). The doctrine here is about keeping it and adding the missing verification.

### 3.1 Structural rules
- **One renderer owns any given element.** No two components writing the same DOM region; no
  duplicate-named components owning sibling tables. (Two functions with the same name owning
  different tables cost a platform weeks.)
- **One formatter module, one escape path.** `formatCurrency`/`fmtMoney` live in `lib/utils.ts`
  only. A local re-implementation shadowing the global produced a `$$649M` double-dollar bug
  elsewhere. Never copy a formatter into a component.
- **Shared component the moment a second page needs the pattern.** Drawer/filter/keyboard logic
  independently re-derived per page drifted on every platform that allowed it. Our
  `components/` layer is the right shape — resist per-page one-offs.
- **Delete dead code the session it dies.** Zombie features accrete dependencies (a methodology
  declared dead stayed wired-in for weeks because retirement was never scoped). Killing things is
  scheduled work.

### 3.2 Language and honesty rules
- **Display-language seam:** internal vocabulary (enum names, `parseConfidence` values,
  disposition flags) passes through one reviewed map to human words before rendering
  (`lib/types.ts` display maps are the seam — every new enum gets a display entry, no raw enum
  leaks). Jargon leaking to the UI is a trust leak.
- **Design empty and success states WITH the happy path.** An honest "no programs match" must
  not look like a broken page. Every list surface has designed empty, loading, and error states.
- **Three-state honesty beats binary alarms.** Statuses render as
  positive / explained-amber / red-only-when-it-matters. Never render a fake or alarming value
  where an honest one exists ("—" beats "null"; a labeled gap beats a zero).
- **Every number appears exactly once; derivation behind a toggle.** Restating the same figure
  four ways bloats surfaces; headline once, "show the math" on demand.
- **Change narratives for headline numbers.** When a scrape or methodology change moves a
  user-visible figure materially, the surface says *why* (dated note), because our audience reads
  numbers, not commit messages. A correct 70% basis move still erodes trust if unexplained.
- **Density beats decoration.** Charts/tiles that don't drive a decision get deleted without
  sentiment. Never dress a table in chart language ("trend", "forecast") unless it is a chart.

### 3.3 Data-driven UI
Filters, facets, category lists, and audience selectors derive from the data payload — adding a
state, category, or audience should require **zero UI code**. (When a platform changed its region
model server-side, the filter UI updated itself.) Audit any hardcoded filter list against this
rule.

### 3.4 A tested layout budget
"Renders within the target viewport with zero horizontal overflow" is a *test*, not a review
comment, once the browser harness (Theme G) exists. Wide content scrolls inside its own
container; 200,000-pixel unpaginated walls shipped elsewhere because nothing measured page
height. Pagination + search ship WITH any large table, never after.

---

## 4. Testing doctrine (priority-ordered — this order is load-bearing)

1. **CI builds and BOOTS the shipped artifact.** `next build` alone is not proof of life —
   400+ unit tests missed two production crash-loops elsewhere because nothing ever *started*
   the artifact. Our CI gap: after `next build`, run `next start`, probe `/api/health` and one
   real page, fail on non-200. This is the single highest-ROI test we don't have (GAP-T1).
2. **Headless browser suite with an absolute console-error gate.** Any uncaught JS error fails
   the run, zero tolerated errors, from the first browser test onward (a tolerated "known"
   console error masked real breakage for weeks elsewhere). Playwright, driving the real built
   app.
3. **UX contracts are tests:** page-height bounds, empty-state text present, deep links load,
   banned-jargon greps, disclaimer present on every AI message, layout budget.
4. **Scripted first-time-user tours find what developers can't.** A harness that walks the site
   as each audience persona (student, farmer, nonprofit, homeowner…) and screenshots every step
   surfaces the navigation traps humans report a month later. None of the retrospectives' worst
   UX bugs were found by their developers.
5. **Relational assertions over literal pins.** Prefer "rendered stat == stat recomputed from
   the same data" so truth can move without test churn; frozen anchors only for numbers that
   must never drift, each paired with an independent recompute.
6. **Worked-example tests for every headline formula at introduction** (see §1.5).
7. **Whole-branch review is a distinct layer.** Per-task review structurally cannot see
   integration seams: eight individually-passing task reviews still shipped a dead filter and an
   unpopulated header elsewhere; ours is `.claude/agents/whole-branch-reviewer.md`.
8. **Isolate side-effectful test infrastructure by construction.** Eval runs, browser harnesses,
   and scrapers-under-test never touch production data (a verification harness once POSTed real
   decisions into a production ledger). Scratch DBs, `DRY_RUN`, eval-only API keys — already our
   pattern; keep it law.
9. **Backfill characterization tests opportunistically and mandatorily:** any untested old route
   or scraper touched for any reason gets a test before the unrelated change lands.
10. **Every new module ships typed and tested — the ratchet is not opt-in.** An opt-in
    strictness ratchet never ratchets (a "2 of 51 modules strict" plateau proved it). For us:
    `tsc --noEmit` already gates; new Python modules get type hints + a test file at birth.

---

## 5. CI/CD & release doctrine (GitHub Actions + Vercel)

1. **The deploy-verification liturgy is a script, not a memory.** After every production deploy:
   probe `/api/health` (assert the deployed commit), load one real program page, check headline
   stats are sane and dated, check `/api/stats/last-scrape`. Encoded at
   `docs/runbooks/deploy-verification.md` until it becomes an automated post-deploy job (the end
   state). "Verified at the artifact" is the only deploy claim allowed — workflow-green and
   image-promoted both lied to other teams.
2. **Rollback is a tested path.** An untested rollback recipe is a rumor — one platform's
   documented rollback was DEAD when needed (artifacts purged) and recovery happened as a
   night-time production hotfix. Ours: Vercel instant rollback + migration-compatibility rules,
   documented in `docs/runbooks/rollback.md`, drilled quarterly.
3. **Required checks are *required* in repo settings** the day they exist — a green-but-optional
   gate is decorative.
4. **No silent no-ops in workflows.** Any conditional skip of a load-bearing step
   (migrations, seed, scrape writes) must fail loud or annotate the run conspicuously.
   `vercel-build`'s migrate-if-env-set conditional is acceptable only because CI drift-gates
   migrations separately — that pairing is deliberate; don't break one side of it.
5. **Migrations forever, `db push` never** against shared databases (already law after
   `--accept-data-loss` was removed — it stays law).
6. **CI flakes get diagnosed by signature.** Died-in-dependency-install ⇒ rerun; died-in-a-test
   ⇒ investigate. Never normalize a flake without classifying it.

---

## 6. Process doctrine (how sessions run)

1. **Session protocol lives in `CLAUDE.md`** — read-first order, hard rules, close-out ritual.
   The memory/handoff system is why 39 days of context survived crashes and week-long gaps on
   the strongest retrospective platform ("no hiccups"). Ours: `docs/memory/HANDOFF.md` (current
   state, updated every close), `docs/memory/LESSONS.md` (losses ledger, maintained
   *continuously* — hindsight should never need reconstruction), `docs/memory/DECISIONS.md`
   (dated decisions with reasons, so divergence is deliberate, not emergent).
2. **Every session close answers "what does the user SEE changed?"** in writing, before any
   success claim. Success theater — measuring test counts and byte-idempotence while the product
   stagnates — went unnoticed for eight releases elsewhere.
3. **Evidence-first claims.** No "should work", no repeating a doc's description of behavior
   without reading the actual entrypoint (a documented build pipeline simply did not match the
   real code on one platform; the doc was aspirational). Verify against code/live URL, then claim.
4. **Prune stale docs the moment practice diverges.** Genesis docs that go stale become actively
   misleading; a stale doc is worse than no doc. README's roadmap section was this repo's own
   example (now fixed — pointer to `ROADMAP.md`).
5. **File human-gated and third-party asks the day they are conceived** (API keys, DNS, legal
   review, SME labeling hours for SS-012 personas). Their lead time is not ours to compress, so
   they pipeline *ahead* of the features they unblock. Maintain a standing "blocked on you"
   list to the owner in `HANDOFF.md` — the worklist pattern applied to our own development.
6. **Sister-surface rule.** When a hard-won guard lands in one layer (a scraper gate, a UI
   pattern, a workflow fix), port it to sibling layers *immediately* — the identical antipattern
   independently resurfacing in a sister surface cost real audit effort elsewhere. If two
   surfaces are deliberately different, write the divergence down in `DECISIONS.md`.
7. **Schedule deletions like features.** Every kill decision gets a dependency sweep and a
   scoped retirement task the same week.
8. **Agent hygiene:** inline execution for big-file edits (a dispatched subagent once stalled
   silently for 6 hours on a job that took 30 minutes inline); watchdog any dispatched agent;
   reviewer agents stay fresh-context; review personas must DRIVE the deployed product
   (walkthrough + screenshots), not infer from code.
9. **Owner sees real pixels mid-build,** not after. A screenshot-and-ask checkpoint mid-build is
   cheaper than the full-surface same-week rebuild it prevents. Screenshot-grounded UX audit
   every few releases — not after ten.

---

## 7. Applying the doctrine — where each rule bites first

| Doctrine | First concrete application here |
|---|---|
| §1.1 data contracts | Golden fixtures + required-field gates for the ~25 sources that lack them |
| §1.3 freshness alarm | Site-level "data as of" banner computed from DB |
| §1.5 worked examples | Regression test for `precompute-stats.ts` formulas |
| §2.2 persistence first | SS-009 backend before any "sync across devices" promise |
| §3.2 display seam | Audit every enum reaching the UI through `lib/types.ts` maps |
| §4.1 boot the artifact | CI job: `next start` + probe after build |
| §4.2 console gate | First Playwright suite (Theme G) |
| §5.1 deploy liturgy | `docs/runbooks/deploy-verification.md` |
| §6.1 memory system | `docs/memory/` — live from this PR onward |

The full prioritized gap list lives in `docs/doctrine/GAP_ANALYSIS.md`. The workstreams that
close them live in `ROADMAP.md`.
