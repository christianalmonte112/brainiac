"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lookupWord } from "@/lib/vocabulary/dictionary";
import { lookupWordSchema } from "@/lib/vocabulary/schema";

export interface VocabularyLookupResult {
  found: boolean;
  word: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  definition: string | null;
  etymology: string | null;
  synonyms: string[];
}

/**
 * Looks up a clicked word and saves it to the reader's personal vocabulary
 * bank (F-004). Re-clicking a word that's already saved just returns the
 * stored entry instead of re-querying the dictionary API. Words with no
 * dictionary entry are reported back but not persisted.
 */
export async function lookupAndSaveWord(word: string, sessionId?: string): Promise<VocabularyLookupResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = lookupWordSchema.parse({ word, sessionId });

  let ownedSessionId: string | null = null;
  if (parsed.sessionId) {
    const session = await prisma.readingSession.findUnique({
      where: { id: parsed.sessionId },
      select: { userId: true },
    });
    if (session?.userId === userId) {
      ownedSessionId = parsed.sessionId;
    }
  }

  const existing = await prisma.vocabularyWord.findUnique({
    where: { userId_word: { userId, word: parsed.word } },
  });
  if (existing) {
    return {
      found: true,
      word: existing.word,
      partOfSpeech: existing.partOfSpeech,
      phonetic: existing.phonetic,
      definition: existing.definition,
      etymology: existing.etymology,
      synonyms: existing.synonyms,
    };
  }

  const result = await lookupWord(parsed.word);
  if (!result) {
    return {
      found: false,
      word: parsed.word,
      partOfSpeech: null,
      phonetic: null,
      definition: null,
      etymology: null,
      synonyms: [],
    };
  }

  await prisma.vocabularyWord.create({
    data: {
      userId,
      word: parsed.word,
      partOfSpeech: result.partOfSpeech,
      phonetic: result.phonetic,
      definition: result.definition,
      etymology: result.etymology,
      synonyms: result.synonyms,
      sourceSessionId: ownedSessionId,
    },
  });

  return { found: true, ...result };
}
