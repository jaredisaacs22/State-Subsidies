# Runbook — Scraper Incident: Purge and Contain

**When:** bad rows reached the live directory (boilerplate stubs, wrong-field pollution,
dead-source garbage, mass-duplicate mint). Codifies the April 20, 2026 Grants.gov incident
response (`13535fe`), which the panel signed off as correct — plus the hardening we added since.

**Prime rule:** contain first, diagnose second, purge third, re-enable last. Never fix-forward
while a polluting source is still writing.

## 1. Freeze (minutes)

- Re-lock the offending source: set its mode to mock / `DRY_RUN=1` in
  `.github/workflows/scraper.yml` (or disable the source in `scrapers/scheduler.py`) and merge
  that single-line change immediately. A polluting scraper on a 6-hour cron re-pollutes faster
  than you can purge.
- Note the incident start time and the suspect `ScrapeRun` ids.

## 2. Quantify the blast radius

Bound the damage by provenance — this is exactly what SS-003's fields are for:
```sql
SELECT COUNT(*), MIN("firstSeenAt"), MAX("lastSeenAt")
FROM "Incentive"
WHERE "sourceDomain" = '<domain>'
  AND "firstSeenAt" >= '<incident window start>';
```
Cross-check against the scrape-report artifact of the suspect runs. Write the numbers down
before purging — the post-mortem needs them.

## 3. Purge

- Delete/quarantine strictly by provenance predicate (`sourceDomain` + time window +
  `sourceHash` list where possible) — never by title pattern alone, never table-wide.
- Use the direct connection (`DATABASE_URL_UNPOOLED`) for the bulk operation; batch deletes
  (doctrine §1.9 — stream, don't slurp).
- Verify counts after: total rows, per-source rows, and that headline stats recompute sane.

## 4. Root-cause and pin (same week, not "later")

Doctrine §0.3 loop: root-cause to a one-line mechanism → failing test that reproduces it on a
fixture → fix → the gate goes into `tests/` so CI blocks the class, not just the instance.
Precedents already pinned this way: boilerplate-prefix gate, contact-text-in-agencyName gate,
stub-row rejection.

## 5. Re-enable via the ladder — no shortcuts

The source goes back through the full promotion checklist
(`docs/scope/items/SS-002-promotion-checklist.md`): 3 clean dry-runs with row inspection before
live writes resume. An incident resets the ladder to zero for that source.

## 6. Record

- Incident entry in `docs/scope/experiments/SS-002-scraper-incidents.md` (existing log).
- One-line scar + pin in `docs/memory/LESSONS.md`.
- If a headline number moved visibly: ship a change narrative on the surface (doctrine §3.2) —
  users saw the number move; tell them why.
