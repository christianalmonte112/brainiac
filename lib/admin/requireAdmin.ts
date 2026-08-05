import { auth } from "@clerk/nextjs/server";

/** True when `userId` matches `ADMIN_USER_ID` (server-only env). */
export function isAdminUserId(userId: string | null | undefined): boolean {
  const adminUserId = process.env.ADMIN_USER_ID;
  return Boolean(userId && adminUserId && userId === adminUserId);
}

/**
 * Guards admin-only Server Actions.
 *
 * app/admin/layout.tsx already redirects non-admins away from the admin
 * *pages*, but that's a route-level check — a Server Action is its own
 * callable endpoint and isn't re-gated by the layout that happens to
 * render the form calling it. Any admin mutation (like the invite actions)
 * needs its own check, so this is factored out to make that hard to forget.
 *
 * Returns the caller's userId if they're the admin, or null otherwise.
 */
export async function requireAdmin(): Promise<string | null> {
  const { userId } = await auth();
  if (!isAdminUserId(userId)) {
    return null;
  }
  return userId;
}
