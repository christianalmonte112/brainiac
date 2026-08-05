"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { validateFeedback } from "./validate";

export interface SubmitFeedbackResult {
  ok: boolean;
  error?: string;
}

/**
 * Persists a feedback submission from the in-app widget (FeedbackWidget.tsx).
 *
 * `page` is the pathname the user was on when they opened the widget —
 * passed through from the client since server actions have no request
 * context of their own to read it from.
 */
export async function submitFeedback(rawMessage: string, rawPage: string | null): Promise<SubmitFeedbackResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "You need to be signed in to send feedback." };
  }

  const rateLimitResponse = await checkRateLimit("feedback", userId);
  if (rateLimitResponse) {
    return { ok: false, error: "You've sent a lot of feedback recently — try again in a bit." };
  }

  const validated = validateFeedback(rawMessage, rawPage);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  // Best-effort: if the User row doesn't exist yet for some reason (e.g. a
  // race with onboarding), there's nothing meaningful to attach feedback
  // to — surface a generic error rather than throwing a raw Prisma FK error.
  try {
    await prisma.feedback.create({
      data: { userId, message: validated.message, page: validated.page },
    });
  } catch {
    return { ok: false, error: "Something went wrong sending your feedback. Please try again." };
  }

  return { ok: true };
}
