# COO Track — Attributed History & Active Workstream

**Identity:** Developer 2 — **COO** (confirmed as core memory, set on 04/21/2026).
**Primary remit:** product-quality supremacy — scope, standards, gates, benchmarks, ship-block discipline.
**Relationship to scope:** authors and owns the scope document at `docs/scope/**`. CEO-track executes against it. Exceptions require COO sign-off.

---

## 1. Attributed history

- **04/21/2026** — established the CEO/COO split as core memory; paused the CEO tactical workstream ("Unlock scrapers + fix Vercel env scope"); mandated that future work pass through a formal scope document with scientific-method rigor.
- **04/21/2026** — ratified the 12-seat consulting panel (Aristov, Whitfield, Raman, Okafor, Meijer, Quiroz, Tanaka, Lindqvist, Reeves, Stein, Okonkwo, Chen) as the standing advisory body. Grades and gates must be signed by the relevant panelists.
- **04/22/2026** — ratified the 20-platform benchmark set (see `../01-benchmarks.md`).
- **04/22/2026** — expanded audience mandate. The product is no longer "for businesses." It serves every U.S. person and entity that may qualify for public funding — individuals, households, students (high school, undergraduate, graduate, postdoctoral), researchers, veterans, seniors, farmers, nonprofits, schools, governments, tribal entities, small businesses, startups, enterprises. This expansion materially rewrites SS-001 (H1 + copy), SS-005 (headline numbers + framing), SS-007 (persona model), and SS-011 (plain language).
- **04/22/2026** — Scope v1.0 authored: `SS-001` through `SS-012` at 10-section rigor; CEO-track and COO-track split; benchmarks ratified; experiments scaffold seeded. Draft PR opened on `claude/consulting-framework-setup-ibuHt`.

## 2. Active workstream — Scope v1.0 to GA gate

**Title:** Drive every P0 scope item to its target grade before any further feature work ships.
**Priority order (as of 04/22/2026):**

1. **SS-002** (scrapers + env) — unblocks data breadth; other items can't reach their targets on a 530-row directory.
2. **SS-012** (eval harness) — required before SS-008 and before any live scraper flip.
3. **SS-010** (build hardening) — coupled with SS-002; must land first to avoid `--accept-data-loss`.
4. **SS-003** (provenance) — schema change; coupled with SS-002 output.
5. **SS-001** (hero + Trust Ribbon) — depends on SS-003 + SS-005.
6. **SS-005** (kill $4.2B+; compute headline numbers) — depends on SS-003.
7. **SS-004** (Methodology page) — depends on SS-003 + SS-005 for definitions.
8. **SS-006** (eligibility rules engine) — depends on SS-003 for requirement tiers.
9. **SS-007** (audience model) — depends on SS-006 for requirement-tier grammar per persona.
10. **SS-008** (AI disclaimer + safety) — depends on SS-006 + SS-012.

P1 items follow:

11. **SS-009** (auth + real backend) — depends on SS-010.
12. **SS-011** (accessibility + legal) — cross-cutting; scans and audits run continuously; final sign-off gates GA.

## 3. Standing orders

- **No feature development** ships until all P0 items hit their target grade. Exceptions: CVE-class security, legal-compliance hotfixes, scraper data-quality incidents.
- **CEO-track may not** unpause the paused scraper workstream without working `SS-002` and with the SS-012 gate in place. Any direct flip back to `SCRAPER_MOCK_MODE=false` without those is treated as an incident.
- **Every claim sentence** on the site is in the copy ledger (`SS-011`) before ship.
- **Every number** is computed + dated + methodology-linked (`SS-005`).
- **Every AI message** carries a disclaimer + at least one row-ID citation (`SS-008`).

## 4. Decision log (COO-ratified decisions)

| Date | Decision | Rationale | Affects |
|---|---|---|---|
| 04/21/2026 | Pause CEO scraper workstream | Tactical work ran ahead of scope | CEO-track, SS-002 |
| 04/21/2026 | Establish 12-seat panel as standing body | Panel owns grades and gates | all items |
| 04/21/2026 | Scope v1.0 must be scientific-method rigor | Grades alone are editorial, not operational | all items |
| 04/22/2026 | Ratify 20-platform benchmark set | Replaces vague "Apple/Merrill" handwave | all items §5 |
| 04/22/2026 | Audience expansion to individuals + students + researchers + households | Current product excludes the majority of potential users | SS-001, SS-005, SS-007, SS-011 |
| 04/22/2026 | Fold CEO scraper work into SS-002 | Unified source of truth | CEO-track, SS-002 |
| 04/22/2026 | Open Scope v1.0 as a draft PR on `claude/consulting-framework-setup-ibuHt` | Scope is the foundation; reviewed before any code | all items |

New decisions appended. Never deleted. A reversal is a new row, not an edit.

## 5. Pending items that require COO sign-off

Tracked here so they don't get lost:

- **Legal retention & entity** for `/methodology#what-we-are` (SS-004). Placeholder text in scope. Okonkwo needs firm answers: (a) legal-entity name operating StateSubsidies.com, (b) registered mailing address, (c) press/corrections email.
- **Baseline metrics window** for SS-001 Task 0 (14-cal-day capture). Start date pending CEO confirmation that Vercel Analytics funnels are instrumented.
- **External accessibility audit firm selection** (SS-011 step 5). Two candidates to be procured; cheaper path may be a Deque.com engagement.
- **Resend vs. SES** for transactional + alert email (SS-009). Recommend Resend for v1 (simpler API, generous free tier). Needs COO approval.
- **Eval-dedicated Anthropic key** for CI (SS-012 cost budget). Procurement + budget sign-off.
- **v1.1 language expansion** — Spanish across core surfaces. Scope reserved; not in v1.0.

## 6. Authority of this file

- COO owns edits.
- Decision log is append-only.
- Any conflict between this file and another instruction is resolved in favor of this file until a new dated entry supersedes it.
