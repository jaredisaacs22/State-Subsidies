# SS-003 — Provenance Schema + Per-Row Citation UX

**Priority:** P0 · **Owners:** Chen · Okafor · Aristov · **Audit origin:** 3.8, 3.11, rec. #2
**Grade today:** C− · **Grade at ship target:** A
**Depends on:** SS-002 (scrapers produce the provenance fields); SS-010 (migration workflow).

---

## 1. Finding ID
`SS-003` — audit §3.8 (detail-page provenance was only `scrapedAt`), §3.11 (schema JSON-in-string anti-pattern), rec. #2 (add provenance fields).

## 2. Hypothesis
*"Adding a provenance tuple (`sourceUrl`, `sourceHash`, `parseConfidence`, `lastVerifiedAt`, `lastVerifiedBy`, `parseNotes`) to every row and rendering a visible citation panel on every card and detail page will — measured over 28 days — raise the per-session 'click-through to source' rate by ≥ 10%, reduce the 'is this site legit?' support query volume by ≥ 50%, and increase Crunchbase-style referral citations inside 90 days."*

The negative hypothesis: if users ignore the citation panel entirely (< 2% ever expand it), we simplify; if they rely on it heavily (> 20% expand on every card), we promote it above the fold.

## 3. Current state
- `prisma/schema.prisma` stores `keyRequirements` and `industryCategories` as **JSON strings**, parsed on read via `parseIncentive` helpers. Blocks indexed filtering; forces `LIKE '%…%'` scans.
- Provenance fields present today: `sourceUrl`, `scrapedAt`. That's it.
- Detail page (`/incentives/[slug]`) renders "Data last updated: {scrapedAt}" in the sidebar — no source hash, no reviewer, no confidence.
- Card (`components/IncentiveCard.tsx`) does not surface provenance at all.
- Scrapers produce no hash, no parse confidence, no human-review artifacts.

## 4. Target state
**Every row** carries:
- `sourceUrl` (already present).
- `sourceDomain` (indexed; for SS-001 Trust Ribbon "N .gov sources").
- `sourceHash` — SHA-256 of fetched HTML stripped of boilerplate; enables diff detection.
- `parseConfidence` — enum `HIGH` / `MEDIUM` / `LOW`. Set by scraper based on field completeness + schema match.
- `parseNotes` — optional string; human-readable reason for MEDIUM/LOW.
- `lastVerifiedAt` — nullable; set when a human reviewer confirms the row.
- `lastVerifiedBy` — reviewer initials (or GitHub handle) + reviewer role.
- `scrapedAt` — first-seen and last-seen handled separately (add `lastSeenAt`).

**Every card** surfaces a compact provenance line: *"via agency.state.gov · parsed Apr 18 · confidence High"*.

**Every detail page** carries a full **Provenance panel**:
- Source link (outbound, `rel="noopener"`).
- Source hash (truncated, copy button).
- First seen / last seen / last verified.
- Parse confidence + parseNotes tooltip.
- "Report an error" CTA → in-product form (SS-009 backend).
- Methodology link (SS-004) — "how we decide confidence."

**Schema migration** also flips JSON-string arrays to proper Postgres arrays (`String[]`), enabling indexed filters.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 7 | **USAspending.gov** | Per-row source + last-updated + downloadable raw file | Source + last updated on every card and detail; make raw source hash visible | Downloadable raw HTML (privacy + storage cost) |
| 12 | **Crunchbase** | Per-field provenance (source + date) on company data | Per-field level provenance on detail page | Crowd edits without staff moderation |
| 1 | **Merrill** | Every price/figure has a footnote; footnote has a date + methodology | Footnote density for numerical fields | Footnote density for prose fields |
| 3 | **Schwab** | Conservative confidence language (*"as reported"*, *"estimated"*) | Same copy register on MEDIUM/LOW confidence rows | Disclaimer overkill that desensitizes users |
| — | **GrantWatch (floor)** | No visible provenance per row | Nothing. We exceed this floor on day one. | Opacity |

## 6. Case studies
- **A — Wikipedia citation model.** Every factual claim gets an inline citation; missing citation triggers `{{citation needed}}`. Lesson applied: if we render a claim from a scraped page, we must be able to point at the source element that produced it.
- **B — Bloomberg Terminal price-source model.** Every quoted price carries a source code (e.g., `CBBT` / `BGN`). Lesson applied: `parseConfidence` as the StateSubsidies analog of Bloomberg's source code.
- **C — Open Secrets / FEC disclosure tooling.** Detail pages link to the raw filing; users can audit the chain. Lesson applied: our "source hash + URL + parse date" triple is our filing link.
- **D — Archive.org Wayback integration.** Rows can link to the Wayback snapshot at parse time. Optional stretch goal for v1.1.

