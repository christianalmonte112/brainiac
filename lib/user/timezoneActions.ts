"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/** Returns true only if `value` is a timezone name the JS runtime actually recognizes. */
function isValidTimezone(value: string): boolean {
  if (value.length === 0 || value.length > 100) return false;
  try {
    // Intl throws a RangeError for any string that isn't a real IANA zone —
    // this is the standard, reliable way to validate a timezone name in JS.
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Persists the caller's browser-detected IANA timezone (e.g.
 * "America/Los_Angeles"). Called from TimezoneSync.tsx on mount, and only
 * when it differs from what's already stored, so this isn't hit on every
 * page load.
 *
 * Silently no-ops (rather than throwing) on an invalid timezone string or a
 * missing User row — this runs as a best-effort background sync, not a
 * user-facing action, so there's nothing useful to show an error for.
 */
export async function setUserTimezone(timezone: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  if (!isValidTimezone(timezone)) return;

  await prisma.user.updateMany({
    where: { id: userId },
    data: { timezone },
  });
  // updateMany (not update) deliberately: the User row is only created when
  // the baseline assessment is submitted (see onboarding/assessment/actions.ts),
  // so it's possible for this to fire before that row exists. updateMany
  // simply matches zero rows in that case instead of throwing, since there's
  // nothing to persist to yet — the sync will succeed on a later page load
  // once the row exists.
}
