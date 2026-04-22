# SS-007 — Audience Model Overhaul (Collisions Fixed **and** Individuals/Students Added)

**Priority:** P0 · **Owners:** Meijer · Quiroz · Raman · Reeves · **Audit origin:** 3.2, 3.4, rec. #7
**Grade today:** C (audience-collision bug + under-served populations) · **Grade at ship target:** A
**Depends on:** SS-001 (hero copy), SS-006 (requirements tiering gives us the eligibility grammar per persona), SS-011 (plain-language pass).

---

## 1. Finding ID
`SS-007` — audit §3.2 ("H1 quietly excludes nonprofits, schools, farmers, municipalities"); §3.4 (AudienceSelector collisions); rec. #7.

## 2. Hypothesis
*"Replacing the current 8-tile AudienceSelector with a scored persona system covering **18 first-class audiences** — including individuals, students, researchers, households — will (a) raise filter-use rate (≥ 1 persona applied) by ≥ 25%, (b) raise share of visitors who see ≥ 1 result in their own scope on first visit by ≥ 30%, and (c) correct the current collision bug where Nonprofit and Government return identical result sets."*

Negative test: if new personas ship without corresponding programs, users land on empty states. Ship-block includes the "every persona has ≥ 20 real programs in the directory at launch" gate.

## 3. Current state
- `components/AudienceSelector.tsx` defines 8 personas, each mapped to a hard `industryCategory` equality filter.
- Documented collisions:
  - **Nonprofit** and **Government** both filter `industryCategory === "Government & Nonprofit"` → identical result sets. Audit §3.4.
  - **Enterprise** filters federal-only; empirically wrong — enterprises heavily use state + utility programs.
  - **Educator/School** maps to "Education" category; real school programs live across Workforce, Facilities, IRA §179D, Infrastructure, etc.
- **Missing audiences** (per 04/22 COO mandate): Individual, Homeowner, Renter, Student (HS), Student (undergrad), Student (graduate), Student (postdoc / researcher), Veteran, Senior, Low-income household, Tribal individual, Person with disability.
- **Current H1** locks the framing to "business," compounding the exclusion at first paint.

## 4. Target state
**18 first-class audiences**, grouped into 4 meta-audiences for UI density:

| Meta-audience | Personas |
|---|---|
| **People & households** | Individual, Homeowner, Renter, Veteran, Senior, Low-income household, Tribal individual, Person with disability |
| **Students & researchers** | Student — High School · Student — Undergraduate · Student — Graduate · Student/Researcher — Postdoc |
| **Mission & public** | Nonprofit · School district · Municipality/County · Tribal government · State agency |
| **For-profit** | Sole proprietor · Startup · Small business · Mid-market/enterprise · Farmer/agricultural producer |

Each persona carries:
- A **boost vector** over industry/program-type tags (not a hard equality filter).
- A **requirement-tier hint** (e.g., "Individual — income threshold MUST; age SHOULD").
- A **starting question set** for the AI advisor (personalizes intake without being invasive).
- A **copy block** in the empty state ("No matches today for Grad Student in your state. Try federal programs.").

The AudienceSelector is **chooseable, combinable, and learn-while-selected**: choose up to two personas, see matches ranked by summed boosts. Single-select remains the default for simplicity.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 11 | **Zillow** | Saved searches per persona (e.g., "first-time buyer"); filter facets combine smoothly | Combinable persona selections | Their sale-pressure copy |
| 15 | **TurboTax** | "Are you a contractor? Homeowner? Married?" cascaded persona flow | Cascaded intake into the advisor, not a persona grid | Up-sell cross-triggers |
| 2 | **Fidelity** | "Investor, Retiree, Student, Small business" persona hubs, plain-language | Persona hubs as deep-link landings (later, v1.1) | Their page density |
| 16 | **Credit Karma** | Personalized match reasons per product | "Why this matched" per card result | Affiliate bias |
| 8 | **GOV.UK** | Task-first persona routing on homepage ("Find a job," "Get a visa") | Verb-first persona tiles | Monochrome aesthetic |
| 10 | **Data.gov** | Topic-and-audience faceting | Dual-dimension facet (industry × persona) | Data-heavy chrome |

## 6. Case studies
- **A — Benefits.gov persona model.** Multi-persona intake (low-income, veteran, senior, etc.) with a scored questionnaire. Lesson applied: scored boost, not hard filter.
- **B — FAFSA simplification (2023).** Expanded persona types (dependent vs independent, emancipated, homeless) and cut completion time materially. Lesson applied: more audiences, fewer fields each.
- **C — Zillow "first-time buyer" lens (2019).** Adding a first-time-buyer persona that combined filters (affordability, down-payment-assistance programs) raised engagement on that cohort ≥ 30% (Zillow post). Lesson applied: persona as saved-search shortcut.
- **D — Rewiring America household audience.** Personas drive entirely different incentive lists (homeowner vs renter). Lesson applied: persona-driven boost is how we surface renter-specific energy assistance.

