import { PrismaClient } from "@prisma/client";

/**
 * Deletes every ReadingSession this suite created (identified by the
 * E2E_TITLE_PREFIX used in core-reading-flow.spec.ts), for the fixture
 * user only. Runs regardless of pass/fail (Playwright always runs
 * globalTeardown).
 *
 * Why this matters: the free tier caps non-archived sessions at 3
 * (lib/subscription/limits.ts). Without cleanup, the 4th CI run would
 * start failing on session creation for reasons that have nothing to do
 * with the app actually breaking. This also keeps E2E runs from slowly
 * polluting your admin dashboard's session-count stats with fake data.
 *
 * Requires DATABASE_URL to point at the SAME database PLAYWRIGHT_BASE_URL's
 * app is using — if these ever point at different environments, this
 * silently deletes nothing (userId/title won't match) rather than deleting
 * the wrong thing, which is the safer failure mode.
 */
const E2E_TITLE_PREFIX = "[Playwright E2E]";

export default async function globalTeardown(): Promise<void> {
  const testEmail = process.env.E2E_TEST_EMAIL;
  if (!testEmail || !process.env.DATABASE_URL) {
    // Nothing to clean up if we don't know who ran the tests or where.
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: testEmail }, select: { id: true } });
    if (!user) return;

    const { count } = await prisma.readingSession.deleteMany({
      where: { userId: user.id, title: { startsWith: E2E_TITLE_PREFIX } },
    });
    if (count > 0) {
      console.log(`[e2e teardown] Deleted ${count} test reading session(s).`);
    }
  } catch (error) {
    // Best-effort — a cleanup failure shouldn't fail the whole test run or
    // mask real test failures. Next run will just have a stale extra
    // session or two, not a broken suite.
    console.warn("[e2e teardown] Cleanup failed (non-fatal):", error);
  } finally {
    await prisma.$disconnect();
  }
}

export { E2E_TITLE_PREFIX };
