import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * E2E test suite (Phase 5 ROADMAP item). See tests/e2e/README.md before
 * running this — it requires a pre-provisioned Clerk test user AND a
 * matching invite/onboarding fixture in whatever DB PLAYWRIGHT_BASE_URL
 * points at. This config and the specs are DRAFTS: written against the
 * real component source, but the first real run is expected to need
 * selector/timing adjustments. Treat failures on first run as normal,
 * not as a sign the app is broken.
 *
 * Required env vars (see tests/e2e/README.md for how to obtain each):
 *   PLAYWRIGHT_BASE_URL          - target app URL. Local dev or a preview
 *                                   deployment ONLY. Never point this at
 *                                   production — global.setup signs in as a
 *                                   real user and global.teardown deletes
 *                                   rows by title prefix; neither should run
 *                                   against prod data.
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY)
 *   CLERK_SECRET_KEY
 *   E2E_TEST_EMAIL               - an existing Clerk user's email. Must
 *                                   already be invited, onboarded (baseline
 *                                   assessment complete), and NOT banned —
 *                                   see tests/e2e/README.md for exact setup
 *                                   steps under the new invite gate.
 *   DATABASE_URL                 - same DB PLAYWRIGHT_BASE_URL's app uses,
 *                                   needed only for global.teardown's cleanup.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Shared fixture user + free-tier session limit (3) make parallel runs fight each other.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  globalTeardown: "./tests/e2e/global.teardown.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "global setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "public (unauthenticated)",
      testMatch: "public.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: ["reader-smoke.spec.ts", "core-reading-flow.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(__dirname, "playwright/.clerk/user.json"),
      },
      dependencies: ["global setup"],
    },
  ],
});
