# 00 — Overview, Current State, Target State, Framework

**Document of record:** Official Scope v1.0
**Date of record:** 04/21/2026

---

## 1. Mission restated (so every scope item can point here)

StateSubsidies.com exists to be the **world's most trusted directory of public money available to any U.S. person or entity**, and the **kindest on-ramp to actually getting that money**.

Three non-negotiables, in priority order:

1. **Trust.** Every claim, number, eligibility signal, and AI paraphrase is sourced, dated, and auditable. If we cannot cite it, we do not print it.
2. **Accuracy.** Eligibility logic is rules-based, not ratio-based. Audience models reflect how grants actually work, not how our database schema happens to be shaped.
3. **Delight + learning.** The user leaves each session having *understood something new about the public-funding system*, regardless of whether they qualified for anything this visit.

The brand promise — as Counsel (Okonkwo) will let us ship it:

> *"We will show you every public program for which you plausibly qualify — across every state, every agency, and every level of government — updated on a cadence we publish, with source links, free forever. We won't guarantee you get the money; we will guarantee we won't hide a program from you."*

That sentence is the brand. It also bounds what we can and cannot claim.

## 2. Audience mandate (expanded 04/22/2026 per COO direction)

The product now serves, as first-class audiences:

- **Individuals & households** — renters, homeowners, low-income households, veterans, seniors, tribal individuals, people with disabilities, immigrants/new Americans.
- **Students & researchers** — high school (dual enrollment, FAFSA, scholarships, STEM programs), undergraduate, graduate, postdoctoral, independent researchers.
- **Farmers & agricultural producers** — row crop, livestock, specialty, beginning farmers, conservation programs.
- **Nonprofits & mission-driven orgs** — 501(c)(3), (c)(4), fiscally-sponsored projects, community dev corps.
- **Public entities** — school districts, municipalities, counties, tribal governments, state agencies, regional authorities.
- **For-profit entities** — sole proprietors, LLCs, S-corps, C-corps, small business, startup, mid-market, enterprise.

This expansion materially changes four scope items (SS-001 hero copy, SS-005 headline numbers, SS-007 audience model, SS-011 plain-language bar). It is called out explicitly in each.

What the current H1 *"Find government money for your business"* (app/page.tsx:263) does is quietly exclude the majority of the audience above. That excludes a 19-year-old Pell-eligible community-college student who came here hoping to find a Workforce Innovation Opportunity Act (WIOA) training grant. The scope document treats that exclusion as a P0 defect.

## 3. Current state baseline (04/21/2026)

| Dimension | State of record 04/21/2026 | Evidence |
|---|---|---|
| Programs in DB | ~530 (mix real + synthetic) | `prisma/seed.ts` (~7,000 lines) |
| Scrapers | 9 built; **all locked to `--mock`** per commit `13535fe` | `.github/workflows/scrape.yml:30`, code: `scrapers/scheduler.py` |
| Live scrape workflow | `scraper.yml` runs every 6h but points at pooled DB URL (will fail under bulk writes) | `.github/workflows/scraper.yml:33` |
| Schema | Prisma/Postgres, `keyRequirements` & `industryCategories` stored as JSON-in-string | `prisma/schema.prisma` |
| Provenance per row | `sourceUrl`, `scrapedAt` only. No hash, reviewer, confidence, or verified-at | `prisma/schema.prisma` |
| AI advisor | Claude Sonnet 4.6 via `@ai-sdk/anthropic`, one tool (`search_incentives`), `stepCountIs(4)` | `app/api/chat/route.ts`, `components/BusinessIntakeChat.tsx` |
| AI enrichment (scrape side) | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) optional on scraper ingest | `scrapers/enricher.py:25` |
| Eligibility UI | Ratio-based (`yesCount / questions.length`) — mathematically lies on compound requirements | `components/IncentiveCard.tsx` |
| Auth | None. Bookmarks + alerts in `localStorage` only. | `lib/useBookmarks.ts` etc. |
| Trust ribbon | Absent. Only footer disclaimer | `app/layout.tsx:86-93` |
| Hard-coded figures | *"$4.2B+ Available"* at `app/page.tsx:296`; not sourced, not dated, not linked | `app/page.tsx:296` |
| Build command | `prisma generate && prisma db push --accept-data-loss && next build` | `vercel.json:2` |
| API abuse controls | None on `/api/chat`, `/api/track` | `app/api/**` |
| Accessibility | Partial aria wiring; no skip link; no formal audit | Across `components/**` |
| Legal copy | Disclaimer in 9px italic; no per-AI-message disclaimer; "guarantee" framing drift | Across `/`, `IncentiveCard`, `BusinessIntakeChat` |
| Env workflows | `DATABASE_URL` (pooled) vs `DATABASE_URL_UNPOOLED` (direct) mis-scoped in scraper workflow | `.github/workflows/scraper.yml:33`, `db-init.yml:45` |

