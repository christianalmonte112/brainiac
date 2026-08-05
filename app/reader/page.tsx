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
    <div className="relative flex h-full flex-col items-center justify-center bg-[#F8F8FA] px-6 py-10 text-center [background-image:radial-gradient(#0f172a_0.75px,transparent_0.75px)] [background-size:16px_16px]">
      <div className="flex max-w-lg flex-col items-center">
        {/* Open-book mark from the ChatGPT empty-state mock (inline so we skip lucide). */}
        <svg
          viewBox="0 0 24 24"
          className="mb-4 h-10 w-10 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
          />
        </svg>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Select a document to start reading</h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose something from your library on the left, or add a new document to get started.
        </p>

        {showBaselineCard && (
          <div className="mt-8 w-full border border-slate-900 bg-white p-6 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-base text-slate-800">
              Your baseline reading speed is <span className="font-bold text-slate-900">{baselineWPM} WPM</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Paste something ~500 words to start.</p>
          </div>
        )}

        {insight && (
          <div className="mt-8 w-full border border-slate-900 bg-white p-6 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-sm text-slate-800">
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
          </div>
        )}
      </div>
    </div>
  );
}
