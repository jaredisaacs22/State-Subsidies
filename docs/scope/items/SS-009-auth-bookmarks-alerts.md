# SS-009 — Auth + Real Backend for Saved Programs, Alerts, and Accounts

**Priority:** P1 · **Owners:** Tanaka · Whitfield · Okonkwo · **Audit origin:** 3.5, 3.9, rec. #9
**Grade today:** D (email alerts are a false promise; bookmarks vanish on storage clear) · **Grade at ship target:** A−
**Depends on:** SS-010 (migration hygiene), SS-011 (legal on account-data handling).

---

## 1. Finding ID
`SS-009` — audit §3.5 (email alerts are localStorage-only; UI implies a service that doesn't exist); §3.9 (Saved page shouldn't persist to device-only); rec. #9.

## 2. Hypothesis
*"Introducing real accounts (email magic-link auth) with server-side saved programs, server-side email alerts, and a correction-reporting form will (a) raise 7-day return-visit rate by ≥ 25% among users who save ≥ 1 program, (b) convert ≥ 8% of saved-program users into active alert subscribers within 30 days, (c) zero out the 'alerts promised but not sent' false-promise liability, and (d) give SS-008 and SS-003 a human-report channel."*

Negative test: if account friction kills save-rate by > 15%, we add guest-save with an upgrade prompt.

## 3. Current state
- **No auth.** `lib/useBookmarks.ts` writes to `localStorage`. Clearing browser → loss.
- **Email alert widget** in `FilterSidebar` writes only to `localStorage`. No SMTP. No queue. UI lies.
- **Dashboard** uses a single shared secret (`DASHBOARD_SECRET=51432`) — functional for internal v0, insufficient for anything that touches user data.
- **No error/correction reporting form** — users with a bad row today have no channel.

## 4. Target state
- **Magic-link auth** (email only; no passwords) via `next-auth`/`Auth.js` + Resend (or SES). No social-login; too much legal overhead for v1.
- **Account schema** minimal:
  - `User { id, email, createdAt, emailVerifiedAt, preferences, status }`.
  - `SavedProgram { id, userId, incentiveId, note, createdAt }`.
  - `Alert { id, userId, filter: Json, cadence, channel, lastSentAt }`.
  - `CorrectionReport { id, userId?, incentiveId, issue, status, createdAt }` — supports anonymous.
- **Saved page** reads from DB when signed in; falls back to `localStorage` with a "Sign in to sync" banner when not.
- **Alerts** delivered by a scheduled job (weekly default) that runs the saved `filter`; sends one email; preference to change cadence/unsubscribe one-click.
- **Corrections** form submits to `CorrectionReport`; triaged via the dashboard; `#corrections` log on SS-004 surfaces resolved reports.
- **Privacy:** email-only; we do not collect phone, address, SSN, or financial data. Our minimum: we can delete your account in one click.

## 5. Top-20 benchmark matrix

| # | Platform | What they do | What we borrow | What we avoid |
|---|---|---|---|---|
| 11 | **Zillow** | Saved searches with email alerts; cadence chooser | Same shape; weekly default | Their notification volume |
| 1 | **Merrill** | Strong auth, but not magic link | Not Merrill's auth; too heavy for our threat model | Password flows |
| 6 | **login.gov** | Federal-grade auth; we explicitly do not copy | Understanding that we are NOT login.gov | Federal-identity collection |
| 20 | **Linear / Notion** | Clean magic-link sign-in; great empty states | Their magic-link UX | Workspace complexity |
| 3 | **Schwab** | Fee/cost disclosure in account creation flow | Transparency copy on first sign-up | Product-heavy onboarding |

## 6. Case studies
- **A — Zillow saved searches (2013+).** Magic-link alternative: saved searches kept as anonymous until email provided. Lesson applied: guest-save first, convert later.
- **B — Substack launch (2017).** Email-first onboarding; magic link; one-click unsubscribe. Lesson applied: mirrored onboarding flow.
- **C — Figma file linking (pre-auth).** Users could start working anonymously; convert to account later. Lesson applied: keep `localStorage` bookmarks as a fallback; sync to DB on sign-in.
- **D — Rewiring America "save my plan" pattern.** Email for follow-up results only; no account needed. Lesson applied: do not force account creation.

## 7. Experiment / test design
- **7.1 — Auth-flow usability (n=10).** Users walk through sign-up; measure time-to-inbox and tap-back-to-app success. Success: ≥ 90% complete in < 60 s.
- **7.2 — Save + sync correctness (automated).** Playwright test: bookmark 3 programs as guest; sign in; confirm all 3 appear server-side; unbookmark one; confirm sync.
- **7.3 — Alert delivery test.** Staging: schedule → job → SMTP → receive. Assert subject line, unsubscribe link, plain-text fallback.
- **7.4 — Save-rate holdout (28 days).** Arm A: current localStorage; Arm B: new sync-on-sign-in. Success: no save-rate drop > 15%; return-visit rate up.
- **7.5 — Privacy checklist (legal gate).** CAN-SPAM compliance on alerts; GDPR-style account deletion works end-to-end; no PII logged in app logs.

