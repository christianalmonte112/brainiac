"use client";

import { useEffect, useRef, useState } from "react";
import { submitListeningAttempt, type ListeningAttemptResult } from "./actions";

/**
 * F-015 listening game flow: paste lyrics → Claude segments them → per
 * segment, listen (ElevenLabs TTS via the existing /api/voice/read route),
 * fill the blanks, answer the question → server-graded results vs.
 * baseline. Audio sync is segment-level for v1: the segment being played
 * is highlighted while its audio runs.
 */

interface Annotation {
  word: string;
  note: string;
}

interface Segment {
  id: string;
  orderIndex: number;
  lyricText: string;
  annotations: Annotation[];
  blankedText: string;
  blankCount: number;
  question: { prompt: string; options: string[] };
}

interface GamePayload {
  gameId: string;
  title: string;
  segments: Segment[];
}

interface SegmentAnswer {
  blanks: string[];
  choice: number | null;
}

export function ListeningGameFlow() {
  const [game, setGame] = useState<GamePayload | null>(null);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [segmentIndex, setSegmentIndex] = useState(0);
  const [answers, setAnswers] = useState<SegmentAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ListeningAttemptResult | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/games/listening/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, lyrics }),
      });
      const data = (await res.json()) as GamePayload & { error?: string };
      if (!res.ok || !Array.isArray(data.segments) || data.segments.length === 0) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setGame(data);
      setAnswers(data.segments.map((s) => ({ blanks: Array(s.blankCount).fill(""), choice: null })));
      setSegmentIndex(0);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build the game. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFinish() {
    if (!game || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const graded = await submitListeningAttempt({ listeningGameId: game.gameId, answers });
      setResult(graded);
    } catch {
      setError("Couldn't submit your answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAll() {
    setGame(null);
    setResult(null);
    setError(null);
    setTitle("");
    setLyrics("");
  }

  if (result && game) {
    return <ListeningResults result={result} game={game} answers={answers} onPlayAgain={resetAll} />;
  }

  if (game) {
    const segment = game.segments[segmentIndex]!;
    const answer = answers[segmentIndex]!;
    const isLast = segmentIndex === game.segments.length - 1;
    const answered = answer.choice !== null && answer.blanks.every((b) => b.trim().length > 0);

    return (
      <div className="flex flex-col gap-6">
        <p className="font-mono text-xs uppercase tracking-wide text-slate-400">
          Segment {segmentIndex + 1} of {game.segments.length} · {game.title}
        </p>

        <SegmentExercise
          key={segment.id}
          segment={segment}
          answer={answer}
          onChange={(next) =>
            setAnswers((prev) => prev.map((a, i) => (i === segmentIndex ? next : a)))
          }
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          {segmentIndex > 0 && (
            <button
              onClick={() => setSegmentIndex((i) => i - 1)}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={!answered || isSubmitting}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isSubmitting ? "Scoring…" : "Finish and score"}
            </button>
          ) : (
            <button
              onClick={() => setSegmentIndex((i) => i + 1)}
              disabled={!answered}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Next segment
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Paste lyrics you have the right to use — your own writing, public-domain songs, or licensed text. Brainiac
        breaks them into listening exercises with vocabulary notes, fill-in-the-blanks, and comprehension questions.
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Song title"
        maxLength={200}
        className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
      <textarea
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder="Paste the lyrics here…"
        rows={10}
        className="resize-none rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || title.trim().length === 0 || lyrics.trim().length < 40}
        className="self-start rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {isGenerating ? "Building your game…" : "Build listening game"}
      </button>
    </div>
  );
}

function SegmentExercise({
  segment,
  answer,
  onChange,
}: {
  segment: Segment;
  answer: SegmentAnswer;
  onChange: (next: SegmentAnswer) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  async function handlePlay() {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    setAudioError(null);

    // Reuse fetched audio on replay.
    if (audioRef.current && urlRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const res = await fetch("/api/voice/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: segment.lyricText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audioRef.current = audio;
      void audio.play();
      setIsPlaying(true);
    } catch {
      setAudioError("Couldn't load audio for this segment. You can still read it below.");
    } finally {
      setIsLoadingAudio(false);
    }
  }

  // Render the blanked text with an input per ____.
  const parts = segment.blankedText.split("____");

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isPlaying ? "border-slate-900 bg-slate-900 text-slate-50" : "border-slate-200 bg-slate-50 text-slate-800"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePlay}
            disabled={isLoadingAudio}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              isPlaying
                ? "bg-white text-slate-900 hover:bg-slate-100"
                : "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
            }`}
          >
            {isLoadingAudio ? "Loading…" : isPlaying ? "⏸ Pause" : "▶ Listen"}
          </button>
          {isPlaying && <span className="font-mono text-[11px] uppercase tracking-wide opacity-70">Now playing</span>}
        </div>
        {audioError && <p className={`mt-3 text-sm ${isPlaying ? "text-slate-200" : "text-red-600"}`}>{audioError}</p>}
        {segment.annotations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {segment.annotations.map((a, i) => (
              <span
                key={i}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  isPlaying ? "border-slate-600 text-slate-200" : "border-slate-300 text-slate-600"
                }`}
              >
                <span className="font-medium">{a.word}</span> — {a.note}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-base leading-loose text-slate-800">
        {parts.map((part, i) => (
          <span key={i} className="whitespace-pre-wrap">
            {part}
            {i < parts.length - 1 && (
              <input
                value={answer.blanks[i] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...answer,
                    blanks: answer.blanks.map((b, k) => (k === i ? e.target.value : b)),
                  })
                }
                placeholder="type what you hear"
                className="mx-1 inline-block w-36 rounded-md border border-slate-300 px-2 py-0.5 text-sm focus:border-slate-500 focus:outline-none"
              />
            )}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-900">{segment.question.prompt}</p>
        {segment.question.options.map((option, k) => (
          <button
            key={k}
            onClick={() => onChange({ ...answer, choice: k })}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
              answer.choice === k
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:border-slate-400"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListeningResults({
  result,
  game,
  answers,
  onPlayAgain,
}: {
  result: ListeningAttemptResult;
  game: GamePayload;
  answers: SegmentAnswer[];
  onPlayAgain: () => void;
}) {
  const percent = Math.round(result.score * 100);
  const baseline = result.baselineComprehension;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Listening score</p>
        <p className="mt-1 text-4xl font-bold text-slate-900">{percent}%</p>
        <p className="mt-2 text-sm text-slate-500">
          {result.correctCount} of {result.totalCount} correct
          {baseline !== null && <> · baseline comprehension {Math.round(baseline)}%</>}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {result.perSegment.map((seg, i) => {
          const question = game.segments[i]?.question;
          return (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Segment {i + 1}</p>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                {seg.blankAnswers.map((expected, b) => (
                  <p key={b} className={seg.blanks[b] ? "text-emerald-700" : "text-red-600"}>
                    {seg.blanks[b] ? "✓" : "✗"} Blank {b + 1}: <span className="font-medium">{expected}</span>
                    {!seg.blanks[b] && answers[i]?.blanks[b]?.trim() && (
                      <span className="text-slate-400"> (you wrote “{answers[i]!.blanks[b]}”)</span>
                    )}
                  </p>
                ))}
                <p className={seg.choiceCorrect ? "text-emerald-700" : "text-red-600"}>
                  {seg.choiceCorrect ? "✓" : "✗"} Question: {question?.options[seg.correctIndex]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onPlayAgain}
        className="self-start rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Try another song
      </button>
    </div>
  );
}
