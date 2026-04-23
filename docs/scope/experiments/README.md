# Experiments — Institutional Memory

Every scope item runs experiments. Every experiment writes its outcome here. This folder is the long-term memory of what we tried, what worked, and what did not — so the 2027 team does not repeat a 2026 failure.

## Conventions

- One file per item: `SS-###-<short-slug>.md`. Append-only. Never rewrite history.
- Every entry is dated, cites a commit SHA, and records raw numbers — not prose conclusions.
- Negative results are as valuable as positive ones. Log them.
- If a PR changes a prompt, a weight, a boost vector, a rubric, or a schema rule, the PR must touch the corresponding experiments file in the same commit. CI will enforce this on the items with a CHANGED-FILES gate.

## Template

```
## <YYYY-MM-DD> — <short title>

- **Hypothesis:** <one falsifiable sentence>
- **Commit:** <SHA>
- **Arms / conditions:** <A = ..., B = ...>
- **Sample size:** <n=...>
- **Results (raw numbers):**
  - metric_1 A vs B: ... vs ... (p = ...)
  - metric_2 A vs B: ... vs ...
- **Conclusion:** <pass / fail / inconclusive>
- **Action:** <what we did next>
```

## Seeded files

- `SS-001-hero.md` — scaffold ready for the first A/B readout.
- `SS-002-scraper-incidents.md` — scaffold + the April 20 incident write-up.
- `SS-012-evals/` — one scorecard per release.

Add more files as items ship their first experiments.
