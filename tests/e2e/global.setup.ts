import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import path from "path";

// Must run serially — clerkSetup() fetches a Clerk Testing Token that later
// steps depend on. See tests/e2e/README.md for the env vars this needs and
// exactly how to provision E2E_TEST_EMAIL under the Phase 5 invite gate.
setup.describe.configure({ mode: "serial" });

// Keep in sync with playwright.config.ts `storageState` (repo-root path).
const authFile = path.join(__dirname, "../../playwright/.clerk/user.json");

setup("configure Clerk testing token", async () => {
  await clerkSetup();
});

setup("sign in fixture user and save storage state", async ({ page }) => {
  const testEmail = process.env.E2E_TEST_EMAIL;
  if (!testEmail) {
    throw new Error(
      "E2E_TEST_EMAIL is not set. See tests/e2e/README.md — this must be an already-invited, already-onboarded Clerk user.",
    );
  }

  // `/` is auth-protected (proxy.ts), so unauthenticated visits bounce to
  // /sign-in. Use the public sign-in page so Clerk's JS actually loads.
  await page.goto("/sign-in");

  // Server-side email-only sign-in: creates a token via the Backend API and
  // bypasses verification/MFA UI, which is fine here since this suite isn't
  // testing Clerk's own auth screens, just this app's behavior once signed
  // in. Requires CLERK_SECRET_KEY. Docs:
  // https://clerk.com/docs/guides/development/testing/playwright/test-helpers
  await clerk.signIn({ page, emailAddress: testEmail });

  // clerk.signIn does not navigate — land on the reader library ourselves.
  await page.goto("/reader");
  await page.waitForURL(/\/reader/, { timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
