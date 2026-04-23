# SS-004 — Methodology Page (Single Canonical URL)

**Priority:** P0 · **Owners:** Okonkwo · Reeves · Stein · **Audit origin:** 3.1, §4, rec. #3
**Grade today:** F (does not exist) · **Grade at ship target:** A−
**Depends on:** SS-002 (ingest cadence), SS-003 (confidence rubric), SS-005 (number computation rules).

---

## 1. Finding ID
`SS-004` — audit §4 ("A Methodology page" — *"the single cheapest trust intervention you can ship"*).

## 2. Hypothesis
*"Shipping a permanent `/methodology` page linked from every footer and every provenance panel will, within 90 days, (a) become the second-most-visited non-results page on the site, (b) be cited in at least three external publications about public funding directories, and (c) reduce 'is this site legit?' support queries by ≥ 50%."*

Negative test: if `/methodology` averages < 1% of visits to `/`, we are under-surfacing it — not over-producing it.

## 3. Current state
- Page does not exist.
- Disclaimers are fragmentary: footer copyright, fine-print in `IncentiveCard` eligibility checker, ambient `BusinessIntakeChat` system prompt.
- No single URL we can cite to a reporter, a regulator, or a partner agency.

## 4. Target state
A single static URL (`/methodology`) with eight canonical sections, each linkable by fragment:

1. `#what-we-are` — *"Independent directory. Not a government website."* + who runs it (org, contact, physical address for legal sufficiency).
2. `#what-we-promise` — the brand promise sentence from `00-overview.md §1`; what we do not promise (outcome guarantee).
3. `#sources` — live list of every source domain we ingest, last-successful-scrape timestamp per source, per-source parse-confidence distribution.
4. `#how-we-verify` — the confidence rubric (HIGH/MEDIUM/LOW definitions from SS-003); human-review policy; review cadence.
5. `#how-we-count` — definition of every headline number on `/` (SS-005). E.g., *"Active" means (`status = ACTIVE` AND `applicationDeadline > today`)*. Query SQL referenced inline.
6. `#corrections` — how users report errors (link to form from SS-009); SLA to acknowledge + correct; public incident log (every purge or re-ingest event).
7. `#ai-advisor` — what the AI does (Claude Sonnet 4.6 via `@ai-sdk/anthropic`); what it doesn't do (give legal/tax advice); how citations to DB rows work; our eval-harness grade (SS-012).
8. `#privacy-and-independence` — data collection (Vercel Analytics + Postgres event table), no third-party ad trackers, no affiliate kickbacks, no government sponsorship.

Every section is writable by panelists and each is reviewed by Okonkwo before ship.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 7 | **USAspending.gov** | Dedicated About + Data Sources pages; every figure footnoted to it | Structure: methodology as the spine | Overly bureaucratic tone |
| 18 | **NerdWallet** | Dedicated "How NerdWallet makes money" + "How we review products" | "How we make money" section (applies even if the answer is "donations/ads-off") | Marketing-adjacent "trust copy" that doesn't commit |
| 16 | **Credit Karma** | Disclosures of credit-score methodology linked from every score display | Linked-from-source-of-claim pattern | Their dense legalese |
| 8 | **GOV.UK** | Plain-language service patterns docs | Grade-9 plain-language throughout | GOV.UK's monochrome visual register |
| 7 | **USAspending.gov (data-quality incidents log)** | Public incident log | `#corrections` public incident log | Nothing — this is the gold standard |

## 6. Case studies
- **A — USAspending.gov "Data Lab" methodology hub.** Regularly cited by academics and journalists. Lesson applied: methodology as a *product surface*, not a compliance afterthought.
- **B — NerdWallet "How NerdWallet works" page (2018 redesign).** After launch, publications linked to it instead of to the product; earned authority bar rose. Lesson applied: a well-produced methodology page is SEO authority.
- **C — The New York Times Corrections section.** Public, standing, with date + what changed. Lesson applied: our `#corrections` incident log including the April 20 Grants.gov purge.
- **D — ProPublica methodology boxes.** Every long-form piece has a short methodology box explaining data sources. Lesson applied: condensed methodology teaser on every page's footer, expanded on the full page.

