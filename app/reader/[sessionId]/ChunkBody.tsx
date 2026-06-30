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

interface ScoringResult {
  aiScore: number;
  aiFeedback: string;
  completed: boolean;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-semibold text-slate-900">{score}/100</span>
    </div>
  );
}

/**
 * One chunk's text plus its micro-summary gate (F-003) with AI scoring (Phase 3).
 *
 * After the user submits a written summary, Claude scores it 0–100 and returns
 * 1–2 sentences of feedback. The score card is shown in place of the form;
 * the user then clicks "Continue" to advance. Keywords mode skips scoring
 * and advances immediately as before.
 *
 * Render this keyed by chunkIndex from the parent so all local state —
 * stage, mode, drafts, scoring result — resets naturally on a fresh mount.
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
  const [stage, setStage] = useState<"reading" | "summarizing" | "scored">("reading");
  const [mode, setMode] = useState<"summary" | "keywords">("summary");
  const [summaryText, setSummaryText] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
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
          chunkText,
        });

        // Keywords mode: no score, advance immediately.
        if (mode === "keywords" || result.aiScore === undefined) {
          onSubmitted(result.completed);
          return;
        }

        // Summary mode: show the score card before advancing.
        setScoringResult({
          aiScore: result.aiScore,
          aiFeedback: result.aiFeedback ?? "",
          completed: result.completed,
        });
        setStage("scored");
      } catch {
        setError("Couldn't save your summary. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Passage — dims once the reader moves to summarizing/scored */}
      <div
        className={`flex flex-col gap-4 text-base leading-relaxed text-slate-800 transition-opacity duration-300 ${
          stage !== "reading" ? "opacity-40" : ""
        }`}
      >
        {chunkText.split("\n\n").map((paragraph, index) => (
          <ClickableParagraph key={index} text={paragraph} onWordClick={onWordClick} />
        ))}
      </div>

      {/* Stage: reading */}
      {stage === "reading" && (
        <button
          onClick={() => setStage("summarizing")}
          className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
        >
          I&apos;ve read this
        </button>
      )}

      {/* Stage: summarizing */}
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
            {isPending
              ? mode === "summary"
                ? "Scoring…"
                : "Saving…"
              : isLastChunk
                ? "Finish"
                : "Submit & continue"}
          </button>
        </div>
      )}

      {/* Stage: scored — show AI feedback before advancing */}
      {stage === "scored" && scoringResult && (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summary score</p>
            <div className="mt-2">
              <ScoreBar score={scoringResult.aiScore} />
            </div>
          </div>

          {scoringResult.aiFeedback && (
            <p className="text-sm leading-relaxed text-slate-700">{scoringResult.aiFeedback}</p>
          )}

          <button
            onClick={() => onSubmitted(scoringResult.completed)}
            className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
          >
            {scoringResult.completed ? "Finish" : "Continue reading"}
          </button>
        </div>
      )}
    </div>
  );
}
