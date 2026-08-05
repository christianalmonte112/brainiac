import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminFeedbackPage() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      message: true,
      page: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Feedback</h2>
          <p className="mt-1 text-xs text-slate-500">
            {feedback.length} submission{feedback.length === 1 ? "" : "s"} · most recent first
          </p>
        </div>
        <Link href="/admin" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ← Back to dashboard
        </Link>
      </div>

      {feedback.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          No feedback submitted yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {feedback.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{entry.message}</p>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {entry.user.name ?? entry.user.email ?? "Unknown user"}
                {entry.page ? ` · ${entry.page}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
