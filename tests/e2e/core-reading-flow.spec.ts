import { test, expect } from "@playwright/test";
import { E2E_TITLE_PREFIX } from "./global.teardown";

// Deliberately does NOT click through to quiz generation, the highlight
// tutor, or the Socratic tutor — those hit the real Claude API and cost
// real money per run (lib/ratelimit.ts's aiGeneration/tutor tiers exist
// precisely because these are expensive). This test covers the free part
// of the core loop: paste text -> save -> land on the reading view with
// your content chunked and visible. A separate, deliberately-opted-into
// test would be the right place to cover AI generation, run manually or on
// a schedule rather than every CI run.

test("pasting text creates a session and lands on the reading view", async ({ page }) => {
  const title = `${E2E_TITLE_PREFIX} ${Date.now()}`;
  const sourceText =
    "The lighthouse keeper climbed the spiral stairs each evening, counting each of the " +
    "one hundred and twelve steps from memory. Below, the sea was calm tonight, and the " +
    "beam swept steadily over the water, warning ships away from the rocks that had claimed " +
    "three vessels in his grandfather's time. He had never once missed a night.";

  await page.goto("/reader");
  await page.getByRole("button", { name: /new document/i }).click();

  await page.getByPlaceholder("Title").fill(title);
  await page.getByPlaceholder("Paste the text you want to read...").fill(sourceText);
  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForURL(/\/reader\/[a-zA-Z0-9_-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