## 7. Experiment / test design
- **7.1 — Comprehension test (n=20).** Show the page for 90 seconds → ask "What is the site? Who runs it? What do they promise?" Success: > 80% answer correctly in their own words.
- **7.2 — SEO authority check (90 days).** Target: at least 3 inbound links from domains ≥ DA50 (any outlet, advocacy org, or .gov landing that references our methodology).
- **7.3 — Footer CTR.** Baseline footer-link CTR vs. current (nothing compelling there now) vs. with Methodology link. Success: Methodology is top-3 footer link by click-rate.

**Stop-for-harm:** none expected. This is a near-pure upside addition.

## 8. Samples / artifacts

### Folder structure

```
app/
  methodology/
    page.tsx          — assembles the eight sections as an MDX or TSX composition
    sections/
      WhatWeAre.tsx
      WhatWePromise.tsx
      Sources.tsx     — fetches live source list from Prisma at build + ISR
      HowWeVerify.tsx
      HowWeCount.tsx
      Corrections.tsx
      AiAdvisor.tsx
      Privacy.tsx
```

### Sample `#what-we-are` copy (legal-review candidate)

> *"StateSubsidies.com is an independent, non-profit directory of public funding programs available to people, households, students, farmers, nonprofits, schools, governments, and businesses in the United States. We are **not** a government website, **not** affiliated with any federal or state agency, and **not** compensated by any program we list.*
>
> *The directory is operated by {legal_entity}, {mailing_address}. Questions, corrections, and press: {email}. Our methodology is public and versioned on {repo_url}."*

### Sample `#what-we-promise`

> *"We will show you every public program for which you plausibly qualify, across every state, agency, and level of government, updated on a cadence we publish, with source links, free forever. We will not hide a program from you because of commercial interest; we do not take commercial interest. We will not guarantee you get the money — no one responsibly can — but we will guarantee we won't hide a program from you."*

### Sample `#how-we-count` (matches SS-005 rules)

> *"'Active programs' means the row's status is `ACTIVE` **and** the application deadline is after today, computed against the database at query time, cached 5 minutes. 'Verified' means the row's parse confidence is HIGH **and** a human reviewer has signed off within the last 180 days (see §how-we-verify). The 'updated X ago' timestamp in the Trust Ribbon is the finish time of the most recent successful scrape run across all sources (see §sources for the per-source table)."*

### Sample `#corrections` incident log entry

> *"**April 20, 2026 — Grants.gov boilerplate incident.** Scraper regression caused ~21 rows to be inserted with the title prefix 'Federal grant opportunity:' and category 'General Business.' All affected rows were purged within 6 hours of detection (commit `13535fe`). All live scrapers were re-locked to mock mode pending quality-gate upgrades (SS-002). Root cause: source-specific prefix filter not present at the time of the schema-driven release. Status: contained; re-qualification in progress."*

## 9. Step-by-step process-flow map

1. **Outline + section owners** (panel). 0.5 ED.
2. **Draft each section** (owners). 2 ED total.
3. **Legal review** (Okonkwo). **Binding gate.** 1 ED.
4. **Build `app/methodology/page.tsx`** with ISR (`revalidate = 3600`). Pulls live source list + incident log. **K.** 1 ED.
5. **Wire footer link site-wide** + Trust Ribbon link (SS-001) + provenance panel link (SS-003). **K.** 0.5 ED.
6. **Comprehension test (Test 7.1).** **Mei.** 3 cal-days.
7. **Ship.** **K.** 0.25 ED.
8. **Monitor** (Test 7.2, 7.3). **St + K.** 90 cal-days.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- Legal sign-off (binding).
- Comprehension test ≥ 80% correct recall.
- All eight canonical sections present and non-empty.
- Every P0-item-visible claim on the rest of the site links back here.

**Rollback:** near-zero risk. If we decide to restructure, we revise — we do not unpublish.

**Institutional memory:** every future scope change that alters a claim on `/methodology` must update `/methodology` in the same PR. A test in CI will assert `/methodology` was touched whenever `app/**` or `lib/stats.ts` changes.
