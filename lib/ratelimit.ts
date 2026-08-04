import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazily constructed so builds/tests without Upstash env vars don't crash at import time.
let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

const limiters = new Map<string, Ratelimit>();

/**
 * Returns a singleton Ratelimit instance for the given tier, keyed by prefix
 * so different route classes track separate budgets in Redis.
 */
function getLimiter(prefix: string, requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`): Ratelimit {
  const existing = limiters.get(prefix);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `ratelimit:${prefix}`,
    analytics: true,
  });
  limiters.set(prefix, limiter);
  return limiter;
}

// Tiers, keyed to what each route class actually costs us:
// - aiGeneration: Claude calls that create persisted content (quizzes, games, summaries)
// - tutor: Claude calls that happen more frequently during a reading session
// - voice: ElevenLabs TTS/STT calls
// - voiceList: cheap metadata lookup, generous limit
export const RATE_LIMIT_TIERS = {
  aiGeneration: () => getLimiter("ai-gen", 10, "1 h"),
  tutor: () => getLimiter("tutor", 30, "1 h"),
  voice: () => getLimiter("voice", 20, "1 h"),
  voiceList: () => getLimiter("voice-list", 60, "1 h"),
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

/**
 * Checks the rate limit for a given user on a given tier. Returns a ready-to-send
 * 429 Response if the limit was exceeded, or null if the request should proceed.
 */
export async function checkRateLimit(tier: RateLimitTier, userId: string): Promise<Response | null> {
  const limiter = RATE_LIMIT_TIERS[tier]();
  const { success, limit, remaining, reset } = await limiter.limit(userId);

  if (success) return null;

  const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    {
      error: "Rate limit exceeded. Please try again later.",
      limit,
      remaining,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
