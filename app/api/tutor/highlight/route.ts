import { auth } from "@clerk/nextjs/server";
import { getAnthropic } from "@/lib/ai/client";
import { HIGHLIGHT_TUTOR_MODEL, HIGHLIGHT_TUTOR_SYSTEM_PROMPT } from "@/lib/prompts/highlight";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { selectedText?: string; surroundingParagraph?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { selectedText, surroundingParagraph, sessionId } = body;

  if (!selectedText || typeof selectedText !== "string" || selectedText.trim().length === 0) {
    return new Response("selectedText is required", { status: 400 });
  }
  if (!sessionId || typeof sessionId !== "string") {
    return new Response("sessionId is required", { status: 400 });
  }

  // Verify the session belongs to the caller before proceeding.
  const session = await prisma.readingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  if (!session || session.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  // Fire-and-forget: log the interaction before streaming so the record exists
  // even if the client disconnects mid-stream. Not awaited — never blocks the response.
  prisma.highlightInteraction
    .create({
      data: {
        userId,
        sessionId,
        selectedText: selectedText.trim().slice(0, 2000),
        surroundingContext: surroundingParagraph?.trim().slice(0, 4000) ?? null,
      },
    })
    .catch(() => {
      // Non-fatal — logging should never block the tutor response.
    });

  const userMessage = surroundingParagraph?.trim()
    ? `CONTEXT (surrounding paragraph):\n${surroundingParagraph.trim()}\n\nHIGHLIGHTED TEXT:\n${selectedText.trim()}`
    : `HIGHLIGHTED TEXT:\n${selectedText.trim()}`;

  // Build a ReadableStream that pipes Claude's streaming response to the client.
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await getAnthropic().messages.stream({
          model: HIGHLIGHT_TUTOR_MODEL,
          max_tokens: 350,
          system: HIGHLIGHT_TUTOR_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
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
      // Disable buffering on proxies / CDN for real-time streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
