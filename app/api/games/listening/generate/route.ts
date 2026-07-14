import { auth } from "@clerk/nextjs/server";
import { getAnthropic } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { generateListeningGameSchema } from "@/lib/games/schema";
import { LISTENING_GAME_MODEL, LISTENING_GAME_SYSTEM_PROMPT } from "@/lib/prompts/listeningGame";

interface RawSegment {
  lyricText: string;
  annotations: { word: string; note: string }[];
  blankedText: string;
  blankAnswers: string[];
  question: { prompt: string; options: string[]; correctIndex: number };
}

function countBlanks(text: string): number {
  return (text.match(/____/g) ?? []).length;
}

/**
 * Generates a listening game (F-015) from lyrics the user pasted — lyrics
 * are user-supplied by design; there is no lyric search or licensing
 * integration. Answer keys (blankAnswers, correctIndex) are persisted on
 * ListeningSegment.questions and stripped from the response — grading
 * happens in the submitListeningAttempt action.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedBody = generateListeningGameSchema.safeParse(body);
  if (!parsedBody.success) {
    const message = parsedBody.error.issues[0]?.message ?? "Invalid input";
    return Response.json({ error: message }, { status: 400 });
  }
  const { title, lyrics } = parsedBody.data;

  const message = await getAnthropic().messages.create({
    model: LISTENING_GAME_MODEL,
    max_tokens: 3000,
    system: LISTENING_GAME_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `SONG TITLE: ${title}\n\nLYRICS:\n${lyrics}` }],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") {
    return Response.json({ error: "Claude returned no content" }, { status: 502 });
  }

  let parsed: { segments: RawSegment[] };
  try {
    const cleaned = raw.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json({ error: "Claude returned invalid JSON" }, { status: 502 });
  }

  if (!Array.isArray(parsed.segments)) {
    return Response.json({ error: "No segments in response" }, { status: 502 });
  }

  // Keep only structurally sound segments: blanks must line up with answers
  // and the question must be a real 4-option multiple choice.
  const validSegments = parsed.segments
    .filter(
      (s) =>
        typeof s?.lyricText === "string" &&
        s.lyricText.trim().length > 0 &&
        typeof s?.blankedText === "string" &&
        countBlanks(s.blankedText) >= 1 &&
        Array.isArray(s.blankAnswers) &&
        s.blankAnswers.length === countBlanks(s.blankedText) &&
        s.blankAnswers.every((a) => typeof a === "string" && a.trim().length > 0) &&
        Array.isArray(s.annotations) &&
        typeof s?.question?.prompt === "string" &&
        Array.isArray(s.question.options) &&
        s.question.options.length === 4 &&
        typeof s.question.correctIndex === "number" &&
        s.question.correctIndex >= 0 &&
        s.question.correctIndex <= 3,
    )
    .slice(0, 6);

  if (validSegments.length < 2) {
    return Response.json({ error: "Couldn't build enough valid segments from these lyrics" }, { status: 502 });
  }

  const game = await prisma.$transaction(async (tx) => {
    const newGame = await tx.listeningGame.create({
      data: { userId, title, model: LISTENING_GAME_MODEL },
    });
    await tx.listeningSegment.createMany({
      data: validSegments.map((s, i) => ({
        listeningGameId: newGame.id,
        orderIndex: i,
        lyricText: s.lyricText.trim(),
        vocabularyAnnotations: s.annotations
          .filter((a) => typeof a?.word === "string" && typeof a?.note === "string")
          .slice(0, 4),
        blankedText: s.blankedText.trim(),
        questions: {
          blankAnswers: s.blankAnswers.map((a) => a.trim()),
          question: s.question,
        },
      })),
    });
    return newGame;
  });

  const segments = await prisma.listeningSegment.findMany({
    where: { listeningGameId: game.id },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, lyricText: true, vocabularyAnnotations: true, blankedText: true, questions: true },
  });

  // Strip the answer key before responding.
  interface StoredSegment {
    id: string;
    orderIndex: number;
    lyricText: string;
    vocabularyAnnotations: unknown;
    blankedText: string;
    questions: unknown;
  }
  const clientSegments = segments.map((s: StoredSegment) => {
    const q = s.questions as { blankAnswers: string[]; question: { prompt: string; options: string[] } };
    return {
      id: s.id,
      orderIndex: s.orderIndex,
      lyricText: s.lyricText,
      annotations: s.vocabularyAnnotations,
      blankedText: s.blankedText,
      blankCount: q.blankAnswers.length,
      question: { prompt: q.question.prompt, options: q.question.options },
    };
  });

  return Response.json({ gameId: game.id, title, segments: clientSegments });
}
