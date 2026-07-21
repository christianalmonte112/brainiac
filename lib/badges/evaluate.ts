/**
 * Pure evaluation of which badges a snapshot of stats currently qualifies
 * for. Deliberately takes a plain stats object rather than querying
 * anything itself — the caller (lib/badges/sync.ts) is responsible for
 * assembling this from already-computed page data, and this function
 * stays trivially testable without a database.
 */

export interface BadgeEligibilityStats {
  currentStreak: number;
  completedSessions: number;
  /** Null when there isn't enough data yet for a current WPM figure. */
  currentWPM: number | null;
  baselineWPM: number;
  /** Null when there are no graded quiz attempts yet. */
  avgQuizScorePercent: number | null;
  masteredVocabularyCount: number;
}

/** Returns the badge keys `stats` currently qualifies for (see lib/badges/definitions.ts for what each key means). */
export function evaluateEarnedBadgeKeys(stats: BadgeEligibilityStats): string[] {
  const earned: string[] = [];

  if (stats.currentStreak >= 3) earned.push("streak_3");
  if (stats.currentStreak >= 7) earned.push("streak_7");
  if (stats.currentStreak >= 30) earned.push("streak_30");

  if (stats.completedSessions >= 1) earned.push("sessions_1");
  if (stats.completedSessions >= 10) earned.push("sessions_10");
  if (stats.completedSessions >= 25) earned.push("sessions_25");

  // Speed badges need a real baseline to compare against — a zero or
  // negative baseline would make "percent faster" meaningless (and risk a
  // divide-by-zero), so they simply can't be earned in that case.
  if (stats.currentWPM !== null && stats.baselineWPM > 0) {
    const percentFaster = ((stats.currentWPM - stats.baselineWPM) / stats.baselineWPM) * 100;
    if (percentFaster >= 10) earned.push("speed_10");
    if (percentFaster >= 25) earned.push("speed_25");
    if (percentFaster >= 50) earned.push("speed_50");
  }

  if (stats.avgQuizScorePercent !== null) {
    if (stats.avgQuizScorePercent >= 80) earned.push("comprehension_80");
    if (stats.avgQuizScorePercent >= 90) earned.push("comprehension_90");
  }

  if (stats.masteredVocabularyCount >= 10) earned.push("vocabulary_10");
  if (stats.masteredVocabularyCount >= 50) earned.push("vocabulary_50");

  return earned;
}
