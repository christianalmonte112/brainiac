import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { VisualGames } from "./VisualGames";

interface VisualGamesPageProps {
  searchParams?: Promise<{ sessionId?: string }> | { sessionId?: string };
}

/**
 * Visual learning games (F-013). Normally reached from a session's
 * completion screen with ?sessionId=…; visited bare (e.g. from the games
 * hub) it offers the user's recently completed sessions to pick from.
 */
export default async function VisualGamesPage({ searchParams }: VisualGamesPageProps) {
  const { userId } = await auth();

  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<{ sessionId?: string }>).then === "function"
      ? await (searchParams as Promise<{ sessionId?: string }>)
      : ((searchParams as { sessionId?: string } | undefined) ?? {});
  const sessionId = resolvedSearchParams.sessionId;

  if (!sessionId) {
    const recentSessions = userId
      ? await prisma.readingSession.findMany({
          where: { userId, status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 5,
          select: { id: true, title: true },
        })
      : [];

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visual games</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a finished document to generate games from.</p>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-slate-500">
            No completed documents yet.{" "}
            <Link href="/reader" className="font-medium text-slate-900 underline">
              Finish a reading session
            </Link>{" "}
            to unlock visual games.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentSessions.map((session: { id: string; title: string }) => (
              <Link
                key={session.id}
                href={`/reader/games/visual?sessionId=${session.id}`}
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400"
              >
                {session.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const session = userId
    ? await prisma.readingSession.findUnique({
        where: { id: sessionId },
        select: { userId: true, title: true },
      })
    : null;

  if (!session || session.userId !== userId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Document not found</h1>
        <p className="text-sm text-slate-500">
          <Link href="/reader/games/visual" className="font-medium text-slate-900 underline">
            Pick one of your documents
          </Link>{" "}
          to play visual games.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visual games</h1>
        <p className="mt-1 text-sm text-slate-500">Generated from “{session.title}”.</p>
      </div>
      <VisualGames sessionId={sessionId} sessionTitle={session.title} />
    </div>
  );
}
