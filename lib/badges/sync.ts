import { prisma } from "@/lib/prisma";
import { evaluateEarnedBadgeKeys, type BadgeEligibilityStats } from "./evaluate";

/**
 * Persists any badges `stats` newly qualifies for. Deliberately a "sync on
 * read" design rather than event-driven hooks scattered across every
 * session-completion/quiz-submission code path: the progress page already
 * assembles every stat this needs on every load, so re-evaluating there is
 * cheap and keeps the award logic in exactly one place.
 *
 * Tradeoff worth knowing: a badge won't show as earned until the next time
 * the user's progress page loads after they qualify, not the instant they
 * cross the threshold. Acceptable for a v1 — no new instrumentation needed
 * at any existing action or route.
 *
 * Already-earned badges are never re-evaluated or removed — `key` is a
 * permanent record once written (skipDuplicates makes this call safe to
 * run on every single page load with no risk of clobbering earnedAt).
 */
export async function syncEarnedBadges(userId: string, stats: BadgeEligibilityStats): Promise<void> {
  const qualifyingKeys = evaluateEarnedBadgeKeys(stats);
  if (qualifyingKeys.length === 0) return;

  await prisma.badge.createMany({
    data: qualifyingKeys.map((key) => ({ userId, key })),
    skipDuplicates: true,
  });
}
