"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { countWords } from "@/lib/text/word-count";
import { createReadingSessionSchema, submitChunkSummarySchema } from "@/lib/reading-sessions/schema";
import { scoreChunkSummary } from "@/lib/prompts/scoreSummary";

export interface CreateSessionActionState {
  error?: string;
}

/** Creates a reading session from pasted text, then redirects to its detail page. */
export async function createReadingSession(
  _prevState: CreateSessionActionState,
  formData: FormData,
): Promise<CreateSessionActionState> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = createReadingSessionSchema.safeParse({
    title: formData.get("title"),
    sourceText: formData.get("sourceText"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const session = await prisma.readingSession.create({
    data: {
      userId,
      title: parsed.data.title,
      sourceText: parsed.data.sourceText,
      wordCount: countWords(parsed.data.sourceText),
      status: "ACTIVE",
    },
  });

  revalidatePath("/reader");
  redirect(`/reader/${session.id}`);
}

/** Deletes a session the caller owns. Silently no-ops if it's already gone or not owned by the caller. */
export async function deleteReadingSession(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const sessionId = formData.get("sessionId");
  if (typeof sessionId === "string" && sessionId.length > 0) {
    await prisma.readingSession.deleteMany({ where: { id: sessionId, userId } });
  }

  revalidatePath("/reader");
  redirect("/reader");
}

export interface SubmitChunkSummaryResult {
  completed: boolean;
  /** Claude score 0–100. Only present when mode is "summary" and scoring succeeded. */
  aiScore?: number;
  /** 1–2 sentence feedback from Claude. Present alongside aiScore. */
  aiFeedback?: string;
}

export interface SubmitChunkSummaryArgs {
  sessionId: string;
  chunkIndex: number;
  totalChunks: number;
  mode: "summary" | "keywords";
  summaryText?: string;
  keywords?: string[];
  chunkSeconds?: number;
  /** Original chunk text — passed to Claude for summary scoring. Not persisted. */
  chunkText?: string;
}

/**
 * Records a reader's micro-summary or chosen keywords for one chunk (F-003),
 * then advances reading progress. This is the only path that can move
 * currentChunkIndex forward — there's no "skip" action, so the next chunk
 * stays locked until a valid summary or exactly 3 keywords are submitted.
 */
export async function submitChunkSummary(args: SubmitChunkSummaryArgs): Promise<SubmitChunkSummaryResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = submitChunkSummarySchema.parse(args);
  const nextChunkIndex = parsed.chunkIndex + 1;
  const completed = nextChunkIndex >= parsed.totalChunks;

  const session = await prisma.readingSession.findUnique({
    where: { id: parsed.sessionId },
    select: { userId: true },
  });
  if (!session || session.userId !== userId) {
    throw new Error("Reading session not found.");
  }

  // Persist the summary and advance session progress atomically.
  await prisma.$transaction([
    prisma.chunkSummary.upsert({
      where: { sessionId_chunkIndex: { sessionId: parsed.sessionId, chunkIndex: parsed.chunkIndex } },
      create: {
        sessionId: parsed.sessionId,
        chunkIndex: parsed.chunkIndex,
        summaryText: parsed.mode === "summary" ? parsed.summaryText : null,
        keywords: parsed.mode === "keywords" ? (parsed.keywords ?? []) : [],
      },
      update: {
        summaryText: parsed.mode === "summary" ? parsed.summaryText : null,
        keywords: parsed.mode === "keywords" ? (parsed.keywords ?? []) : [],
        aiScore: null,
        aiFeedback: null,
      },
    }),
    prisma.readingSession.update({
      where: { id: parsed.sessionId },
      data: {
        currentChunkIndex: nextChunkIndex,
        elapsedSeconds: { increment: parsed.chunkSeconds },
        ...(completed ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    }),
  ]);

  // Score summary-mode submissions with Claude. This runs after the DB write
  // so a Claude timeout never blocks progress. Keywords mode doesn't get
  // sentence scoring — we return without a score for that path.
  if (parsed.mode === "summary" && parsed.summaryText) {
    const chunkSummaryRecord = await prisma.chunkSummary.findUnique({
      where: { sessionId_chunkIndex: { sessionId: parsed.sessionId, chunkIndex: parsed.chunkIndex } },
      select: { id: true },
    });

    try {
      const { score, feedback } = await scoreChunkSummary(args.chunkText ?? "", parsed.summaryText);

      if (chunkSummaryRecord) {
        await prisma.chunkSummary.update({
          where: { id: chunkSummaryRecord.id },
          data: { aiScore: score, aiFeedback: feedback },
        });
      }

      revalidatePath(`/reader/${parsed.sessionId}`);
      return { completed, aiScore: score, aiFeedback: feedback };
    } catch {
      // Scoring failure is non-fatal — user still advances.
    }
  }

  revalidatePath(`/reader/${parsed.sessionId}`);
  return { completed };
}
