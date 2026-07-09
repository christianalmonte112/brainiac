import { prisma } from "@/lib/prisma";

function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatScoreAsPercent(score: number | null): string {
  if (score === null) return "0%";
  return `${Math.round(score * 100)}%`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalSignups,
    baselineCompletedCount,
    newSignupsThisWeek,
    totalSessionsCreated,
    totalSessionsCompleted,
    totalChunksRead,
    totalSummariesWritten,
    totalHighlightInteractions,
    totalTutorMessages,
    totalQuizzesTaken,
    avgQuizScore,
    totalVocabularyWords,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.baselineAssessment.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.readingSession.count(),
    prisma.readingSession.count({ where: { status: "COMPLETED" } }),
    prisma.chunkSummary.count(),
    prisma.chunkSummary.count({ where: { summaryText: { not: null } } }),
    prisma.highlightInteraction.count(),
    prisma.tutorMessage.count(),
    prisma.quizAttempt.count(),
    prisma.quizAttempt.aggregate({ _avg: { score: true } }),
    prisma.vocabularyWord.count(),
  ]);

  const assessmentCompletionRate = formatPercent(baselineCompletedCount, totalSignups);
  const sessionCompletionRate = formatPercent(totalSessionsCompleted, totalSessionsCreated);
  const averageQuizScore = formatScoreAsPercent(avgQuizScore._avg.score);
  const averageWordsPerUser = totalSignups > 0 ? (totalVocabularyWords / totalSignups).toFixed(1) : "0.0";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total signups" value={totalSignups.toLocaleString()} />
          <StatCard label="Baseline completed" value={baselineCompletedCount.toLocaleString()} />
          <StatCard label="Assessment completion rate" value={assessmentCompletionRate} />
          <StatCard label="New signups (7 days)" value={newSignupsThisWeek.toLocaleString()} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Engagement</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Sessions created" value={totalSessionsCreated.toLocaleString()} />
          <StatCard label="Sessions completed" value={totalSessionsCompleted.toLocaleString()} />
          <StatCard label="Session completion rate" value={sessionCompletionRate} />
          <StatCard label="Total chunks read" value={totalChunksRead.toLocaleString()} />
          <StatCard label="Total summaries written" value={totalSummariesWritten.toLocaleString()} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Usage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Highlight interactions" value={totalHighlightInteractions.toLocaleString()} />
          <StatCard label="Socratic tutor messages" value={totalTutorMessages.toLocaleString()} />
          <StatCard label="Quizzes taken" value={totalQuizzesTaken.toLocaleString()} />
          <StatCard label="Average quiz score" value={averageQuizScore} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Vocabulary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <StatCard label="Vocabulary words saved" value={totalVocabularyWords.toLocaleString()} />
          <StatCard label="Average words per user" value={averageWordsPerUser} />
        </div>
      </section>
    </main>
  );
}
