/**
 * SS-006 — Deterministic eligibility rules engine.
 *
 * Replaces the ratio model (`yesCount / questions.length`) that mathematically
 * lied on compound requirements: 3 Yes + 1 No on five mandatory requirements
 * used to render "MEDIUM confidence" while the applicant could not win the
 * award. LESSONS.md #14.
 *
 * Three-tier requirement model (SS-006 §4):
 *   MUST   — mandatory; any "NO" is disqualifying → LOW, stated plainly.
 *   SHOULD — expected; a "NO" (or unconfirmed) moves the verdict down to MEDIUM.
 *   PLUS   — preferential; never downgrades, "YES" answers break ties between
 *            HIGH matches via `plusScore`.
 *
 * This is a pure function: given the same answers and requirements it always
 * returns the same verdict (doctrine: eligibility answers are rules-based and
 * reproducible). It performs no I/O and cannot corrupt state — the SS-006 §10
 * rollback story depends on that property.
 *
 * Until the `IncentiveRequirement` table + SME tiering land (SS-006 §9 steps
 * 1–2), requirements are derived from `keyRequirements` with the spec's
 * conservative default: every requirement is MUST (see DECISIONS.md
 * 2026-07-11). The engine already supports all three tiers so the data can be
 * upgraded without touching this logic.
 */

export type EligibilityAnswer = "YES" | "NO" | "UNSURE";
export type EligibilityTier = "HIGH" | "MEDIUM" | "LOW";
export type RequirementTier = "MUST" | "SHOULD" | "PLUS";

export interface EligibilityRequirement {
  id: string;
  tier: RequirementTier;
  /** Plain-language requirement the user answers YES/NO/UNSURE against. */
  text: string;
  /** Optional glossary/tooltip text (SS-006 case study B). */
  explainer?: string;
}

export interface EligibilityVerdict {
  /**
   * null = "can't tell yet": not every requirement is answered AND no
   * disqualifying MUST-NO exists. A MUST-NO short-circuits to LOW immediately
   * — the verdict is already determined, so we do not make the user answer
   * the remaining questions before telling them the truth.
   */
  tier: EligibilityTier | null;
  /** Human-readable, per-requirement reasons behind the verdict. */
  reasons: string[];
  /** MUST requirements answered NO — the disqualifiers, surfaced verbatim. */
  blocking: EligibilityRequirement[];
  /** Requirements not yet answered (empty once complete). */
  pending: EligibilityRequirement[];
  /** Count of PLUS requirements answered YES — sub-tier sort key only. */
  plusScore: number;
}

export function scoreEligibility(
  answers: Record<string, EligibilityAnswer | null | undefined>,
  requirements: EligibilityRequirement[]
): EligibilityVerdict {
  const must = requirements.filter((r) => r.tier === "MUST");
  const should = requirements.filter((r) => r.tier === "SHOULD");
  const plus = requirements.filter((r) => r.tier === "PLUS");

  const pending = requirements.filter((r) => answers[r.id] == null);
  const plusScore = plus.filter((r) => answers[r.id] === "YES").length;

  // 1. Any MUST answered NO is disqualifying — even before completion.
  const mustNo = must.filter((r) => answers[r.id] === "NO");
  if (mustNo.length > 0) {
    return {
      tier: "LOW",
      reasons: mustNo.map((r) => `Does not meet requirement: ${r.text}`),
      blocking: mustNo,
      pending,
      plusScore,
    };
  }

  // 2. Otherwise no verdict until every requirement is answered.
  if (pending.length > 0) {
    return { tier: null, reasons: [], blocking: [], pending, plusScore };
  }

  // 3. MUST answered UNSURE → MEDIUM, pending confirmation.
  const mustUnsure = must.filter((r) => answers[r.id] === "UNSURE");
  if (mustUnsure.length > 0) {
    return {
      tier: "MEDIUM",
      reasons: mustUnsure.map((r) => `Needs confirmation: ${r.text}`),
      blocking: [],
      pending: [],
      plusScore,
    };
  }

  // 4. SHOULD answered NO or UNSURE → MEDIUM. (Spec defines SHOULD-NO; an
  //    unconfirmed SHOULD is treated the same, conservatively — "all SHOULD
  //    Yes" is the only path to HIGH.)
  const shouldNotMet = should.filter((r) => answers[r.id] !== "YES");
  if (shouldNotMet.length > 0) {
    return {
      tier: "MEDIUM",
      reasons: shouldNotMet.map((r) =>
        answers[r.id] === "NO"
          ? `Partially matches (${r.text})`
          : `Needs confirmation: ${r.text}`
      ),
      blocking: [],
      pending: [],
      plusScore,
    };
  }

  // 5. All MUST yes, all SHOULD yes → HIGH.
  return {
    tier: "HIGH",
    reasons: [
      should.length > 0
        ? "All mandatory and preferred requirements met"
        : "All mandatory requirements met",
    ],
    blocking: [],
    pending: [],
    plusScore,
  };
}

/**
 * SS-006 §9 step 2 conservative default: until per-requirement SME tiering
 * exists, every `keyRequirements` entry is a MUST. Deriving them here (rather
 * than persisting a table of all-MUST rows) keeps the future migration a pure
 * data upgrade — the engine and UI do not change when real tiers arrive.
 */
export function requirementsFromKeyRequirements(
  keyRequirements: string[],
  limit: number
): EligibilityRequirement[] {
  return keyRequirements.slice(0, limit).map((text, i) => ({
    id: `req-${i}`,
    tier: "MUST" as const,
    text,
  }));
}
