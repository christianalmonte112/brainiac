import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { dueVocabularyWordsWhere } from "@/lib/games/dueWords";
import { MemoryGame, type MemoryCard } from "./MemoryGame";

const REVIEW_BATCH_SIZE = 20;

/** Flashcard memory game (F-014) — reviews vocabulary words that are due per their spaced-repetition schedule. */
export default async function MemoryGamePage() {
  const { userId } = await auth();

  const dueWords = userId
    ? await prisma.vocabularyWord.findMany({
        where: dueVocabularyWordsWhere(userId),
        orderBy: { createdAt: "asc" },
        take: REVIEW_BATCH_SIZE,
        select: {
          id: true,
          word: true,
          partOfSpeech: true,
          phonetic: true,
          definition: true,
          synonyms: true,
        },
      })
    : [];

  if (dueWords.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Nothing due for review</h1>
        <p className="text-sm text-slate-500">
          All caught up! Words come back on a spaced-repetition schedule as you learn them. Look up new words while
          reading, or check your{" "}
          <Link href="/reader/vocabulary" className="font-medium text-slate-900 underline">
            vocabulary bank
          </Link>
          .
        </p>
      </div>
    );
  }

  const cards: MemoryCard[] = dueWords;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Memory game</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recall the meaning of each word, then flip the card to check yourself. Honest answers keep your review
          schedule accurate.
        </p>
      </div>
      <MemoryGame cards={cards} />
    </div>
  );
}
