"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BASELINE_PASSAGE,
  COMPREHENSION_QUESTIONS,
  INFERENCE_QUESTIONS,
  VOCABULARY_QUESTIONS,
} from "@/lib/baseline-assessment/content";
import { minElapsedSecondsForPassage } from "@/lib/baseline-assessment/scoring";
import { submitBaselineAssessment, type SubmitBaselineAssessmentResult } from "./actions";
import { QuestionStep } from "./QuestionStep";

type Step = "intro" | "reading" | "comprehension" | "vocabulary" | "inference" | "results";

const UNANSWERED = -1;
const MIN_READING_SECONDS = minElapsedSecondsForPassage(BASELINE_PASSAGE.wordCount);

export function AssessmentFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitBaselineAssessmentResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(MIN_READING_SECONDS);

  const [comprehensionAnswers, setComprehensionAnswers] = useState<number[]>(
    () => Array(COMPREHENSION_QUESTIONS.length).fill(UNANSWERED),
  );
  const [vocabularyAnswers, setVocabularyAnswers] = useState<number[]>(
    () => Array(VOCABULARY_QUESTIONS.length).fill(UNANSWERED),
  );
  const [inferenceAnswers, setInferenceAnswers] = useState<number[]>(
    () => Array(INFERENCE_QUESTIONS.length).fill(UNANSWERED),
  );

  const readingStartedAt = useRef<number | null>(null);
  const elapsedSecondsRef = useRef<number>(0);

  useEffect(() => {
    if (step !== "reading" || readingStartedAt.current === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - (readingStartedAt.current ?? Date.now())) / 1000);
      setSecondsLeft(Math.max(0, MIN_READING_SECONDS - elapsed));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [step]);

  function startReading() {
    readingStartedAt.current = Date.now();
    setSecondsLeft(MIN_READING_SECONDS);
    setStep("reading");
  }

  function finishReading() {
    if (readingStartedAt.current === null) return;
    const elapsed = Math.max(1, Math.round((Date.now() - readingStartedAt.current) / 1000));
    if (elapsed < MIN_READING_SECONDS) return;
    elapsedSecondsRef.current = elapsed;
    setStep("comprehension");
  }

  function updateAnswer(setter: typeof setComprehensionAnswers, questionIndex: number, optionIndex: number) {
    setter((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  async function finishAssessment() {
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await submitBaselineAssessment({
        elapsedSeconds: elapsedSecondsRef.current,
        comprehensionAnswers,
        vocabularyAnswers,
        inferenceAnswers,
      });
      setResult(data);
      setStep("results");
    } catch {
      setError("Something went wrong submitting your results. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const allAnswered = (answers: number[]) => answers.every((a) => a !== UNANSWERED);

  const paragraphs = useMemo(() => BASELINE_PASSAGE.body.split("\n\n"), []);
  const canFinishReading = secondsLeft === 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      {step === "intro" && (
        <div className="flex flex-col gap-6 text-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Let&apos;s find your baseline</h1>
            <p className="mt-2 text-slate-600">
              A quick, 5-minute reading check. You&apos;ll read one short passage, then answer 12 questions about
              comprehension, vocabulary, and inference. Your results set the starting point we&apos;ll measure your
              growth against — answer at your own honest pace.
            </p>
          </div>
          <button
            onClick={startReading}
            className="self-center rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
          >
            Start assessment
          </button>
        </div>
      )}

      {step === "reading" && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-slate-900">{BASELINE_PASSAGE.title}</h2>
          <div className="flex flex-col gap-4 text-base leading-relaxed text-slate-800">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div className="flex flex-col items-start gap-2">
            <button
              onClick={finishReading}
              disabled={!canFinishReading}
              className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              I&apos;ve finished reading
            </button>
            {!canFinishReading && (
              <p className="text-sm text-slate-500">
                Read at a normal pace — continue available in {secondsLeft}s (keeps your baseline realistic).
              </p>
            )}
          </div>
        </div>
      )}

      {step === "comprehension" && (
        <div className="flex flex-col gap-6">
          <QuestionStep
            title="Comprehension"
            description="Answer based only on what you just read."
            questions={COMPREHENSION_QUESTIONS}
            answers={comprehensionAnswers}
            onAnswer={(q, o) => updateAnswer(setComprehensionAnswers, q, o)}
          />
          <button
            onClick={() => setStep("vocabulary")}
            disabled={!allAnswered(comprehensionAnswers)}
            className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Continue
          </button>
        </div>
      )}

      {step === "vocabulary" && (
        <div className="flex flex-col gap-6">
          <QuestionStep
            title="Vocabulary"
            description="Choose the closest meaning for each word as it was used in the passage."
            questions={VOCABULARY_QUESTIONS}
            answers={vocabularyAnswers}
            onAnswer={(q, o) => updateAnswer(setVocabularyAnswers, q, o)}
          />
          <button
            onClick={() => setStep("inference")}
            disabled={!allAnswered(vocabularyAnswers)}
            className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Continue
          </button>
        </div>
      )}

      {step === "inference" && (
        <div className="flex flex-col gap-6">
          <QuestionStep
            title="Inference"
            description="These questions ask you to read between the lines."
            questions={INFERENCE_QUESTIONS}
            answers={inferenceAnswers}
            onAnswer={(q, o) => updateAnswer(setInferenceAnswers, q, o)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={finishAssessment}
            disabled={!allAnswered(inferenceAnswers) || isSubmitting}
            className="self-start rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Scoring..." : "Submit"}
          </button>
        </div>
      )}

      {step === "results" && result && (
        <div className="flex flex-col gap-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Your baseline is set</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreCard label="Reading speed" value={`${result.readingSpeedWPM} WPM`} />
            <ScoreCard label="Comprehension" value={`${result.comprehensionScore}%`} />
            <ScoreCard label="Vocabulary" value={`${result.vocabularyScore}%`} />
            <ScoreCard label="Inference" value={`${result.inferenceScore}%`} />
          </div>
          <div className="rounded-xl bg-slate-900 px-6 py-5 text-white">
            <p className="text-sm uppercase tracking-wide text-slate-300">Overall</p>
            <p className="text-3xl font-bold">{result.overallScore}</p>
          </div>
          <button
            onClick={() => router.push("/reader")}
            className="self-center rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700"
          >
            Go to my dashboard
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
