import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live under tests/e2e and import `test`/`expect` from
    // @playwright/test, not vitest — without this exclude, vitest's default
    // glob (**/*.spec.ts) picks them up too and fails with "Playwright Test
    // did not expect test() to be called here" for every unit test file
    // alongside them. The two suites are run with separate commands
    // (`npm test` vs `npm run test:e2e`) and should never share a runner.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
});
