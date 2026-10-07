import { describe, expect, it } from "vitest";
import { submitChunkSummarySchema } from "./schema";

const base = {
  sessionId: "session",
  chunkIndex: 4,
  totalChunks: 6,
  chunkSeconds: 30,
};

describe("submitChunkSummarySchema", () => {
  it("accepts a section summary of 1000 words", () => {
    const summaryText = Array.from({ length: 1000 }, () => "word").join(" ");
    const result = submitChunkSummarySchema.safeParse({ ...base, mode: "summary", summaryText });
    expect(result.success).toBe(true);
  });

  it("rejects a section summary past 1000 words", () => {
    const summaryText = Array.from({ length: 1001 }, () => "word").join(" ");
    const result = submitChunkSummarySchema.safeParse({ ...base, mode: "summary", summaryText });
    expect(result.success).toBe(false);
  });
});
