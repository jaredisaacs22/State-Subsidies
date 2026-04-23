# StateSubsidies.com — Official Scope Document v1.0

**Status:** Pre-POC baseline of record
**Date of record:** April 21, 2026
**Branch of record:** `claude/consulting-framework-setup-ibuHt`
**Authoring mandate:** COO-track (Developer 2)
**Supersedes:** ad-hoc audit letters, panel chatter, and anything produced before this document's date.

---

## What this document is

A pre-proof-of-concept scope of record. It exists so that, six months from now, we can answer any question of the form *"did we intend that?"* by pointing at a file.

It is the single source of truth for:

1. **Current-state reality on 04/21/2026** — measured where possible, documented where not.
2. **Target-state ambition** — A++ world-class, world-renowned; the global leader in *"what public money is available to me and how do I actually get it."*
3. **The falsifiable path from A → B** — every finding becomes a reproducible experiment, not an opinion.
4. **Audience mandate** — this is not a small-business tool. It serves **every U.S. person and entity** that may qualify for public funding: individuals, households, students (high school, undergrad, graduate, postdoc), researchers, farmers, nonprofits, school districts, tribal entities, municipalities, small businesses, startups, enterprises, governments. The directory and the UX must reflect that on every surface.
5. **Trust bar** — we will ship no sentence, number, or claim the brand cannot back with a citation, a date, and a reviewer.

## How to read it

- `00-overview.md` — Current state, target vision, audience mandate, grading framework, ship-block doctrine.
- `01-benchmarks.md` — The ratified top-20 benchmark set, cross-referenced by dimension.
- `items/SS-001` through `items/SS-012` — **Twelve scope items**, each written to the same ten-section scientific-method template (see template in `00-overview.md §5`). These are the "do-not-ship-more-features-until" list from the 04/21 audit, elevated from opinion to specification.
- `tracks/CEO-track.md` — attributed history + active workstream for Developer 1.
- `tracks/COO-track.md` — attributed history + active workstream for Developer 2. This track holds the product-quality mandate.
- `experiments/` — per-item experiment logs once testing begins. Currently seeded with a scaffold for SS-001.

## Scope items at a glance

| ID | Title | Audit origin | Priority | Owner(s) |
|---|---|---|---|---|
| [SS-001](items/SS-001-hero-and-trust-ribbon.md) | Hero + persistent Trust Ribbon rebuild (includes audience-neutral H1) | 3.1, 3.2, rec. #5 | P0 | Aristov · Reeves · Kenji · Okonkwo |
| [SS-002](items/SS-002-scraper-revalidation.md) | Scraper re-validation + Vercel env scope fix (CEO-track, folded in) | 3.11, rec. #1 | P0 | Chen · Tanaka · Quiroz · Lindqvist |
| [SS-003](items/SS-003-provenance-schema.md) | Provenance schema + per-row citation UX | 3.8, 3.11, rec. #2 | P0 | Chen · Okafor · Aristov |
| [SS-004](items/SS-004-methodology-page.md) | Methodology page (single canonical URL) | 3.1, 4, rec. #3 | P0 | Okonkwo · Reeves · Stein |
| [SS-005](items/SS-005-directory-numbers.md) | Kill hard-coded $4.2B+; compute every headline number from the DB | 3.2, 4, rec. #4 | P0 | Chen · Whitfield · Okafor |
| [SS-006](items/SS-006-eligibility-rules-engine.md) | Eligibility Checker: ratio → rules engine | 3.6, rec. #6 | P0 | Quiroz · Lindqvist · Raman |
| [SS-007](items/SS-007-audience-model.md) | Audience model overhaul — collisions fixed **and** individuals/students added | 3.2, 3.4, rec. #7 | P0 | Meijer · Quiroz · Raman · Reeves |
| [SS-008](items/SS-008-ai-disclaimer-and-safety.md) | AI disclaimer on every message + safety rails on the advisor | 3.3, rec. #8 | P0 | Okonkwo · Lindqvist |
| [SS-009](items/SS-009-auth-bookmarks-alerts.md) | Real backend for saved programs, alerts, and accounts (auth + sync) | 3.5, 3.9, rec. #9 | P1 | Tanaka · Whitfield · Okonkwo |
| [SS-010](items/SS-010-build-and-release-hardening.md) | Build & release hardening (remove `--accept-data-loss`; migrations; observability) | 3.12, rec. #10 | P1 | Tanaka · Chen |
| [SS-011](items/SS-011-accessibility-and-legal.md) | WCAG 2.2 AA audit + plain-language + legal/UDAAP pass across the product | 3.1, 3.3, 3.6, rec. #11 | P1 | Raman · Okonkwo · Reeves |
| [SS-012](items/SS-012-ai-eval-harness.md) | AI eval harness — 200-persona golden set gates every prompt/model change | 3.3, 3.11, rec. #12 | P0 | Lindqvist · Quiroz |

P0 = ship-block. P1 = ship concurrently but can follow P0 by no more than 14 days.

## Authority

This document is the product-quality supremacy track. When any subsequent instruction conflicts with a specification here, the specification wins until this document is explicitly revised with a dated entry. Tactical (CEO-track) work does not override strategic (COO-track) quality gates without a written exception recorded in `tracks/COO-track.md`.

Panel sign-off: Aristov · Whitfield · Raman · Okafor · Meijer · Quiroz · Tanaka · Lindqvist · Reeves · Stein · Okonkwo · Chen — April 21, 2026.
