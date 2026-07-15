"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitListeningAttemptSchema, type SubmitListeningAttemptInput } from "@/lib/games/schema";
import { gradeSegment } from "@/lib/games/listeningScoring";
import { fractionScore } from "@/lib/games/visualScoring";

export interface ListeningSegmentResult {
  blanks: boolean[];
  blankAnswers: string[];
  choiceCorrect: boolean;
  correctIndex: number;
}

export interface ListeningAttemptResult {
  score: number;
  correctCount: number;
  totalCount: number;
  perSegment: ListeningSegmentResult[];
  baselineComprehension: number | null;
}

/**
 * Grades one listening-game play-through (F-015). The answer key lives only
 * on ListeningSegment.questions, so grading happens here; the results
 * include the reveal (correct words and option index) for the results
 * screen, after the attempt is recorded.
 */
export async function submitListeningAttempt(args: SubmitListeningAttemptInput): Promise<ListeningAttemptResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = submitListeningAttemptSchema.parse(args);

  const game = await prisma.listeningGame.findUnique({
    where: { id: parsed.listeningGameId },
    select: {
      userId: true,
      segments: {
        orderBy: { orderIndex: "asc" },
        select: { questions: true },
      },
    },
  });
  if (!game || game.userId !== userId) {
    throw new Error("Game not found.");
  }

  let correctCount = 0;
  let totalCount = 0;
  const perSegment: ListeningSegmentResult[] = [];

  game.segments.forEach((segment: { questions: unknown }, index: number) => {
    const key = segment.questions as {
      blankAnswers: string[];
      question: { correctIndex: number };
    };
    const given = parsed.answers[index] ?? { blanks: [], choice: null };
    const graded = gradeSegment(given.blanks, key.blankAnswers, given.choice, key.question.correctIndex);
    perSegment.push({
      blanks: graded.blanks,
      blankAnswers: key.blankAnswers,
      choiceCorrect: graded.choiceCorrect,
      correctIndex: key.question.correctIndex,
    });
    correctCount += graded.correctCount;
    totalCount += graded.totalCount;
  });

  const score = fractionScore(correctCount, totalCount);

  const [baseline] = await Promise.all([
    prisma.baselineAssessment.findUnique({ where: { userId }, select: { comprehensionScore: true } }),
    prisma.listeningAttempt.create({
      data: {
        listeningGameId: parsed.listeningGameId,
        userId,
        answers: parsed.answers,
        score,
      },
    }),
  ]);

  return {
    score,
    correctCount,
    totalCount,
    perSegment,
    baselineComprehension: baseline?.comprehensionScore ?? null,
  };
}
