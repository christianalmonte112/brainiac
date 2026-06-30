import { getAnthropic } from "@/lib/ai/client";

export const SCORE_SUMMARY_MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are a reading comprehension coach evaluating a student's chunk summary.

Given the original passage and the student's summary, you will:
1. Score the summary 0–100 based on accuracy and completeness
2. Provide 1–2 sentences of brief, encouraging feedback

Scoring guide:
- 90–100: Captures all key ideas accurately with strong phrasing
- 70–89: Captures most key ideas; minor gaps or slight inaccuracies
- 50–69: Captures some key ideas but misses important points
- 30–49: Very partial or partially inaccurate
- 0–29: Off-topic or incorrect

Always be encouraging — the student is learning. Acknowledge effort even when the score is low.

Respond ONLY as a JSON object with this exact shape:
{"score": <integer 0–100>, "feedback": "<1–2 sentences>"}

No markdown, no extra keys, no explanation outside the JSON.`;

export interface SummaryScoreResult {
  score: number;
  feedback: string;
}

/**
 * Scores a user's chunk summary against the original passage using Claude.
 * Uses non-streaming messages — the response is short (JSON only) so streaming
 * adds latency overhead without UX benefit here.
 *
 * Returns a safe fallback result rather than throwing if parsing fails, so a
 * Claude hiccup never blocks the user from advancing to the next chunk.
 */
export async function scoreChunkSummary(
  chunkText: string,
  userSummary: string,
): Promise<SummaryScoreResult> {
  const userMessage = `PASSAGE:\n${chunkText.trim()}\n\nSTUDENT SUMMARY:\n${userSummary.trim()}`;

  const message = await getAnthropic().messages.create({
    model: SCORE_SUMMARY_MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") {
    return { score: 0, feedback: "We couldn't score your summary this time — keep up the great work!" };
  }

  try {
    const parsed = JSON.parse(raw.text) as { score: unknown; feedback: unknown };
    const score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 0;
    const feedback = typeof parsed.feedback === "string" && parsed.feedback.length > 0
      ? parsed.feedback
      : "Nice work summarizing this section!";
    return { score, feedback };
  } catch {
    return { score: 0, feedback: "Nice work summarizing this section — keep it up!" };
  }
}
