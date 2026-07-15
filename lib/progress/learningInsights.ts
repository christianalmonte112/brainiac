/** Quiz question categories aligned with the generator prompt (lib/prompts/quiz.ts). */
export type QuestionType = "recall" | "comprehension" | "inference";

export interface QuestionResult {
  prompt: string;
  orderIndex: number;
  isCorrect: boolean;
}

export interface WeakAreaInsight {
  type: QuestionType;
  label: string;
  /** 0–100 accuracy across answered questions of this type. */
  accuracyPercent: number;
  answered: number;
}

export interface VocabularyMasteryStats {
  totalWords: number;
  masteredCount: number;
  learningCount: number;
  newCount: number;
  /** Words recently missed in the memory game (streak reset). */
  atRiskCount: number;
  /** 0–100; null when the user has no saved words. */
  masteryPercent: number | null;
}

export interface NextAction {
  title: string;
  reason: string;
  href: string;
}

export interface SessionLearningReport {
  scorePercent: number;
  avgScore30Day: number | null;
  scoreDelta: number | null;
  chunkSummaryAvg: number | null;
  bestChunkIndex: number | null;
  weakestChunkIndex: number | null;
  vocabularyWordsAdded: number;
  weakAreas: WeakAreaInsight[];
  headline: string;
  /** Optional narrative line, e.g. comprehension dipped on the last section. */
  insightLine: string | null;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  recall: "Recall",
  comprehension: "Comprehension",
  inference: "Inference",
};

/** Minimum consecutive correct reviews before a word counts as mastered. */
export const MASTERED_MIN_STREAK = 2;

/**
 * Classifies a quiz question when `type` isn't stored in the DB. Uses prompt
 * keywords first, then falls back to the generator's intended slot order
 * (0–1 recall, 2–3 comprehension, 4 inference).
 */
export function classifyQuestionType(prompt: string, orderIndex: number): QuestionType {
  const lower = prompt.toLowerCase();

  if (
    /\b(infer|imply|implied|suggest|between the lines|most likely|why might|what can you conclude)\b/.test(
      lower,
    )
  ) {
    return "inference";
  }

  if (
    /\b(according to|which of the following|what did|what was|who |when did|where did|how many|directly)\b/.test(
      lower,
    )
  ) {
    return "recall";
  }

  if (/\b(main idea|meaning|theme|purpose|author|tone|why does|how does|best describes)\b/.test(lower)) {
    return "comprehension";
  }

  if (orderIndex >= 4) return "inference";
  if (orderIndex >= 2) return "comprehension";
  return "recall";
}

/** Words reviewed at least twice correctly, or on a 4+ day interval, count as mastered. */
export function computeVocabularyMastery(
  words: { review: { intervalDays: number; correctStreak: number } | null }[],
): VocabularyMasteryStats {
  if (words.length === 0) {
    return { totalWords: 0, masteredCount: 0, learningCount: 0, newCount: 0, atRiskCount: 0, masteryPercent: null };
  }

  let masteredCount = 0;
  let learningCount = 0;
  let newCount = 0;
  let atRiskCount = 0;

  for (const word of words) {
    if (!word.review) {
      newCount += 1;
      continue;
    }
    const { correctStreak, intervalDays } = word.review;
    if (correctStreak === 0 && intervalDays === 0) {
      atRiskCount += 1;
    }
    if (correctStreak >= MASTERED_MIN_STREAK || intervalDays >= 4) {
      masteredCount += 1;
    } else {
      learningCount += 1;
    }
  }

  return {
    totalWords: words.length,
    masteredCount,
    learningCount,
    newCount,
    atRiskCount,
    masteryPercent: Math.round((masteredCount / words.length) * 100),
  };
}

/** Aggregates accuracy by question type; returns types below 80% accuracy, worst first. */
export function analyzeWeakAreas(results: QuestionResult[]): WeakAreaInsight[] {
  const buckets = new Map<QuestionType, { correct: number; total: number }>();

  for (const result of results) {
    const type = classifyQuestionType(result.prompt, result.orderIndex);
    const bucket = buckets.get(type) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (result.isCorrect) bucket.correct += 1;
    buckets.set(type, bucket);
  }

  const insights: WeakAreaInsight[] = [];

  for (const type of ["recall", "comprehension", "inference"] as QuestionType[]) {
    const bucket = buckets.get(type);
    if (!bucket || bucket.total === 0) continue;

    const accuracyPercent = Math.round((bucket.correct / bucket.total) * 100);
    insights.push({
      type,
      label: QUESTION_TYPE_LABELS[type],
      accuracyPercent,
      answered: bucket.total,
    });
  }

  return insights
    .filter((i) => i.accuracyPercent < 80)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent);
}

