"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { readingSourceById } from "@/lib/reading-sources/catalog";
import { fetchWikipediaExtract, readingSourceBody } from "@/lib/reading-sources/wikipedia";
import { countWords } from "@/lib/text/word-count";
import { createReadingSessionSchema } from "@/lib/reading-sessions/schema";
import { canCreateSession, FREE_SESSION_LIMIT } from "@/lib/subscription/limits";
import { getSubscriptionForUser } from "@/lib/subscription/getSubscription";
import { isPremiumStatus } from "@/lib/subscription/status";

export interface OpenReadingSourceResult {
  error?: string;
}

/** Opens a shelf piece as a reading session. Reopens the same source if it is already in the library. */
export async function openReadingSource(sourceId: string): Promise<OpenReadingSourceResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const source = readingSourceById(sourceId);
  if (!source) {
    return { error: "That reading isn't on the shelf." };
  }

  const existing = await prisma.readingSession.findFirst({
    where: { userId, sourceUrl: source.sourceUrl, status: { not: "ARCHIVED" } },
    select: { id: true },
  });
  if (existing) {
    redirect(`/reader/${existing.id}`);
  }

  let article: { title: string; extract: string } | null;
  try {
    article = await fetchWikipediaExtract(source.wikipediaTitle);
  } catch {
    return { error: "Couldn't load that article. Try again in a moment." };
  }
  if (!article) {
    return { error: "Couldn't load that article. Try another one." };
  }

  const sourceText = readingSourceBody(article.title, source.sourceUrl, article.extract);
  const parsed = createReadingSessionSchema.safeParse({ title: article.title, sourceText });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That article is too short to read here." };
  }

  const [subscription, activeSessionCount] = await Promise.all([
    getSubscriptionForUser(userId),
    prisma.readingSession.count({ where: { userId, status: { not: "ARCHIVED" } } }),
  ]);
  const isPremium = subscription ? isPremiumStatus(subscription.status) : false;
  if (!canCreateSession(isPremium, activeSessionCount)) {
    return {
      error: `Free accounts are limited to ${FREE_SESSION_LIMIT} documents. Upgrade to Premium for unlimited sessions.`,
    };
  }

  const session = await prisma.readingSession.create({
    data: {
      userId,
      title: parsed.data.title,
      sourceText: parsed.data.sourceText,
      sourceUrl: source.sourceUrl,
      wordCount: countWords(parsed.data.sourceText),
      status: "ACTIVE",
    },
  });

  revalidatePath("/reader");
  redirect(`/reader/${session.id}`);
}
