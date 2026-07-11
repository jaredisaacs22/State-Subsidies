# Runbook — Rollback

**Law (doctrine §5.2):** an untested rollback recipe is a rumor. One source-retrospective
platform discovered its documented rollback was dead — artifacts purged — during a night-time
production incident. Drill this quarterly; record each drill date at the bottom.

## Code rollback (Vercel)

1. Vercel dashboard → Project → Deployments → select the last known-good deployment →
   **"Instant Rollback"** (or Promote to Production). This re-serves the previous immutable
   build — no rebuild, seconds.
2. Immediately run `deploy-verification.md` against the rolled-back artifact (health probe must
   show the OLD commit SHA — that's the proof).
3. Vercel retains prior deployments; still, confirm during each drill that the target
   deployment is actually promotable (retention policies are exactly what killed the
   rumor-rollback elsewhere).

## The migration caveat (read before rolling back)

Rolling back code does NOT roll back the schema. This is survivable **only** if migrations
follow the backward-compatibility rule in `database-operations.md` (additive first). Before any
rollback:

- Did the bad deploy include a migration? `git log --oneline -- prisma/migrations` between the
  two SHAs.
- **Additive migration** (new nullable column/table): roll back code freely; old code ignores
  the new shape.
- **Destructive/renaming migration:** rolling back code against the new schema may 500. Options,
  in order: fix-forward with a hotfix; apply a compensating additive migration restoring the old
  shape; only then consider down-migration (Prisma has no automatic down — it's a hand-written
  compensating migration, on the unpooled URL, tested against a copy first).

## Data rollback

There is no whole-DB time travel in our setup (Neon branching exists — evaluate during a drill).
Data incidents are handled surgically by provenance predicate:
`scraper-incident-purge-and-contain.md`.

## After any rollback

- Change narrative if user-visible numbers/behavior moved (doctrine §3.2).
- LESSONS.md entry: mechanism + pin.
- The bad commit gets its failing test before it ships again.

## Drill log

| Date | Who | Rolled back to | Result / recipe fixes |
|---|---|---|---|
| — | — | — | **No drill performed yet — first drill is a blocked-on-owner item** |
