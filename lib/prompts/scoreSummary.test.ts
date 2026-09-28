import { describe, expect, it } from "vitest";
import { parseSummaryScoreText } from "./scoreSummaryParse";

describe("parseSummaryScoreText", () => {
  it("parses clean JSON", () => {
    expect(parseSummaryScoreText('{"score": 88, "feedback": "You caught the main claim."}')).toEqual({
      score: 88,
      feedback: "You caught the main claim.",
    });
  });

  it("strips markdown fences", () => {
    const raw = '```json\n{"score": 72, "feedback": "Solid overview."}\n```';
    expect(parseSummaryScoreText(raw)).toEqual({
      score: 72,
      feedback: "Solid overview.",
    });
  });

  it("extracts JSON from surrounding prose", () => {
    const raw = 'Here you go:\n{"score": 55, "feedback": "Add the cause."}\nHope that helps!';
    expect(parseSummaryScoreText(raw)?.score).toBe(55);
  });

  it("coerces string scores", () => {
    expect(parseSummaryScoreText('{"score": "91", "feedback": "Excellent."}')?.score).toBe(91);
  });

  it("clamps out-of-range scores", () => {
    expect(parseSummaryScoreText('{"score": 140, "feedback": "Wow."}')?.score).toBe(100);
    expect(parseSummaryScoreText('{"score": -5, "feedback": "Hmm."}')?.score).toBe(0);
  });

  it("returns null for unparseable output", () => {
    expect(parseSummaryScoreText("Nice work summarizing this section — keep it up!")).toBeNull();
    expect(parseSummaryScoreText("")).toBeNull();
    expect(parseSummaryScoreText('{"feedback": "missing score"}')).toBeNull();
  });
});
