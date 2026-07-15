"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionLearningReport } from "@/lib/progress/learningInsights";

export interface QuizQuestion {
  id: string;
  orderIndex: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

interface QuizResult {
  questionIndex: number;
  prompt: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string | null;
}

interface QuizResultsResponse {
  score: number;
  correctCount: number;
  totalCount: number;
  results: QuizResult[];
  report?: SessionLearningReport;
}

interface QuizModalProps {
  quizId: string;
  questions: QuizQuestion[];
  onClose: () => void;
}

/**
 * Retention quiz modal (F-006). Presented after a reading session completes.
 *
 * One question at a time with a progress bar. After all 5 answers are
 * selected the quiz is submitted, graded server-side, and a results screen
 * shows the score with explanations for wrong answers.
 */
export function QuizModal({ quizId, questions, onClose }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [stage, setStage] = useState<"quiz" | "submitting" | "results">("quiz");
  const [results, setResults] = useState<QuizResultsResponse | null>(null);
  const [report, setReport] = useState<SessionLearningReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasQuestions = questions.length > 0;

  const currentQuestion = hasQuestions ? questions[currentIndex] : null;
  const selectedAnswer = answers[currentIndex];
  const isLastQuestion = hasQuestions ? currentIndex === questions.length - 1 : false;
  const progressPercent = hasQuestions
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

  function selectAnswer(index: number) {
    if (stage !== "quiz") return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = index;
      return next;
    });
  }

  function handleNext() {
    if (selectedAnswer === null) return;
    if (isLastQuestion) {
      submitQuiz();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  async function submitQuiz() {
    setStage("submitting");
    setSubmitError(null);
    setReport(null);

    const payload = answers.map((a) => a ?? -1);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers: payload }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as QuizResultsResponse;
      setResults(data);
      setStage("results");
    } catch {
      setSubmitError("Couldn't submit your quiz. Please try again.");
      setStage("quiz");
    }
  }

  useEffect(() => {
    if (stage !== "results" || !results) return;

    const scorePercent = Math.round(results.score * 100);
    let cancelled = false;

    async function loadReport() {
      setReportLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);

        const response = await fetch("/api/quiz/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, scorePercent }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { report: SessionLearningReport };
        if (!cancelled) setReport(data.report);
      } catch {
        // Report is optional — score screen still works without it.
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [stage, results, quizId]);

  if (!hasQuestions) {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">📋</span>
            <span className="text-sm font-semibold text-slate-900">Retention Quiz</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm text-slate-600">
            We could not build quiz questions for this document yet. Please close and try again.
          </p>
        </div>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (stage === "results" && results) {
    const pct = Math.round(results.score * 100);
    const scoreColor =
      pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600";
    const scoreBg =
      pct >= 80 ? "bg-emerald-50 border-emerald-200" : pct >= 60 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200";

    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">📋</span>
            <span className="text-sm font-semibold text-slate-900">Session report</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Done
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {/* Score summary */}
            <div className={`flex flex-col items-center gap-2 rounded-2xl border p-6 text-center ${scoreBg}`}>
              <p className={`text-4xl font-bold ${scoreColor}`}>{pct}%</p>
              <p className="text-sm font-medium text-slate-700">
                {results.correctCount} out of {results.totalCount} correct
              </p>
              {report ? (
                <>
                  <p className="text-xs text-slate-600">{report.headline}</p>
                  {report.insightLine && (
                    <p className="text-xs text-slate-500">{report.insightLine}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  {pct >= 80 ? "Excellent retention!" : pct >= 60 ? "Good effort — review the explanations below." : "Keep reading and try again."}
                </p>
              )}
            </div>

            {reportLoading && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Loading learning snapshot…
              </div>
            )}

            {report && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Learning snapshot</h3>
                <dl className="mt-3 grid gap-2 text-sm">
                  {report.avgScore30Day !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">vs. 30-day average</dt>
                      <dd className="font-medium text-slate-900">
                        {report.scoreDelta !== null && report.scoreDelta > 0 ? "+" : ""}
                        {report.scoreDelta ?? 0} pts ({report.avgScore30Day}% avg)
                      </dd>
                    </div>
                  )}
                  {report.chunkSummaryAvg !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Chunk summary score</dt>
                      <dd className="font-medium text-slate-900">{report.chunkSummaryAvg}% avg</dd>
                    </div>
                  )}
                  {report.bestChunkIndex !== null && report.chunkSummaryAvg !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Strongest section</dt>
                      <dd className="font-medium text-slate-900">Chunk {report.bestChunkIndex + 1}</dd>
                    </div>
                  )}
                  {report.weakestChunkIndex !== null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Trickiest section</dt>
                      <dd className="font-medium text-slate-900">Chunk {report.weakestChunkIndex + 1}</dd>
                    </div>
                  )}
                  {report.vocabularyWordsAdded > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Vocabulary saved</dt>
                      <dd className="font-medium text-slate-900">
                        {report.vocabularyWordsAdded} word{report.vocabularyWordsAdded === 1 ? "" : "s"}
                      </dd>
                    </div>
                  )}
                </dl>
                {report.weakAreas.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-xs text-slate-600">
                    {report.weakAreas.map((area) => (
                      <li key={area.type}>
                        {area.label} needs work — {area.accuracyPercent}% on this quiz
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/reader/progress"
                  className="mt-4 inline-block text-xs font-medium text-slate-700 underline"
                >
                  View full progress →
                </Link>
              </div>
            )}

            {/* Per-question breakdown */}
            <div className="flex flex-col gap-4">
              {results.results.map((r) => (
                <div
                  key={`${r.questionIndex}-${r.prompt}`}
                  className={`rounded-xl border p-4 ${
                    r.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-base">
                      {r.isCorrect ? "✓" : "✗"}
                    </span>
                    <p className="text-sm font-medium text-slate-900">{r.prompt}</p>
                  </div>

                  {!r.isCorrect && (
                    <div className="mt-3 flex flex-col gap-1 pl-6">
                      <p className="text-xs text-slate-500">
                        Your answer:{" "}
                        <span className="font-medium text-rose-600">
                          {r.options[r.selectedIndex] ?? "—"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Correct answer:{" "}
                        <span className="font-medium text-emerald-700">
                          {r.options[r.correctIndex]}
                        </span>
                      </p>
                      {r.explanation && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 italic">
                          {r.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="self-center rounded-lg bg-slate-900 px-8 py-3 font-medium text-white hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">📋</span>
          <span className="text-sm font-semibold text-slate-900">Retention Quiz</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Exit quiz
        </button>
      </header>

      {/* Progress bar */}
      <div className="shrink-0 px-6 pt-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question + options */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <p className="text-base font-medium leading-relaxed text-slate-900">
            {currentQuestion?.prompt}
          </p>

          <div className="flex flex-col gap-3">
            {currentQuestion?.options.map((option, i) => {
              const isSelected = selectedAnswer === i;
              const label = ["A", "B", "C", "D"][i];
              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>

          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-200 px-6 py-4">
        <div className="mx-auto flex max-w-2xl justify-end">
          <button
            onClick={handleNext}
            disabled={selectedAnswer === null || stage === "submitting"}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {stage === "submitting"
              ? "Grading…"
              : isLastQuestion
                ? "Submit quiz"
                : "Next question"}
          </button>
        </div>
      </div>
    </div>
  );
}
