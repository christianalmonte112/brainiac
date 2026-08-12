import { describe, expect, it, vi, afterEach } from "vitest";
import { extractTextWithGoogleVision, isGoogleVisionConfigured } from "./visionOcr";

describe("isGoogleVisionConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false when key missing", () => {
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "");
    expect(isGoogleVisionConfigured()).toBe(false);
  });

  it("is true when key present", () => {
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "test-key");
    expect(isGoogleVisionConfigured()).toBe(true);
  });
});

describe("extractTextWithGoogleVision", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns normalized fullTextAnnotation text", async () => {
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: "He had a black beard and had to shave every\nmorning.",
              },
            },
          ],
        }),
      }),
    );

    const text = await extractTextWithGoogleVision([{ base64: "abc" }]);
    expect(text).toContain("shave every morning");
  });

  it("throws when Google returns an error payload", async () => {
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: "API key not valid. Please pass a valid API key." },
        }),
      }),
    );

    await expect(extractTextWithGoogleVision([{ base64: "abc" }])).rejects.toThrow(/API key not valid/i);
  });
});
