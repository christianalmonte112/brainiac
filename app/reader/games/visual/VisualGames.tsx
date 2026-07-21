"use client";

import { useState } from "react";
import Link from "next/link";
import { submitVisualGameAttempt, type VisualGameAttemptResult } from "./actions";

/**
 * F-013 visual games client flow: pick a game type → play → server-graded
 * results compared to the baseline comprehension score. Solutions never
 * reach the client until after grading.
 */

type GameType = "MATCHING" | "SEQUENCING";

interface GameItem {
  id: string;
  orderIndex: number;
  prompt: string;
  itemData: { left?: string[]; right?: string[]; steps?: string[] };
}

interface GamePayload {
  gameId: string;
  gameType: GameType;
  items: GameItem[];
}

interface VisualGamesProps {
  sessionId: string;
  sessionTitle: string;
}

export function VisualGames({ sessionId, sessionTitle }: VisualGamesProps) {
  const [game, setGame] = useState<GamePayload | null>(null);
  const [loadingType, setLoadingType] = useState<GameType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisualGameAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function generate(gameType: GameType) {
    setLoadingType(gameType);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/games/visual/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, gameType }),
      });
      const data = (await res.json()) as GamePayload & { error?: string };
      if (!res.ok || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setGame(data);
    } catch {
      setError("Couldn't generate the game. Please try again.");
    } finally {
      setLoadingType(null);
    }
  }

  async function handleSubmit(selections: number[]) {
    if (!game || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const graded = await submitVisualGameAttempt({
        visualGameId: game.gameId,
        answers: [{ selections }],
      });
      setResult(graded);
    } catch {
      setError("Couldn't submit your answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setGame(null);
    setResult(null);
    setError(null);
  }

  if (result && game) {
    return <ResultsScreen result={result} game={game} onPlayAgain={reset} />;
  }

  if (game) {
    const item = game.items[0]!;
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-slate-500">{item.prompt}</p>
        {game.gameType === "MATCHING" ? (
          <MatchingBoard
            left={item.itemData.left ?? []}
            right={item.itemData.right ?? []}
            disabled={isSubmitting}
            onSubmit={handleSubmit}
          />
        ) : (
          <SequencingBoard steps={item.itemData.steps ?? []} disabled={isSubmitting} onSubmit={handleSubmit} />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={reset} className="self-start text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Choose a different game
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Two ways to test how well you understood “{sessionTitle}”. Both are generated fresh from the document.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => generate("MATCHING")}
          disabled={loadingType !== null}
          className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-2xl">🔗</span>
          <span className="font-semibold text-slate-900">Matching</span>
          <span className="text-sm text-slate-500">
            {loadingType === "MATCHING" ? "Generating…" : "Pair key terms with what they mean in this document."}
          </span>
        </button>
        <button
          onClick={() => generate("SEQUENCING")}
          disabled={loadingType !== null}
          className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-5 text-left transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-2xl">🔢</span>
          <span className="font-semibold text-slate-900">Sequencing</span>
          <span className="text-sm text-slate-500">
            {loadingType === "SEQUENCING" ? "Generating…" : "Put the document's events or steps back in order."}
          </span>
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function MatchingBoard({
  left,
  right,
  disabled,
  onSubmit,
}: {
  left: string[];
  right: string[];
  disabled: boolean;
  onSubmit: (selections: number[]) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(0);
  const [assignments, setAssignments] = useState<(number | null)[]>(() => left.map(() => null));

  function assign(rightIndex: number) {
    if (selectedLeft === null) return;
    setAssignments((prev) => {
      const next = prev.map((v) => (v === rightIndex ? null : v)); // steal from any previous owner
      next[selectedLeft] = rightIndex;
      // Auto-advance to the next unassigned term.
      const nextUnassigned = next.findIndex((v) => v === null);
      setSelectedLeft(nextUnassigned === -1 ? null : nextUnassigned);
      return next;
    });
  }

  const complete = assignments.every((v) => v !== null);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          {left.map((term, i) => (
            <button
              key={`l${i}`}
              onClick={() => setSelectedLeft(i)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                selectedLeft === i
                  ? "border-slate-900 bg-slate-900 text-white"
                  : assignments[i] !== null
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-slate-300 text-slate-900 hover:border-slate-500"
              }`}
            >
              {term}
              {assignments[i] !== null && (
                <span className="mt-1 block text-xs font-normal opacity-70">→ {right[assignments[i]!]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((description, k) => {
            const taken = assignments.includes(k);
            return (
              <button
                key={`r${k}`}
                onClick={() => assign(k)}
                disabled={selectedLeft === null && !taken}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  taken
                    ? "border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-300 text-slate-700 hover:border-slate-500"
                }`}
              >
                {description}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const selections = assignments.map((v) => v ?? -1);
            onSubmit(selections);
          }}
          disabled={!complete || disabled}
          className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {disabled ? "Checking…" : "Check answers"}
        </button>
        <button
          onClick={() => {
            setAssignments(left.map(() => null));
            setSelectedLeft(0);
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function SequencingBoard({
  steps,
  disabled,
  onSubmit,
}: {
  steps: string[];
  disabled: boolean;
  onSubmit: (selections: number[]) => void;
}) {
  const [chosen, setChosen] = useState<number[]>([]);

  const remaining = steps.map((_, k) => k).filter((k) => !chosen.includes(k));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your order</p>
        {chosen.length === 0 && <p className="text-sm text-slate-400">Tap the steps below in the right order.</p>}
        {chosen.map((k, position) => (
          <div key={`c${k}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="font-mono text-xs text-slate-400">{position + 1}</span>
            <span className="text-sm text-slate-800">{steps[k]}</span>
          </div>
        ))}
        {chosen.length > 0 && (
          <button
            onClick={() => setChosen((prev) => prev.slice(0, -1))}
            className="self-start text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Undo last
          </button>
        )}
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Steps</p>
          {remaining.map((k) => (
            <button
              key={`s${k}`}
              onClick={() => setChosen((prev) => [...prev, k])}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-left text-sm text-slate-800 transition-colors hover:border-slate-500"
            >
              {steps[k]}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => onSubmit(chosen)}
        disabled={chosen.length !== steps.length || disabled}
        className="self-start rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {disabled ? "Checking…" : "Check order"}
      </button>
    </div>
  );
}

function ResultsScreen({
  result,
  game,
  onPlayAgain,
}: {
  result: VisualGameAttemptResult;
  game: GamePayload;
  onPlayAgain: () => void;
}) {
  const percent = Math.round(result.score * 100);
  const baseline = result.baselineComprehension;
  const delta = baseline !== null ? percent - Math.round(baseline) : null;
  const item = game.items[0]!;
  const labels = game.gameType === "MATCHING" ? (item.itemData.left ?? []) : [];
  const options = game.gameType === "MATCHING" ? (item.itemData.right ?? []) : (item.itemData.steps ?? []);
  const per = result.perItem[0] ?? [];
  const solution = result.solutions[0] ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your score</p>
        <p className="mt-1 text-4xl font-bold text-slate-900">{percent}%</p>
        <p className="mt-2 text-sm text-slate-500">
          {result.correctCount} of {result.totalCount} correct
          {baseline !== null && (
            <>
              {" · "}baseline comprehension {Math.round(baseline)}%
              {delta !== null && (
                <span className="font-medium text-slate-900">
                  {" "}
                  ({delta >= 0 ? "+" : ""}
                  {delta})
                </span>
              )}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {per.map((correct, position) => (
          <div
            key={position}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
              correct ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}
          >
            <span>{correct ? "✓" : "✗"}</span>
            <div>
              {game.gameType === "MATCHING" ? (
                <>
                  <span className="font-medium text-slate-900">{labels[position]}</span>
                  <span className="text-slate-600"> → {options[solution[position] ?? -1]}</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-xs text-slate-400">{position + 1} </span>
                  <span className="text-slate-800">{options[solution[position] ?? -1]}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Play another game
        </button>
        <Link
          href="/reader"
          className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to reading
        </Link>
      </div>
    </div>
  );
}