/** Accuracy for one question type across all graded results, or null if none. */
export function accuracyForQuestionType(
  results: QuestionResult[],
  type: QuestionType,
): number | null {
  const matching = results.filter(
    (r) => classifyQuestionType(r.prompt, r.orderIndex) === type,
  );
  if (matching.length === 0) return null;
  const correct = matching.filter((r) => r.isCorrect).length;
  return Math.round((correct / matching.length) * 100);
}

export interface BuildNextActionsInput {
  dueReviewCount: number;
  atRiskWordCount: number;
  inProgressSessions: { id: string; title: string }[];
  lowScoreSessions: { id: string; title: string; scorePercent: number }[];
  unfinishedQuizzes: { id: string; title: string }[];
  weakAreas: WeakAreaInsight[];
  highlightCount30Days: number;
}

const MAX_ACTIONS = 4;

/** Prioritized learning actions for the progress dashboard. */
export function buildNextActions(input: BuildNextActionsInput): NextAction[] {
  const actions: NextAction[] = [];

  if (input.dueReviewCount > 0) {
    actions.push({
      title: "Review vocabulary",
      reason: `${input.dueReviewCount} word${input.dueReviewCount === 1 ? "" : "s"} due in the memory game.`,
      href: "/reader/games/memory",
    });
  }

  for (const session of input.inProgressSessions.slice(0, 2)) {
    actions.push({
      title: `Continue "${session.title}"`,
      reason: "You started this document but haven't finished yet.",
      href: `/reader/${session.id}`,
    });
  }

  for (const session of input.lowScoreSessions.slice(0, 2)) {
    actions.push({
      title: `Retry quiz on "${session.title}"`,
      reason: `Last score: ${session.scorePercent}% — a second pass helps retention.`,
      href: `/reader/${session.id}`,
    });
  }

  for (const session of input.unfinishedQuizzes.slice(0, 1)) {
    actions.push({
      title: `Take the quiz on "${session.title}"`,
      reason: "Reading is done — lock in comprehension with a quick quiz.",
      href: `/reader/${session.id}`,
    });
  }

  const worstArea = input.weakAreas[0];
  if (worstArea && worstArea.accuracyPercent < 70) {
    const retryTarget = input.lowScoreSessions[0];
    actions.push({
      title: `Strengthen ${worstArea.label.toLowerCase()}`,
      reason: `You scored ${worstArea.accuracyPercent}% on ${worstArea.label.toLowerCase()}-style questions this month.`,
      href: retryTarget ? `/reader/${retryTarget.id}` : "/reader/progress",
    });
  }

  if (input.highlightCount30Days >= 3) {
    actions.push({
      title: "Revisit highlighted passages",
      reason: `You asked for help on ${input.highlightCount30Days} passages recently — a quick re-read helps.`,
      href: input.inProgressSessions[0]
        ? `/reader/${input.inProgressSessions[0].id}`
        : "/reader/progress",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Start a new reading session",
      reason: "Keep your streak going with fresh material.",
      href: "/reader",
    });
  }

  return actions.slice(0, MAX_ACTIONS);
}

export interface BuildSessionReportInput {
  scorePercent: number;
  avgScore30Day: number | null;
  chunkScores: { chunkIndex: number; aiScore: number | null }[];
  vocabularyWordsAdded: number;
  questionResults: QuestionResult[];
}

