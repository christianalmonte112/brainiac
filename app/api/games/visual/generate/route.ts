import { auth } from "@clerk/nextjs/server";
import { getAnthropic } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { generateVisualGameSchema } from "@/lib/games/schema";
import {
  MATCHING_GAME_SYSTEM_PROMPT,
  SEQUENCING_GAME_SYSTEM_PROMPT,
  VISUAL_GAME_MODEL,
} from "@/lib/prompts/visualGame";
import { invertPermutation, shuffleAvoidingIdentity, shuffleWithRng } from "@/lib/games/visualScoring";

interface MatchingPayload {
  pairs: { term: string; description: string }[];
}

interface SequencingPayload {
  steps: string[];
}

const PAIR_COUNT = 5;

/**
 * Generates one visual game (F-013) for a session the caller owns. The
 * shuffle happens server-side and the solution is stored on
 * VisualGameItem.correctAnswer — the response contains only display data,
 * never the answers. Grading lives in the submitVisualGameAttempt action.
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

  const parsedBody = generateVisualGameSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: "sessionId and a valid gameType are required" }, { status: 400 });
  }
  const { sessionId, gameType } = parsedBody.data;

  const session = await prisma.readingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, sourceText: true, title: true },
  });
  if (!session || session.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Cap document text sent to Claude to keep costs predictable (quiz parity).
  const docText = session.sourceText.slice(0, 12000);
  const userMessage = `DOCUMENT TITLE: ${session.title}\n\nDOCUMENT TEXT:\n${docText}\n\nGenerate the exercise from this document.`;

  const message = await getAnthropic().messages.create({
    model: VISUAL_GAME_MODEL,
    max_tokens: 1024,
    system: gameType === "MATCHING" ? MATCHING_GAME_SYSTEM_PROMPT : SEQUENCING_GAME_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") {
    return Response.json({ error: "Claude returned no content" }, { status: 502 });
  }

  let parsed: MatchingPayload | SequencingPayload;
  try {
    const cleaned = raw.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json({ error: "Claude returned invalid JSON" }, { status: 502 });
  }

  // Validate the payload and build the item's display data + solution.
  let prompt: string;
  let itemData: unknown;
  let correctSelections: number[];

  if (gameType === "MATCHING") {
    const pairs = (parsed as MatchingPayload).pairs;
    const valid =
      Array.isArray(pairs) &&
      pairs.length >= 3 &&
      pairs.every(
        (p) =>
          typeof p?.term === "string" &&
          p.term.trim().length > 0 &&
          typeof p?.description === "string" &&
          p.description.trim().length > 0,
      );
    if (!valid) {
      return Response.json({ error: "No valid matching pairs parsed" }, { status: 502 });
    }

    const trimmed = pairs.slice(0, PAIR_COUNT);
    const terms = trimmed.map((p) => p.term.trim());
    const descriptions = trimmed.map((p) => p.description.trim());
    const { shuffled, sourceIndex } = shuffleWithRng(descriptions, Math.random);

    prompt = "Match each term to its description from the document.";
    itemData = { left: terms, right: shuffled };
    // For term i, the correct pick is the shuffled position of description i.
    correctSelections = invertPermutation(sourceIndex);
  } else {
    const steps = (parsed as SequencingPayload).steps;
    const valid =
      Array.isArray(steps) && steps.length >= 3 && steps.every((s) => typeof s === "string" && s.trim().length > 0);
    if (!valid) {
      return Response.json({ error: "No valid sequence parsed" }, { status: 502 });
    }

    const trimmed = steps.slice(0, PAIR_COUNT).map((s) => s.trim());
    const { shuffled, sourceIndex } = shuffleAvoidingIdentity(trimmed, Math.random);

    prompt = "Put these steps in the order the document describes.";
    itemData = { steps: shuffled };
    // Position j in the true sequence lives at the shuffled index inv[j].
    correctSelections = invertPermutation(sourceIndex);
  }

  const game = await prisma.$transaction(async (tx) => {
    const newGame = await tx.visualGame.create({
      data: { sessionId, gameType, model: VISUAL_GAME_MODEL },
    });
    await tx.visualGameItem.create({
      data: {
        visualGameId: newGame.id,
        orderIndex: 0,
        type: gameType,
        prompt,
        itemData: itemData as object,
        correctAnswer: { selections: correctSelections },
      },
    });
    return newGame;
  });

  const items = await prisma.visualGameItem.findMany({
    where: { visualGameId: game.id },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, prompt: true, itemData: true }, // correctAnswer deliberately excluded
  });

  return Response.json({ gameId: game.id, gameType, items });
}
