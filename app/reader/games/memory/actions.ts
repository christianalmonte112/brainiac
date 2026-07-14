"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { submitVocabularyReviewSchema, type SubmitVocabularyReviewInput } from "@/lib/games/schema";
import { scheduleNextReview } from "@/lib/games/spacedRepetition";

export interface SubmitVocabularyReviewResult {
  correctStreak: number;
  intervalDays: number;
}

/**
 * Records one flashcard answer (F-014) and reschedules the word using the
 * Leitner ladder in lib/games/spacedRepetition.ts. The review row is created
 * lazily on a word's first-ever review.
 */
export async function submitVocabularyReview(
  args: SubmitVocabularyReviewInput,
): Promise<SubmitVocabularyReviewResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = submitVocabularyReviewSchema.parse(args);

  const word = await prisma.vocabularyWord.findUnique({
    where: { id: parsed.vocabularyWordId },
    select: {
      userId: true,
      review: { select: { intervalDays: true, correctStreak: true } },
    },
  });
  if (!word || word.userId !== userId) {
    throw new Error("Vocabulary word not found.");
  }

  const currentState = word.review ?? { intervalDays: 0, correctStreak: 0 };
  const next = scheduleNextReview(currentState, parsed.correct);

  await prisma.vocabularyReview.upsert({
    where: { vocabularyWordId: parsed.vocabularyWordId },
    create: {
      userId,
      vocabularyWordId: parsed.vocabularyWordId,
      nextReviewAt: next.nextReviewAt,
      intervalDays: next.intervalDays,
      correctStreak: next.correctStreak,
      lastReviewedAt: next.lastReviewedAt,
    },
    update: {
      nextReviewAt: next.nextReviewAt,
      intervalDays: next.intervalDays,
      correctStreak: next.correctStreak,
      lastReviewedAt: next.lastReviewedAt,
    },
  });

  revalidatePath("/reader/progress");
  return { correctStreak: next.correctStreak, intervalDays: next.intervalDays };
}
