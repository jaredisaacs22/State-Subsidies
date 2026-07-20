import { defineConfig } from "vitest/config";

// Unit tests only — tests/e2e belongs to Playwright, tests/*.py to pytest.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
