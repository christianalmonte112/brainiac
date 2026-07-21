import { describe, expect, it } from "vitest";
import { evaluateEarnedBadgeKeys, type BadgeEligibilityStats } from "./evaluate";

function baseStats(overrides: Partial<BadgeEligibilityStats> = {}): BadgeEligibilityStats {
  return {
    currentStreak: 0,
    completedSessions: 0,
    currentWPM: null,
    baselineWPM: 200,
    avgQuizScorePercent: null,
    masteredVocabularyCount: 0,
    ...overrides,
  };
}

describe("evaluateEarnedBadgeKeys — streak", () => {
  it("awards nothing below the first threshold", () => {
    expect(evaluateEarnedBadgeKeys(baseStats({ currentStreak: 2 }))).not.toContain("streak_3");
  });

  it("awards every threshold at or below the current streak", () => {
    const keys = evaluateEarnedBadgeKeys(baseStats({ currentStreak: 7 }));
    expect(keys).toEqual(expect.arrayContaining(["streak_3", "streak_7"]));
    expect(keys).not.toContain("streak_30");
  });

  it("awards all three at 30+", () => {
    const keys = evaluateEarnedBadgeKeys(baseStats({ currentStreak: 30 }));
    expect(keys).toEqual(expect.arrayContaining(["streak_3", "streak_7", "streak_30"]));
  });
});

describe("evaluateEarnedBadgeKeys — sessions", () => {
  it("awards the first-session badge exactly at 1", () => {
    expect(evaluateEarnedBadgeKeys(baseStats({ completedSessions: 1 }))).toContain("sessions_1");
  });

  it("does not award anything at 0 sessions", () => {
    expect(evaluateEarnedBadgeKeys(baseStats({ completedSessions: 0 }))).not.toContain("sessions_1");
  });
});

describe("evaluateEarnedBadgeKeys — speed", () => {
  it("computes percent-faster correctly against baseline", () => {
    // 220 vs 200 baseline = exactly +10%
    const keys = evaluateEarnedBadgeKeys(baseStats({ currentWPM: 220, baselineWPM: 200 }));
    expect(keys).toContain("speed_10");
    expect(keys).not.toContain("speed_25");
  });

  it("awards nothing when currentWPM is null (not enough data)", () => {
    const keys = evaluateEarnedBadgeKeys(baseStats({ currentWPM: null, baselineWPM: 200 }));
    expect(keys.some((k) => k.startsWith("speed_"))).toBe(false);
  });

  it("never awards a speed badge against a zero or negative baseline", () => {
    const keys = evaluateEarnedBadgeKeys(baseStats({ currentWPM: 500, baselineWPM: 0 }));
    expect(keys.some((k) => k.startsWith("speed_"))).toBe(false);
  });

  it("does not award speed badges for reading slower than baseline", () => {
    const keys = evaluateEarnedBadgeKeys(baseStats({ currentWPM: 150, baselineWPM: 200 }));
    expect(keys.some((k) => k.startsWith("speed_"))).toBe(false);
  });
});

describe("evaluateEarnedBadgeKeys — comprehension", () => {
  it("respects the 80/90 thresholds independently", () => {
    expect(evaluateEarnedBadgeKeys(baseStats({ avgQuizScorePercent: 85 }))).toEqual(
      expect.arrayContaining(["comprehension_80"]),
    );
    expect(evaluateEarnedBadgeKeys(baseStats({ avgQuizScorePercent: 85 }))).not.toContain("comprehension_90");
    expect(evaluateEarnedBadgeKeys(baseStats({ avgQuizScorePercent: 95 }))).toEqual(
      expect.arrayContaining(["comprehension_80", "comprehension_90"]),
    );
  });

  it("awards nothing when there are no graded attempts yet", () => {
    const keys = evaluateEarnedBadgeKeys(baseStats({ avgQuizScorePercent: null }));
    expect(keys.some((k) => k.startsWith("comprehension_"))).toBe(false);
  });
});

describe("evaluateEarnedBadgeKeys — vocabulary", () => {
  it("respects the 10/50 thresholds independently", () => {
    expect(evaluateEarnedBadgeKeys(baseStats({ masteredVocabularyCount: 10 }))).toContain("vocabulary_10");
    expect(evaluateEarnedBadgeKeys(baseStats({ masteredVocabularyCount: 49 }))).not.toContain("vocabulary_50");
    expect(evaluateEarnedBadgeKeys(baseStats({ masteredVocabularyCount: 50 }))).toContain("vocabulary_50");
  });
});

describe("evaluateEarnedBadgeKeys — combination", () => {
  it("evaluates every category independently in one call", () => {
    const keys = evaluateEarnedBadgeKeys({
      currentStreak: 10,
      completedSessions: 12,
      currentWPM: 300,
      baselineWPM: 200,
      avgQuizScorePercent: 92,
      masteredVocabularyCount: 15,
    });
    expect(keys.sort()).toEqual(
      [
        "streak_3",
        "streak_7",
        "sessions_1",
        "sessions_10",
        "speed_10",
        "speed_25",
        "speed_50",
        "comprehension_80",
        "comprehension_90",
        "vocabulary_10",
      ].sort(),
    );
  });
});
