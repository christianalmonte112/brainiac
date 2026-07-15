import { prisma } from "@/lib/prisma";
import { computeAverageQuizScore } from "@/lib/progress/stats";
import {
  buildSessionLearningReport,
  type QuestionResult,
  type SessionLearningReport,
} from "@/lib/progress/learningInsights";

const THIRTY_DAYS_MS = 30 * 86_400_000;

/** Builds the post-quiz learning snapshot (separate from submit for fast grading). */
export async function fetchSessionLearningReport(
  userId: string,
  quizId: string,
  scorePercent: number,
): Promise<SessionLearningReport | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      attempts: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { answers: true },
      },
      session: { select: { userId: true, id: true } },
    },
  });

  if (!quiz || quiz.session.userId !== userId) return null;

  const latestAttempt = quiz.attempts[0];
  if (!latestAttempt || !Array.isArray(latestAttempt.answers)) return null;

  const answers = latestAttempt.answers as number[];
  const questionResults: QuestionResult[] = quiz.questions.map((q) => {
    const selected = answers[q.orderIndex] ?? -1;
    return {
      prompt: q.prompt,
      orderIndex: q.orderIndex,
      isCorrect: selected === q.correctIndex,
    };
  });

  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  const [chunkScores, vocabularyWordsAdded, recentAttempts] = await Promise.all([
    prisma.chunkSummary.findMany({
      where: { sessionId: quiz.sessionId },
      select: { chunkIndex: true, aiScore: true },
    }),
    prisma.vocabularyWord.count({
      where: { userId, sourceSessionId: quiz.sessionId },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: {
        score: true,
        createdAt: true,
        quiz: { select: { sessionId: true } },
      },
    }),
  ]);

  const attemptStats = recentAttempts.map((a) => ({
    sessionId: a.quiz.sessionId,
    score: a.score,
    createdAt: a.createdAt,
  }));

  return buildSessionLearningReport({
    scorePercent,
    avgScore30Day: computeAverageQuizScore(attemptStats),
    chunkScores,
    vocabularyWordsAdded,
    questionResults,
  });
}
