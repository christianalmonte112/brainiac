import { computeDelta, type Delta } from "./range";
import { computeAverageWPM, type CompletedSessionStats } from "./stats";
import { accuracyForQuestionType, type QuestionResult } from "./learningInsights";

/**
 * Returns the calendar month (YYYY-MM) `date` falls on, in `timezone`. Reuses
 * the same 'en-CA' formatting trick as localDateString (see timezone.ts) —
 * just truncated to year-month instead of year-month-day.
 */
export function localMonthString(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date).slice(0, 7);
  } catch {
    return date.toISOString().slice(0, 7);
  }
}

/** Human-readable label for a YYYY-MM string, e.g. "2026-08" -> "August 2026". */
export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum) return month;
  const date = new Date(Date.UTC(year, monthNum - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * Filters items to those whose date (via `getDate`) falls in `month`
 * (YYYY-MM) as observed in `timezone`. Deliberately a plain JS filter over
 * an already-fetched, slightly-wider DB result rather than a DB-level date
 * range query — getting exact local-calendar-month boundaries right in a
 * DB query means either running the query per-user-timezone or accepting
 * UTC-approximate boundaries that can misclassify a session on the last
 * day of the month. Same "coarse DB filter, precise JS filter" pattern as
 * buildGrowthSeries and computeAverageQuizScore elsewhere in this file.
 */
export function filterByLocalMonth<T>(items: T[], getDate: (item: T) => Date, timezone: string, month: string): T[] {
  return items.filter((item) => localMonthString(getDate(item), timezone) === month);
}

export interface MonthlyMetric {
  label: string;
  unit: string;
  baseline: number;
  /** null when there's no data for this metric this month. */
  current: number | null;
  delta: Delta | null;
}

export interface MonthlyProgressReport {
  month: string;
  monthLabel: string;
  sessionsCompleted: number;
  vocabularyWordsAdded: number;
  wpm: MonthlyMetric;
  comprehension: MonthlyMetric;
  vocabulary: MonthlyMetric;
  inference: MonthlyMetric;
  headline: string;
}

export interface BaselineForReport {
  readingSpeedWPM: number;
  comprehensionScore: number;
  vocabularyScore: number;
  inferenceScore: number;
}

export interface MonthlyReportInput {
  month: string;
  baseline: BaselineForReport;
  monthSessions: CompletedSessionStats[];
  /** Latest attempt per session this month, already deduped by the caller. */
  monthQuizScores: number[];
  monthQuestionResults: QuestionResult[];
  vocabularyWordsAddedThisMonth: number;
  /** Current overall mastery — not month-scoped, since mastery reflects long-term retention rather than this month's activity alone (same convention as the live "Baseline vs. current" table on the main progress page). */
  currentVocabularyMasteryPercent: number | null;
}

function buildMetric(label: string, unit: string, baseline: number, current: number | null): MonthlyMetric {
  return {
    label,
    unit,
    baseline,
    current,
    delta: current !== null ? computeDelta(current, baseline) : null,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export interface DedupableAttempt {
  sessionId: string;
  score: number;
  createdAt: Date;
}

/**
 * Reduces a list of quiz attempts to the latest attempt per session — same
 * "retries shouldn't count twice" rule as computeAverageQuizScore in
 * stats.ts, factored out here since that function bakes in its own 30-day
 * cutoff and this report needs calendar-month-scoped input instead.
 */
export function dedupeLatestPerSession(attempts: DedupableAttempt[]): number[] {
  const latestBySession = new Map<string, DedupableAttempt>();
  for (const attempt of attempts) {
    const existing = latestBySession.get(attempt.sessionId);
    if (!existing || attempt.createdAt > existing.createdAt) {
      latestBySession.set(attempt.sessionId, attempt);
    }
  }
  return [...latestBySession.values()].map((a) => Math.round(a.score * 100));
}

/** Builds a short headline calling out the most notable change this month. */
function buildHeadline(sessionsCompleted: number, wpm: MonthlyMetric, comprehension: MonthlyMetric): string {
  if (sessionsCompleted === 0) {
    return "No completed reading sessions this month yet.";
  }

  const wpmUp = wpm.delta !== null && wpm.delta.pct >= 10;
  const comprehensionUp = comprehension.delta !== null && comprehension.delta.abs >= 10;
  const comprehensionDown = comprehension.delta !== null && comprehension.delta.abs <= -10;

  if (wpmUp && comprehensionUp) {
    return "Reading faster and understanding more than your baseline — strong month.";
  }
  if (wpmUp) {
    return `Reading speed is up ${Math.round(wpm.delta!.pct)}% over your baseline this month.`;
  }
  if (comprehensionUp) {
    return `Comprehension is up ${Math.round(comprehension.delta!.abs)} points over your baseline this month.`;
  }
  if (comprehensionDown) {
    return "Comprehension dipped below baseline this month — shorter sessions can help.";
  }
  return `${sessionsCompleted} session${sessionsCompleted === 1 ? "" : "s"} completed this month, holding steady with your baseline.`;
}

/** Pure computation — no DB or auth dependency, easy to unit test. */
export function computeMonthlyReport(input: MonthlyReportInput): MonthlyProgressReport {
  const currentWPM = computeAverageWPM(input.monthSessions);
  const currentComprehension = average(input.monthQuizScores);
  const currentInference = accuracyForQuestionType(input.monthQuestionResults, "inference");

  const wpm = buildMetric("Reading speed", "WPM", input.baseline.readingSpeedWPM, currentWPM);
  const comprehension = buildMetric("Comprehension", "%", input.baseline.comprehensionScore, currentComprehension);
  const vocabulary = buildMetric(
    "Vocabulary",
    "%",
    input.baseline.vocabularyScore,
    input.currentVocabularyMasteryPercent,
  );
  const inference = buildMetric("Inference", "%", input.baseline.inferenceScore, currentInference);

  return {
    month: input.month,
    monthLabel: formatMonthLabel(input.month),
    sessionsCompleted: input.monthSessions.length,
    vocabularyWordsAdded: input.vocabularyWordsAddedThisMonth,
    wpm,
    comprehension,
    vocabulary,
    inference,
    headline: buildHeadline(input.monthSessions.length, wpm, comprehension),
  };
}
