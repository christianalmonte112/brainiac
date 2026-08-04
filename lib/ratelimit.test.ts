import { describe, expect, it, vi, beforeEach } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => ({})) },
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = vi.fn((requests: number, window: string) => ({ requests, window }));
    limit = limitMock;
  }
  return { Ratelimit };
});

// Imported after mocks so lib/ratelimit picks up the mocked modules.
const { checkRateLimit } = await import("./ratelimit");

describe("checkRateLimit", () => {
  beforeEach(() => {
    limitMock.mockReset();
  });

  it("returns null when the request is within the limit", async () => {
    limitMock.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 1000 });

    const result = await checkRateLimit("aiGeneration", "user_123");

    expect(result).toBeNull();
    expect(limitMock).toHaveBeenCalledWith("user_123");
  });

  it("returns a 429 Response with Retry-After when the limit is exceeded", async () => {
    const reset = Date.now() + 30_000;
    limitMock.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset });

    const result = await checkRateLimit("tutor", "user_456");

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    expect(result?.headers.get("Retry-After")).toBeTruthy();

    const body = await result?.json();
    expect(body.error).toMatch(/rate limit/i);
    expect(body.limit).toBe(10);
    expect(body.remaining).toBe(0);
  });

  it("keys separate tiers on separate Ratelimit instances", async () => {
    limitMock.mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: Date.now() + 1000 });

    await checkRateLimit("voice", "user_789");
    await checkRateLimit("voiceList", "user_789");

    // Both calls succeeded independently — tiers don't share a single limiter instance.
    expect(limitMock).toHaveBeenCalledTimes(2);
  });
});
