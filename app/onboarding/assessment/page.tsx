import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { AssessmentFlow } from "./AssessmentFlow";

/**
 * The DB row (not Clerk's publicMetadata) is the authoritative source of
 * truth here: it doesn't depend on whether the Clerk Dashboard has been
 * configured to include publicMetadata in the session JWT (see
 * lib/types/clerk.d.ts), so a returning user can never be shown the
 * assessment twice even before that Dashboard setting exists.
 */
export default async function OnboardingAssessmentPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }

  const existing = await prisma.baselineAssessment.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    redirect("/reader");
  }

  return <AssessmentFlow />;
}
