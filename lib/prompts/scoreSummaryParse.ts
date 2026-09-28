/**
 * Pulls a score/feedback pair out of Claude's text reply.
 * Tolerates markdown fences, string scores, and leading/trailing prose.
 */

function coerceScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) {
      return Math.min(100, Math.max(0, Math.round(n)));
    }
  }
  return null;
}

export function parseSummaryScoreText(raw: string): { score: number; feedback: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as {
      score?: unknown;
      feedback?: unknown;
    };
    const score = coerceScore(parsed.score);
    if (score === null) return null;

    const feedback =
      typeof parsed.feedback === "string" && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : "Nice work summarizing this section — keep practicing the main ideas.";

    return { score, feedback };
  } catch {
    return null;
  }
}
