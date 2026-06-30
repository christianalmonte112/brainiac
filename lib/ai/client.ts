import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client singleton — same pattern as lib/prisma.ts.
 *
 * The key is validated lazily (on first call) rather than at module init so
 * the build can complete without the env var set. Any server action or route
 * that actually calls Claude will throw a clear error at request time if the
 * key is missing.
 */
declare global {
  var anthropicGlobal: Anthropic | undefined;
}

function createClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function getAnthropic(): Anthropic {
  if (globalThis.anthropicGlobal) return globalThis.anthropicGlobal;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.anthropicGlobal = client;
  }
  return client;
}
