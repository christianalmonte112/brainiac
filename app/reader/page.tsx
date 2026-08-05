import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildReaderHomeInsight } from "@/lib/progress/learningInsights";
import { latestQuizScorePercent } from "@/lib/progress/stats";
import { dueVocabularyWordsWhere } from "@/lib/games/dueWords";

/** Reader library home — Gemini empty canvas: black dots fading in the center, black type, book mark. */
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
    <div className="relative flex h-full flex-col items-center justify-center bg-white p-8 text-center">
      {/* Black micro-dots — dense at edges, fade out toward the middle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,transparent_0%,transparent_22%,rgba(0,0,0,0.45)_55%,#000_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,transparent_0%,transparent_22%,rgba(0,0,0,0.45)_55%,#000_100%)]"
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center">
        {/* Black open book */}
        <svg
          viewBox="0 0 24 24"
          className="mb-5 h-11 w-11 text-black"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>

        <h1 className="text-2xl font-bold tracking-tight text-black">Select a document to start reading</h1>
        <p className="mt-2 text-sm text-black/70">
          Choose something from your library on the left, or add a new document to get started.
        </p>

        {showBaselineCard && (
          <div className="mt-8 w-full border border-black bg-white px-6 py-5 text-center">
            <p className="text-base text-black">
              Your baseline reading speed is <span className="font-bold">{baselineWPM} WPM</span>
            </p>
            <p className="mt-1 text-xs text-black/55">Paste something ~500 words to recalculate your baseline.</p>
          </div>
        )}

        {insight && (
          <div className="mt-8 w-full border border-black bg-white px-6 py-5 text-center">
            <p className="text-sm text-black">
              {insight}
              {dueReviewCount > 0 && (
                <>
                  {" "}
                  <Link href="/reader/games/memory" className="font-medium underline">
                    Review now →
                  </Link>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
