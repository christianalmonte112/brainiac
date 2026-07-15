"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitVocabularyReview } from "./actions";

export interface MemoryCard {
  id: string;
  word: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  definition: string;
  synonyms: string[];
}

interface MemoryGameProps {
  cards: MemoryCard[];
}

/**
 * Flashcard interaction for the memory game (F-014). One card at a time:
 * the reader recalls the definition, flips the card, then self-grades with
 * "Knew it" / "Still learning". Each answer is persisted via a server action
 * that advances the word's spaced-repetition schedule.
 */
export function MemoryGame({ cards }: MemoryGameProps) {
  const router = useRouter();
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedWords, setMissedWords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const totalCards = cards.length;
  const finished = cardIndex >= totalCards;

  async function handleAnswer(correct: boolean) {
    const card = cards[cardIndex];
    setIsSaving(true);
    setSaveError(null);
    try {
      await submitVocabularyReview({ vocabularyWordId: card.id, correct });
      if (correct) {
        setCorrectCount((count) => count + 1);
      } else {
        setMissedWords((words) => [...words, card.word]);
      }
      setRevealed(false);
      setCardIndex((index) => index + 1);
    } catch {
      setSaveError("Couldn't save that answer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Results screen ──────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-2xl">🧠</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {correctCount} of {totalCards} remembered
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {missedWords.length === 0
              ? "Perfect recall — these words won't come back until later on your schedule."
              : "Missed words stay due, so they'll show up again the next time you review."}
          </p>
        </div>
        {missedWords.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {missedWords.map((word) => (
              <span key={word} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                {word}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          {missedWords.length > 0 && (
            <button
              onClick={() => router.refresh()}
              className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
            >
              Review missed words
            </button>
          )}
          <Link
            href="/reader/progress"
            className="rounded-lg border border-slate-200 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to progress
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[cardIndex];
  const progressPercent = Math.round((cardIndex / totalCards) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-slate-900 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-xs text-slate-500">
          Card {cardIndex + 1} of {totalCards}
        </p>
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 px-6 py-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900">{card.word}</h2>
        <p className="text-xs text-slate-400">
          {[card.phonetic, card.partOfSpeech].filter(Boolean).join(" · ")}
        </p>

        {revealed ? (
          <>
            <p className="max-w-md text-sm leading-relaxed text-slate-700">{card.definition}</p>
            {card.synonyms.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {card.synonyms.map((synonym) => (
                  <span key={synonym} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {synonym}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
          >
            Flip card
          </button>
        )}
      </div>

      {revealed && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() => handleAnswer(false)}
            disabled={isSaving}
            className="rounded-lg border border-rose-200 bg-rose-50 px-6 py-3 font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✗ Still learning
          </button>
          <button
            onClick={() => handleAnswer(true)}
            disabled={isSaving}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-3 font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Knew it
          </button>
        </div>
      )}

      {saveError && <p className="text-center text-sm text-red-500">{saveError}</p>}
    </div>
  );
}
