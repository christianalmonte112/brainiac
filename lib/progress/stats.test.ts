import { describe, expect, it } from "vitest";
import {
  buildGrowthSeries,
  computeAverageQuizScore,
  computeAverageWPM,
  latestQuizScorePercent,
  type CompletedSessionStats,
  type QuizAttemptStat,
} from "./stats";

describe("computeAverageWPM", () => {
  it("returns null when there are no valid sessions", () => {
    const sessions: CompletedSessionStats[] = [
      { wordCount: null, elapsedSeconds: 120, completedAt: new Date() },
      { wordCount: 200, elapsedSeconds: 0, completedAt: new Date() },
    ];

    expect(computeAverageWPM(sessions)).toBeNull();
  });

  it("computes rounded average WPM across valid sessions", () => {
    const sessions: CompletedSessionStats[] = [
      { wordCount: 250, elapsedSeconds: 120, completedAt: new Date() },
      { wordCount: 300, elapsedSeconds: 180, completedAt: new Date() },
    ];

    // (550 words) / (300 sec / 60) = 110 WPM
    expect(computeAverageWPM(sessions)).toBe(110);
  });
});

describe("computeAverageQuizScore", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");

  it("returns null when there are no recent attempts", () => {
    const attempts: QuizAttemptStat[] = [
      { sessionId: "s1", score: 0.8, createdAt: new Date("2026-06-01T00:00:00.000Z") },
    ];
    expect(computeAverageQuizScore(attempts, now)).toBeNull();
  });

  it("uses the latest attempt per session and averages as a percentage", () => {
    const attempts: QuizAttemptStat[] = [
      { sessionId: "s1", score: 0.6, createdAt: new Date("2026-07-10T00:00:00.000Z") },
      { sessionId: "s1", score: 0.8, createdAt: new Date("2026-07-12T00:00:00.000Z") },
      { sessionId: "s2", score: 1, createdAt: new Date("2026-07-11T00:00:00.000Z") },
    ];
    // latest s1=80%, s2=100% → avg 90%
    expect(computeAverageQuizScore(attempts, now)).toBe(90);
  });
});

describe("latestQuizScorePercent", () => {
  it("returns null when there are no attempts", () => {
    expect(latestQuizScorePercent([])).toBeNull();
  });

  it("returns the most recent attempt as a percentage", () => {
    expect(
      latestQuizScorePercent([
        { score: 0.5, createdAt: new Date("2026-07-10T00:00:00.000Z") },
        { score: 0.85, createdAt: new Date("2026-07-12T00:00:00.000Z") },
      ]),
    ).toBe(85);
  });
});

describe("buildGrowthSeries", () => {
  it("sorts sessions by completion time and maps to local dates", () => {
    const sessions: CompletedSessionStats[] = [
      { wordCount: 300, elapsedSeconds: 180, completedAt: new Date("2026-07-12T23:30:00.000Z") },
      { wordCount: 240, elapsedSeconds: 120, completedAt: new Date("2026-07-11T23:30:00.000Z") },
    ];

    const points = buildGrowthSeries(sessions, "UTC");
    expect(points).toEqual([
      { date: "2026-07-11", wpm: 120 },
      { date: "2026-07-12", wpm: 100 },
    ]);
  });

  it("ignores sessions without required data", () => {
    const sessions: CompletedSessionStats[] = [
      { wordCount: null, elapsedSeconds: 120, completedAt: new Date("2026-07-11T00:00:00.000Z") },
      { wordCount: 200, elapsedSeconds: 0, completedAt: new Date("2026-07-12T00:00:00.000Z") },
      { wordCount: 240, elapsedSeconds: 120, completedAt: null },
      { wordCount: 300, elapsedSeconds: 150, completedAt: new Date("2026-07-13T00:00:00.000Z") },
    ];

    expect(buildGrowthSeries(sessions, "UTC")).toEqual([{ date: "2026-07-13", wpm: 120 }]);
  });
});
