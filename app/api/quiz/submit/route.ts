import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { quizId?: string; answers?: number[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { quizId, answers } = body;
  if (!quizId || typeof quizId !== "string") {
    return Response.json({ error: "quizId is required" }, { status: 400 });
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: "answers array is required" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      session: { select: { userId: true } },
    },
  });

  if (!quiz || quiz.session.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { questions } = quiz;

  const results = questions.map((q, i) => {
    const selected = answers[i] ?? -1;
    const isCorrect = selected === q.correctIndex;
    return {
      questionIndex: i,
      prompt: q.prompt,
      options: q.options as string[],
      selectedIndex: selected,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: isCorrect ? null : (q.explanation ?? null),
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = questions.length;
  const score = totalCount > 0 ? correctCount / totalCount : 0;

  await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      answers: answers,
      score,
      correctCount,
      totalCount,
    },
  });

  return Response.json({ score, correctCount, totalCount, results });
}
