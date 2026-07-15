/**
 * Pure helpers behind the F-013 visual games. Both game types reduce to the
 * same shape: the server shuffles content, remembers the solution as an
 * index array (`selections`), and grades the player's index array against
 * it position by position. Keeping this pure (RNG injectable) makes the
 * shuffle and grading testable — see visualScoring.test.ts.
 */

export type Rng = () => number;

export interface ShuffleResult<T> {
  /** The items in shuffled order. */
  shuffled: T[];
  /** sourceIndex[k] = index in the ORIGINAL array of shuffled[k]. */
  sourceIndex: number[];
}

/** Fisher–Yates shuffle with an injectable RNG (pass Math.random in prod). */
export function shuffleWithRng<T>(items: T[], rng: Rng): ShuffleResult<T> {
  const order = items.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return {
    shuffled: order.map((sourceIdx) => items[sourceIdx]!),
    sourceIndex: order,
  };
}

/**
 * Like shuffleWithRng, but re-shuffles (bounded) if the result is the
 * identity permutation — a "shuffled" sequencing game that's already in the
 * right order is a free win, not a game.
 */
export function shuffleAvoidingIdentity<T>(items: T[], rng: Rng, maxTries = 5): ShuffleResult<T> {
  let result = shuffleWithRng(items, rng);
  let tries = 1;
  while (items.length > 1 && tries < maxTries && result.sourceIndex.every((v, i) => v === i)) {
    result = shuffleWithRng(items, rng);
    tries++;
  }
  return result;
}

/** inv[sourceIndex[k]] = k — maps original positions to shuffled positions. */
export function invertPermutation(sourceIndex: number[]): number[] {
  const inv = new Array<number>(sourceIndex.length);
  sourceIndex.forEach((orig, k) => {
    inv[orig] = k;
  });
  return inv;
}

export interface PositionScore {
  perPosition: boolean[];
  correctCount: number;
  totalCount: number;
}

/**
 * Grades one exercise: `given[i]` is correct when it equals `correct[i]`.
 * Missing entries (player somehow submitted fewer answers) count as wrong;
 * extra entries are ignored — totalCount is always the solution's length.
 */
export function scorePositions(given: number[], correct: number[]): PositionScore {
  const perPosition = correct.map((expected, i) => given[i] === expected);
  return {
    perPosition,
    correctCount: perPosition.filter(Boolean).length,
    totalCount: correct.length,
  };
}

/** 0..1 fraction, safe for a zero denominator. */
export function fractionScore(correctCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return correctCount / totalCount;
}
