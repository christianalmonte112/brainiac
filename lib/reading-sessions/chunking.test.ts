import { describe, expect, it } from "vitest";
import { chunkText, SHORT_DOCUMENT_WORD_LIMIT } from "./chunking";

describe("chunkText", () => {
  it("keeps short documents as a single section", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Word${i}`).join(" ");
    expect(countApprox(text)).toBeLessThanOrEqual(SHORT_DOCUMENT_WORD_LIMIT);
    expect(chunkText(text)).toHaveLength(1);
  });

  it("still chunks longer multi-paragraph documents", () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) => {
      const words = Array.from({ length: 60 }, (_, w) => `p${i}w${w}`).join(" ");
      return words;
    });
    const text = paragraphs.join("\n\n");
    expect(countApprox(text)).toBeGreaterThan(SHORT_DOCUMENT_WORD_LIMIT);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });
});

function countApprox(text: string): number {
  return text.trim().split(/\s+/).length;
}
