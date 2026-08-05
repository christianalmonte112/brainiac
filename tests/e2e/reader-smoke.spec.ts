import { test, expect } from "@playwright/test";

// Uses the storageState saved by global.setup.ts — see playwright.config.ts.
// Assumes the fixture user (E2E_TEST_EMAIL) is already invited, onboarded
// (baseline assessment complete), and not banned — see tests/e2e/README.md.

test("signed-in user reaches the reader library, not onboarding or sign-in", async ({ page }) => {
  await page.goto("/reader");

  // Should NOT be bounced to onboarding or sign-in. If this fails, the
  // most likely cause is the fixture user's baseline assessment isn't
  // actually complete in whatever DB PLAYWRIGHT_BASE_URL points at —
  // see tests/e2e/README.md's fixture setup steps.
  await expect(page).toHaveURL(/\/reader$/);

  await expect(page.getByRole("button", { name: /new document/i })).toBeVisible();
});

test("progress page loads and shows the baseline comparison", async ({ page }) => {
  await page.goto("/reader/progress");
  await expect(page.getByText(/baseline vs\. current/i)).toBeVisible();
});
