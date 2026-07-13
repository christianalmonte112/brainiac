import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/reading-sessions/chunking";
import { ChunkReader } from "./ChunkReader";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

/** Reading area for a single document — paragraph-chunked, one section unlocked at a time (F-002). */
export default async function ReadingSessionPage({ params }: SessionPageProps) {
  const { sessionId } = await params;
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const session = await prisma.readingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    notFound();
  }

  const chunks = chunkText(session.sourceText);

  if (chunks.length === 0) {
    return (
      <article className="mx-auto flex w-full max-w-2xl flex-col px-6 py-10">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{session.wordCount ?? 0} words</p>
        </header>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-700">
            This document does not contain readable text yet. Edit the session and add text to start reading.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col">
      <header className="mx-auto w-full max-w-2xl px-6 pt-10">
        <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{session.wordCount ?? 0} words</p>
      </header>
      <ChunkReader
        sessionId={session.id}
        chunks={chunks}
        initialChunkIndex={session.currentChunkIndex}
        documentTitle={session.title}
        documentText={session.sourceText}
      />
    </article>
  );
}
