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

  it("prefers geometry assembly and strips footer page numbers", async () => {
    vi.stubEnv("GOOGLE_CLOUD_VISION_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: "ignore flat text\n92",
                pages: [
                  {
                    width: 800,
                    height: 1200,
                    blocks: [
                      {
                        boundingBox: {
                          vertices: [
                            { x: 50, y: 80 },
                            { x: 700, y: 80 },
                            { x: 700, y: 160 },
                            { x: 50, y: 160 },
                          ],
                        },
                        paragraphs: [
                          {
                            words: [
                              {
                                symbols: [
                                  { text: "H" },
                                  { text: "i", property: { detectedBreak: { type: "SPACE" } } },
                                ],
                              },
                              {
                                symbols: [
                                  { text: "t" },
                                  { text: "h" },
                                  { text: "e" },
                                  { text: "r" },
                                  { text: "e", property: { detectedBreak: { type: "LINE_BREAK" } } },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        boundingBox: {
                          vertices: [
                            { x: 360, y: 1100 },
                            { x: 420, y: 1100 },
                            { x: 420, y: 1140 },
                            { x: 360, y: 1140 },
                          ],
                        },
                        paragraphs: [
                          {
                            boundingBox: {
                              vertices: [
                                { x: 360, y: 1100 },
                                { x: 420, y: 1100 },
                                { x: 420, y: 1140 },
                                { x: 360, y: 1140 },
                              ],
                            },
                            words: [
                              {
                                symbols: [
                                  { text: "9" },
                                  { text: "2", property: { detectedBreak: { type: "LINE_BREAK" } } },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const text = await extractTextWithGoogleVision([{ base64: "abc" }]);
    expect(text).toContain("Hi there");
    expect(text).not.toMatch(/\b92\b/);
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
