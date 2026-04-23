# SS-011 — WCAG 2.2 AA + Plain-Language + Legal/UDAAP Pass

**Priority:** P1 · **Owners:** Raman · Okonkwo · Reeves · **Audit origin:** 3.1, 3.3, 3.6, rec. #11
**Grade today:** C+ (partial aria; 9px disclaimers; no formal audit) · **Grade at ship target:** A (AA-compliant + legal sign-off)
**Depends on:** all user-facing items (SS-001, SS-003, SS-004, SS-005, SS-006, SS-007, SS-008, SS-009).

---

## 1. Finding ID
`SS-011` — audit §§3.1, 3.3, 3.6; rec. #11.

## 2. Hypothesis
*"A dedicated accessibility + plain-language + UDAAP audit, followed by the remediations it surfaces, will (a) clear WCAG 2.2 AA site-wide, (b) achieve reading age ≤ grade 9 on all core surfaces, (c) produce a legal sign-off on every outcome-implying sentence, and (d) reduce tickets labeled 'I couldn't use/understand this' by ≥ 70%."*

Binary gate: no item ships to GA until this audit is green across its surface.

## 3. Current state
- **aria-*** mostly present on interactive controls. `aria-live="polite"` on chat log is correct.
- **Missing:** skip link in `<main>`; chip group labels; some icon-only buttons lack `aria-label`; streaming cursor reads literal character (SS-008 fix).
- **Contrast:** navy palette checks out at the shell level; slate-500 on white fails AA in several copy blocks (verify with automated scan).
- **Reading age:** uncomputed today. Eligibility checker prose, AI system prompt, and hero subcopy skew ~grade 11–12 by informal read — too high.
- **Disclaimers:** 9px italic at the bottom of eligibility checker; 9px in footer; no per-AI-message disclaimer today (SS-008).
- **Implied guarantees:** current H1, $4.2B+ figure, and advisor outputs all drift toward implied guarantees (Okonkwo's standing flag).
- **No formal accessibility audit** has been commissioned.
- **No legal retention opinion** exists; the site claims "Not a government website" only in the footer.

## 4. Target state
- **WCAG 2.2 AA site-wide**, certified by an external auditor (firm or consultant). Remediations tracked in `docs/scope/experiments/SS-011-a11y.md`.
- **Plain-language rule: all core surfaces at reading age ≤ grade 9** per Flesch–Kincaid (measured via CI script `scripts/grade-level.ts`). Exceptions: legal text (explicitly waived), advanced reference docs (clearly labeled).
- **Disclaimer floor:** ≥ 14px on any eligibility tier result, AI message, or stats strip claim. Color contrast ≥ 4.5:1.
- **Legal/UDAAP pass on every outcome-implying sentence.** A copy ledger at `docs/scope/experiments/SS-011-legal.md` tracks every claim sentence site-wide, the reviewer, the date, and the sign-off.
- **Language expansion plan (v1.1):** Spanish translations for every core surface. Not in v1.0 scope but reserved on the roadmap.
- **Assistive-tech QA matrix:** VoiceOver (Safari), NVDA (Firefox), JAWS (Chrome), TalkBack (Chrome mobile), VoiceOver iOS. Matrix of tested tasks per surface.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 6 | **login.gov** | WCAG 2.2 AA+, Section 508, plain language | AA+ target | Federal-scale bureaucracy |
| 8 | **GOV.UK** | Grade-9 reading-age rule; service-patterns library | Reading-age CI gate; service-patterns mindset | Monochrome chrome |
| 9 | **Canada.ca** | Plain writing SC standard; bilingual precision | Plain-writing rubric | Bilingual rollout overhead in v1.0 |
| 1 | **Merrill** | Outcome-implication review on every marketing asset | Copy-ledger discipline | Regulated-advisor tooling |
| 2 | **Fidelity** | Glossary overlays on finance jargon | Glossary-overlay pattern (ties to SS-006 requirement tooltips) | Finance-product density |

## 6. Case studies
- **A — GOV.UK reading-age standard (post-2012).** Set an explicit grade-9 target; measurable impact on service completion rates. Lesson applied directly.
- **B — Target.com 2006 NFB lawsuit.** Failure to meet web accessibility cost $6M settlement and years of remediation. Lesson applied: audit is cheaper than settlement.
- **C — CFPB UDAAP examples (public).** Cases where outcome-implying copy cost firms millions in fines. Lesson applied: copy-ledger discipline.
- **D — Apple accessibility standards.** Visible, shipped, tracked in release notes. Lesson applied: public accessibility statement on `/methodology#a11y` (new subsection).

## 7. Experiment / test design
- **7.1 — Automated scan.** Axe-core + Pa11y on every pull request. CI gate: zero AA violations on touched routes.
- **7.2 — Assistive-tech walkthrough (binding).** Two independent sessions per surface, one with NVDA/Firefox, one with VoiceOver/Safari. Pass criterion: every core task completable without visual feedback.
- **7.3 — Reading-age CI.** `scripts/grade-level.ts` computes Flesch–Kincaid for every MDX/TSX core surface; fails > grade 9.
- **7.4 — Moderated users with disabilities (n=6).** Two users from three disability types (low vision, motor, cognitive). Task: complete an intake and save a program. Success: all complete in < 5 minutes unaided.
- **7.5 — External audit sign-off (binding).** Commissioned firm produces a formal report. Every finding triaged to P0/P1/P2; P0s gate GA.

**Stop-for-harm:** any P0 audit finding open → no GA.

## 8. Samples / artifacts

### `scripts/grade-level.ts` (skeleton)

```ts
// scripts/grade-level.ts
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { fleschKincaid } from "flesch-kincaid";

const ROUTES = ["app/page.tsx", "app/methodology/page.tsx", "components/IncentiveCard.tsx"];
const LIMIT = 9;

let failed = 0;
for (const route of ROUTES) {
  const text = stripCode(readFileSync(route, "utf8"));
  const grade = fleschKincaid(text);
  const ok = grade <= LIMIT;
  console.log(`${ok ? "OK " : "FAIL"} ${route} — grade ${grade.toFixed(1)}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
```

### Copy ledger entry shape

```
┌─ SS-011 Copy Ledger ─────────────────────────────────────────────┐
│ ID     Location                   Claim                   Reviewer  Date        Sign-off │
│ L-001  app/page.tsx:263           H1 variant A             Okon      2026-04-24  PASS    │
│ L-002  components/IncentiveCard   LOW verdict copy         Okon      2026-04-25  PASS    │
│ L-003  BusinessIntakeChat system  "plausibly qualify for"  Okon      2026-04-25  PASS    │
│ L-004  TrustRibbon                "verified programs"      Okon      2026-04-24  PASS    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Skip link

```tsx
// app/layout.tsx (near top of <body>)
<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white p-2 border">
  Skip to main content
</a>
...
<main id="main">
  {children}
</main>
```

### Contrast + disclaimer floor (Tailwind tokens)

```ts
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    fontSize: {
      "legal": ["14px", { lineHeight: "1.5" }], // 9px era is over
    },
    textColor: {
      "legal": "#334155",   // slate-700; AA against white
    },
  },
}
```

## 9. Step-by-step process-flow map

1. **Automated scan in CI** (Axe + Pa11y). **K.** 0.5 ED.
2. **Grade-level CI script + thresholds.** **K + Rmn.** 0.5 ED.
3. **Initial remediations** (skip link, chip group labels, aria-labels, disclaimer sizing). **A + K.** 1.5 ED.
4. **Copy ledger created + seeded** with every current claim sentence. **Rv + Okon.** 1 ED.
5. **Commission external audit firm.** **COO.** 2 cal-days procurement + 2–4 weeks audit.
6. **Assistive-tech walkthroughs (Test 7.2).** **Rmn + Mei.** 3 cal-days.
7. **Moderated users with disabilities (Test 7.4).** **Rmn.** 5 cal-days.
8. **Remediate P0 audit findings.** **K + A + Rv.** as found; GA-blocking.
9. **Publish public accessibility statement** at `/methodology#a11y`. **Okon + Rv.** 0.5 ED.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- CI accessibility scan: zero AA violations on touched routes.
- External audit: zero open P0 findings.
- Reading-age CI: every core surface ≤ grade 9.
- Copy ledger: every outcome-implying sentence has a PASS.
- Assistive-tech matrix: 100% task completion.

**Rollback:** this item produces gates, not shipable UI. Failure to complete is a work continuation.

**Institutional memory:** `experiments/SS-011-a11y.md` + `experiments/SS-011-legal.md` — live logs updated with every audit and every copy-change PR.
