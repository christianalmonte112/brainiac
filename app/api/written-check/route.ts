import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAnthropic } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/ratelimit";
import { gradingPrompt, gradingSchema, questions, submissionSchema } from "@/lib/written-check/schema";

export const maxDuration = 120;
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return Response.json({ error: "Missing session." }, { status: 400 });
  const session = await prisma.readingSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return Response.json({ error: "Session not found." }, { status: 404 });
  try {
    const saved = await prisma.writtenCheck.findUnique({ where: { sessionId } });
    return Response.json({ saved });
  } catch {
    return Response.json({ error: "Could not load saved answers. Please try again." }, { status: 503 });
  }
}
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in again. Your answers are still on this screen." }, { status: 401 });
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Answer all three questions using up to 4,000 characters each." }, { status: 400 });
  const { sessionId, answers } = parsed.data;
  let claimed: { id: string; updatedAt: Date } | null = null;
  try {
    const session = await prisma.readingSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) return Response.json({ error: "Session not found." }, { status: 404 });
    const record = await prisma.writtenCheck.upsert({ where: { sessionId }, create: { sessionId, userId, answers }, update: {} });
    if (record.status === "GRADED" && JSON.stringify(record.answers) === JSON.stringify(answers)) {
      return Response.json({ saved: true, result: record.result });
    }
    if (record.status === "GRADING" && Date.now() - record.updatedAt.getTime() < 120000) {
      return Response.json({ error: "Your saved answers are still being graded. Wait a moment, then retry." }, { status: 409 });
    }
    const limited = await checkRateLimit("aiGeneration", userId);
    if (limited) return limited;
    const claimedAt = new Date();
    const lock = await prisma.writtenCheck.updateMany({ where: { id: record.id, updatedAt: record.updatedAt }, data: { answers, result: Prisma.DbNull, status: "GRADING", updatedAt: claimedAt } });
    if (!lock.count) return Response.json({ error: "Another submission is being processed. Please retry shortly." }, { status: 409 });
    claimed = { id: record.id, updatedAt: claimedAt };
    const message = await getAnthropic().messages.create({ model: "claude-sonnet-4-5", max_tokens: 2000, system: gradingPrompt, messages: [{ role: "user", content: JSON.stringify({ passage: session.sourceText, questions, answers }) }] }, { timeout: 90000, maxRetries: 0 });
    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const result = gradingSchema.parse(JSON.parse(text));
    const stored = await prisma.writtenCheck.updateMany({ where: claimed, data: { result, status: "GRADED" } });
    if (!stored.count) return Response.json({ error: "A newer submission replaced this one. Reopen the check to see it." }, { status: 409 });
    return Response.json({ saved: true, result });
  } catch (error) {
    console.error("Written check failed", error instanceof Error ? error.name : "Unknown error");
    if (claimed) {
      await prisma.writtenCheck.updateMany({ where: claimed, data: { status: "SAVED" } }).catch(() => {});
      return Response.json({ saved: true, error: "Your answers are saved, but grading is unavailable. Retry to grade them." }, { status: 503 });
    }
    return Response.json({ error: "We could not confirm your answers were saved. Keep this screen open and retry." }, { status: 503 });
  }
}
