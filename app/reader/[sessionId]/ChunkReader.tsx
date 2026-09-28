"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveReadingTimer } from "@/lib/reading-sessions/useActiveReadingTimer";
import { ChunkBody } from "./ChunkBody";
import { ChunkTimer } from "./ChunkTimer";
import { VocabularyPanel } from "./VocabularyPanel";
import { HighlightTutor } from "./HighlightTutor";
import { SocraticTutor } from "./SocraticTutor";
import { QuizModal, type QuizQuestion } from "./QuizModal";
import { SummaryModal } from "./SummaryModal";

interface ChunkReaderProps {
  sessionId: string;
  chunks: string[];
  initialChunkIndex: number;
  documentTitle: string;
  documentText: string;
  /** True when the session is already finished (status or chunk progress). */
  initiallyComplete?: boolean;
}

/**
 * Paragraph-chunked reader: one chunk visible at a time, gated behind a
 * micro-summary (F-003) rather than a plain "next" button.
 *
 * On completion the user is offered quiz / summary / Socratic / games.
 * Returning to a finished session restores that hub — it does NOT force a
 * re-read. "Read it again" is the only path that restarts from chunk 0.
 *
 * Manages three independent panels:
 * - VocabularyPanel (z-40) — single-word lookup
 * - HighlightTutor (z-50) — multi-word Claude breakdown
 * - SocraticTutor (z-[100]) — full-screen post-completion Q&A
 */
