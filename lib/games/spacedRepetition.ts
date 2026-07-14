/**
 * Leitner-style review ladder (F-014). Each consecutive correct answer moves
 * a word one box up; the box determines how many days until it's due again.
 * A miss drops the word back to box zero so it comes around again in the
 * same review session (interval 0 → due immediately).
 */
export const REVIEW_INTERVALS_DAYS = [1, 2, 4, 7, 14, 30, 60] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewState {
  intervalDays: number;
  correctStreak: number;
}

export interface ScheduledReview {
  intervalDays: number;
  correctStreak: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
}

/**
 * Computes the next review schedule after one flashcard answer. Pure — the
 * caller persists the result. `now` is injectable for tests.
 */
export function scheduleNextReview(state: ReviewState, correct: boolean, now: Date = new Date()): ScheduledReview {
  if (!correct) {
    return {
      intervalDays: 0,
      correctStreak: 0,
      nextReviewAt: new Date(now),
      lastReviewedAt: new Date(now),
    };
  }

  const correctStreak = state.correctStreak + 1;
  const ladderIndex = Math.min(correctStreak - 1, REVIEW_INTERVALS_DAYS.length - 1);
  const intervalDays = REVIEW_INTERVALS_DAYS[ladderIndex];

  return {
    intervalDays,
    correctStreak,
    nextReviewAt: new Date(now.getTime() + intervalDays * DAY_MS),
    lastReviewedAt: new Date(now),
  };
}

/** True when a review row (or a word with no row yet) is due for practice. */
export function isReviewDue(nextReviewAt: Date | null, now: Date = new Date()): boolean {
  if (nextReviewAt === null) return true;
  return nextReviewAt.getTime() <= now.getTime();
}
