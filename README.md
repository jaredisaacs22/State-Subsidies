# StateSubsidies.com — Public Funding Discovery Platform

A web application for discovering, filtering, and understanding government grants, tax credits, rebates, vouchers, and loans — for **every U.S. person and entity** (individuals, students, farmers, nonprofits, public entities, and businesses) at the Federal, State, City, and Agency levels. Mission priority: **Trust → Accuracy → Delight** (see `docs/scope/00-overview.md`).

## Start here (docs map)

| Doc | What it is |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Repo law — read-first order, hard rules, session protocol |
| [`ROADMAP.md`](ROADMAP.md) | Every workstream: status, next increment, acceptance criteria |
| [`docs/doctrine/`](docs/doctrine/) | Engineering doctrine + dated gap analysis |
| [`docs/memory/`](docs/memory/) | HANDOFF (current state) · LESSONS (scars) · DECISIONS |
| [`docs/runbooks/`](docs/runbooks/) | Deploy verification · scraper incident · DB ops · rollback |
| [`docs/scope/`](docs/scope/) | Scope of record — SS-001…SS-012 specifications |
| [`DEPLOY.md`](DEPLOY.md) | Environment variables, secrets, first-deploy checklist |
| [`.claude/agents/`](.claude/agents/) | Review/audit agent definitions |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma |
| Database | PostgreSQL (Vercel Postgres / Neon) |
| Scrapers | Python 3 + BeautifulSoup4 + Playwright |
| Icons | Lucide React |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

### 3. Configure environment

Edit `.env` and set:
- `DATABASE_URL` — your PostgreSQL connection string (pooled)
- `DATABASE_URL_UNPOOLED` — direct (non-pooled) connection (required for migrations)
- `ANTHROPIC_API_KEY` — enables the AI advisor chat feature

### 4. Initialize database and seed

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # apply migrations (requires DATABASE_URL_UNPOOLED)
npm run db:seed       # seed example incentive records
```

### 5. Run the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Database Schema

The core `Incentive` model captures:

| Field | Type | Notes |
|---|---|---|
| `title` | String | Program name |
| `jurisdictionLevel` | Enum | FEDERAL / STATE / CITY / AGENCY |
| `jurisdictionName` | String | e.g. "California" |
| `managingAgency` | String | e.g. "CARB", "DOE" |
| `shortSummary` | String | 2–3 sentence description |
| `keyRequirements` | JSON String | Parsed as `string[]` |
| `industryCategories` | JSON String | Parsed as `string[]` |
| `incentiveType` | Enum | GRANT / TAX_CREDIT / POINT_OF_SALE_REBATE / SUBSIDY / LOAN / VOUCHER |
| `fundingAmount` | Float? | Max USD |
| `deadline` | DateTime? | Application close date |
| `sourceUrl` | String | Official .gov URL |
| `status` | Enum | ACTIVE / CLOSED / UPCOMING / SUSPENDED |

SS-003 provenance fields: `sourceDomain`, `parseConfidence` (HIGH/MEDIUM/LOW), `sourceHash`, `firstSeenAt`, `lastSeenAt`, `lastVerifiedAt/By`.

---

## Seeded Mock Data

| Program | Agency | Type | Max Funding |
|---|---|---|---|
| WAZIP Off-Road Equipment Replacement | Valley Air District | Voucher | $500K |
| CARB HVIP Zero-Emission Trucks | CARB | Point-of-Sale Rebate | $300K |
| IRA Section 48C Advanced Energy Tax Credit | DOE / IRS | Tax Credit | Varies |
| CalTrans CORE Zero-Emission Transit | CalTrans | Grant | $25M |

---

## Scraper Architecture

```
scrapers/
├── __init__.py
├── models.py              # Pydantic ScrapedIncentive model
├── base_scraper.py        # Abstract base with HTTP/Playwright/retry/logging
├── caltrans_core_scraper.py   # CalTrans CORE page parser
├── wazip_scraper.py       # Valley Air WAZIP page parser
├── runner.py              # CLI runner
└── requirements.txt
```

### Running scrapers

```bash
cd scrapers
pip install -r requirements.txt

# Mock mode (no HTTP — uses bundled HTML fixtures)
python -m scrapers.runner --mock

# Specific scraper
python -m scrapers.runner --scraper wazip --mock

# Live mode + output to JSON
python -m scrapers.runner --live --output incentives.json
```

### Adding a new scraper

1. Create `scrapers/my_agency_scraper.py`
2. Extend `BaseScraper`
3. Set `SOURCE_NAME` and `BASE_URL`
4. Implement `scrape() → list[ScrapedIncentive]`
5. Register in `scrapers/runner.py` `SCRAPERS` dict

---

## Project Structure

```
State-Subsidies/
├── app/
│   ├── layout.tsx               # Root layout + header/footer
│   ├── page.tsx                 # Main search/filter dashboard
│   ├── globals.css
│   ├── api/
│   │   └── incentives/
│   │       ├── route.ts         # GET /api/incentives (list + filter)
│   │       └── [slug]/route.ts  # GET /api/incentives/:slug (detail)
│   └── incentives/
│       └── [slug]/page.tsx      # Incentive detail page
├── components/
│   ├── Badge.tsx                # IncentiveTypeBadge, JurisdictionBadge
│   ├── FilterBar.tsx            # Filter dropdowns + sort
│   ├── IncentiveCard.tsx        # Search result card
│   ├── ResultsGrid.tsx          # Grid + skeleton loading
│   └── SearchBar.tsx            # Search input
├── lib/
│   ├── db.ts                    # Prisma client singleton
│   ├── types.ts                 # Shared TypeScript types + display maps
│   └── utils.ts                 # formatCurrency, formatDeadline, etc.
├── prisma/
│   ├── schema.prisma            # DB schema
│   └── seed.ts                  # Seed script (4 realistic examples)
├── scrapers/
│   ├── base_scraper.py
│   ├── caltrans_core_scraper.py
│   ├── wazip_scraper.py
│   ├── runner.py
│   ├── models.py
│   └── requirements.txt
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Roadmap

The living roadmap is [`ROADMAP.md`](ROADMAP.md) — themed workstreams with verified statuses and
acceptance criteria, updated in the same PR as any change to reality. (The checklist that used to
live here had drifted stale — several items it listed as todo shipped months ago. Per doctrine
§6.4, stale docs get fixed on sight; this pointer is the fix.)
