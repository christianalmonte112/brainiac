"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChunkBody } from "./ChunkBody";
import { ChunkTimer } from "./ChunkTimer";
import { VocabularyPanel } from "./VocabularyPanel";

interface ChunkReaderProps {
  sessionId: string;
  chunks: string[];
  initialChunkIndex: number;
}

/**
 * Paragraph-chunked reader: one chunk visible at a time, gated behind a
 * micro-summary (F-003) rather than a plain "next" button. ChunkBody is
 * keyed by chunkIndex so its read/summarize stage resets on every new chunk.
 */
export function ChunkReader({ sessionId, chunks, initialChunkIndex }: ChunkReaderProps) {
  const router = useRouter();
  const totalChunks = chunks.length;
  const alreadyCompleted = initialChunkIndex >= totalChunks;

  const [chunkIndex, setChunkIndex] = useState(() => Math.min(initialChunkIndex, totalChunks - 1));
  const [restarted, setRestarted] = useState(false);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

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
    setPanelOpen(true);
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
        persist={!restarted}
      />

      <VocabularyPanel
        word={activeWord}
        isOpen={panelOpen}
        sessionId={sessionId}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
