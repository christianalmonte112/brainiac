import { test, expect } from "@playwright/test";

// No auth fixture needed — these run in the "public (unauthenticated)"
// project (see playwright.config.ts), with a clean/no storage state.

test("redirects an unauthenticated visitor away from /reader", async ({ page }) => {
  await page.goto("/reader");
  await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/sign-in/);
});

test("sign-up page shows invite-only messaging", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByText(/invite-only/i)).toBeVisible();
});

test("redirects an unauthenticated visitor away from /admin", async ({ page }) => {
  // app/admin/layout.tsx redirects non-admins to /reader, which then
  // itself redirects unauthenticated visitors to /sign-in — so the final
  // landing spot is /sign-in, same as the /reader case above.
  await page.goto("/admin");
  await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/sign-in/);
});
