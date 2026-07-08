"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChunkBody } from "./ChunkBody";
import { ChunkTimer } from "./ChunkTimer";
import { VocabularyPanel } from "./VocabularyPanel";
import { HighlightTutor } from "./HighlightTutor";

interface ChunkReaderProps {
  sessionId: string;
  chunks: string[];
  initialChunkIndex: number;
}

/**
 * Paragraph-chunked reader: one chunk visible at a time, gated behind a
 * micro-summary (F-003) rather than a plain "next" button.
 *
 * Manages two independent slide-in panels:
 * - VocabularyPanel (z-40) — single-word lookup via the vocabulary mapper
 * - HighlightTutor (z-50) — multi-word highlight breakdown via Claude
 *
 * Both panels have separate open/close state and can coexist; HighlightTutor
 * sits above VocabularyPanel when both are open.
 */
export function ChunkReader({ sessionId, chunks, initialChunkIndex }: ChunkReaderProps) {
  const router = useRouter();
  const totalChunks = chunks.length;
  const alreadyCompleted = initialChunkIndex >= totalChunks;

  const [chunkIndex, setChunkIndex] = useState(() => Math.min(initialChunkIndex, totalChunks - 1));
  const [restarted, setRestarted] = useState(false);

  // Vocabulary panel state
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [vocabPanelOpen, setVocabPanelOpen] = useState(false);

  // Highlight tutor state
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const [highlightParagraph, setHighlightParagraph] = useState<string | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);

  if (alreadyCompleted && !restarted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-slate-900">You&apos;ve finished this document</h2>
        <button
          onClick={() => {
            setChunkIndex(0);
            setRestarted(true);
          }}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Read it again
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((chunkIndex + 1) / totalChunks) * 100);

  function handleSubmitted(completed: boolean) {
    if (completed) {
      router.refresh();
    } else {
      setChunkIndex((current) => current + 1);
    }
  }

  function handleWordClick(word: string) {
    setActiveWord(word);
    setVocabPanelOpen(true);
  }

  function handleHighlight(selectedText: string, paragraphText: string) {
    setHighlightText(selectedText);
    setHighlightParagraph(paragraphText);
    setTutorOpen(true);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-slate-900 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>
            Section {chunkIndex + 1} of {totalChunks}
          </span>
          <ChunkTimer key={chunkIndex} />
        </div>
      </div>

      <ChunkBody
        key={chunkIndex}
        sessionId={sessionId}
        chunkText={chunks[chunkIndex]!}
        chunkIndex={chunkIndex}
        totalChunks={totalChunks}
        onSubmitted={handleSubmitted}
        onWordClick={handleWordClick}
        onHighlight={handleHighlight}
        persist={!restarted}
      />

      {/* Vocabulary panel — single-word lookup (z-40) */}
      <VocabularyPanel
        word={activeWord}
        isOpen={vocabPanelOpen}
        sessionId={sessionId}
        onClose={() => setVocabPanelOpen(false)}
      />

      {/* Highlight Tutor — multi-word Claude breakdown (z-50, above vocab panel) */}
      <HighlightTutor
        selectedText={highlightText}
        surroundingParagraph={highlightParagraph}
        sessionId={sessionId}
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
      />
    </div>
  );
}
