# E2E tests (Playwright)

**Status: draft scaffolding.** Specs were written against the app's real component source (selectors, routes, redirects). Expect the first real run to need adjustments (a selector that doesn't quite match, a timing issue, etc.) — that's normal. Run it, fix what breaks, then trust it.

## What's covered

- `public.spec.ts` — unauthenticated visitors get redirected off `/reader` and `/admin`, and the sign-up page shows the invite-only message. No fixture user needed.
- `reader-smoke.spec.ts` — a signed-in, already-onboarded user reaches their library and progress page (not bounced to onboarding or sign-in).
- `core-reading-flow.spec.ts` — pastes text, saves a session, confirms it loads. **Deliberately stops before quiz generation, the highlight tutor, or the Socratic tutor** — those call the real Claude/ElevenLabs APIs and cost real money per run. If you want AI-path coverage, write it as a separate, manually-triggered test — not part of the suite that runs on every push.

## What's NOT covered (good next additions, not attempted here)

- The onboarding/baseline-assessment flow itself (signing up as a brand-new invited user).
- Anything AI-generated (quiz taking, tutor interactions, vocabulary lookups).
- Billing/Stripe checkout.

## Fixture user setup (required before running)

The Phase 5 invite gate means you can't just sign up a fresh test user through the UI without extra steps. Before running this suite against any environment:

1. **Add the test email to the invite allowlist** — go to `/admin/invites` on that environment and add the email you'll use as `E2E_TEST_EMAIL`.
2. **Actually sign up that user once**, through the real sign-up UI, so the Clerk webhook creates their Postgres `User` row (see `app/api/clerk/webhook/route.ts`). Signing in via `@clerk/testing`'s server-side helper does NOT trigger this — it signs in an existing Clerk user, it doesn't create one.
3. **Complete the baseline assessment** for that user (`/onboarding/assessment`), also through the real UI. `reader-smoke.spec.ts` will fail at the `/reader` redirect check if this step is skipped — the app itself redirects anyone without a completed baseline to onboarding, so that failure means "fixture isn't set up," not "app is broken."
4. If you're running against a fresh preview/local DB rather than an environment where you've already done 1-3, redo all three there — fixtures don't carry across databases.

## Required environment variables

| Variable | Where it comes from |
|---|---|
| `PLAYWRIGHT_BASE_URL` | The app URL to test against. **Local dev or a preview deployment only — never production.** `global.setup.ts` signs in as a real user and `global.teardown.ts` deletes rows by title prefix; neither should touch prod data. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or `CLERK_PUBLISHABLE_KEY` | Same publishable key the app uses for that environment. `@clerk/testing` accepts either. |
| `CLERK_SECRET_KEY` | Same. Needed for the server-side sign-in helper — keep it out of anywhere this could be logged or committed. |
| `E2E_TEST_EMAIL` | The fixture user's email — see setup steps above. |
| `DATABASE_URL` | Same DB the target app is using. Only used by teardown to delete the sessions this suite creates; if unset, teardown just skips cleanup rather than guessing. |

## Running

```bash
npx playwright install --with-deps chromium   # one-time, downloads the browser binary
npm run test:e2e                              # headless
npm run test:e2e:ui                           # interactive, easier for debugging failures
```

## Why teardown deletes sessions by title prefix

The free tier caps non-archived sessions at 3 (`lib/subscription/limits.ts`). Without cleanup, the 4th CI run would fail on session creation for a reason that has nothing to do with the app breaking. `core-reading-flow.spec.ts` titles its session `[Playwright E2E] <timestamp>`, and `global.teardown.ts` deletes anything matching that prefix for the fixture user, every run, pass or fail.
