# SS-006 — Eligibility Engine Experiment Log

Per SS-006 §10: every time the engine changes, re-run the fixture suite and append the delta.

## 2026-07-11 — Engine v1 ships (ratio model retired)

- `lib/eligibility.ts`: deterministic `scoreEligibility` per SS-006 §8 — MUST/SHOULD/PLUS,
  reasons array, blocking array, `plusScore` tie-break, MUST-No short-circuit, incomplete
  answers ⇒ honest null verdict. Pure function, no I/O.
- Spec gap resolved: SHOULD answered UNSURE (undefined in §4) treated as not-met ⇒ MEDIUM
  ("only all-SHOULD-Yes reaches HIGH"), conservatively.
- `components/EligibilityChecker.tsx`: percentage/score UI removed entirely; verdict + reasons
  + disclaimer-above-verdict per §8 copy shapes. Requirements derive from `keyRequirements`
  as all-MUST (§9 step 2 conservative default; DECISIONS.md 2026-07-11).
- Fixtures: 40/40 pass (`lib/eligibility.test.ts`, vitest, CI-gated) — includes the full
  hand-derived 27-combination MUST×SHOULD×PLUS table and the motivating scar case
  (3 Yes + 1 No + 1 Unsure on mandatory requirements ⇒ LOW; ratio model said MEDIUM).
- §10 ship-block status: unit suite ✅ in CI · MUST-No⇒LOW invariant ✅ pinned ·
  golden program suite (n=20, SME-tagged) ⏸ blocked on SME hours · moderated usability ⏸ ·
  legal copy review ⏸ owner to arrange · A/B ⏸.
