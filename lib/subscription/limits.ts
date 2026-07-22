/** Non-premium users may have at most this many non-archived sessions. */
export const FREE_SESSION_LIMIT = 3;

export function canCreateSession(isPremium: boolean, activeSessionCount: number): boolean {
  if (isPremium) return true;
  return activeSessionCount < FREE_SESSION_LIMIT;
}
