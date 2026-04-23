# SS-008 — AI Disclaimer on Every Message + Safety Rails on the Advisor

**Priority:** P0 · **Owners:** Okonkwo · Lindqvist · **Audit origin:** 3.3, rec. #8
**Grade today:** C− · **Grade at ship target:** A
**Depends on:** SS-003 (per-row citations), SS-006 (deterministic eligibility), SS-011 (plain-language floor), SS-012 (eval harness).

---

## 1. Finding ID
`SS-008` — audit §3.3 (AI advisor), rec. #8.

## 2. Hypothesis
*"Adding a per-message disclaimer, per-claim row-ID citations, model-output safety rails (no legal/tax/financial advice, no guarantee of outcome), and abuse/cost guardrails will (a) reduce legal exposure to ≤ 0 standing counsel concerns by ship, (b) raise user-reported trust of the advisor from an unmeasured baseline to ≥ 4.2/5, and (c) eliminate the current prompt conflict between 'rate HIGH/MEDIUM/LOW' and 'do NOT describe programs in your text response.'"*

Negative test: if the per-message disclaimer harms conversation feel (< 4.0/5 on an unobtrusiveness scale), we move it to a sticky footer strip and re-test.

## 3. Current state
- `BusinessIntakeChat` — Claude Sonnet 4.6 via `@ai-sdk/anthropic`; one tool (`search_incentives`); `stepCountIs(4)` cap; `localStorage` session.
- **Prompt conflict** (Quiroz's finding, audit §3.3): system prompt asks the model to produce tier ratings, while the presentation prompt forbids describing individual programs. Output is therefore inconsistent.
- **No per-message disclaimer** — the model regularly says "you likely qualify for…" without counsel-approved hedging.
- **No citations** — the model paraphrases DB rows but does not print the row IDs. Users cannot audit claims.
- **No abuse / rate limiting** on `/api/chat`; no per-session token budget; no cost kill-switch.
- **`AI not configured` fallback** exposes the literal env-var name in the UI — a production-quality smell (audit §3.3).
- **`aria-live`** correct; cursor `::after { content: "▋" }` reads as a literal character in some screen readers.

## 4. Target state
- **Per-message disclaimer** rendered inline on every assistant turn: *"Informational, not legal or tax advice. Programs change; always confirm on the source page."* Paired with a `role="note"` for assistive tech.
- **Row-ID citations** printed in small type after every factual claim: *"([ID-12A](/incentives/energy-smart-homes))"*. When multiple, grouped. Implementation: the tool output returns IDs; the model is instructed to cite them; post-processing renders them as links.
- **Model-output safety rails** (system prompt):
  - Never use the words "guaranteed," "you will get," "approved."
  - Always attribute eligibility determinations to the SS-006 deterministic engine, not the model.
  - On detection of legal/tax questions ("can I sue," "what's my tax liability"), route to a canned response + link to SS-004.
- **Prompt-conflict fix.** Two modes, each with one consistent prompt:
  - **Quick.** Short, outcome-oriented; names programs, does not tier.
  - **Tailored.** Walks through requirements; surfaces tier per program via SS-006 engine (not via the model).
- **Abuse rails:** per-IP token budget (default 20k tokens / 24h; configurable); `/api/chat` Edge middleware with a soft 429 + CAPTCHA fallback; daily cost ceiling tripwire (`MAX_DAILY_CLAUDE_SPEND_USD`) that disables chat + shows a graceful degraded state.
- **A11y:** replace streaming-cursor character with an animated span + `aria-hidden="true"`; group chips have `<ul role="group" aria-label="Follow-up suggestions">`.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 15 | **TurboTax** | "Answers here are informational. Your preparer must review." on every AI suggestion | Same disclaimer register | TurboTax upsell flows |
| 16 | **Credit Karma** | Product cards always state "Why we matched this" with an audit link | Same citation discipline | Affiliate-first reasoning bias |
| 1 | **Merrill** | Every advisor output is accompanied by a disclosure + link to methodology | Per-message disclaimer + SS-004 link | Regulated-advisor regime (we are not a broker) |
| 7 | **USAspending.gov** | Claims are linked to primary sources | Per-claim citation to row ID | Rigid federal tone |
| 5 | **Stripe Docs** | When AI help is offered, it cites doc sections with link | Same pattern — cite the row as the source section | Over-reliance on AI for critical answers |

## 6. Case studies
- **A — AI in financial chat (Bank of America Erica, 2018+).** Every Erica response carries "I'm not a financial advisor" caveats. Bank reported this reduced escalation to live reps (not advisor confusion). Lesson applied: disclaimers do not kill conversion.
- **B — Klarna AI customer-service rollout (2024).** Cost savings reported; safety rails (no promises, route to human on edge cases) cited as critical. Lesson applied: human-route fallback via SS-009 (contact form).
- **C — OpenAI ChatGPT post-2023 safety rails.** Refusal patterns for legal/medical questions, with links to professional sources. Lesson applied: canned reroute on legal/tax prompts.
- **D — Our own audit (OKONKWO-01).** Counsel's flag: per-message disclaimer is not optional. We are exposed today.

## 7. Experiment / test design
- **7.1 — SS-012 eval set (100 persona × scenario pairs).** Gate: every prompt change must pass the eval set with ≥ 90% on accuracy + 100% on safety rubric (no prohibited words, every claim cites at least one row ID).
- **7.2 — Legal review (binding).** Okonkwo signs off on prompts + disclaimer copy.
- **7.3 — Moderated trust test (n=15).** Users converse with advisor; rate trust + unobtrusiveness of disclaimer (1–5). Success: trust ≥ 4.2; unobtrusiveness ≥ 4.0.
- **7.4 — Abuse load test.** Simulate 10k requests/hour from 50 IPs; confirm 429 behavior + CAPTCHA fallback; confirm cost-ceiling kill-switch fires.

**Stop-for-harm:** safety rubric < 100% → no ship, period. This is the one hard gate in the scope document.

## 8. Samples / artifacts

### Per-message disclaimer component

```tsx
// components/AIDisclaimer.tsx
export function AIDisclaimer() {
  return (
    <p role="note" className="mt-1 text-[11px] text-slate-500">
      Informational, not legal or tax advice. Programs change; always confirm on the source page.
      {" "}
      <a href="/methodology#ai-advisor" className="underline">How we built this.</a>
    </p>
  );
}
```

Rendered once per assistant message, below the last token of stream.

### System prompt (v2) — Quick mode

```
You are the StateSubsidies advisor. You help people, households, students, farmers, nonprofits,
schools, governments, and businesses find public funding programs they may qualify for.

Rules you must follow:
1. Never say "guaranteed," "you will get," "approved," "pre-approved," or "qualify for" as an
   absolute. Use "plausibly qualify for" or "may qualify for".
2. Every factual claim about a program must cite the program's row ID in the tool output.
3. You do not produce HIGH/MEDIUM/LOW eligibility tiers; the deterministic engine does that and
   its output is appended to the tool result. You present what the engine says; you do not
   override it.
4. If the user asks a legal, tax, or financial-advice question, respond with the canned
   reroute and link to /methodology#ai-advisor.
5. Keep responses to ≤ 6 sentences in Quick mode. Surface programs by name; link each.
```

### Tailored-mode delta

```
Additional Tailored rules:
- Walk the user through requirements one at a time, using the starting questions from the
  selected persona (SS-007).
- After three answered requirements, run the deterministic engine (SS-006) and present its
  tier verdict with reasons. Do not infer a tier yourself.
```

### Canned reroute

> *"This sounds like a legal or tax question. I'm not a lawyer, accountant, or financial advisor, and can't answer it responsibly. A starting point: [Methodology](/methodology#ai-advisor) explains what I can and can't do. If you'd like, I can continue helping you find public funding programs — just say the word."*

### Abuse rails (Edge middleware)

```ts
// middleware.ts (excerpt)
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "24h"),   // messages per IP per 24h (configurable)
  prefix: "chat-rate",
});

// also: enforce MAX_DAILY_CLAUDE_SPEND_USD by reading a daily counter in redis;
// if exceeded, return 503 with JSON { degraded: true, retryAt: <tomorrow> }.
```

### `AI not configured` fallback — quieter UI

Replace the env-var-exposing text with:

> *"AI suggestions are temporarily unavailable. You can still search and filter the full directory below."*

## 9. Step-by-step process-flow map

1. **Draft v2 system prompts** (Quick + Tailored). **E + Q.** 1 ED.
2. **Disclaimer component + a11y review.** **A + Rmn.** 0.5 ED.
3. **Row-ID citation rendering** (post-process model output to wrap IDs as `<Link>`). **E + K.** 1 ED.
4. **Deterministic engine passthrough** (SS-006 integration). **E + K.** 0.5 ED (if SS-006 landed).
5. **Abuse rails** (Upstash rate-limit + cost ceiling). **K.** 1 ED.
6. **Canned reroute** and a11y fixes (cursor char, chip grouping). **A + K.** 0.5 ED.
7. **SS-012 eval run** — must pass 90% accuracy + 100% safety. **E.** (gated by SS-012).
8. **Legal review.** **Okon.** 1 ED. Binding.
9. **Moderated trust test (7.3).** **Mei.** 3 cal-days.
10. **Ship + abuse load test in staging.** **K.** 0.5 ED.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- 100% safety-rubric pass on SS-012 eval.
- Legal sign-off (binding).
- Trust ≥ 4.2/5; unobtrusiveness ≥ 4.0/5.
- Abuse-load test: 429 fires correctly; cost ceiling disables chat gracefully.
- Every production assistant message carries the disclaimer + cites at least one row ID when making a factual claim.

**Rollback:** feature-flag-controlled; reverts to pre-SS-008 chat path in one toggle. System prompt changes are version-pinned in code.

**Institutional memory:** `experiments/SS-008-advisor-safety.md` — every prompt revision appends its eval results and a diff summary.
