import { describe, expect, it } from "vitest";
import {
  analyzeWeakAreas,
  buildFrictionPoints,
  buildNextActions,
  buildReaderHomeInsight,
  buildSessionLearningReport,
  classifyQuestionType,
  computeVocabularyMastery,
  accuracyForQuestionType,
} from "./learningInsights";

describe("classifyQuestionType", () => {
  it("detects inference from prompt keywords", () => {
    expect(classifyQuestionType("What can you infer about the author's attitude?", 0)).toBe("inference");
  });

  it("falls back to slot order when prompt is ambiguous", () => {
    expect(classifyQuestionType("Question text", 0)).toBe("recall");
    expect(classifyQuestionType("Question text", 3)).toBe("comprehension");
    expect(classifyQuestionType("Question text", 4)).toBe("inference");
  });
});

describe("computeVocabularyMastery", () => {
  it("returns null mastery when there are no words", () => {
    expect(computeVocabularyMastery([]).masteryPercent).toBeNull();
  });

  it("counts mastered, learning, new, and at-risk words", () => {
    const stats = computeVocabularyMastery([
      { review: null },
      { review: { correctStreak: 0, intervalDays: 0 } },
      { review: { correctStreak: 2, intervalDays: 2 } },
      { review: { correctStreak: 1, intervalDays: 7 } },
    ]);

    expect(stats.totalWords).toBe(4);
    expect(stats.newCount).toBe(1);
    expect(stats.atRiskCount).toBe(1);
    expect(stats.masteredCount).toBe(2);
    expect(stats.masteryPercent).toBe(50);
  });
});

describe("analyzeWeakAreas", () => {
  it("returns types below 80% accuracy sorted worst-first", () => {
    const areas = analyzeWeakAreas([
      { prompt: "What can you infer?", orderIndex: 4, isCorrect: false },
      { prompt: "What can you conclude?", orderIndex: 4, isCorrect: false },
      { prompt: "According to the text?", orderIndex: 0, isCorrect: true },
      { prompt: "Main idea?", orderIndex: 2, isCorrect: true },
    ]);

    expect(areas[0]?.type).toBe("inference");
    expect(areas[0]?.accuracyPercent).toBe(0);
  });
});

describe("buildFrictionPoints", () => {
  it("merges quiz weak areas and highlight usage", () => {
    const points = buildFrictionPoints(
      [{ type: "inference", label: "Inference", accuracyPercent: 40, answered: 5 }],
      [{ selectedText: "a confusing paragraph about AI policy" }],
    );

    expect(points.some((p) => p.includes("Inference"))).toBe(true);
    expect(points.some((p) => p.includes("passage"))).toBe(true);
  });
});

describe("buildReaderHomeInsight", () => {
  it("suggests baseline WPM for new users", () => {
    expect(
      buildReaderHomeInsight({
        baselineWPM: 180,
        sessionCount: 0,
        lastSessionTitle: null,
        lastQuizScorePercent: null,
        dueReviewCount: 0,
      }),
    ).toContain("180 WPM");
  });

  it("flags low last quiz scores", () => {
    expect(
      buildReaderHomeInsight({
        baselineWPM: 180,
        sessionCount: 2,
        lastSessionTitle: "Essay",
        lastQuizScorePercent: 20,
        dueReviewCount: 0,
      }),
    ).toContain("20%");
  });
});

describe("accuracyForQuestionType", () => {
  it("returns null when no questions of that type exist", () => {
    expect(accuracyForQuestionType([], "inference")).toBeNull();
  });
});

describe("buildNextActions", () => {
  it("prioritizes vocabulary review first", () => {
    const actions = buildNextActions({
      dueReviewCount: 3,
      atRiskWordCount: 0,
      inProgressSessions: [{ id: "s1", title: "Essay" }],
      lowScoreSessions: [],
      unfinishedQuizzes: [],
      weakAreas: [],
      highlightCount30Days: 0,
    });

    expect(actions[0]?.href).toBe("/reader/games/memory");
  });

  it("adds weak-area coaching when inference is low", () => {
    const actions = buildNextActions({
      dueReviewCount: 0,
      atRiskWordCount: 0,
      inProgressSessions: [],
      lowScoreSessions: [{ id: "s1", title: "AI Article", scorePercent: 40 }],
      unfinishedQuizzes: [],
      weakAreas: [{ type: "inference", label: "Inference", accuracyPercent: 20, answered: 5 }],
      highlightCount30Days: 0,
    });

    expect(actions.some((a) => a.title.toLowerCase().includes("inference"))).toBe(true);
  });

  it("falls back to starting a session when nothing is pending", () => {
    const actions = buildNextActions({
      dueReviewCount: 0,
      atRiskWordCount: 0,
      inProgressSessions: [],
      lowScoreSessions: [],
      unfinishedQuizzes: [],
      weakAreas: [],
      highlightCount30Days: 0,
    });

    expect(actions[0]?.href).toBe("/reader");
  });
});

describe("buildSessionLearningReport", () => {
  it("computes chunk averages, best section, and insight line", () => {
    const report = buildSessionLearningReport({
      scorePercent: 80,
      avgScore30Day: 60,
      chunkScores: [
        { chunkIndex: 0, aiScore: 90 },
        { chunkIndex: 1, aiScore: 50 },
      ],
      vocabularyWordsAdded: 4,
      questionResults: [
        { prompt: "Infer?", orderIndex: 4, isCorrect: false },
        { prompt: "Fact?", orderIndex: 0, isCorrect: true },
      ],
    });

    expect(report.scoreDelta).toBe(20);
    expect(report.chunkSummaryAvg).toBe(70);
    expect(report.weakestChunkIndex).toBe(1);
    expect(report.bestChunkIndex).toBe(0);
    expect(report.vocabularyWordsAdded).toBe(4);
    expect(report.insightLine).toContain("last section");
  });

  it("ignores zero chunk scores from empty summaries", () => {
    const report = buildSessionLearningReport({
      scorePercent: 60,
      avgScore30Day: null,
      chunkScores: [{ chunkIndex: 0, aiScore: 0 }],
      vocabularyWordsAdded: 0,
      questionResults: [],
    });

    expect(report.chunkSummaryAvg).toBeNull();
    expect(report.weakestChunkIndex).toBeNull();
  });
});
