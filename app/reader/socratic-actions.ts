"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Persists a single Socratic tutor message (question or answer).
 * Fire-and-forget from the client — never blocks the streaming response.
 */
export async function saveTutorMessage(
  sessionId: string,
  role: "USER" | "TUTOR",
  content: string,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Verify caller owns the session before writing.
  const session = await prisma.readingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  if (!session || session.userId !== userId) return;

  await prisma.tutorMessage.create({
    data: { sessionId, role, content: content.slice(0, 10000) },
  });
}