**Consensus letter grade, whole product, 04/21/2026: C+ / B−.** The visual system has run ahead of the data layer and the audience coverage; the brand *looks* trustworthy while the substance is still catching up. That gap is the exact risk this scope document exists to close.

## 4. Target state (A++ / world-class / world-renowned)

We will ship a directory that a government CIO would cite, a Stripe engineer would screenshot, a community-college guidance counselor would bookmark for every student they advise, a farmer in Iowa would trust at 11pm before harvest, and a Rewiring America policy director would benchmark against. Concretely, the product at v1.0 GA has:

- **Every federal, state, local, utility, tribal, and foundation public-funding program** the user may plausibly qualify for, surfaced behind a single input.
- **Every row** carries `sourceUrl`, `sourceHash`, `lastVerifiedAt`, `lastVerifiedBy`, `parseConfidence`, and a visible "Methodology" link.
- **Every headline number** on the site is computed from the DB at query time with an `as of` timestamp.
- **Every audience** — individuals, students, farmers, nonprofits, governments, businesses — sees themselves in the H1, the personas, and the default empty state.
- **Every AI message** carries a plain, non-legal-advice disclaimer, cites the row IDs that informed it, and passes an eval gate before ship.
- **Every eligibility answer** is rules-based and reproducible (given inputs X, the engine returns Y, deterministically).
- **Every page** reads at grade 9 per the GOV.UK standard, passes WCAG 2.2 AA, and has been legally reviewed for UDAAP/implied-guarantee drift.
- **Every deploy** is migration-gated, observable, and rollback-able in under 60 seconds.

**Consensus letter-grade target, whole product, v1.0 GA: A / A+.** We leave A++ as the forcing function for the following generation (v1.1–v2).

## 5. The scientific-method template (every scope item conforms)

Every one of the twelve items is written to this exact ten-section structure. Deviation is flagged in the item itself and must justify why.

1. **Finding ID** — `SS-###: short title`. Used in tickets, commits (`SS-007:` prefix), experiments folder, and trust-ledger entries.
2. **Hypothesis** — single falsifiable sentence. If it can't be falsified, it's an opinion — rewrite.
3. **Current state** — file paths, line numbers, measured metrics (or "unmeasured — baseline capture is task 0").
4. **Target state** — specific, illustrated, with a "wow" description AND a quantitative gate.
5. **Top-20 benchmark matrix** — which of the 20 nail this dimension; what we borrow; what we consciously avoid.
6. **Case studies** — 2–3 documented prior-art precedents (name, what changed, measured impact, citation).
7. **Experiment / test design** — what we measure, how, with what tool, with what sample size, at what threshold, with what stop-for-harm trip.
8. **Samples / artifacts** — concrete copy, code, SQL, prompt, wireframe, schema diff. No "something like."
9. **Step-by-step process-flow map** — numbered, assignable, dependency-ordered, estimated in engineer-days.
10. **Success metrics + rollback + ship-block criteria** — the falsifiability backstop. Named SHA to revert to, named threshold to trip, named logbook file to write the outcome into.

## 6. Grading & accountability

- Each item carries a **grade today → grade at ship**. Grades are set by the three relevant panelists (listed in each item's "Owner(s)" field) plus COO ratification.
- A grade *cannot be raised* on opinion alone — only on experiment readout (Section 7 of the item).
- Items can be **downgraded** between reviews if drift is detected. Downgrades are recorded with a date, a reason, and a reopened ticket.

## 7. Ship-block doctrine

No feature development ships until **all P0 items** have hit their target grade. Panel is unanimous on this. The exceptions, and only these:

- Security hotfixes (CVE-class).
- Legal-compliance hotfixes (demand letter, subpoena).
- Scraper data-quality incidents (apply the purge-and-contain playbook in SS-002 §4).

Any other "small exception" goes through COO sign-off in `tracks/COO-track.md` with a written justification. No verbal approvals.

## 8. This document's own change control

- Any item edit is a PR to this branch (`claude/consulting-framework-setup-ibuHt`) or its successor, tagged `scope:SS-###`.
- Version history lives in `git log docs/scope/**`.
- Major revisions (audience mandate expansion, benchmark swaps, template changes) are recorded in `docs/scope/CHANGELOG.md` (created when the first such change lands).
- COO is the final approver on scope changes. CEO is the final approver on tactical execution.
