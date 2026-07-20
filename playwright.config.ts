import { defineConfig, devices } from "@playwright/test";

/**
 * Theme F-2 — browser verification harness.
 * Runs against an already-booted production server (CI: the boot-probe job's
 * `next start`; locally: `npm run build && npm start`). BASE_URL overrides
 * the target. The suite's contract is doctrine §4.2: ANY uncaught console
 * error fails the run — zero tolerated errors, no allowlist.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  workers: 2,
  reporter: [["line"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
    // Sandboxes with a pre-provisioned Chromium set PW_CHROMIUM_PATH instead
    // of downloading a version-matched browser. CI leaves this unset and runs
    // `npx playwright install chromium` for the exact matching build.
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
});
