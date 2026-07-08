import { auth } from "@clerk/nextjs/server";
import { getAnthropic } from "@/lib/ai/client";
import { QUIZ_GENERATOR_MODEL, QUIZ_GENERATOR_SYSTEM_PROMPT } from "@/lib/prompts/quiz";
import { prisma } from "@/lib/prisma";

interface RawQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  type: string;
  explanation: string;
}

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
    select: { userId: true, sourceText: true, title: true },
  });
  if (!session || session.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Cap document text sent to Claude to keep costs predictable.
  const docText = session.sourceText.slice(0, 12000);
  const userMessage = `DOCUMENT TITLE: ${session.title}\n\nDOCUMENT TEXT:\n${docText}\n\nGenerate 5 quiz questions about this document.`;

  const message = await getAnthropic().messages.create({
    model: QUIZ_GENERATOR_MODEL,
    max_tokens: 2048,
    system: QUIZ_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") {
    return Response.json({ error: "Claude returned no content" }, { status: 502 });
  }

  let parsed: { questions: RawQuestion[] };
  try {
    // Strip any accidental markdown code fences before parsing.
    const cleaned = raw.text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json({ error: "Claude returned invalid JSON" }, { status: 502 });
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return Response.json({ error: "No questions in response" }, { status: 502 });
  }

  // Validate and normalise each question.
  const validQuestions = parsed.questions
    .filter(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3,
    )
    .slice(0, 5);

  if (validQuestions.length === 0) {
    return Response.json({ error: "No valid questions parsed" }, { status: 502 });
  }

  // Persist quiz and questions in a transaction.
  const quiz = await prisma.$transaction(async (tx) => {
    const newQuiz = await tx.quiz.create({
      data: {
        sessionId,
        questionCount: validQuestions.length,
        model: QUIZ_GENERATOR_MODEL,
      },
    });

    await tx.question.createMany({
      data: validQuestions.map((q, i) => ({
        quizId: newQuiz.id,
        orderIndex: i,
        prompt: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? null,
      })),
    });

    return newQuiz;
  });

  // Return the quiz with questions for the client.
  const questions = await prisma.question.findMany({
    where: { quizId: quiz.id },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, prompt: true, options: true, correctIndex: true, explanation: true },
  });

  return Response.json({ quizId: quiz.id, questions });
}
