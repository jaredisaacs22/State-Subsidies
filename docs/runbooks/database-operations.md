# Runbook — Database Operations

## Connection scoping (get this wrong and jobs fail confusingly)

| Env var | What | Used by |
|---|---|---|
| `DATABASE_URL` | **Pooled** (pgbouncer, `-pooler` host) | App runtime, API routes |
| `DATABASE_URL_UNPOOLED` | **Direct**, port 5432 | Migrations, seeds, bulk scraper writes, backfills |

`scrapers/db_writer.py` guards against accidentally receiving a `-pooler` URL. If a migration or
bulk job hangs or errors on prepared statements, the first suspect is pooled-URL misuse
(LESSONS #9).

## Schema changes

1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <descriptive-name>` against a dev DB — the migration file
   ships **in the same PR** (CI drift-gate blocks otherwise).
3. Production applies automatically via `vercel-build` (`migrate deploy` with the unpooled URL).
4. **Never** `prisma db push` against any shared database. `--accept-data-loss` is banned
   forever (LESSONS #10).
5. Write migrations backward-compatible with the currently-serving code (additive first,
   destructive only after the code that stops reading the old shape is live) — this is what
   keeps `rollback.md` a real path.

## Seeds and backfills

- Seeds are idempotent and **assert expected row counts** at the end (LESSONS #4 — a silent
  import bug once dropped 32 programs).
- Seed rows must carry provenance that distinguishes them from scraped rows, forever
  (doctrine §1.7).
- Backfills (`prisma/backfill-*.ts`) run with the unpooled URL, batched (doctrine §1.9), with a
  count-before / count-after log line.
- Startup self-healing (`instrumentation.ts`) exists but is a transitional pattern — verify its
  log line actually fires after any deploy touching it (LESSONS #11); long-term it moves to
  explicit workflows (GAP-B6).

## One-time workflows (GitHub Actions, manual dispatch)

- `migrate-baseline.yml` — one-time baseline for an existing DB (idempotent).
- `db-init.yml` — initialize + seed. Requires `DATABASE_URL_UNPOOLED` in Actions secrets.
Run order for a fresh environment: Migrate Baseline → Initialize Database → scraper workflow.
