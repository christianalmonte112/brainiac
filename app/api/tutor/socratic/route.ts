import { auth } from "@clerk/nextjs/server";
import { getAnthropic } from "@/lib/ai/client";
import { SOCRATIC_TUTOR_MODEL, SOCRATIC_TUTOR_SYSTEM_PROMPT } from "@/lib/prompts/socratic";
import { prisma } from "@/lib/prisma";

interface ConversationMessage {
  role: "user" | "tutor";
  content: string;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    sessionId?: string;
    conversationHistory?: ConversationMessage[];
    documentText?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { sessionId, conversationHistory = [], documentText } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return new Response("sessionId is required", { status: 400 });
  }

  // Verify the session belongs to the caller.
  const session = await prisma.readingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, title: true, sourceText: true },
  });
  if (!session || session.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  // Use the document text from the request if provided, otherwise fall back
  // to the full source text from the DB.
  const docText = (documentText?.trim() || session.sourceText).slice(0, 8000);

  // Build Anthropic messages array from conversation history.
  // The first message primes Claude with the document content so it can ask
  // contextual questions without the user having to paste it again.
  const systemContext = `${SOCRATIC_TUTOR_SYSTEM_PROMPT}\n\nDOCUMENT THE USER JUST READ (title: "${session.title}"):\n${docText}`;

  const messages: { role: "user" | "assistant"; content: string }[] =
    conversationHistory.length === 0
      ? // First turn: ask Claude to open with its first question.
        [{ role: "user", content: "I just finished reading the document. Please ask me your first Socratic question." }]
      : conversationHistory.map((msg) => ({
          role: msg.role === "tutor" ? "assistant" : "user",
          content: msg.content,
        }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await getAnthropic().messages.stream({
          model: SOCRATIC_TUTOR_MODEL,
          max_tokens: 300,
          system: systemContext,
          messages,
        });

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Claude error";
        controller.enqueue(encoder.encode(`\n\n[Tutor unavailable: ${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}
