/**
 * SS-006 §7.1 — worked-example fixtures for the eligibility rules engine.
 *
 * The 27-combination table below is HAND-DERIVED from SS-006 §4 (independent
 * of the implementation — doctrine §1.5: expectations are worked examples,
 * never re-computations through the code under test).
 *
 * Ship-block (SS-006 §10): zero cases where a MUST-No returns anything other
 * than LOW.
 */
import { describe, it, expect } from "vitest";
import {
  scoreEligibility,
  requirementsFromKeyRequirements,
  type EligibilityAnswer,
  type EligibilityRequirement,
  type EligibilityTier,
} from "./eligibility";

const REQS: EligibilityRequirement[] = [
  { id: "m1", tier: "MUST", text: "Registered business in California" },
  { id: "s1", tier: "SHOULD", text: "Fleet of 3 or more vehicles" },
  { id: "p1", tier: "PLUS", text: "Located in a disadvantaged community" },
];

/**
 * Hand-derived expectation table (SS-006 §4):
 *   MUST NO      → LOW, always, regardless of SHOULD/PLUS.
 *   MUST UNSURE  → MEDIUM (needs confirmation), regardless of SHOULD/PLUS.
 *   MUST YES:
 *     SHOULD NO      → MEDIUM (partial match)
 *     SHOULD UNSURE  → MEDIUM (conservative: only all-SHOULD-Yes reaches HIGH)
 *     SHOULD YES     → HIGH
 *   PLUS never changes the tier.
 */
const A: EligibilityAnswer[] = ["YES", "NO", "UNSURE"];
const EXPECTED: Record<EligibilityAnswer, Record<EligibilityAnswer, EligibilityTier>> = {
  NO: { YES: "LOW", NO: "LOW", UNSURE: "LOW" },
  UNSURE: { YES: "MEDIUM", NO: "MEDIUM", UNSURE: "MEDIUM" },
  YES: { YES: "HIGH", NO: "MEDIUM", UNSURE: "MEDIUM" },
};

describe("scoreEligibility — 27-combination MUST×SHOULD×PLUS table", () => {
  for (const m of A) {
    for (const s of A) {
      for (const p of A) {
        const want = EXPECTED[m][s];
        it(`MUST=${m} SHOULD=${s} PLUS=${p} → ${want}`, () => {
          const v = scoreEligibility({ m1: m, s1: s, p1: p }, REQS);
          expect(v.tier).toBe(want);
          // PLUS may never downgrade or upgrade the tier — only plusScore.
          expect(v.plusScore).toBe(p === "YES" ? 1 : 0);
        });
      }
    }
  }
});

describe("scoreEligibility — verdict contents", () => {
  it("MUST-No returns the blocking requirement verbatim, with a plain reason", () => {
    const v = scoreEligibility({ m1: "NO", s1: "YES", p1: "YES" }, REQS);
    expect(v.tier).toBe("LOW");
    expect(v.blocking).toHaveLength(1);
    expect(v.blocking[0].id).toBe("m1");
    expect(v.reasons).toEqual([
      "Does not meet requirement: Registered business in California",
    ]);
  });

  it("multiple MUST-No are all surfaced as blocking", () => {
    const reqs: EligibilityRequirement[] = [
      { id: "m1", tier: "MUST", text: "A" },
      { id: "m2", tier: "MUST", text: "B" },
      { id: "m3", tier: "MUST", text: "C" },
    ];
    const v = scoreEligibility({ m1: "NO", m2: "NO", m3: "YES" }, reqs);
    expect(v.tier).toBe("LOW");
    expect(v.blocking.map((r) => r.id)).toEqual(["m1", "m2"]);
    expect(v.reasons).toHaveLength(2);
  });

  it("MUST-Unsure yields MEDIUM with a needs-confirmation reason and no blocking", () => {
    const v = scoreEligibility({ m1: "UNSURE", s1: "YES", p1: "NO" }, REQS);
    expect(v.tier).toBe("MEDIUM");
    expect(v.blocking).toHaveLength(0);
    expect(v.reasons).toEqual([
      "Needs confirmation: Registered business in California",
    ]);
  });

  it("SHOULD-No yields MEDIUM with a partial-match reason", () => {
    const v = scoreEligibility({ m1: "YES", s1: "NO", p1: "YES" }, REQS);
    expect(v.tier).toBe("MEDIUM");
    expect(v.reasons).toEqual(["Partially matches (Fleet of 3 or more vehicles)"]);
  });

  it("all-MUST catalog (today's conservative default) phrases the HIGH reason without 'preferred'", () => {
    const reqs = requirementsFromKeyRequirements(["A", "B"], 5);
    const v = scoreEligibility({ "req-0": "YES", "req-1": "YES" }, reqs);
    expect(v.tier).toBe("HIGH");
    expect(v.reasons).toEqual(["All mandatory requirements met"]);
  });

  it("mixed catalog phrases the HIGH reason with 'preferred'", () => {
    const v = scoreEligibility({ m1: "YES", s1: "YES", p1: "NO" }, REQS);
    expect(v.tier).toBe("HIGH");
    expect(v.reasons).toEqual(["All mandatory and preferred requirements met"]);
  });
});

describe("scoreEligibility — incompleteness honesty", () => {
  it("no verdict (tier=null) while answers are incomplete and nothing disqualifies", () => {
    const v = scoreEligibility({ m1: "YES" }, REQS);
    expect(v.tier).toBeNull();
    expect(v.pending.map((r) => r.id)).toEqual(["s1", "p1"]);
  });

  it("a MUST-No short-circuits to LOW even when other answers are missing", () => {
    const v = scoreEligibility({ m1: "NO" }, REQS);
    expect(v.tier).toBe("LOW");
    expect(v.pending.map((r) => r.id)).toEqual(["s1", "p1"]);
  });

  it("null and undefined answers are both treated as unanswered", () => {
    const v = scoreEligibility({ m1: null, s1: undefined, p1: "YES" }, REQS);
    expect(v.tier).toBeNull();
    expect(v.pending.map((r) => r.id)).toEqual(["m1", "s1"]);
  });

  it("empty requirement list yields an immediate (vacuous) HIGH with no pending", () => {
    const v = scoreEligibility({}, []);
    expect(v.tier).toBe("HIGH");
    expect(v.pending).toHaveLength(0);
  });
});

describe("scoreEligibility — the exact scar that motivated SS-006 (LESSONS #14)", () => {
  it("3 Yes + 1 No + 1 Unsure on five mandatory requirements is LOW, never a 'medium match'", () => {
    const reqs = requirementsFromKeyRequirements(["A", "B", "C", "D", "E"], 5);
    const v = scoreEligibility(
      { "req-0": "YES", "req-1": "YES", "req-2": "YES", "req-3": "NO", "req-4": "UNSURE" },
      reqs
    );
    expect(v.tier).toBe("LOW"); // the ratio model said 60% / MEDIUM here
    expect(v.blocking.map((r) => r.text)).toEqual(["D"]);
  });

  it("determinism: identical inputs give identical verdicts", () => {
    const answers = { m1: "YES", s1: "NO", p1: "UNSURE" } as const;
    expect(scoreEligibility(answers, REQS)).toEqual(scoreEligibility(answers, REQS));
  });
});

describe("requirementsFromKeyRequirements", () => {
  it("maps every entry to a MUST with stable ids, respecting the limit", () => {
    const reqs = requirementsFromKeyRequirements(["A", "B", "C"], 2);
    expect(reqs).toEqual([
      { id: "req-0", tier: "MUST", text: "A" },
      { id: "req-1", tier: "MUST", text: "B" },
    ]);
  });
});
