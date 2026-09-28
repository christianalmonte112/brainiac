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

/**
 * Hard ceiling for recorded baseline WPM. Real-world peak silent reading is
 * well below this; values like 9,000 WPM mean the user skipped the passage
 * in a couple of seconds.
 */
export const MAX_PLAUSIBLE_READING_WPM = 800;

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

/** Minimum seconds to read `wordCount` words without exceeding max plausible WPM. */
export function minElapsedSecondsForPassage(
  wordCount: number,
  maxWpm: number = MAX_PLAUSIBLE_READING_WPM,
): number {
  if (wordCount <= 0 || maxWpm <= 0) return 1;
  return Math.max(1, Math.ceil((wordCount / maxWpm) * 60));
}

/** True when a stored baseline is almost certainly a skip/glitch, not real reading. */
export function isImplausibleBaselineWpm(wpm: number): boolean {
  return wpm > MAX_PLAUSIBLE_READING_WPM;
}

/** Words per minute from a word count and elapsed time, capped at a plausible max. */
export function calculateWPM(wordCount: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const raw = Math.round(wordCount / (elapsedSeconds / 60));
  return Math.min(raw, MAX_PLAUSIBLE_READING_WPM);
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
  const elapsedSeconds = Math.max(
    input.elapsedSeconds,
    minElapsedSecondsForPassage(input.wordCount),
  );
  const readingSpeedWPM = calculateWPM(input.wordCount, elapsedSeconds);
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
