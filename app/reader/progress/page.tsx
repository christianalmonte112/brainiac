import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { computeReadingStreak } from "@/lib/progress/streak";
import {
  buildGrowthSeries,
  computeAverageQuizScore,
  computeAverageWPM,
  latestQuizScorePercent,
  type CompletedSessionStats,
  type QuizAttemptStat,
} from "@/lib/progress/stats";
import {
  accuracyForQuestionType,
  analyzeWeakAreas,
  buildFrictionPoints,
  buildNextActions,
  collectQuestionResultsFromAttempts,
  computeVocabularyMastery,
} from "@/lib/progress/learningInsights";
import { dueVocabularyWordsWhere } from "@/lib/games/dueWords";
import { syncEarnedBadges } from "@/lib/badges/sync";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import { BadgeShelf } from "./BadgeShelf";
import { ShareCard } from "./ShareCard";
import { BillingPanel } from "./BillingPanel";
import { TickerChart } from "./TickerChart";
import { getSubscriptionForUser } from "@/lib/subscription/getSubscription";
import { isPremiumStatus } from "@/lib/subscription/status";

const RECENT_SESSION_LIMIT = 10;
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86_400_000);

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function scoreBadgeClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (pct >= 60) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

/** F-006 progress dashboard — stats, learning insights, baseline comparison, growth chart. */
export default async function ProgressPage() {
  const { userId } = await auth();

  const [
    baseline,
    completedSessions,
    vocabularyWords,
    dueReviewCount,
    user,
    totalSessions,
    recentSessions,
    quizAttempts,
    gradedAttempts,
    inProgressSessions,
    recentHighlights,
  ] = userId
    ? await Promise.all([
        prisma.baselineAssessment.findUnique({ where: { userId } }),
        prisma.readingSession.findMany({
          where: { userId, status: "COMPLETED" },
          select: { wordCount: true, elapsedSeconds: true, completedAt: true },
        }),
        prisma.vocabularyWord.findMany({
          where: { userId },
          select: { review: { select: { intervalDays: true, correctStreak: true } } },
        }),
        prisma.vocabularyWord.count({ where: dueVocabularyWordsWhere(userId) }),
        prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
        prisma.readingSession.count({ where: { userId, status: { not: "ARCHIVED" } } }),
        prisma.readingSession.findMany({
          where: { userId, status: { not: "ARCHIVED" } },
          orderBy: { updatedAt: "desc" },
          take: RECENT_SESSION_LIMIT,
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
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
        prisma.quizAttempt.findMany({
          where: { userId, createdAt: { gte: THIRTY_DAYS_AGO } },
          select: {
            score: true,
            createdAt: true,
            quiz: { select: { sessionId: true } },
          },
        }),
        prisma.quizAttempt.findMany({
          where: { userId, createdAt: { gte: THIRTY_DAYS_AGO } },
          select: {
            answers: true,
            quiz: {
              select: {
                questions: {
                  orderBy: { orderIndex: "asc" },
                  select: { orderIndex: true, prompt: true, correctIndex: true },
                },
              },
            },
          },
        }),
        prisma.readingSession.findMany({
          where: { userId, status: "ACTIVE" },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: { id: true, title: true },
        }),
        prisma.highlightInteraction.findMany({
          where: { userId, createdAt: { gte: THIRTY_DAYS_AGO } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { selectedText: true },
        }),
      ])
    : [null, [], [], 0, null, 0, [], [], [], [], []];

  const subscription = userId ? await getSubscriptionForUser(userId) : null;

  const timezone = user?.timezone ?? "UTC";

  if (!baseline) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No baseline yet</h1>
        <p className="text-sm text-slate-500">
          Complete your{" "}
          <Link href="/onboarding/assessment" className="font-medium text-slate-900 underline">
            baseline assessment
          </Link>{" "}
          to unlock your progress dashboard.
        </p>
      </div>
    );
  }

  const completionDates = completedSessions
    .map((session: CompletedSessionStats) => session.completedAt)
    .filter((date: Date | null): date is Date => date !== null);

  const streak = computeReadingStreak(completionDates, timezone);
  const growthSeries = buildGrowthSeries(completedSessions, timezone);
  const currentWPM = computeAverageWPM(completedSessions);

  const attemptStats: QuizAttemptStat[] = quizAttempts.map((a) => ({
    sessionId: a.quiz.sessionId,
    score: a.score,
    createdAt: a.createdAt,
  }));
  const avgQuizScore = computeAverageQuizScore(attemptStats);

  const vocabularyMastery = computeVocabularyMastery(vocabularyWords);
  const questionResults = collectQuestionResultsFromAttempts(gradedAttempts);
  const weakAreas = analyzeWeakAreas(questionResults);
  const frictionPoints = buildFrictionPoints(weakAreas, recentHighlights);
  const inferenceAccuracy = accuracyForQuestionType(questionResults, "inference");

  // F-021: re-evaluate and persist any newly-earned badges on every load —
  // see lib/badges/sync.ts for why this is "sync on read" rather than
  // event-driven hooks. completedSessions.length (not totalSessions, which
  // also counts in-progress ones) is the right denominator for the
  // sessions_* badges.
  let earnedBadgeKeys = new Set<string>();
  if (userId) {
    await syncEarnedBadges(userId, {
      currentStreak: streak,
      completedSessions: completedSessions.length,
      currentWPM,
      baselineWPM: baseline.readingSpeedWPM,
      avgQuizScorePercent: avgQuizScore,
      masteredVocabularyCount: vocabularyMastery.masteredCount,
    });
    const earnedBadges = await prisma.badge.findMany({ where: { userId }, select: { key: true } });
    earnedBadgeKeys = new Set(earnedBadges.map((b) => b.key));
  }

  const lowScoreSessions = recentSessions
    .map((session) => {
      const flatAttempts = session.quizzes.flatMap((q) => q.attempts);
      const scorePct = latestQuizScorePercent(flatAttempts);
      return scorePct !== null && scorePct < 60
        ? { id: session.id, title: session.title, scorePercent: scorePct }
        : null;
    })
    .filter((s): s is { id: string; title: string; scorePercent: number } => s !== null);

  const unfinishedQuizzes = recentSessions
    .filter((session) => {
      if (session.status !== "COMPLETED") return false;
      const flatAttempts = session.quizzes.flatMap((q) => q.attempts);
      return flatAttempts.length === 0;
    })
    .map((session) => ({ id: session.id, title: session.title }));

  const nextActions = buildNextActions({
    dueReviewCount,
    atRiskWordCount: vocabularyMastery.atRiskCount,
    inProgressSessions,
    lowScoreSessions,
    unfinishedQuizzes,
    weakAreas,
    highlightCount30Days: recentHighlights.length,
  });

  const memoryGameSubtext =
    dueReviewCount === 0
      ? vocabularyMastery.atRiskCount > 0
        ? `${vocabularyMastery.atRiskCount} word${vocabularyMastery.atRiskCount === 1 ? "" : "s"} at risk — practice to lock them in.`
        : "All caught up — no words due for review."
      : `${dueReviewCount} word${dueReviewCount === 1 ? "" : "s"} due · ${vocabularyMastery.masteryPercent ?? 0}% mastered overall`;

  const isPremium = subscription ? isPremiumStatus(subscription.status) : false;
  const renewsAt = subscription?.currentPeriodEnd
    ? subscription.currentPeriodEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your progress</h1>
        <p className="mt-1 text-sm text-slate-500">Baseline taken {baseline.takenAt.toLocaleDateString()}.</p>
      </div>

      <div className="rounded-xl border border-slate-900 bg-slate-900 p-5 text-white">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">What to work on next</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {nextActions.map((action) => (
            <li key={`${action.href}-${action.title}`}>
              <Link href={action.href} className="group block rounded-lg bg-white/10 px-4 py-3 transition-colors hover:bg-white/15">
                <p className="text-sm font-semibold">{action.title}</p>
                <p className="mt-0.5 text-xs text-slate-300">{action.reason}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Reading streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        <StatCard label="Total sessions" value={String(totalSessions)} />
        <StatCard
          label="Avg quiz score"
          value={avgQuizScore !== null ? `${avgQuizScore}%` : "—"}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Subscription</h2>
        <div className="mt-3">
          <BillingPanel
            isPremium={isPremium}
            statusLabel={subscription?.status ?? "NONE"}
            renewsAt={renewsAt}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Badges ({earnedBadgeKeys.size}/{BADGE_DEFINITIONS.length})
        </h2>
        <div className="mt-3">
          <BadgeShelf earnedKeys={earnedBadgeKeys} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Share your progress</h2>
        <div className="mt-3 rounded-xl border border-slate-200 p-4">
          <ShareCard
            currentWPM={currentWPM}
            baselineWPM={baseline.readingSpeedWPM}
            streak={streak}
            avgQuizScorePercent={avgQuizScore}
            earnedBadgeKeys={[...earnedBadgeKeys]}
          />
        </div>
      </div>

      {totalSessions === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">No documents yet — add one from your library to start tracking progress.</p>
          <Link href="/reader" className="mt-3 inline-block text-sm font-medium text-slate-900 underline">
            Go to library
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent sessions</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recentSessions.map((session) => {
              const flatAttempts = session.quizzes.flatMap((q) => q.attempts);
              const scorePct = latestQuizScorePercent(flatAttempts);
              const dateLabel = session.updatedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <li key={session.id}>
                  <Link
                    href={`/reader/${session.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-slate-400"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{session.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{dateLabel}</p>
                    </div>
                    {scorePct !== null ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${scoreBadgeClass(scorePct)}`}
                      >
                        {scorePct}%
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-slate-400">No quiz</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {frictionPoints.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <h2 className="text-sm font-semibold text-amber-900">Friction points (last 30 days)</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {frictionPoints.map((bullet) => (
              <li key={bullet} className="text-sm text-amber-800">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/reader/games/memory"
        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4 transition-colors hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Memory game</p>
          <p className="mt-0.5 text-xs text-slate-500">{memoryGameSubtext}</p>
        </div>
        <span className="text-sm font-medium text-slate-600">
          {dueReviewCount > 0 ? `${dueReviewCount} due →` : "Practice →"}
        </span>
      </Link>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Baseline vs. current</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 font-medium">Metric</th>
              <th className="py-2 font-medium">Baseline</th>
              <th className="py-2 font-medium">Current</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 text-slate-700">Reading speed</td>
              <td className="py-2 text-slate-900">{baseline.readingSpeedWPM} WPM</td>
              <td className="py-2 text-slate-900">{currentWPM !== null ? `${currentWPM} WPM` : "Not enough data yet"}</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-700">Comprehension</td>
              <td className="py-2 text-slate-900">{baseline.comprehensionScore}%</td>
              <td className="py-2 text-slate-900">{avgQuizScore !== null ? `${avgQuizScore}%` : "—"}</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-700">Vocabulary</td>
              <td className="py-2 text-slate-900">{baseline.vocabularyScore}%</td>
              <td className="py-2 text-slate-900">
                {vocabularyMastery.masteryPercent !== null
                  ? `${vocabularyMastery.masteryPercent}% mastered (${vocabularyMastery.totalWords} saved${vocabularyMastery.atRiskCount > 0 ? `, ${vocabularyMastery.atRiskCount} at risk` : ""})`
                  : "—"}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-slate-700">Inference</td>
              <td className="py-2 text-slate-900">{baseline.inferenceScore}%</td>
              <td className="py-2 text-slate-900">
                {inferenceAccuracy !== null ? `${inferenceAccuracy}%` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Reading speed over time</h2>
        <div className="mt-3 rounded-xl border border-slate-200 p-4">
          <TickerChart points={growthSeries} baselineWPM={baseline.readingSpeedWPM} />
        </div>
      </div>
    </div>
  );
}
