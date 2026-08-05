#!/usr/bin/env node
/**
 * Basic load/smoke test for public, unauthenticated routes (Phase 5 ROADMAP
 * item). Run against local or preview only.
 *
 * Run: BASE_URL=http://localhost:3000 node scripts/load-test.mjs
 *
 * SAFETY: hard-refuses to run against the known production URL unless you
 * explicitly override it (see PRODUCTION_URL below). Only hits public,
 * unauthenticated pages by default — NEVER an AI-calling route
 * (/api/quiz/generate, /api/tutor/*, /api/voice/*, /api/games/{type}/generate,
 * /api/summary/generate, /api/vision/extract). Those cost real Claude/
 * ElevenLabs money per request and would also just immediately trip
 * lib/ratelimit.ts's per-user limits rather than measuring anything real
 * about how the app performs under load — a load test against them would
 * mostly be a load test of your Anthropic bill.
 *
 * Extending this to cover authenticated pages (e.g. /reader, /reader/[id]):
 * autocannon can send a `Cookie` header, so you could grab a valid session
 * cookie for a test user (e.g. via browser devtools, or by scripting the
 * @clerk/testing sign-in helper the E2E suite uses — see tests/e2e/) and
 * pass it in `headers` below. Still never add a POST to an AI route to the
 * `requests` list, load test or not.
 */

import autocannon from "autocannon";

const PRODUCTION_URL = "https://brainiac-inky.vercel.app";

const baseUrl = (process.env.BASE_URL ?? "").replace(/\/$/, "");
if (!baseUrl) {
  console.error("BASE_URL is required, e.g. BASE_URL=http://localhost:3000 node scripts/load-test.mjs");
  process.exit(1);
}

if (baseUrl === PRODUCTION_URL.replace(/\/$/, "") && process.env.LOAD_TEST_ALLOW_PRODUCTION !== "yes") {
  console.error(
    `Refusing to run against production (${PRODUCTION_URL}).\n` +
      "If you really mean to (NOT recommended — this hits your live app with concurrent traffic),\n" +
      "set LOAD_TEST_ALLOW_PRODUCTION=yes explicitly.",
  );
  process.exit(1);
}

// Public, unauthenticated, no-side-effect routes only. Add more here if
// useful, but keep the same character: static-ish pages, no AI calls, no
// mutations.
const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up"];

const DURATION_SECONDS = Number(process.env.LOAD_TEST_DURATION_SECONDS ?? 15);
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS ?? 10);

async function runOne(path) {
  console.log(`\n--- ${path} (${CONNECTIONS} connections, ${DURATION_SECONDS}s) ---`);
  const result = await autocannon({
    url: `${baseUrl}${path}`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
  });

  console.log(
    `  requests/sec: ${result.requests.average.toFixed(1)}  ` +
      `latency p50/p99: ${result.latency.p50}ms / ${result.latency.p99}ms  ` +
      `errors: ${result.errors}  non-2xx: ${result.non2xx}`,
  );

  return result;
}

console.log(`Load-testing ${baseUrl} — public routes only, no AI-calling routes included.`);

for (const path of PUBLIC_ROUTES) {
  await runOne(path);
}

console.log("\nDone. See the per-route output above; nothing is aggregated/failed automatically —");
console.log("use your judgment on what latency/error rate is acceptable for your infra.");
