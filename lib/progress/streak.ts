import { localDateString } from "./timezone";

/**
 * Consecutive calendar days with reading activity, counting back from today
 * or yesterday — measured in `timezone` (the reader's actual local day),
 * not the server's UTC day. Without this, a session at, say, 4pm Pacific
 * can land on a different "day" than one at 3:59pm the same afternoon,
 * purely because that moment happens to cross midnight UTC.
 */
export function computeReadingStreak(completionDates: Date[], timezone: string): number {
  if (completionDates.length === 0) return 0;

  const uniqueDays = Array.from(new Set(completionDates.map((d) => localDateString(d, timezone)))).sort();

  if (uniqueDays.length === 0) return 0;

  const today = localDateString(new Date(), timezone);
  const yesterday = localDateString(new Date(Date.now() - 86_400_000), timezone);
  const lastDay = uniqueDays[uniqueDays.length - 1];

  if (lastDay !== today && lastDay !== yesterday) return 0;

  let streak = 1;
  for (let i = uniqueDays.length - 2; i >= 0; i--) {
    const current = new Date(uniqueDays[i + 1]!);
    const prev = new Date(uniqueDays[i]!);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
