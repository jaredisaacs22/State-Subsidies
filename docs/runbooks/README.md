# Runbooks

Operational procedures encoded as scripts-in-prose, not memory. Doctrine §5.1: a verification
or recovery path that lives only in someone's head is a rumor. After every use of a runbook,
improve it in the same session.

| Runbook | When |
|---|---|
| `deploy-verification.md` | After every production deploy — "deployed" means this passed |
| `scraper-incident-purge-and-contain.md` | Bad data reached the live directory |
| `database-operations.md` | Migrations, seeds, backfills, connection scoping |
| `rollback.md` | A deploy must be reverted — read it BEFORE you need it; drill quarterly |

Related, lives with its scope item: the per-source scraper promotion ladder at
`docs/scope/items/SS-002-promotion-checklist.md`.
