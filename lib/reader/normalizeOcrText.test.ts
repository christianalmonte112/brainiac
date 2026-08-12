import { describe, expect, it } from "vitest";
import { normalizeOcrText } from "./normalizeOcrText";

describe("normalizeOcrText", () => {
  it("rejoins wrapped book lines into one paragraph", () => {
    const raw = [
      "He had a black beard and had to shave every",
      "morning. And he had a mass of black hair.",
      "",
      "Another guy, Peter, had long soft hair.",
    ].join("\n");

    const out = normalizeOcrText(raw);
    expect(out).toBe(
      "He had a black beard and had to shave every morning. And he had a mass of black hair.\n\nAnother guy, Peter, had long soft hair.",
    );
  });

  it("fixes end-of-line hyphenation", () => {
    expect(normalizeOcrText("morn-\ning")).toBe("morning");
  });

  it("does not create a paragraph per blank OCR line between wraps", () => {
    const raw = ["people become part", "", "of us.", "", "Next idea starts here."].join("\n");
    const out = normalizeOcrText(raw);
    // First two lines join; sentence end then blank allows a second paragraph.
    expect(out.split("\n\n").length).toBeLessThanOrEqual(2);
    expect(out).toContain("people become part of us.");
  });

  it("drops lone junk symbol lines", () => {
    expect(normalizeOcrText("Hello world.\n¥\nMore text here.")).toBe("Hello world.\n\nMore text here.");
  });
});
