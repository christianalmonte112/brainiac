import { getAnthropic } from "@/lib/ai/client";
import { parseSummaryScoreText } from "./scoreSummaryParse";

export const SCORE_SUMMARY_MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are a reading comprehension coach evaluating a student's chunk summary.

Given the original passage and the student's summary, you will:
1. Score the summary 0–100 based on accuracy and completeness
2. Provide 1–2 sentences of brief, encouraging feedback that mentions something specific about their summary

Scoring guide:
- 90–100: Captures all key ideas accurately with strong phrasing
- 70–89: Captures most key ideas; minor gaps or slight inaccuracies
- 50–69: Captures some key ideas but misses important points
- 30–49: Very partial or partially inaccurate
- 0–29: Off-topic or incorrect

Always be encouraging — the student is learning. Acknowledge effort even when the score is low.

Respond with ONLY a raw JSON object (no markdown fences, no preamble):
{"score": <integer 0–100>, "feedback": "<1–2 sentences>"}`;

export type SummaryScoreResult =
  | { ok: true; score: number; feedback: string }
  | { ok: false; feedback: string };

const UNSCORED_FEEDBACK =
  "We couldn't score this summary right now. Your progress is saved — continue when you're ready.";

/**
 * Scores a user's chunk summary against the original passage using Claude.
 * Returns `{ ok: false }` instead of a fake 0/100 when Claude is unavailable
 * or returns unparseable output — so the UI never pretends the student scored zero.
 */
export async function scoreChunkSummary(
  chunkText: string,
  userSummary: string,
): Promise<SummaryScoreResult> {
  if (!chunkText.trim() || !userSummary.trim()) {
    return { ok: false, feedback: UNSCORED_FEEDBACK };
  }

  const userMessage = `PASSAGE:\n${chunkText.trim()}\n\nSTUDENT SUMMARY:\n${userSummary.trim()}`;

  try {
    const message = await getAnthropic().messages.create({
      model: SCORE_SUMMARY_MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0];
    if (!raw || raw.type !== "text") {
      return { ok: false, feedback: UNSCORED_FEEDBACK };
    }

    const parsed = parseSummaryScoreText(raw.text);
    if (!parsed) {
      return { ok: false, feedback: UNSCORED_FEEDBACK };
    }

    return { ok: true, score: parsed.score, feedback: parsed.feedback };
  } catch {
    return { ok: false, feedback: UNSCORED_FEEDBACK };
  }
}
