import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Owner-only roster of Brainiac users (Postgres rows created at invited signup). */
export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      baselineAssessment: { select: { id: true, takenAt: true } },
      _count: { select: { readingSessions: true } },
    },
  });

  const withBaseline = users.filter((user) => user.baselineAssessment).length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Users on Brainiac</h2>
          <p className="mt-1 text-xs text-slate-500">
            {users.length} user{users.length === 1 ? "" : "s"} · {withBaseline} completed baseline · newest first
          </p>
        </div>
        <Link href="/admin" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ← Back to dashboard
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        These are people who signed up with an accepted invite (or were created before the invite gate). Banned
        uninvited accounts never get a row here.
      </p>

      {users.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          No users yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.name?.trim() || "No name"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email ?? "No email"}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className={
                    user.baselineAssessment
                      ? "rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
                      : "rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"
                  }
                >
                  {user.baselineAssessment ? "Baseline done" : "No baseline"}
                </span>
                <span>
                  {user._count.readingSessions} session{user._count.readingSessions === 1 ? "" : "s"}
                </span>
                <span className="text-slate-400">Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
