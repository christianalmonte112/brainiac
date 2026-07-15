import { describe, expect, it } from "vitest";
import { gradeSegment, isBlankCorrect, normalizeBlankAnswer } from "./listeningScoring";

describe("normalizeBlankAnswer", () => {
  it("lowercases, trims, and strips surrounding punctuation", () => {
    expect(normalizeBlankAnswer("  Fire, ")).toBe("fire");
    expect(normalizeBlankAnswer('"Hello!"')).toBe("hello");
  });

  it("converts curly apostrophes and keeps interior ones", () => {
    expect(normalizeBlankAnswer("Don\u2019t")).toBe("don't");
  });
});

describe("isBlankCorrect", () => {
  it("matches forgivingly but never on empty input", () => {
    expect(isBlankCorrect(" FIRE. ", "fire")).toBe(true);
    expect(isBlankCorrect("water", "fire")).toBe(false);
    expect(isBlankCorrect("   ", "fire")).toBe(false);
    expect(isBlankCorrect("...", "fire")).toBe(false);
  });
});

describe("gradeSegment", () => {
  it("counts each blank plus the question as one unit each", () => {
    const grade = gradeSegment(["fire", "wrong"], ["fire", "rain"], 2, 2);
    expect(grade.blanks).toEqual([true, false]);
    expect(grade.choiceCorrect).toBe(true);
    expect(grade.correctCount).toBe(2);
    expect(grade.totalCount).toBe(3);
  });

  it("treats missing blanks and a missing choice as wrong", () => {
    const grade = gradeSegment([], ["fire", "rain"], null, 0);
    expect(grade.blanks).toEqual([false, false]);
    expect(grade.choiceCorrect).toBe(false);
    expect(grade.correctCount).toBe(0);
    expect(grade.totalCount).toBe(3);
  });
});
