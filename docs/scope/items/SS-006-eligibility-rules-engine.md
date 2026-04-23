# SS-006 — Eligibility Checker: Ratio → Rules Engine

**Priority:** P0 · **Owners:** Quiroz · Lindqvist · Raman · **Audit origin:** 3.6, rec. #6
**Grade today:** C+ (mathematically misleading in compound-eligibility cases) · **Grade at ship target:** A
**Depends on:** SS-003 (structured requirements per row), SS-008 (safety disclaimer on any eligibility output), SS-011 (plain-language pass on all question text), SS-012 (eval harness includes eligibility regressions).

---

## 1. Finding ID
`SS-006` — audit §3.6 ("`yesCount / questions.length` is simplistic to the point of misleading"); rec. #6.

## 2. Hypothesis
*"Replacing the ratio model with an explicit rules engine (MUST / SHOULD / PLUS tiering + deterministic HIGH/MEDIUM/LOW output) will (a) correctly reject any answer pattern where a MUST requirement is marked No, (b) raise self-reported confidence in the checker from a baseline we capture to ≥ 4.2/5, and (c) reduce 'I applied and was told I didn't qualify' negative feedback by ≥ 50% over 180 days."*

Negative test: if users abandon the checker at a higher rate because rule-based answers feel "stricter," we soften copy, not math.

## 3. Current state
- `components/IncentiveCard.tsx` computes: `yesCount / questions.length` → % → bucketed to HIGH (≥75%), MEDIUM (≥50%), LOW (<50%).
- In practice, this means: 3 Yes + 1 No + 1 Unsure on a 5-question compound requirement (all of which are mandatory) returns *MEDIUM confidence*. That is factually wrong and actively harmful — the user may spend hours on an application they cannot win.
- Questions are the first 5 strings of `keyRequirements` — the same flat JSON-string blob today (SS-003 fixes the storage; SS-006 adds structure).
- Disclaimer is 9px italic. Okonkwo's grade: C.

## 4. Target state
Three-tier requirement model per row:

- **MUST** — mandatory; any "No" → LOW (disqualifying, stated plainly).
- **SHOULD** — expected; a "No" on a SHOULD moves confidence down one tier.
- **PLUS** — preferential; a "No" on a PLUS does not downgrade, but "Yes" on PLUSes upgrades inside a tier (tie-break).

Deterministic output function `scoreEligibility(answers, requirements) → { tier, reasons, blocking }`:

- If any MUST is No → `tier = LOW`, `blocking = [must_id…]`. UX shows *"You don't currently qualify because: X, Y."*
- Else if any MUST is Unsure → `tier = MEDIUM`, `reasons = ["We couldn't confirm X"]`. UX shows *"Likely match, pending: X."*
- Else (all MUST Yes):
  - Count SHOULD-No: if ≥ 1 → `tier = MEDIUM`.
  - Else if all SHOULD Yes → `tier = HIGH`.
- PLUS answers shift sub-tier only (used to sort multiple HIGH matches).

Reasons are human-readable and surfaced *per requirement*. Disclaimer upgraded to ≥ 14px (SS-011 sets the floor) and visible above the tier verdict.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 15 | **TurboTax** | Each step is a rule-checked gate; copy is empathetic but rules are strict | Empathetic copy + strict rules | TurboTax upsell UX |
| 16 | **Credit Karma** | *"Why this matched"* inline reasoning on every product match | Reasons array on every tier output | Their ad-driven ranking |
| 17 | **Rewiring America IRA Calculator** | Deterministic rebate eligibility with reasons on every answer | Same deterministic register | Dollar-estimate framing (we list programs, not promise $) |
| 2 | **Fidelity** | Plain-language requirement lists with glossary overlays | Glossary overlays on each requirement | Their deep-product UX complexity |
| 13 | **Google Flights** | Compound filters return "0 results" gracefully with specific "why" | Our LOW verdict copy is the same shape | Counterfactual suggestion rabbit-holes |

## 6. Case studies
- **A — Healthcare.gov eligibility engine (post-2014).** Rule-engine design with deterministic output. Lesson applied: deterministic, testable logic.
- **B — TurboTax "Why we asked" tooltip pattern.** Each question links to a micro-explanation of the underlying tax rule. Lesson applied: glossary overlay per requirement.
- **C — IRS Interactive Tax Assistant (ITA).** Path-based rule trees with disclaimers at each branching decision. Lesson applied: branching disclaimers by tier.
- **D — Rewiring America "IRA Savings Calculator" (2023).** Rule-based eligibility with reasons array (e.g., *"You do not qualify because your AMI is above 150%"*). Lesson applied: the reasons-array output shape is directly transferable.