export function ChunkReader({
  sessionId,
  chunks,
  initialChunkIndex,
  documentTitle,
  documentText,
  initiallyComplete = false,
}: ChunkReaderProps) {
  const router = useRouter();
  const totalChunks = chunks.length;
  const alreadyCompleted = initiallyComplete || initialChunkIndex >= totalChunks;

  const [chunkIndex, setChunkIndex] = useState(() =>
    Math.min(Math.max(initialChunkIndex, 0), Math.max(totalChunks - 1, 0)),
  );
  // Persist the finished hub across navigations (Progress → back to doc).
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [restarted, setRestarted] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Vocabulary panel state
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [vocabPanelOpen, setVocabPanelOpen] = useState(false);

  // Highlight tutor state
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const [highlightParagraph, setHighlightParagraph] = useState<string | null>(null);
  const [highlightTutorOpen, setHighlightTutorOpen] = useState(false);

  // Socratic tutor state
  const [socraticOpen, setSocraticOpen] = useState(false);

  // Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState<{ quizId: string; questions: QuizQuestion[] } | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Full-session summary state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [readingStage, setReadingStage] = useState<"reading" | "summarizing" | "scored">("reading");

  const safeChunkIndex = Math.min(Math.max(chunkIndex, 0), totalChunks - 1);
  const timerRunning = !completed && readingStage === "reading";
  const { activeSeconds, getActiveSeconds, reset: resetReadingTimer } = useActiveReadingTimer(timerRunning);

  useEffect(() => {
    resetReadingTimer();
  }, [safeChunkIndex, resetReadingTimer]);

  async function handleStartQuiz() {
    setIsGeneratingQuiz(true);
    setQuizError(null);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { quizId: string; questions: QuizQuestion[] };
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setQuizError("No quiz questions were generated for this document yet. Please try again.");
        return;
      }
      setQuizData(data);
      setQuizOpen(true);
    } catch {
      setQuizError("Couldn't generate quiz. Please try again.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  async function handleGetSummary() {
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json().catch(() => ({}))) as { content?: string; error?: string };
      if (!res.ok) {
        if (res.status === 429) {
          setSummaryError(data.error ?? "Too many AI requests this hour. Wait a bit, then try again.");
        } else {
          setSummaryError(data.error ?? "Couldn't generate summary. Please try again.");
        }
        return;
      }
      if (!data.content) {
        setSummaryError("Couldn't generate summary. Please try again.");
        return;
      }
      setSummaryContent(data.content);
      setSummaryOpen(true);
    } catch {
      setSummaryError("Couldn't generate summary. Please try again.");
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  // Completion screen — shown when all chunks are done and no overlay is open.
  if (completed && !socraticOpen && !quizOpen && !summaryOpen) {
    if (reviewOpen) {
      return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Reviewing finished document</p>
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to actions
            </button>
          </div>
          <div className="flex flex-col gap-4 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
            {documentText.trim()}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleGetSummary}
              disabled={isGeneratingSummary}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isGeneratingSummary ? "Generating…" : "Get Summary"}
            </button>
            <button
              type="button"
              onClick={handleStartQuiz}
              disabled={isGeneratingQuiz}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isGeneratingQuiz ? "Generating…" : "Take Quiz"}
            </button>
            <button
              type="button"
              onClick={() => setSocraticOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Socratic Session
            </button>
          </div>
          {quizError && <p className="text-sm text-red-500">{quizError}</p>}
          {summaryError && <p className="text-sm text-red-500">{summaryError}</p>}
        </div>
      );
    }

    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-2xl">✓</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">You&apos;ve finished this document</h2>
          <p className="mt-1 text-sm text-slate-500">
            Test your retention, go deeper with Socratic questions, review the text, or read again.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <button
            onClick={handleGetSummary}
            disabled={isGeneratingSummary}
            className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isGeneratingSummary ? "Generating summary..." : "📄 Get Summary"}
          </button>
          <button
            onClick={handleStartQuiz}
            disabled={isGeneratingQuiz}
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isGeneratingQuiz ? "Generating quiz…" : "📋 Take Quiz"}
          </button>
          <button
            onClick={() => setSocraticOpen(true)}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            ✦ Start Socratic Session
          </button>
          <Link
            href={`/reader/games/visual?sessionId=${sessionId}`}
            className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700"
          >
            🧩 Visual Games
          </Link>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="rounded-lg border border-slate-200 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Review text
          </button>
          <button
            onClick={() => {
              setCompleted(false);
              setReviewOpen(false);
              setChunkIndex(0);
              setRestarted(true);
            }}
            className="rounded-lg border border-slate-200 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Read it again
          </button>
        </div>
        {quizError && <p className="text-sm text-red-500">{quizError}</p>}
        {summaryError && <p className="text-sm text-red-500">{summaryError}</p>}
      </div>
    );
  }

  const progressPercent = Math.round(((safeChunkIndex + 1) / totalChunks) * 100);

  function handleSubmitted(completed: boolean) {
    if (completed) {
      setCompleted(true);
      router.refresh();
    } else {
      setChunkIndex((current) => Math.min(current + 1, totalChunks - 1));
    }
  }

  function handleWordClick(word: string) {
    setActiveWord(word);
    setVocabPanelOpen(true);
  }

  function handleHighlight(selectedText: string, paragraphText: string) {
    setHighlightText(selectedText);
    setHighlightParagraph(paragraphText);
    setHighlightTutorOpen(true);
  }

  return (
    <>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-slate-900 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              Section {safeChunkIndex + 1} of {totalChunks}
            </span>
            <ChunkTimer activeSeconds={activeSeconds} />
          </div>
        </div>

        <ChunkBody
          key={safeChunkIndex}
          sessionId={sessionId}
          chunkText={chunks[safeChunkIndex]}
          chunkIndex={safeChunkIndex}
          totalChunks={totalChunks}
          onSubmitted={handleSubmitted}
          onWordClick={handleWordClick}
          onHighlight={handleHighlight}
          onStageChange={setReadingStage}
          getChunkSeconds={getActiveSeconds}
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
          isOpen={highlightTutorOpen}
          onClose={() => setHighlightTutorOpen(false)}
        />
      </div>

      {/* Socratic Tutor — full-screen overlay (z-[100]) */}
      {socraticOpen && (
        <SocraticTutor
          sessionId={sessionId}
          documentTitle={documentTitle}
          documentText={documentText}
          onClose={() => setSocraticOpen(false)}
        />
      )}

      {/* Quiz Modal — full-screen overlay (z-[90], below Socratic tutor) */}
      {quizOpen && quizData && (
        <QuizModal
          quizId={quizData.quizId}
          questions={quizData.questions}
          onClose={() => {
            setQuizOpen(false);
            setQuizData(null);
          }}
        />
      )}

      {/* Summary Modal — full-session summary overlay (z-[80]) */}
      {summaryOpen && summaryContent && (
        <SummaryModal
          documentTitle={documentTitle}
          content={summaryContent}
          onClose={() => {
            setSummaryOpen(false);
            setSummaryContent(null);
          }}
        />
      )}
    </>
  );
}
