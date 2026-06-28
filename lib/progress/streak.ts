/** Consecutive calendar days with reading activity, counting back from today or yesterday. */
export function computeReadingStreak(completionDates: Date[]): number {
  if (completionDates.length === 0) return 0;

  const uniqueDays = Array.from(new Set(completionDates.map((d) => d.toISOString().slice(0, 10)))).sort();

  if (uniqueDays.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
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
