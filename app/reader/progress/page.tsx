import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { computeReadingStreak } from "@/lib/progress/streak";
import { buildGrowthSeries, computeAverageWPM, type CompletedSessionStats } from "@/lib/progress/stats";
import { TickerChart } from "./TickerChart";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function ProgressPage() {
  const { userId } = await auth();

  const [baseline, completedSessions, vocabularyWordsCount, user] = userId
    ? await Promise.all([
        prisma.baselineAssessment.findUnique({ where: { userId } }),
        prisma.readingSession.findMany({
          where: { userId, status: "COMPLETED" },
          select: { wordCount: true, elapsedSeconds: true, completedAt: true },
        }),
        prisma.vocabularyWord.count({ where: { userId } }),
        prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
      ])
    : [null, [], 0, null];

  // Falls back to UTC if the browser-detected timezone hasn't synced yet
  // (e.g. a user's very first page load, or JS-disabled) — same behavior
  // as before timezone tracking existed, just not the common case.
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your progress</h1>
        <p className="mt-1 text-sm text-slate-500">Baseline taken {baseline.takenAt.toLocaleDateString()}.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Reading streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        <StatCard label="Sessions completed" value={String(completedSessions.length)} />
        <StatCard label="Vocabulary words learned" value={String(vocabularyWordsCount)} />
      </div>

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
              <td className="py-2 text-slate-500">—</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-700">Vocabulary</td>
              <td className="py-2 text-slate-900">{baseline.vocabularyScore}%</td>
              <td className="py-2 text-slate-900">{vocabularyWordsCount} words saved</td>
            </tr>
            <tr>
              <td className="py-2 text-slate-700">Inference</td>
              <td className="py-2 text-slate-900">{baseline.inferenceScore}%</td>
              <td className="py-2 text-slate-500">—</td>
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
