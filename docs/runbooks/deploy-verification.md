# Runbook — Deploy Verification Liturgy

**When:** after EVERY production deploy (merge to `main` → Vercel build).
**Law:** "deployed" is a claim about the running artifact, not about a green workflow. Two
platforms in our doctrine's source retrospectives shipped stale/broken artifacts behind green
workflows. Do not skip steps because the deploy "was small."

## Steps

1. **Confirm the build:** Vercel dashboard (or `vercel-deploy.yml` run) shows the new deployment
   Ready, and the deployment's commit SHA matches the merge commit you expect.
2. **Probe health at the artifact:**
   ```bash
   curl -s https://<production-domain>/api/health | jq .
   ```
   Assert: HTTP 200 · `dbReachable: true` · `commit` matches the merged SHA · `dbLatencyMs` sane.
   If `commit` is stale, the deploy you're looking at is not the deploy that's serving. Stop and
   find out why before anything else.
3. **Load one real page** (not just the home skeleton): a program detail page
   (`/incentives/<known-slug>`). Assert it renders program data, provenance panel present, no
   visible "null"/placeholder text.
4. **Check headline stats are sane and dated:** home stats strip renders DB-computed values
   (no `$XB+` literals — CI gates this, but verify the values didn't zero out), and
   `/api/stats` returns non-empty.
5. **Check data recency:** `/api/stats/last-scrape` returns a plausible timestamp.
6. **If the deploy included a migration:** spot-check the affected model via a page that reads
   it (never via `db push`/studio against prod).
7. **Record it:** one line in the session close / `HANDOFF.md` — "deploy `<sha>` verified:
   health ✓ page ✓ stats ✓".

## On any failure

- Do not iterate on prod. Go to `rollback.md` if user-facing, or fix-forward only if the failure
  is cosmetic AND the fix is one commit.
- Append the incident to `docs/memory/LESSONS.md` with its mechanism and pin.

## End state (Theme H)

This liturgy becomes an automated post-deploy GitHub Actions job (probe + assert + annotate the
run). Until that exists, the human liturgy is mandatory.
