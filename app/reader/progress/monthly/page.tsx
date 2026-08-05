import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  computeMonthlyReport,
  dedupeLatestPerSession,
  filterByLocalMonth,
  localMonthString,
  type MonthlyMetric,
} from "@/lib/progress/monthlyReport";
import { collectQuestionResultsFromAttempts, computeVocabularyMastery } from "@/lib/progress/learningInsights";
import type { CompletedSessionStats } from "@/lib/progress/stats";

// Wide enough to guarantee full coverage of the current calendar month
// regardless of the user's timezone offset relative to the server — the
// exact boundary is then re-applied precisely in JS via filterByLocalMonth.
// See lib/progress/monthlyReport.ts for why this two-step approach is used
// instead of a timezone-exact DB query.
const DB_FETCH_BUFFER_DAYS = 35;

function MetricCard({ metric }: { metric: MonthlyMetric }) {
  const deltaLabel =
    metric.delta === null
      ? null
      : `${metric.delta.abs >= 0 ? "+" : ""}${Math.round(metric.delta.abs)}${metric.unit === "%" ? " pts" : ` ${metric.unit}`} (${metric.delta.pct >= 0 ? "+" : ""}${Math.round(metric.delta.pct)}%)`;
  const deltaColor =
    metric.delta === null ? "text-slate-400" : metric.delta.abs >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <div className="rounded-xl border border-slate-200 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">
        {metric.current !== null ? `${metric.current}${metric.unit === "%" ? "%" : ` ${metric.unit}`}` : "No data yet"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Baseline: {metric.baseline}
        {metric.unit === "%" ? "%" : ` ${metric.unit}`}
        {deltaLabel && <span className={`ml-2 font-medium ${deltaColor}`}>{deltaLabel}</span>}
      </p>
    </div>
  );
}

export default async function MonthlyReportPage() {
  const { userId } = await auth();
  if (!userId) {
    return null; // Guarded by app/reader/layout.tsx; this satisfies TS narrowing below.
  }

  const dbCutoff = new Date();
  dbCutoff.setDate(dbCutoff.getDate() - DB_FETCH_BUFFER_DAYS);

  const [baseline, user, allCompletedSessions, recentAttemptsForScore, recentAttemptsForQuestions, recentVocabWords, allVocabWords] =
    await Promise.all([
      prisma.baselineAssessment.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
      prisma.readingSession.findMany({
        where: { userId, status: "COMPLETED" },
        select: { wordCount: true, elapsedSeconds: true, completedAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, createdAt: { gte: dbCutoff } },
        select: { score: true, createdAt: true, quiz: { select: { sessionId: true } } },
      }),
      prisma.quizAttempt.findMany({
        where: { userId, createdAt: { gte: dbCutoff } },
        select: {
          answers: true,
          createdAt: true,
          quiz: {
            select: { questions: { orderBy: { orderIndex: "asc" }, select: { orderIndex: true, prompt: true, correctIndex: true } } },
          },
        },
      }),
      prisma.vocabularyWord.findMany({
        where: { userId, createdAt: { gte: dbCutoff } },
        select: { createdAt: true },
      }),
      prisma.vocabularyWord.findMany({
        where: { userId },
        select: { review: { select: { intervalDays: true, correctStreak: true } } },
      }),
    ]);

  if (!baseline) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">No baseline yet</h1>
        <p className="text-sm text-slate-500">
          Complete your{" "}
          <Link href="/onboarding/assessment" className="text-slate-900 underline">
            baseline assessment
          </Link>{" "}
          first — the monthly report compares your progress against it.
        </p>
      </div>
    );
  }

  const timezone = user?.timezone ?? "UTC";
  const now = new Date();
  const month = localMonthString(now, timezone);

  const monthSessions: CompletedSessionStats[] = filterByLocalMonth(
    allCompletedSessions.filter((s): s is CompletedSessionStats & { completedAt: Date } => s.completedAt !== null),
    (s) => s.completedAt,
    timezone,
    month,
  );

  const monthAttemptsForScore = filterByLocalMonth(recentAttemptsForScore, (a) => a.createdAt, timezone, month);
  const monthQuizScores = dedupeLatestPerSession(
    monthAttemptsForScore.map((a) => ({ sessionId: a.quiz.sessionId, score: a.score, createdAt: a.createdAt })),
  );

  const monthAttemptsForQuestions = filterByLocalMonth(recentAttemptsForQuestions, (a) => a.createdAt, timezone, month);
  const monthQuestionResults = collectQuestionResultsFromAttempts(monthAttemptsForQuestions);

  const vocabularyWordsAddedThisMonth = filterByLocalMonth(recentVocabWords, (w) => w.createdAt, timezone, month).length;
  const vocabularyMastery = computeVocabularyMastery(allVocabWords);

  const report = computeMonthlyReport({
    month,
    baseline: {
      readingSpeedWPM: baseline.readingSpeedWPM,
      comprehensionScore: baseline.comprehensionScore,
      vocabularyScore: baseline.vocabularyScore,
      inferenceScore: baseline.inferenceScore,
    },
    monthSessions,
    monthQuizScores,
    monthQuestionResults,
    vocabularyWordsAddedThisMonth,
    currentVocabularyMasteryPercent: vocabularyMastery.masteryPercent,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <Link href="/reader/progress" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ← Back to progress
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{report.monthLabel} report</h1>
        <p className="mt-1 text-sm text-slate-600">{report.headline}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard metric={report.wpm} />
        <MetricCard metric={report.comprehension} />
        <MetricCard metric={report.vocabulary} />
        <MetricCard metric={report.inference} />
      </div>

      <div className="rounded-xl border border-slate-200 px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">This month</p>
        <p className="mt-1 text-sm text-slate-900">
          {report.sessionsCompleted} session{report.sessionsCompleted === 1 ? "" : "s"} completed ·{" "}
          {report.vocabularyWordsAdded} vocabulary word{report.vocabularyWordsAdded === 1 ? "" : "s"} added
        </p>
      </div>
    </div>
  );
}
