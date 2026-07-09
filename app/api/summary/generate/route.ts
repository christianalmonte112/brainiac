import { auth } from "@clerk/nextjs/server";
import { getAnthropic } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { SESSION_SUMMARY_MODEL, SESSION_SUMMARY_SYSTEM_PROMPT } from "@/lib/prompts/sessionSummary";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await prisma.readingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, title: true, sourceText: true },
  });
  if (!session || session.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Keep prompt size bounded for predictable latency/cost.
  const docText = session.sourceText.slice(0, 14000);
  const userMessage = `DOCUMENT TITLE: ${session.title}\n\nDOCUMENT TEXT:\n${docText}\n\nGenerate the requested full-session summary in markdown.`;

  const message = await getAnthropic().messages.create({
    model: SESSION_SUMMARY_MODEL,
    max_tokens: 700,
    system: SESSION_SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    return Response.json({ error: "Claude returned no summary content" }, { status: 502 });
  }

  const content = firstBlock.text.trim();
  if (!content) {
    return Response.json({ error: "Generated summary was empty" }, { status: 502 });
  }

  const saved = await prisma.summary.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      depth: "STANDARD",
      content,
      model: SESSION_SUMMARY_MODEL,
      promptTokens: message.usage?.input_tokens ?? null,
      completionTokens: message.usage?.output_tokens ?? null,
    },
    update: {
      depth: "STANDARD",
      content,
      model: SESSION_SUMMARY_MODEL,
      promptTokens: message.usage?.input_tokens ?? null,
      completionTokens: message.usage?.output_tokens ?? null,
    },
    select: { content: true },
  });

  return Response.json({ content: saved.content });
}