**Stop-for-harm:** alert bounce rate > 5% → pause sends, investigate, fix.

## 8. Samples / artifacts

### Prisma schema (new)

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerifiedAt   DateTime?
  createdAt         DateTime  @default(now())
  preferences       Json?
  status            String    @default("ACTIVE") // "ACTIVE" | "DELETED"
  savedPrograms     SavedProgram[]
  alerts            Alert[]
}

model SavedProgram {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  incentiveId String
  incentive   Incentive @relation(fields: [incentiveId], references: [id], onDelete: Cascade)
  note        String?
  createdAt   DateTime  @default(now())
  @@unique([userId, incentiveId])
}

model Alert {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  filter     Json     // serialized filter (personas, jurisdictions, categories, state, etc.)
  cadence    String   @default("WEEKLY")        // "DAILY" | "WEEKLY" | "MONTHLY"
  channel    String   @default("EMAIL")
  lastSentAt DateTime?
  createdAt  DateTime @default(now())
  @@index([cadence, lastSentAt])
}

model CorrectionReport {
  id          String    @id @default(cuid())
  userId      String?
  incentiveId String
  incentive   Incentive @relation(fields: [incentiveId], references: [id], onDelete: Cascade)
  issue       String
  status      String    @default("OPEN")        // "OPEN" | "TRIAGED" | "FIXED" | "WONTFIX"
  createdAt   DateTime  @default(now())
  resolvedAt  DateTime?
}
```

### Magic-link config (Auth.js)

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Email from "next-auth/providers/email";

export const { handlers, auth } = NextAuth({
  providers: [Email({ from: "alerts@statesubsidies.com", server: process.env.EMAIL_SERVER })],
  pages: { signIn: "/sign-in", verifyRequest: "/check-your-email" },
  session: { strategy: "database" },
  callbacks: {
    session: async ({ session, user }) => ({ ...session, userId: user.id }),
  },
});
```

### Sync-on-sign-in flow

```ts
// lib/syncBookmarks.ts
export async function syncLocalBookmarksToServer(userId: string) {
  const local: string[] = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");
  if (!local.length) return;
  await fetch("/api/bookmarks/bulk", {
    method: "POST", body: JSON.stringify({ incentiveIds: local }),
  });
  localStorage.removeItem("bookmarks");
}
```

### Alerts job (daily cron)

```ts
// app/api/cron/alerts/route.ts (Vercel Cron)
// For each Alert where lastSentAt older than cadence, run the filter, collect new incentives
// (firstSeenAt > lastSentAt), send one email, update lastSentAt.
```

### Alert email template (CAN-SPAM compliant)

```
Subject: 3 new matches for your saved search — StateSubsidies

Hi —

Since we last emailed you, 3 new programs match your saved search "graduate STEM fellowships, any state."

  • NSF Graduate Research Fellowship Program — Federal — deadline Oct 15
  • NIH Ruth L. Kirschstein F31 — Federal — rolling
  • California Graduate Fellowship — State — deadline Nov 30

See all matches:  https://statesubsidies.com/alerts/abc123
Change cadence:   https://statesubsidies.com/account/alerts/abc123
Unsubscribe:      https://statesubsidies.com/alerts/abc123/unsubscribe

StateSubsidies.com — independent public directory, not a government website
{legal_entity} · {mailing_address}
```

## 9. Step-by-step process-flow map

1. **Prisma migrations for `User`/`SavedProgram`/`Alert`/`CorrectionReport`.** **K.** 1 ED.
2. **Install `next-auth` + Resend provider** + magic-link pages. **K.** 1 ED.
3. **Sync-on-sign-in** flow + fallback. **K.** 0.5 ED.
4. **Server-backed saved page** at `/saved`. **K.** 0.5 ED.
5. **Alerts job + Vercel Cron entry** + email template. **K.** 1 ED.
6. **Corrections form** (detail page + Methodology page cross-link). **K + A.** 0.5 ED.
7. **Legal review** — CAN-SPAM, deletion flow, privacy copy. **Okon.** 0.5 ED. Binding.
8. **Privacy page** under `/methodology#privacy-and-independence` updated accordingly. **Okon + Rv.** 0.25 ED.
9. **E2E tests (7.1–7.3).** **K.** 2 cal-days.
10. **A/B ship (7.4) 28 days.** **K monitors.**

## 10. Success metrics · rollback · ship-block

**Ship-block on all:**
- Magic-link flow: ≥ 90% complete in < 60 s.
- Save + sync correctness test passes in CI.
- Alerts deliverability test passes in staging.
- Legal sign-off (binding).
- Account deletion removes all user rows in a single transaction (CI-verified).
- No save-rate drop > 15%.

**Rollback:** disable new auth routes; UI falls back to localStorage. Alerts job paused via cron disable.

**Institutional memory:** `experiments/SS-009-accounts.md` — store auth-flow telemetry and alert bounce/click rates monthly.
