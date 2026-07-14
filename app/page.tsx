import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Splash } from "./Splash";

/**
 * The landing splash (Phase 4). Keeps the exact routing intelligence the
 * old instant-redirect had — signed in with a baseline goes to the
 * reader, signed in without one goes to onboarding, signed out goes to
 * sign-in — but puts it behind the brain-click moment on the splash
 * instead of redirecting immediately.
 */
export default async function Home() {
  const { userId } = await auth();

  let enterHref = "/sign-in";
  if (userId) {
    const baseline = await prisma.baselineAssessment.findUnique({
      where: { userId },
      select: { id: true },
    });
    enterHref = baseline ? "/reader" : "/onboarding/assessment";
  }

  return <Splash enterHref={enterHref} />;
}
