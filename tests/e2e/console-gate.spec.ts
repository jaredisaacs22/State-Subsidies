/**
 * Theme F-2 (GAP-F1 / LESSONS #12) — the absolute console-error gate.
 *
 * Doctrine §4.2: any uncaught JS error or console.error on a real page fails
 * the suite. Zero tolerated errors, no allowlist — a "known" console error
 * masked real breakage for weeks on a platform this doctrine came from.
 * The browse-page crash that reached production (#61) is the scar this
 * suite exists to make unshippable.
 *
 * Also carries the first UX contracts (doctrine §4.3): honest empty states
 * (pages render error-free even with an empty directory), no raw "null"
 * leaking into visible text, deep links load, and the detail page agrees
 * with the API (relational, no literal pins).
 */
import { test, expect, type Page } from "@playwright/test";

type ConsoleCapture = { errors: string[] };

function captureConsole(page: Page, opts?: { httpFailures?: boolean }): ConsoleCapture {
  const cap: ConsoleCapture = { errors: [] };
  page.on("console", (msg) => {
    if (msg.type() === "error") cap.errors.push(msg.text());
  });
  page.on("pageerror", (err) => cap.errors.push(`pageerror: ${err.message}`));
  if (opts?.httpFailures) {
    // Name the failing URL — "Failed to load resource" without a URL is
    // undiagnosable in CI output.
    page.on("response", (r) => {
      if (r.status() >= 400) cap.errors.push(`HTTP ${r.status()}: ${r.url()}`);
    });
  }
  return cap;
}

async function visitClean(page: Page, path: string): Promise<ConsoleCapture> {
  const cap = captureConsole(page, { httpFailures: true });
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response, `${path} returned no response`).toBeTruthy();
  expect(response!.status(), `${path} returned HTTP ${response?.status()}`).toBe(200);
  return cap;
}

function expectZeroErrors(path: string, cap: ConsoleCapture) {
  expect(
    cap.errors,
    `${path} produced console/page errors:\n${cap.errors.join("\n")}`
  ).toEqual([]);
}

const STATIC_PAGES = ["/", "/methodology", "/nonprofits", "/map", "/saved"];

for (const path of STATIC_PAGES) {
  test(`console gate: ${path}`, async ({ page }) => {
    const cap = await visitClean(page, path);
    // Let client hydration and data fetches settle before judging.
    await page.waitForTimeout(1500);
    expectZeroErrors(path, cap);

    // UX contract: no raw "null"/"undefined" leaking into visible text.
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body, `${path} renders a literal "null"`).not.toMatch(/(^|\s)null(\s|$)/);
    expect(body, `${path} renders a literal "undefined"`).not.toMatch(/(^|\s)undefined(\s|$)/);
  });
}

test("deep link: detail page loads and agrees with the API (relational)", async ({ page, request }) => {
  const res = await request.get("/api/incentives?pageSize=1");
  expect(res.status()).toBe(200);
  const payload = await res.json();

  if (!payload.total || payload.total < 1 || payload.degraded) {
    // Empty/degraded directory (e.g. local run without a DB): the empty-state
    // contract above already covered the honest rendering; the relational
    // check needs data, which CI's seeded boot-probe DB always has.
    test.skip(true, "no directory rows available to deep-link against");
    return;
  }

  const { slug, title } = payload.data[0];
  const cap = await visitClean(page, `/incentives/${slug}`);
  await page.waitForTimeout(1000);
  expectZeroErrors(`/incentives/${slug}`, cap);

  // The page must render the same program the API returned.
  await expect(page.locator("h1")).toContainText(title.slice(0, 40));
});

test("404 route renders the designed not-found page, not a crash", async ({ page }) => {
  const cap = captureConsole(page);
  const response = await page.goto("/incentives/this-slug-does-not-exist-xyz", {
    waitUntil: "networkidle",
  });
  expect(response!.status()).toBe(404);
  await page.waitForTimeout(500);
  // Chromium logs "Failed to load resource … 404" for the main document
  // itself on any 404 URL — that single line is inherent to this test, not
  // an app defect. Page errors and every other console error stay absolute.
  const realErrors = cap.errors.filter(
    (e) => !e.startsWith("Failed to load resource")
  );
  expect(
    realErrors,
    `not-found page produced errors:\n${realErrors.join("\n")}`
  ).toEqual([]);
  await expect(page.locator("body")).toContainText(/not found|doesn.t exist|couldn.t find/i);
});
