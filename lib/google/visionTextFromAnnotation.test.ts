import { describe, expect, it } from "vitest";
import { textFromFullTextAnnotation } from "./visionTextFromAnnotation";

function word(text: string, breakType?: string) {
  const symbols = text.split("").map((ch, i) => ({
    text: ch,
    property:
      i === text.length - 1 && breakType
        ? { detectedBreak: { type: breakType } }
        : undefined,
  }));
  return { symbols };
}

describe("textFromFullTextAnnotation", () => {
  it("orders blocks top-to-bottom and drops footer page numbers", () => {
    const text = textFromFullTextAnnotation({
      text: "Wrong order dump\n92",
      pages: [
        {
          width: 1000,
          height: 1400,
          blocks: [
            {
              boundingBox: { vertices: [{ x: 100, y: 1200 }, { x: 200, y: 1200 }, { x: 200, y: 1250 }, { x: 100, y: 1250 }] },
              paragraphs: [
                {
                  boundingBox: { vertices: [{ x: 100, y: 1200 }, { x: 200, y: 1200 }, { x: 200, y: 1250 }, { x: 100, y: 1250 }] },
                  words: [word("92", "LINE_BREAK")],
                },
              ],
            },
            {
              boundingBox: { vertices: [{ x: 80, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 200 }, { x: 80, y: 200 }] },
              paragraphs: [
                {
                  words: [
                    word("Holy", "SPACE"),
                    word("shit!", "EOL_SURE_SPACE"),
                    word("We", "SPACE"),
                    word("had", "SPACE"),
                    word("something.", "LINE_BREAK"),
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(text).toContain("Holy shit!");
    expect(text).toContain("We had something.");
    expect(text).not.toMatch(/\b92\b/);
  });

  it("falls back to annotation.text when pages are empty", () => {
    expect(textFromFullTextAnnotation({ text: "Plain fallback" })).toBe("Plain fallback");
  });
});