/** Post-quiz learning summary shown on the results screen. */
export function buildSessionLearningReport(input: BuildSessionReportInput): SessionLearningReport {
  const meaningfulChunks = input.chunkScores.filter((c) => c.aiScore !== null && c.aiScore > 0);
  const chunkSummaryAvg =
    meaningfulChunks.length > 0
      ? Math.round(meaningfulChunks.reduce((sum, c) => sum + (c.aiScore ?? 0), 0) / meaningfulChunks.length)
      : null;

  const weakest =
    meaningfulChunks.length > 0
      ? meaningfulChunks.reduce((min, c) => ((c.aiScore ?? 101) < (min.aiScore ?? 101) ? c : min))
      : null;

  const strongest =
    meaningfulChunks.length > 0
      ? meaningfulChunks.reduce((max, c) => ((c.aiScore ?? -1) > (max.aiScore ?? -1) ? c : max))
      : null;

  const weakAreas = analyzeWeakAreas(input.questionResults);
  const scoreDelta =
    input.avgScore30Day !== null ? input.scorePercent - input.avgScore30Day : null;

  let headline: string;
  if (scoreDelta !== null && scoreDelta >= 10) {
    headline = `Strong session — ${scoreDelta} points above your recent average.`;
  } else if (scoreDelta !== null && scoreDelta <= -10) {
    headline = "Tough quiz — review the explanations and try another document soon.";
  } else if (input.scorePercent >= 80) {
    headline = "Solid retention — you're holding onto what you read.";
  } else if (input.scorePercent >= 60) {
    headline = "Good effort — focus on the missed questions below.";
  } else {
    headline = "Keep going — re-reading tricky sections helps.";
  }

  let insightLine: string | null = null;
  if (
    weakest &&
    strongest &&
    weakest.chunkIndex !== strongest.chunkIndex &&
    (strongest.aiScore ?? 0) - (weakest.aiScore ?? 0) >= 25
  ) {
    const lastChunk = Math.max(...meaningfulChunks.map((c) => c.chunkIndex));
    if (weakest.chunkIndex === lastChunk) {
      insightLine = "Comprehension dipped toward the end — re-read the last section.";
    } else {
      insightLine = `Chunk ${weakest.chunkIndex + 1} was trickiest — your summaries scored lowest there.`;
    }
  } else if (scoreDelta !== null && scoreDelta >= 10) {
    insightLine = "You beat your recent average on this quiz.";
  }

  return {
    scorePercent: input.scorePercent,
    avgScore30Day: input.avgScore30Day,
    scoreDelta,
    chunkSummaryAvg,
    bestChunkIndex: strongest?.chunkIndex ?? null,
    weakestChunkIndex: weakest?.chunkIndex ?? null,
    vocabularyWordsAdded: input.vocabularyWordsAdded,
    weakAreas,
    headline,
    insightLine,
  };
}

/** Flattens stored quiz attempts into per-question results for weak-area analysis. */
export function collectQuestionResultsFromAttempts(
  attempts: {
    answers: unknown;
    quiz: { questions: { orderIndex: number; prompt: string; correctIndex: number }[] };
  }[],
): QuestionResult[] {
  const results: QuestionResult[] = [];

  for (const attempt of attempts) {
    if (!Array.isArray(attempt.answers)) continue;

    const answers = attempt.answers as number[];
    for (const question of attempt.quiz.questions) {
      const selected = answers[question.orderIndex] ?? -1;
      results.push({
        prompt: question.prompt,
        orderIndex: question.orderIndex,
        isCorrect: selected === question.correctIndex,
      });
    }
  }

  return results;
}

/** Formats weak-area insights as short dashboard bullets. */
export function weakAreaSummaries(weakAreas: WeakAreaInsight[], limit = 3): string[] {
  return weakAreas.slice(0, limit).map(
    (area) =>
      `${area.label} questions at ${area.accuracyPercent}% (${area.answered} answered recently)`,
  );
}

/** Summarizes recent highlight-tutor usage as friction-point bullets. */
export function highlightFrictionSummaries(
  highlights: { selectedText: string }[],
  limit = 2,
): string[] {
  if (highlights.length === 0) return [];

  const bullets: string[] = [
    `You asked for help on ${highlights.length} passage${highlights.length === 1 ? "" : "s"} recently — revisit what confused you.`,
  ];

  const snippets = highlights.slice(0, limit).map((h) => {
    const trimmed = h.selectedText.trim().replace(/\s+/g, " ");
    const snippet = trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
    return `"${snippet}"`;
  });

  return [...bullets, ...snippets];
}

/** Merges quiz weak areas and highlight friction into one bullet list. */
export function buildFrictionPoints(
  weakAreas: WeakAreaInsight[],
  highlights: { selectedText: string }[],
  limit = 4,
): string[] {
  return [...weakAreaSummaries(weakAreas, 3), ...highlightFrictionSummaries(highlights, 1)].slice(0, limit);
}

export interface ReaderHomeInsightInput {
  baselineWPM: number | null;
  sessionCount: number;
  lastSessionTitle: string | null;
  lastQuizScorePercent: number | null;
  dueReviewCount: number;
}

/** One-line coaching copy for the reader library empty state. */
export function buildReaderHomeInsight(input: ReaderHomeInsightInput): string | null {
  if (input.dueReviewCount > 0) {
    return `${input.dueReviewCount} word${input.dueReviewCount === 1 ? "" : "s"} due for review — try the memory game after reading.`;
  }

  if (input.sessionCount === 0 && input.baselineWPM !== null) {
    return `Your baseline reading speed is ${input.baselineWPM} WPM — paste something ~500 words to start.`;
  }

  if (input.lastQuizScorePercent !== null && input.lastQuizScorePercent < 60) {
    return `Last session quiz: ${input.lastQuizScorePercent}% — try a shorter piece today.`;
  }

  if (input.lastSessionTitle) {
    return `"${input.lastSessionTitle}" is in your library — pick up where you left off.`;
  }

  return null;
}
