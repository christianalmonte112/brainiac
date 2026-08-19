import { describe, expect, it } from "vitest";
import {
  calculateWPM,
  computeBaselineScores,
  isImplausibleBaselineWpm,
  MAX_PLAUSIBLE_READING_WPM,
  minElapsedSecondsForPassage,
} from "./scoring";

describe("calculateWPM", () => {
  it("computes normal reading speeds", () => {
    // 300 words in 60s → 300 WPM
    expect(calculateWPM(300, 60)).toBe(300);
  });

  it("caps skip-through absurd speeds", () => {
    // 311 words in 2s would be ~9k WPM raw
    expect(calculateWPM(311, 2)).toBe(MAX_PLAUSIBLE_READING_WPM);
  });
});

describe("minElapsedSecondsForPassage", () => {
  it("requires enough time that WPM cannot exceed the cap", () => {
    const min = minElapsedSecondsForPassage(311);
    expect(calculateWPM(311, min)).toBeLessThanOrEqual(MAX_PLAUSIBLE_READING_WPM);
    expect(calculateWPM(311, Math.max(1, min - 1))).toBe(MAX_PLAUSIBLE_READING_WPM);
  });
});

describe("computeBaselineScores", () => {
  it("floors elapsed time so a 2-second skim cannot set a 9k baseline", () => {
    const scores = computeBaselineScores({
      wordCount: 311,
      elapsedSeconds: 2,
      comprehensionAnswers: [0, 0, 0, 0],
      vocabularyAnswers: [0, 0, 0, 0],
      inferenceAnswers: [0, 0, 0, 0],
    });
    expect(scores.readingSpeedWPM).toBeLessThanOrEqual(MAX_PLAUSIBLE_READING_WPM);
    expect(isImplausibleBaselineWpm(scores.readingSpeedWPM)).toBe(false);
  });
});

describe("isImplausibleBaselineWpm", () => {
  it("flags the known bad stored baseline", () => {
    expect(isImplausibleBaselineWpm(9330)).toBe(true);
    expect(isImplausibleBaselineWpm(200)).toBe(false);
  });
});
