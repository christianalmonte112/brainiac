import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildReaderHomeInsight } from "@/lib/progress/learningInsights";
import { latestQuizScorePercent } from "@/lib/progress/stats";
import { dueVocabularyWordsWhere } from "@/lib/games/dueWords";
import { ReaderEmptyHero } from "./ReaderEmptyHero";

/** Reader library home — ChatGPT monochrome empty state. */
export default async function ReaderPage() {
  const { userId } = await auth();

  const [baseline, sessionCount, lastSession, dueReviewCount] = userId
    ? await Promise.all([
        prisma.baselineAssessment.findUnique({
          where: { userId },
          select: { readingSpeedWPM: true },
        }),
        prisma.readingSession.count({ where: { userId, status: { not: "ARCHIVED" } } }),
        prisma.readingSession.findFirst({
          where: { userId, status: { not: "ARCHIVED" } },
          orderBy: { updatedAt: "desc" },
          select: {
            title: true,
            quizzes: {
              select: {
                attempts: {
                  where: { userId },
                  orderBy: { createdAt: "desc" },
                  select: { score: true, createdAt: true },
                },
              },
            },
          },
        }),
        prisma.vocabularyWord.count({ where: dueVocabularyWordsWhere(userId) }),
      ])
    : [null, 0, null, 0];

  const lastQuizScore = lastSession
    ? latestQuizScorePercent(lastSession.quizzes.flatMap((q) => q.attempts))
    : null;

  const baselineWPM = baseline?.readingSpeedWPM ?? null;
  const showBaselineCard = sessionCount === 0 && baselineWPM !== null;

  const insight = showBaselineCard
    ? null
    : buildReaderHomeInsight({
        baselineWPM,
        sessionCount,
        lastSessionTitle: lastSession?.title ?? null,
        lastQuizScorePercent: lastQuizScore,
        dueReviewCount,
      });

  return (
    <ReaderEmptyHero
      baselineWPM={baselineWPM}
      showBaselineCard={showBaselineCard}
      insight={insight}
      dueReviewCount={dueReviewCount}
    />
  );
}
