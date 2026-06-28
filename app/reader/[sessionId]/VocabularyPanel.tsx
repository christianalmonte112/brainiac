"use client";

import { useEffect, useState } from "react";
import { lookupAndSaveWord, type VocabularyLookupResult } from "@/app/vocabulary/actions";

interface VocabularyPanelProps {
  word: string | null;
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
}

/**
 * Slide-in panel for the vocabulary mapper (F-004). Always mounted so the
 * open/close transform animates; the inner content is keyed by `word` so its
 * loading/result state resets cleanly on every new click instead of via an
 * effect-driven reset.
 */
export function VocabularyPanel({ word, isOpen, sessionId, onClose }: VocabularyPanelProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={`fixed inset-y-0 right-0 z-40 w-full max-w-sm border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
        <button onClick={onClose} className="self-end text-sm text-slate-500 hover:text-slate-800">
          Close
        </button>
        {word && <VocabularyPanelContent key={word} word={word} sessionId={sessionId} />}
      </div>
    </aside>
  );
}

function VocabularyPanelContent({ word, sessionId }: { word: string; sessionId: string }) {
  const [result, setResult] = useState<VocabularyLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    lookupAndSaveWord(word, sessionId)
      .then((lookup) => {
        if (active) setResult(lookup);
      })
      .catch(() => {
        if (active) setError("Couldn't look up that word. Please try again.");
      });

    return () => {
      active = false;
    };
  }, [word, sessionId]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!result) {
    return <p className="text-sm text-slate-500">Looking up &ldquo;{word}&rdquo;...</p>;
  }

  if (!result.found) {
    return (
      <p className="text-sm text-slate-500">
        No dictionary entry found for &ldquo;{result.word}&rdquo;.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{result.word}</h2>
        <p className="text-sm text-slate-500">
          {[result.phonetic, result.partOfSpeech].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Definition</h3>
        <p className="mt-1 text-sm text-slate-800">{result.definition}</p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Etymology</h3>
        <p className="mt-1 text-sm text-slate-800">{result.etymology ?? "No etymology available for this word."}</p>
      </div>

      {result.synonyms.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Synonyms</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {result.synonyms.map((synonym) => (
              <span key={synonym} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {synonym}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">Saved to your vocabulary bank.</p>
    </div>
  );
}
