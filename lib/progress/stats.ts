import { localDateString } from "./timezone";

export interface CompletedSessionStats {
  wordCount: number | null;
  elapsedSeconds: number;
  completedAt: Date | null;
}

export interface GrowthPoint {
  date: string;
  wpm: number;
}

export interface QuizAttemptStat {
  sessionId: string;
  score: number;
  createdAt: Date;
}

const THIRTY_DAYS_MS = 30 * 86_400_000;

/** Latest attempt per session within the last 30 days, then mean score (0–100). */
export function computeAverageQuizScore(
  attempts: QuizAttemptStat[],
  now: Date = new Date(),
): number | null {
  const cutoff = new Date(now.getTime() - THIRTY_DAYS_MS);
  const latestBySession = new Map<string, QuizAttemptStat>();

  for (const attempt of attempts) {
    if (attempt.createdAt < cutoff) continue;
    const existing = latestBySession.get(attempt.sessionId);
    if (!existing || attempt.createdAt > existing.createdAt) {
      latestBySession.set(attempt.sessionId, attempt);
    }
  }

  if (latestBySession.size === 0) return null;

  const total = [...latestBySession.values()].reduce((sum, a) => sum + a.score, 0);
  return Math.round((total / latestBySession.size) * 100);
}

/** Most recent quiz score for a session, as a 0–100 integer, or null if never quizzed. */
export function latestQuizScorePercent(
  attempts: { score: number; createdAt: Date }[],
): number | null {
  if (attempts.length === 0) return null;
  const latest = attempts.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  return Math.round(latest.score * 100);
}

/** Average WPM across completed sessions with valid word counts and elapsed time. */
export function computeAverageWPM(sessions: CompletedSessionStats[]): number | null {
  const valid = sessions.filter((s) => s.wordCount && s.elapsedSeconds > 0);
  if (valid.length === 0) return null;

  const totalWords = valid.reduce((sum, s) => sum + (s.wordCount ?? 0), 0);
  const totalSeconds = valid.reduce((sum, s) => sum + s.elapsedSeconds, 0);
  if (totalSeconds === 0) return null;

  return Math.round(totalWords / (totalSeconds / 60));
}

/** Builds a time series of per-session WPM for the growth chart, dated in the reader's local timezone. */
export function buildGrowthSeries(sessions: CompletedSessionStats[], timezone: string): GrowthPoint[] {
  return sessions
    .filter(
      (s): s is CompletedSessionStats & { completedAt: Date } =>
        s.completedAt !== null && s.wordCount !== null && s.elapsedSeconds > 0,
    )
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
    .map((session) => ({
      date: localDateString(session.completedAt, timezone),
      wpm: Math.round((session.wordCount ?? 0) / (session.elapsedSeconds / 60)),
    }));
}
