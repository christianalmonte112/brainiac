import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildReaderHomeInsight } from "@/lib/progress/learningInsights";
import { latestQuizScorePercent } from "@/lib/progress/stats";
import { dueVocabularyWordsWhere } from "@/lib/games/dueWords";

/** Reader library home — empty state with a personalized learning insight when available. */
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

  const insight = buildReaderHomeInsight({
    baselineWPM: baseline?.readingSpeedWPM ?? null,
    sessionCount,
    lastSessionTitle: lastSession?.title ?? null,
    lastQuizScorePercent: lastQuizScore,
    dueReviewCount,
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Select a document to start reading</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Choose something from your library on the left, or add a new document to get started.
      </p>
      {insight && (
        <p className="max-w-md rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {insight}
          {dueReviewCount > 0 && (
            <>
              {" "}
              <Link href="/reader/games/memory" className="font-medium text-slate-900 underline">
                Review now →
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
