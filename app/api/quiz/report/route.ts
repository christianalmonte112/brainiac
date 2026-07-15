import { auth } from "@clerk/nextjs/server";
import { fetchSessionLearningReport } from "@/lib/progress/sessionReport";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { quizId?: string; scorePercent?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { quizId, scorePercent } = body;
  if (!quizId || typeof quizId !== "string") {
    return Response.json({ error: "quizId is required" }, { status: 400 });
  }
  if (typeof scorePercent !== "number") {
    return Response.json({ error: "scorePercent is required" }, { status: 400 });
  }

  const report = await fetchSessionLearningReport(userId, quizId, scorePercent);
  if (!report) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ report });
}
