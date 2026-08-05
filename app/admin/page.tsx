import { clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
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
    onboardedUsers,
    baselineCompletedCount,
    onboardedThisWeek,
    totalSessionsCreated,
    totalSessionsCompleted,
    totalChunksRead,
    totalSummariesWritten,
    totalHighlightInteractions,
    totalTutorMessages,
    totalQuizzesTaken,
    avgQuizScore,
    totalVocabularyWords,
    totalFeedbackCount,
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
    prisma.feedback.count(),
  ]);

  // The true Clerk signup count — NOT the same as onboardedUsers above.
  //
  // A User row is now created immediately at signup via the Clerk webhook
  // (see app/api/clerk/webhook/route.ts, Phase 5). Before that webhook
  // existed, the only place a User row was ever created was inside
  // submitBaselineAssessment — at the very end of onboarding — which meant
  // prisma.user.count() could only ever count people who'd already
  // finished onboarding. We still pull the signup count from Clerk's own
  // API rather than Postgres: it remains the more defensive source of
  // truth (e.g. if the webhook were ever misconfigured or missed an
  // event, Clerk's count can't silently drift the way a derived Postgres
  // count could), and it costs nothing extra to ask Clerk directly.
  const client = await clerkClient();
  const totalClerkSignups = await client.users.getCount();

  const assessmentCompletionRate = formatPercent(baselineCompletedCount, totalClerkSignups);
  const sessionCompletionRate = formatPercent(totalSessionsCompleted, totalSessionsCreated);
  const averageQuizScore = formatScoreAsPercent(avgQuizScore._avg.score);
  // Deliberately averaged over onboarded users, not total signups — vocabulary
  // words can only ever belong to a user who has a Postgres row at all, so
  // "per onboarded user" is the meaningful denominator here.
  const averageWordsPerUser = onboardedUsers > 0 ? (totalVocabularyWords / onboardedUsers).toFixed(1) : "0.0";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Users</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total signups" value={totalClerkSignups.toLocaleString()} />
          <StatCard label="Baseline completed" value={baselineCompletedCount.toLocaleString()} />
          <StatCard label="Assessment completion rate" value={assessmentCompletionRate} />
          <StatCard label="Onboarded this week" value={onboardedThisWeek.toLocaleString()} />
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Vocabulary</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <StatCard label="Vocabulary words saved" value={totalVocabularyWords.toLocaleString()} />
          <StatCard label="Average words per user" value={averageWordsPerUser} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Feedback</h2>
          <Link href="/admin/feedback" className="text-xs font-medium text-slate-500 hover:text-slate-800">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Feedback submissions" value={totalFeedbackCount.toLocaleString()} />
        </div>
      </section>
    </main>
  );
}
