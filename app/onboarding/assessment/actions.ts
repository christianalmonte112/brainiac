"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { computeBaselineScores, type BaselineScoreResult } from "@/lib/baseline-assessment/scoring";
import { submitBaselineAssessmentSchema, type SubmitBaselineAssessmentInput } from "@/lib/baseline-assessment/schema";
import { BASELINE_PASSAGE } from "@/lib/baseline-assessment/content";

export interface SubmitBaselineAssessmentResult extends BaselineScoreResult {
  alreadyCompleted: boolean;
}

/**
 * Scores and permanently records a user's onboarding baseline assessment.
 *
 * There is no Clerk -> Postgres user-sync webhook yet (planned for later),
 * so this upserts the User row itself immediately before writing the
 * assessment, rather than assuming one already exists.
 */
export async function submitBaselineAssessment(
  input: SubmitBaselineAssessmentInput,
): Promise<SubmitBaselineAssessmentResult> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated.");
  }

  const parsed = submitBaselineAssessmentSchema.parse(input);

  // The baseline is permanent and never overwritten. If one already exists
  // (e.g. a double-submit or a back-navigation resubmit), return it as-is
  // instead of violating the unique constraint on userId.
  const existing = await prisma.baselineAssessment.findUnique({ where: { userId } });
  if (existing) {
    return {
      readingSpeedWPM: existing.readingSpeedWPM,
      comprehensionScore: existing.comprehensionScore,
      vocabularyScore: existing.vocabularyScore,
      inferenceScore: existing.inferenceScore,
      overallScore: existing.overallScore,
      alreadyCompleted: true,
    };
  }

  const scores = computeBaselineScores({
    wordCount: BASELINE_PASSAGE.wordCount,
    elapsedSeconds: parsed.elapsedSeconds,
    comprehensionAnswers: parsed.comprehensionAnswers,
    vocabularyAnswers: parsed.vocabularyAnswers,
    inferenceAnswers: parsed.inferenceAnswers,
  });

  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: primaryEmail, name },
    update: { email: primaryEmail, name },
  });

  await prisma.baselineAssessment.create({
    data: {
      userId,
      readingSpeedWPM: scores.readingSpeedWPM,
      comprehensionScore: scores.comprehensionScore,
      vocabularyScore: scores.vocabularyScore,
      inferenceScore: scores.inferenceScore,
      overallScore: scores.overallScore,
      takenAt: new Date(),
    },
  });

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { onboardingComplete: true },
  });

  return { ...scores, alreadyCompleted: false };
}
