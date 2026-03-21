# Deploy to Vercel — Get Your Public URL in 60 Seconds

## Step 1 — Create a free Vercel account
Go to [vercel.com](https://vercel.com) → Sign Up (free, takes 30 sec)

## Step 2 — Get your Vercel token
Settings → Tokens → Create Token → copy it

## Step 3 — Install Vercel CLI and deploy
```bash
npm install -g vercel
vercel login --token YOUR_TOKEN_HERE
vercel deploy --prod
```

Vercel will give you a URL like: `https://state-subsidies-xyz.vercel.app`

## Step 4 — Set up the database (Vercel Postgres — free tier)
In Vercel dashboard:
1. Storage → Create → Postgres → Free tier
2. Copy `DATABASE_URL` connection string
3. Settings → Environment Variables → Add `DATABASE_URL`

Then push the schema:
```bash
DATABASE_URL="your-postgres-url" npx prisma db push
DATABASE_URL="your-postgres-url" npx ts-node prisma/seed.ts
```

## Step 5 — Enable live background scraping (GitHub Actions)
Push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/state-subsidies.git
git push -u origin main
```

In GitHub repo Settings → Secrets → Add:
- `DATABASE_URL` — your Postgres URL
- `ANTHROPIC_API_KEY` — optional, enables AI enrichment

The `.github/workflows/scraper.yml` runs every 6 hours automatically.

## One-command local run (alternative)
```bash
git clone https://github.com/YOUR_USERNAME/state-subsidies
cd state-subsidies
cp .env.example .env
npm install
npm run db:generate && npm run db:push && npm run db:seed
npm run dev
# → http://localhost:3000
```
