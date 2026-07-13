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
