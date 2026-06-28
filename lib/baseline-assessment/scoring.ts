import {
  COMPREHENSION_QUESTIONS,
  INFERENCE_QUESTIONS,
  VOCABULARY_QUESTIONS,
  type AssessmentQuestion,
} from "./content";

/**
 * Reading speed above which we award a full 100 on the normalized speed
 * component. 300 WPM is comfortably above average adult silent-reading
 * speed (~200-250 WPM), so this rewards fast readers without requiring
 * speed-reading-level pace for a perfect score. Tune freely — this constant
 * is the only thing that needs to change.
 */
const WPM_FOR_MAX_SPEED_SCORE = 300;

/** Equal weighting across the four baseline dimensions. Must sum to 1. */
const SCORE_WEIGHTS = {
  speed: 0.25,
  comprehension: 0.25,
  vocabulary: 0.25,
  inference: 0.25,
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Words per minute from a word count and elapsed time. */
export function calculateWPM(wordCount: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.round(wordCount / (elapsedSeconds / 60));
}

/** Maps raw WPM onto a 0-100 scale so it can be combined with percentage scores. */
export function normalizeSpeedScore(wpm: number): number {
  return clamp(Math.round((wpm / WPM_FOR_MAX_SPEED_SCORE) * 100), 0, 100);
}

/** Percentage of correct answers, 0-100. */
export function scoreSection(answers: number[], questions: AssessmentQuestion[]): number {
  if (questions.length === 0) return 0;
  const correct = questions.reduce(
    (count, question, index) => (answers[index] === question.correctIndex ? count + 1 : count),
    0,
  );
  return Math.round((correct / questions.length) * 100);
}

export interface BaselineScoreInput {
  wordCount: number;
  elapsedSeconds: number;
  comprehensionAnswers: number[];
  vocabularyAnswers: number[];
  inferenceAnswers: number[];
}

export interface BaselineScoreResult {
  readingSpeedWPM: number;
  comprehensionScore: number;
  vocabularyScore: number;
  inferenceScore: number;
  overallScore: number;
}

/** Pure scoring function — no DB or auth dependency, easy to unit test. */
export function computeBaselineScores(input: BaselineScoreInput): BaselineScoreResult {
  const readingSpeedWPM = calculateWPM(input.wordCount, input.elapsedSeconds);
  const comprehensionScore = scoreSection(input.comprehensionAnswers, COMPREHENSION_QUESTIONS);
  const vocabularyScore = scoreSection(input.vocabularyAnswers, VOCABULARY_QUESTIONS);
  const inferenceScore = scoreSection(input.inferenceAnswers, INFERENCE_QUESTIONS);
  const speedScore = normalizeSpeedScore(readingSpeedWPM);

  const overallScore = Math.round(
    speedScore * SCORE_WEIGHTS.speed +
      comprehensionScore * SCORE_WEIGHTS.comprehension +
      vocabularyScore * SCORE_WEIGHTS.vocabulary +
      inferenceScore * SCORE_WEIGHTS.inference,
  );

  return { readingSpeedWPM, comprehensionScore, vocabularyScore, inferenceScore, overallScore };
}