## 7. Experiment / test design
- **7.1 — Persona coverage audit (blocking pre-launch).** For each of the 18 personas, confirm ≥ 20 real programs exist in the DB that return for that persona today. Blocker: if any persona has < 20, either (a) scrape to fill, (b) drop the persona to v1.1, or (c) surface a clearly labeled "Coming soon" chip.
- **7.2 — 5-second recognition (n=50).** Show the new AudienceSelector; ask "Can you find yourself here?" Success: ≥ 95% say yes across all personas; failures bucketed by persona.
- **7.3 — Moderated intake (n=15).** Each respondent drawn from a different persona; observe whether the advisor's starting questions feel relevant. Success: ≥ 4.0/5 relevance rating.
- **7.4 — Production A/B (28 days).** Metric: filter-use rate (≥1 persona applied) and "any matches" rate. Threshold: +25% filter use, +30% any-matches.

**Stop-for-harm:** match-click-rate drop > 10% → re-rank boost vectors, not revert.

## 8. Samples / artifacts

### Persona model

```ts
// lib/personas.ts
export type PersonaId =
  | "individual" | "homeowner" | "renter" | "veteran" | "senior"
  | "low_income_household" | "tribal_individual" | "pwd"
  | "student_hs" | "student_ugrad" | "student_grad" | "student_postdoc"
  | "nonprofit" | "school_district" | "municipality" | "tribal_gov" | "state_agency"
  | "sole_prop" | "startup" | "small_business" | "enterprise" | "farmer";

export type IndustryBoost = Record<string, number>; // e.g., { "Workforce": 1.0, "Housing": 0.8 }

export interface Persona {
  id: PersonaId;
  label: string;                    // plain language, grade 9
  meta: "people" | "students" | "mission" | "forprofit";
  shortBlurb: string;
  boost: IndustryBoost;             // multiplicative rank boost on industryCategories
  intakeSeedQuestions: string[];    // AI advisor personalization
  mustRequirements: string[];       // e.g., "age 14+" for student_hs (used by SS-006)
  emptyStateCopy: string;
}
```

### Example persona — Graduate Student (new audience)

```ts
{
  id: "student_grad",
  label: "Graduate student",
  meta: "students",
  shortBlurb: "Grants, fellowships, and loan-forgiveness programs for master's and PhD students.",
  boost: {
    "Research": 1.0,
    "Workforce": 0.7,
    "Education": 1.0,
    "Clean Technology": 0.4,   // NSF GRFP-adjacent
    "Agriculture": 0.3,         // USDA NIFA
    "Housing": 0.4,             // grad-housing assistance
  },
  intakeSeedQuestions: [
    "What's your field of study?",
    "Are you enrolled full-time?",
    "Do you have a research advisor or PI yet?",
  ],
  mustRequirements: ["enrolled at an accredited US institution", "US person or eligible non-citizen"],
  emptyStateCopy:
    "No state-level matches today for graduate students in your state. Federal fellowships (NSF GRFP, Ford Foundation, USDA NIFA) are almost always a starting point.",
}
```

### Ranking (used by both grid and AI advisor)

```ts
function scoreProgram(p: Incentive, persona: Persona): number {
  let s = 1;
  for (const cat of p.industryCategories) s *= persona.boost[cat] ?? 0.5;
  if (p.jurisdictionLevel === "FEDERAL") s *= 1.1;   // federal portability bonus
  if (p.status === "CLOSING_SOON")       s *= 1.05;  // urgency nudge (SS-008-safe)
  return s;
}
```

### AudienceSelector (meta-grouped tab UI, a11y-first)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Who are you?  (choose up to 2)                                       │
│                                                                      │
│  [People & households] [Students & researchers]                       │
│  [Mission & public]    [For-profit]                                   │
│                                                                      │
│  ── People & households ─────────────────────────────────────────     │
│  ⦾ Individual  ⦾ Homeowner  ⦾ Renter  ⦾ Veteran  ⦾ Senior            │
│  ⦾ Low-income household  ⦾ Tribal individual  ⦾ Person with disab.   │
└──────────────────────────────────────────────────────────────────────┘
```

## 9. Step-by-step process-flow map

1. **Finalize persona list + boost vectors** with SME (Quiroz) and plain-language lead (Raman). **Q + Rmn + Rv.** 1 ED.
2. **Persona coverage audit (Test 7.1).** For each persona, confirm ≥ 20 programs. Identify gaps. **H + Q.** 2 ED + 5 cal-days scrape if gaps.
3. **Implement `lib/personas.ts` + `scoreProgram`.** Vitest coverage. **K + E.** 1 ED.
4. **Rewrite `AudienceSelector`** into meta-grouped UI; support up-to-2 multi-select. **A + K.** 1.5 ED.
5. **Wire into `/api/chat`** — selected persona drives `intakeSeedQuestions` and boost in `search_incentives`. **E + K.** 1 ED.
6. **Empty-state copy** per persona; legal review on any income/benefit framing. **Rv + Okon.** 0.5 ED.
7. **5-second + moderated tests (7.2, 7.3).** **Mei.** 5–7 cal-days.
8. **A/B ship (7.4) 28 days.** **K.** 28 cal-days.
9. **Readout** → default-on or iterate. **Panel.** 0.5 ED.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- Every persona has ≥ 20 real programs at launch (or is labeled "coming soon").
- No collision: any two distinct personas return non-identical result sets (CI test).
- Recognition test: 95% find themselves.
- A/B: +25% filter-use rate, +30% any-matches rate.
- No match-click-rate drop > 10%.

**Rollback:** UI flag reverts to old 8-tile; scoring function is pure and can stay; no data migration risk.

**Institutional memory:** `experiments/SS-007-personas.md` — boost vectors are treated as versioned; every change records the prior vector and the metric deltas.