## 7. Experiment / test design
- **7.1 — Unit tests (Vitest).** 40+ fixtures covering MUST/SHOULD/PLUS permutations. 100% must pass; one fail blocks ship.
- **7.2 — Golden program suite (n=20).** Twenty real programs tagged by Quiroz with ground-truth requirement tiers. Run the engine against canonical applicant profiles; expected outputs checked. Gated in CI.
- **7.3 — Moderated usability (n=15).** Users answer the checker; interviewer asks *"Do you believe the verdict? Why?"* Success: ≥ 4.2/5 self-reported confidence.
- **7.4 — A/B in production (28 days).** Metric: check-completion rate (starts → finishes the checker). Threshold: no drop > 10%.

**Stop-for-harm:** check-start drops > 15% → soften copy (not logic) and re-run.

## 8. Samples / artifacts

### Requirement model (couples with SS-003 schema changes)

```prisma
model IncentiveRequirement {
  id          String              @id @default(cuid())
  incentiveId String
  incentive   Incentive           @relation(fields: [incentiveId], references: [id])
  tier        RequirementTier     // MUST | SHOULD | PLUS
  text        String              // plain-language question
  explainer   String?             // glossary / tooltip text
  sort        Int                 @default(0)
  @@index([incentiveId, sort])
}

enum RequirementTier {
  MUST
  SHOULD
  PLUS
}
```

### Rules engine

```ts
// lib/eligibility.ts
type Answer = "YES" | "NO" | "UNSURE";

export type Tier = "HIGH" | "MEDIUM" | "LOW";

export function scoreEligibility(
  answers: Record<string, Answer>,
  requirements: IncentiveRequirement[],
): { tier: Tier; reasons: string[]; blocking: IncentiveRequirement[] } {
  const must = requirements.filter(r => r.tier === "MUST");
  const should = requirements.filter(r => r.tier === "SHOULD");

  const mustNo = must.filter(r => answers[r.id] === "NO");
  if (mustNo.length) return {
    tier: "LOW",
    reasons: mustNo.map(r => `Does not meet requirement: ${r.text}`),
    blocking: mustNo,
  };

  const mustUnsure = must.filter(r => answers[r.id] === "UNSURE");
  if (mustUnsure.length) return {
    tier: "MEDIUM",
    reasons: mustUnsure.map(r => `Needs confirmation: ${r.text}`),
    blocking: [],
  };

  const shouldNo = should.filter(r => answers[r.id] === "NO");
  if (shouldNo.length) return {
    tier: "MEDIUM",
    reasons: shouldNo.map(r => `Partially matches (${r.text})`),
    blocking: [],
  };

  return { tier: "HIGH", reasons: ["All mandatory and preferred requirements met"], blocking: [] };
}
```

### UX copy — LOW verdict (legal-reviewable)

> *"You don't currently qualify because: **income above threshold**, **business not registered in CA**. Programs change; recheck when your circumstances do. Not legal or tax advice. [Methodology](/methodology#how-we-verify)"*

### UX copy — HIGH verdict

> *"Likely match. All mandatory and preferred requirements are met based on your answers. The program's administering agency makes the final call. Not legal or tax advice. [Methodology](/methodology#how-we-verify)"*

## 9. Step-by-step process-flow map

1. **Schema migration** for `IncentiveRequirement` (coupled with SS-003). **K.** 0.5 ED.
2. **Backfill existing rows** — migrate current `keyRequirements` string arrays to MUST (conservative default); flag MEDIUM/LOW parse confidence for human review. **H + Q.** 1 ED + 3 cal-days SME review.
3. **Implement `scoreEligibility`** + 40 fixtures. **E + Q.** 1 ED.
4. **Update `IncentiveCard` checker UI** to reasons-array output. **A + K.** 1 ED.
5. **Plain-language pass** on all requirement text (SS-011 couples). **Rmn.** 1 ED.
6. **Legal copy review** on LOW/MEDIUM/HIGH default text. **Okon.** 0.5 ED. Binding.
7. **Golden-suite test (7.2)** wired into CI. **E + Q.** 0.5 ED.
8. **Moderated usability (7.3)**. **Mei + Rmn.** 5 cal-days.
9. **A/B ship (7.4) 28 days.** **K.** 28 cal-days.
10. **Readout → default-on or iterate.** **Panel.** 0.5 ED.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- 100% unit + golden-suite pass in CI.
- Zero cases in the golden suite where a MUST-No returns anything other than LOW.
- Moderated confidence ≥ 4.2/5.
- No > 10% drop in check-completion rate.

**Rollback:** UI-only flag; engine stays. Engine is a pure function; it cannot corrupt state. Reverts in < 60 s.

**Institutional memory:** `experiments/SS-006-eligibility.md` — every time the engine changes, we re-run the golden suite and append the delta.
