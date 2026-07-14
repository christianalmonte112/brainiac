"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitVisualGameAttemptSchema, type SubmitVisualGameAttemptInput } from "@/lib/games/schema";
import { fractionScore, scorePositions } from "@/lib/games/visualScoring";

export interface VisualGameAttemptResult {
  score: number;
  correctCount: number;
  totalCount: number;
  /** perItem[itemIndex][position] — which selections were right. */
  perItem: boolean[][];
  /** The solutions, revealed only after grading, for the results screen. */
  solutions: number[][];
  baselineComprehension: number | null;
}

/**
 * Grades one visual-game play-through (F-013). Solutions live only in
 * VisualGameItem.correctAnswer, so grading must happen here — the client
 * never sees answers before submitting.
 */
export async function submitVisualGameAttempt(args: SubmitVisualGameAttemptInput): Promise<VisualGameAttemptResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = submitVisualGameAttemptSchema.parse(args);

  const game = await prisma.visualGame.findUnique({
    where: { id: parsed.visualGameId },
    select: {
      session: { select: { userId: true } },
      items: {
        orderBy: { orderIndex: "asc" },
        select: { correctAnswer: true },
      },
    },
  });
  if (!game || game.session.userId !== userId) {
    throw new Error("Game not found.");
  }

  let correctCount = 0;
  let totalCount = 0;
  const perItem: boolean[][] = [];
  const solutions: number[][] = [];

  game.items.forEach((item: { correctAnswer: unknown }, index: number) => {
    const solution = (item.correctAnswer as { selections?: number[] })?.selections ?? [];
    const given = parsed.answers[index]?.selections ?? [];
    const graded = scorePositions(given, solution);
    perItem.push(graded.perPosition);
    solutions.push(solution);
    correctCount += graded.correctCount;
    totalCount += graded.totalCount;
  });

  const score = fractionScore(correctCount, totalCount);

  const [baseline] = await Promise.all([
    prisma.baselineAssessment.findUnique({ where: { userId }, select: { comprehensionScore: true } }),
    prisma.visualGameAttempt.create({
      data: {
        visualGameId: parsed.visualGameId,
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
    perItem,
    solutions,
    baselineComprehension: baseline?.comprehensionScore ?? null,
  };
}
