"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitChunkSummary } from "../actions";
import { extractCandidateKeywords } from "@/lib/reading-sessions/keywords";
import { ClickableParagraph } from "./ClickableParagraph";

interface ChunkBodyProps {
  sessionId: string;
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
  onSubmitted: (completed: boolean) => void;
  onWordClick: (word: string) => void;
  /** False during a post-completion re-read, where progress is already saved and shouldn't be overwritten. */
  persist?: boolean;
}

/**
 * One chunk's text plus its micro-summary gate (F-003): the passage dims
 * once the reader says they're done, and the next chunk stays locked until
 * they submit a one-sentence summary or pick exactly 3 keywords. Render this
 * keyed by chunkIndex from the parent so all local state — stage, mode,
 * drafts — resets naturally on a fresh mount instead of an effect-driven
 * reset.
 */
export function ChunkBody({
  sessionId,
  chunkText,
  chunkIndex,
  totalChunks,
  onSubmitted,
  onWordClick,
  persist = true,
}: ChunkBodyProps) {
  const [stage, setStage] = useState<"reading" | "summarizing">("reading");
  const [mode, setMode] = useState<"summary" | "keywords">("summary");
  const [summaryText, setSummaryText] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  const candidateKeywords = useMemo(() => extractCandidateKeywords(chunkText), [chunkText]);
  const isLastChunk = chunkIndex === totalChunks - 1;
  const canSubmit = mode === "summary" ? summaryText.trim().length > 0 : selectedKeywords.length === 3;

  function toggleKeyword(word: string) {
    setSelectedKeywords((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 3) return prev;
      return [...prev, word];
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);

    if (!persist) {
      onSubmitted(isLastChunk);
      return;
    }

    startTransition(async () => {
      try {
        const chunkSeconds =
          mountedAtRef.current !== null ? Math.round((Date.now() - mountedAtRef.current) / 1000) : 0;
        const result = await submitChunkSummary({
          sessionId,
          chunkIndex,
          totalChunks,
          mode,
          summaryText: mode === "summary" ? summaryText.trim() : undefined,
          keywords: mode === "keywords" ? selectedKeywords : undefined,
          chunkSeconds,
        });
        onSubmitted(result.completed);
      } catch {
        setError("Couldn't save your summary. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex flex-col gap-4 text-base leading-relaxed text-slate-800 transition-opacity duration-300 ${
          stage === "summarizing" ? "opacity-40" : ""
        }`}
      >
        {chunkText.split("\n\n").map((paragraph, index) => (
          <ClickableParagraph key={index} text={paragraph} onWordClick={onWordClick} />
        ))}
      </div>

      {stage === "reading" && (
        <button
          onClick={() => setStage("summarizing")}
          className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
        >
          I&apos;ve read this
        </button>
      )}

      {stage === "summarizing" && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setMode("summary")}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                mode === "summary" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Write a summary
            </button>
            <button
              onClick={() => setMode("keywords")}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                mode === "keywords" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pick keywords
            </button>
          </div>

          {mode === "summary" ? (
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="Summarize this section in one sentence..."
              maxLength={280}
              rows={2}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {candidateKeywords.map((word) => {
                  const selected = selectedKeywords.includes(word);
                  return (
                    <button
                      key={word}
                      onClick={() => toggleKeyword(word)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">{selectedKeywords.length}/3 selected</p>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Saving..." : isLastChunk ? "Finish" : "Submit & continue"}
          </button>
        </div>
      )}
    </div>
  );
}
