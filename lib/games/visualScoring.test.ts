import { describe, expect, it } from "vitest";
import {
  fractionScore,
  invertPermutation,
  scorePositions,
  shuffleAvoidingIdentity,
  shuffleWithRng,
} from "./visualScoring";

/** Deterministic RNG that replays a fixed sequence (wraps around). */
function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe("shuffleWithRng", () => {
  it("is deterministic for a fixed RNG and keeps all items", () => {
    const items = ["a", "b", "c", "d"];
    const first = shuffleWithRng(items, fixedRng([0.1, 0.7, 0.3]));
    const second = shuffleWithRng(items, fixedRng([0.1, 0.7, 0.3]));

    expect(first.shuffled).toEqual(second.shuffled);
    expect([...first.shuffled].sort()).toEqual([...items].sort());
  });

  it("reports sourceIndex consistent with the shuffled output", () => {
    const items = ["a", "b", "c", "d", "e"];
    const { shuffled, sourceIndex } = shuffleWithRng(items, fixedRng([0.9, 0.2, 0.6, 0.4]));

    sourceIndex.forEach((orig, k) => {
      expect(shuffled[k]).toBe(items[orig]!);
    });
  });

  it("does not mutate the input array", () => {
    const items = ["a", "b", "c"];
    shuffleWithRng(items, fixedRng([0.5, 0.5]));
    expect(items).toEqual(["a", "b", "c"]);
  });
});

describe("shuffleAvoidingIdentity", () => {
  it("re-rolls when the first shuffle lands on the identity permutation", () => {
    // rng ≈ i/(i+1) makes Fisher–Yates swap every element with itself
    // (identity) on the first pass; the follow-up values break it.
    const rng = fixedRng([0.99, 0.99, 0.99, 0.1, 0.2, 0.3]);
    const { sourceIndex } = shuffleAvoidingIdentity(["a", "b", "c", "d"], rng);
    expect(sourceIndex.some((v, i) => v !== i)).toBe(true);
  });

  it("returns single-item arrays unchanged without looping", () => {
    const { shuffled, sourceIndex } = shuffleAvoidingIdentity(["only"], fixedRng([0.5]));
    expect(shuffled).toEqual(["only"]);
    expect(sourceIndex).toEqual([0]);
  });
});

describe("invertPermutation", () => {
  it("maps original positions to shuffled positions", () => {
    // shuffled[0]=orig 2, shuffled[1]=orig 0, shuffled[2]=orig 1
    expect(invertPermutation([2, 0, 1])).toEqual([1, 2, 0]);
  });

  it("round-trips with a shuffle so solutions line up", () => {
    const items = ["s1", "s2", "s3", "s4", "s5"];
    const { shuffled, sourceIndex } = shuffleWithRng(items, fixedRng([0.31, 0.72, 0.05, 0.88]));
    const solution = invertPermutation(sourceIndex);
    // Reading the shuffled array in solution order recovers the original.
    expect(solution.map((k) => shuffled[k]!)).toEqual(items);
  });
});

describe("scorePositions", () => {
  it("grades position-by-position", () => {
    const { perPosition, correctCount, totalCount } = scorePositions([1, 0, 2], [1, 2, 2]);
    expect(perPosition).toEqual([true, false, true]);
    expect(correctCount).toBe(2);
    expect(totalCount).toBe(3);
  });

  it("counts missing answers as wrong and ignores extras", () => {
    expect(scorePositions([1], [1, 2]).correctCount).toBe(1);
    expect(scorePositions([1], [1, 2]).totalCount).toBe(2);
    expect(scorePositions([1, 2, 9, 9], [1, 2]).correctCount).toBe(2);
    expect(scorePositions([1, 2, 9, 9], [1, 2]).totalCount).toBe(2);
  });
});

describe("fractionScore", () => {
  it("returns a 0..1 fraction and survives a zero denominator", () => {
    expect(fractionScore(3, 4)).toBeCloseTo(0.75);
    expect(fractionScore(0, 0)).toBe(0);
  });
});
