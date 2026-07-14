import type { Prisma } from "@prisma/client";

/**
 * Shared filter for vocabulary words due for memory-game review (F-014).
 * Words that have never been reviewed have no VocabularyReview row and are
 * treated as due immediately.
 */
export function dueVocabularyWordsWhere(userId: string, now: Date = new Date()): Prisma.VocabularyWordWhereInput {
  return {
    userId,
    OR: [{ review: null }, { review: { nextReviewAt: { lte: now } } }],
  };
}
