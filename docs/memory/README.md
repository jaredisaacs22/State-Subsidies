# docs/memory — The Institutional Memory System

**Why this exists:** context that lives only in a chat session dies with it. The strongest
finding across the five engineering retrospectives this repo's doctrine was distilled from
(2026-07-11) was that a disciplined handoff + lessons + decisions memory is what let 39 days of
development survive crashes, context clears, and week-long gaps "with no hiccups" — and that
hindsight documents should never have to be *reconstructed* because the losses ledger was
maintained continuously.

## The three files

| File | What it is | Update cadence |
|---|---|---|
| `HANDOFF.md` | Current state of the whole project: what's live, what's in flight, next steps, blocked-on-owner list. **The first thing every session reads.** | Every session close, no exceptions |
| `LESSONS.md` | Append-only losses ledger: every incident/scar, its one-line mechanism, and the test/gate/runbook that pins it. | The moment a scar happens — not at retro time |
| `DECISIONS.md` | Append-only decision log: dated engineering decisions with reasons, so divergence is deliberate and revisitable. | When a decision is made |

## Rules

1. **HANDOFF.md describes reality, not aspiration.** Verify its claims against `git log` and the
   live site at session open before trusting them; fix drift immediately.
2. **LESSONS entries are never deleted** — superseded entries get a dated "closed by" note.
3. **A lesson without a pin is unfinished.** Every LESSONS row names the test, gate, or runbook
   that makes recurrence mechanical to catch.
4. Dated session narratives (when needed beyond the handoff) go to `docs/scope/sessions/` —
   this folder holds only the three living files.