## 7. Experiment / test design
- **7.1 — A/B card variant** (28 days). Arm A: card without provenance line. Arm B: card with provenance line. Primary metric: source-click-through rate. Secondary: card-click-rate (we need this *not* to drop).
- **7.2 — Moderated trust survey (n=20).** Five personas including **student** and **small-business owner**. Ask: "Do you trust this card more or less than {control}? Why?" Qualitative, but recorded against the trust-narrative hypothesis.
- **7.3 — Diff-detection test (infra).** Take 100 production rows, re-scrape, compare hashes. Confirm hash changes when content materially changes and stays stable when only timestamps change.

**Stop-for-harm:** card-click-rate drop > 10% → collapse provenance line by default, expose on hover/tap.

## 8. Samples / artifacts

### Prisma migration (abridged)

```prisma
model Incentive {
  // ... existing fields ...

  sourceUrl          String
  sourceDomain       String   @db.VarChar(253)
  sourceHash         String?  @db.Char(64)      // sha256 hex
  parseConfidence    ParseConfidence @default(MEDIUM)
  parseNotes         String?
  lastVerifiedAt     DateTime?
  lastVerifiedBy     String?  @db.VarChar(64)
  firstSeenAt        DateTime @default(now())
  lastSeenAt         DateTime @default(now())

  keyRequirements    String[] @db.Text           // was: JSON string
  industryCategories String[] @db.Text           // was: JSON string

  @@index([sourceDomain])
  @@index([parseConfidence])
}

enum ParseConfidence {
  HIGH
  MEDIUM
  LOW
}
```

### Card provenance line (React)

```tsx
// components/IncentiveCard.tsx (excerpt)
<p className="text-[11px] text-slate-500">
  via <span className="font-mono">{hostnameOf(incentive.sourceUrl)}</span>
  {" · "}parsed <time dateTime={incentive.lastSeenAt}>{formatDate(incentive.lastSeenAt)}</time>
  {" · "}confidence <ConfidencePill value={incentive.parseConfidence} />
</p>
```

### Detail-page `ProvenancePanel`

```
Provenance
──────────
Source          eere.energy.gov/foo/bar  ↗
Source hash     9f2a7c…3b11  [copy]
First seen      Feb 14, 2026
Last seen       Apr 18, 2026
Last verified   Apr 16, 2026 by RQ (SME)
Confidence      HIGH — all required fields matched schema

Methodology →     Report an error →
```

### Python scraper side — `sourceHash` computation

```python
# scrapers/enricher.py or a new scrapers/fingerprint.py
import hashlib, re

def compute_source_hash(html: str) -> str:
    # strip scripts, styles, and noise before hashing
    body = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
    body = re.sub(r"<style[\s\S]*?</style>", "", body, flags=re.I)
    body = re.sub(r"\s+", " ", body).strip()
    return hashlib.sha256(body.encode("utf-8")).hexdigest()
```

## 9. Step-by-step process-flow map

1. **Schema design review** (Prisma migration). **H + K.** 0.5 ED.
2. **Write migration** (`prisma migrate dev --name add_provenance`) — flip arrays and add columns. **K.** 0.5 ED.
3. **Backfill existing rows** with `sourceDomain` parsed from `sourceUrl`; parseConfidence defaulted to `MEDIUM`; arrays converted. **H.** 1 ED.
4. **Scraper-side emission** of `sourceHash`, `parseConfidence`, `parseNotes`. **H + E.** 1 ED.
5. **`ProvenancePanel` component** + card provenance line. **A (design) + K (build).** 1 ED.
6. **A/B flag + 28-day window** (Test 7.1). **K.** 0.5 ED + 28 cal-days.
7. **Moderated trust survey (Test 7.2).** **Mei.** 5–7 cal-days.
8. **Readout + decision gate.** If pass: default-on. If hurt card-click: collapse-by-default. **Panel.** 0.5 ED.
9. **Methodology page (SS-004) documents confidence definitions** — coupled.

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- Every active row has non-null `sourceUrl`, `sourceDomain`, `parseConfidence`.
- LOW-confidence rows cannot be surfaced by the AI advisor (gated by SS-008 safety rails).
- Trust survey: > 70% of n=20 respondents state "more trusting" on new variant.
- Source click-through rate ≥ +10%; card click-rate not down > 5%.

**Rollback:** feature flag toggles provenance line off; schema fields stay (migrations are one-way but columns can be ignored).

**Institutional memory:** `experiments/SS-003-provenance.md` — contains the final confidence rubric, trust survey transcripts, and the source-domain whitelist once established.
