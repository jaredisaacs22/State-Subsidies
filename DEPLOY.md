# Deploy Guide — Production Setup

End-to-end checklist for getting StateSubsidies.com running on Vercel with
GitHub Actions for scraping and DB initialization. Follow in order.

---

## 1 — Database (Vercel Postgres or Neon)

In Vercel dashboard:
1. **Storage** → **Create** → **Postgres** (free tier works for dev/staging)
2. Connect it to your project. Vercel will auto-set:
   - `DATABASE_URL` (pooled)
   - `POSTGRES_URL_NON_POOLING` (direct/unpooled)

You will copy `POSTGRES_URL_NON_POOLING` into a separate var named
`DATABASE_URL_UNPOOLED` in steps 2 and 3 below. Direct/unpooled is required
for `prisma migrate deploy` because migrations need a real connection
(the pooler does not allow DDL).

---

## 2 — Vercel environment variables

Settings → Environment Variables. Add to **Production** *and* **Preview**:

| Name                   | Value                                              | Required |
|------------------------|----------------------------------------------------|----------|
| `DATABASE_URL`         | pooled Postgres URL (auto-set by Vercel Postgres)  | yes      |
| `DATABASE_URL_UNPOOLED`| copy of `POSTGRES_URL_NON_POOLING`                 | yes      |
| `ANTHROPIC_API_KEY`    | from console.anthropic.com → API Keys              | yes for AI advisor |
| `DASHBOARD_SECRET`     | random string; gates `/api/analytics`              | yes      |
| `UPSTASH_REDIS_REST_URL`   | from console.upstash.com → Redis → REST API    | optional |
| `UPSTASH_REDIS_REST_TOKEN` | "                                              | optional |

`DATABASE_URL_UNPOOLED` powers the `vercel-build` step in `package.json`
which runs `prisma migrate deploy` automatically on every Vercel deploy.

---

## 3 — GitHub Actions secrets

Settings → Secrets and variables → **Actions** → Repository secrets.

| Name                   | Used by                                                 |
|------------------------|---------------------------------------------------------|
| `DATABASE_URL_UNPOOLED`| `db-init.yml`, `migrate-baseline.yml`, `scraper.yml`    |
| `ANTHROPIC_API_KEY`    | `scraper.yml` (enrichment), `ai-eval.yml`               |
| `ANTHROPIC_API_KEY_EVAL` | `ai-eval.yml` (separate key for eval gate)            |
| `VERCEL_TOKEN`         | `set-vercel-env.yml` (optional — only if you use it)    |
| `VERCEL_SCOPE`         | "                                                       |

The Initialize Database workflow (`Actions` → `Initialize Database` →
`Run workflow`) requires `DATABASE_URL_UNPOOLED`. Without it, the first
diagnostic step fails fast with a clear error message.

---

## 4 — One-time database baseline (only if Postgres was set up via `db push`)

If your production DB was created via `prisma db push` rather than
`prisma migrate deploy`, the `_prisma_migrations` table is empty and
`migrate deploy` will try to re-run `0_init` on existing tables and fail.

Run **once**:
```
GitHub → Actions → Migrate Baseline (one-time) → Run workflow
```
This marks `0_init` as already-applied. Subsequent migrations
(`1_add_scrape_run`, `2_add_provenance`, …) flow through normally.

---

## 5 — Initialize / reseed the database

```
GitHub → Actions → Initialize Database → Run workflow
```

Applies any pending migrations and re-runs `prisma/seed.ts`. Idempotent —
safe to re-run; migrations are append-only and the seed uses upsert.

---

## 6 — Local development

```bash
git clone https://github.com/jaredisaacs22/state-subsidies
cd state-subsidies
cp .env.example .env
# fill in DATABASE_URL, DATABASE_URL_UNPOOLED, ANTHROPIC_API_KEY, DASHBOARD_SECRET
npm install
npm run db:generate
npm run db:migrate          # applies migrations using DATABASE_URL_UNPOOLED
npm run db:seed
npm run dev                 # http://localhost:3000
```

---

## 7 — Sanity checklist after first deploy

- [ ] Vercel build log shows `Applying migration` lines (or "No pending migrations")
- [ ] `/api/health` returns 200
- [ ] `/api/incentives` returns a non-empty list
- [ ] Trust Ribbon on the homepage shows a non-zero `.gov` source count
- [ ] AI advisor responds (POST `/api/chat` with a sample query)

If any of these fail, the most common root causes are:
1. `DATABASE_URL_UNPOOLED` not set in Vercel (build skips migrations silently)
2. `Migrate Baseline` not run on a `db push`-bootstrapped DB
3. `ANTHROPIC_API_KEY` missing or set to placeholder `your_api_key_here`
