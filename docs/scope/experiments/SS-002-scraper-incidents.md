# SS-002 — Scraper Incidents & Re-qualification Log

See [SS-002 scope](../items/SS-002-scraper-revalidation.md). Incidents and per-source re-qualification runs are appended below.

Every incident row must answer: *what gate would have caught this?* That column drives the next scope update.

---

## 2026-04-20 — Grants.gov boilerplate row incident

- **Detected:** 04/20/2026 (CEO-track review of recently inserted rows).
- **Contained at:** 04/20/2026, commit `13535fe` — purge of affected rows in `prisma/seed.ts:6890-6901` + hardcoded `--mock` in `scrape.yml`.
- **Signature:** ~21 rows with title prefix `"Federal grant opportunity: …"` and `industryCategories = ["General Business"]`.
- **Root cause:** Grants.gov parser fell back to API synopsis text when the opportunity page layout changed; synopsis text was boilerplate for a class of opportunity types. No source-specific prefix filter existed at the time to reject these.
- **Remediation applied:** re-lock to mock; keep the purge block in `seed.ts` as a permanent safety net.
- **What gate would have caught this?** SS-002 §7.1 (contract test against a golden `grants_gov` fixture asserting non-boilerplate title) **and** SS-002 §7.2 (dry-run artifact inspection before live write). **Neither existed.** Both are now specified.
- **Status:** Contained. Re-qualification gated by SS-002 promotion ladder + SS-012 eval pass.

---

*Append new incidents above this line, most-recent first. Never overwrite.*
