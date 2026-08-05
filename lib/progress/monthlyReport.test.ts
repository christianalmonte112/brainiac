import { describe, expect, it } from "vitest";
import {
  computeMonthlyReport,
  dedupeLatestPerSession,
  filterByLocalMonth,
  formatMonthLabel,
  localMonthString,
  type BaselineForReport,
} from "./monthlyReport";
import type { CompletedSessionStats } from "./stats";
import type { QuestionResult } from "./learningInsights";

const BASELINE: BaselineForReport = {
  readingSpeedWPM: 200,
  comprehensionScore: 70,
  vocabularyScore: 60,
  inferenceScore: 50,
};

describe("localMonthString", () => {
  it("returns YYYY-MM in the given timezone", () => {
    expect(localMonthString(new Date("2026-08-15T12:00:00Z"), "UTC")).toBe("2026-08");
  });

  it("crosses month boundary correctly near midnight in a negative-offset timezone", () => {
    // 2026-08-01T02:00:00Z is still July 31st in America/Los_Angeles (UTC-7 in August).
    expect(localMonthString(new Date("2026-08-01T02:00:00Z"), "America/Los_Angeles")).toBe("2026-07");
  });

  it("falls back to UTC month for an invalid timezone", () => {
    expect(localMonthString(new Date("2026-08-15T12:00:00Z"), "Not/AZone")).toBe("2026-08");
  });
});

describe("formatMonthLabel", () => {
  it("formats a YYYY-MM string as a readable label", () => {
    expect(formatMonthLabel("2026-08")).toBe("August 2026");
  });

  it("returns the input unchanged if malformed", () => {
    expect(formatMonthLabel("not-a-month")).toBe("not-a-month");
  });
});

describe("filterByLocalMonth", () => {
  it("keeps only items whose local date falls in the target month", () => {
    const items = [
      { id: "a", date: new Date("2026-08-05T12:00:00Z") },
      { id: "b", date: new Date("2026-07-31T12:00:00Z") },
      { id: "c", date: new Date("2026-08-31T12:00:00Z") },
    ];
    const result = filterByLocalMonth(items, (item) => item.date, "UTC", "2026-08");
    expect(result.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("returns an empty array when nothing matches", () => {
    const items = [{ date: new Date("2026-01-01T00:00:00Z") }];
    expect(filterByLocalMonth(items, (item) => item.date, "UTC", "2026-08")).toEqual([]);
  });
});

describe("dedupeLatestPerSession", () => {
  it("keeps only the latest attempt per session, converted to a 0-100 percent", () => {
    const attempts = [
      { sessionId: "s1", score: 0.6, createdAt: new Date("2026-08-01T00:00:00Z") },
      { sessionId: "s1", score: 0.9, createdAt: new Date("2026-08-05T00:00:00Z") },
      { sessionId: "s2", score: 0.5, createdAt: new Date("2026-08-03T00:00:00Z") },
    ];
    const result = dedupeLatestPerSession(attempts).sort((a, b) => a - b);
    expect(result).toEqual([50, 90]);
  });

  it("returns an empty array for no attempts", () => {
    expect(dedupeLatestPerSession([])).toEqual([]);
  });
});

describe("computeMonthlyReport", () => {
  const sessionAt = (isoDate: string, wordCount: number, elapsedSeconds: number): CompletedSessionStats => ({
    wordCount,
    elapsedSeconds,
    completedAt: new Date(isoDate),
  });

  it("reports no activity when there are no sessions this month", () => {
    const report = computeMonthlyReport({
      month: "2026-08",
      baseline: BASELINE,
      monthSessions: [],
      monthQuizScores: [],
      monthQuestionResults: [],
      vocabularyWordsAddedThisMonth: 0,
      currentVocabularyMasteryPercent: null,
    });

    expect(report.sessionsCompleted).toBe(0);
    expect(report.wpm.current).toBeNull();
    expect(report.wpm.delta).toBeNull();
    expect(report.headline).toMatch(/no completed reading sessions/i);
    expect(report.monthLabel).toBe("August 2026");
  });

  it("computes a positive WPM delta over baseline", () => {
    const report = computeMonthlyReport({
      month: "2026-08",
      baseline: BASELINE,
      monthSessions: [sessionAt("2026-08-10T00:00:00Z", 3000, 600)], // 300 WPM
      monthQuizScores: [],
      monthQuestionResults: [],
      vocabularyWordsAddedThisMonth: 0,
      currentVocabularyMasteryPercent: null,
    });

    expect(report.wpm.current).toBe(300);
    expect(report.wpm.delta).not.toBeNull();
    expect(report.wpm.delta!.abs).toBe(100);
    expect(report.wpm.delta!.pct).toBeCloseTo(50, 5);
    expect(report.headline).toMatch(/reading speed is up/i);
  });

  it("computes comprehension from the average of this month's quiz scores", () => {
    const report = computeMonthlyReport({
      month: "2026-08",
      baseline: BASELINE,
      monthSessions: [sessionAt("2026-08-10T00:00:00Z", 1000, 300)],
      monthQuizScores: [80, 90],
      monthQuestionResults: [],
      vocabularyWordsAddedThisMonth: 0,
      currentVocabularyMasteryPercent: null,
    });

    expect(report.comprehension.current).toBe(85);
    expect(report.comprehension.delta!.abs).toBe(15);
  });

  it("flags a comprehension drop below baseline", () => {
    const report = computeMonthlyReport({
      month: "2026-08",
      baseline: BASELINE,
      monthSessions: [sessionAt("2026-08-10T00:00:00Z", 1000, 300)],
      monthQuizScores: [40],
      monthQuestionResults: [],
      vocabularyWordsAddedThisMonth: 0,
      currentVocabularyMasteryPercent: null,
    });

    expect(report.comprehension.current).toBe(40);
    expect(report.comprehension.delta!.abs).toBe(-30);
    expect(report.headline).toMatch(/dipped below baseline/i);
  });

  it("computes inference accuracy from this month's question results", () => {
    const questionResults: QuestionResult[] = [
      { prompt: "What can you infer about the character's motive?", orderIndex: 4, isCorrect: true },
      { prompt: "What can you infer about the outcome?", orderIndex: 4, isCorrect: false },
    ];
    const report = computeMonthlyReport({
      month: "2026-08",
      baseline: BASELINE,
      monthSessions: [sessionAt("2026-08-10T00:00:00Z", 1000, 300)],
      monthQuizScores: [],
      monthQuestionResults: questionResults,
      vocabularyWordsAddedThisMonth: 0,
      currentVocabularyMasteryPercent: null,
    });

    expect(report.inference.current).toBe(50);
  });

  it("passes through vocabulary words added and current mastery percent", () => {
    const report = computeMonthlyReport({
      month: "2026-08",
      baseline: BASELINE,
      monthSessions: [],
      monthQuizScores: [],
      monthQuestionResults: [],
      vocabularyWordsAddedThisMonth: 12,
      currentVocabularyMasteryPercent: 75,
    });

    expect(report.vocabularyWordsAdded).toBe(12);
    expect(report.vocabulary.current).toBe(75);
    expect(report.vocabulary.delta!.abs).toBe(15);
  });
});
