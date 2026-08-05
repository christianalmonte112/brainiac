import { describe, expect, it } from "vitest";
import {
  applyAnswer,
  createMemoryRoundState,
  isRoundFinished,
  resetMemoryRound,
} from "./memoryRoundState";

describe("memoryRoundState", () => {
  it("marks the round finished when cardIndex reaches the batch size", () => {
    let state = createMemoryRoundState();
    state = applyAnswer(state, "alpha", false);
    state = applyAnswer(state, "beta", false);
    expect(isRoundFinished(state, 2)).toBe(true);
    expect(state.missedWords).toEqual(["alpha", "beta"]);
  });

  it("resets to an unfinished round even when card ids would be unchanged", () => {
    let state = createMemoryRoundState();
    state = applyAnswer(state, "alpha", false);
    state = applyAnswer(state, "beta", false);
    expect(isRoundFinished(state, 2)).toBe(true);

    // Bug: router.refresh() alone left finished=true when the key stayed the same.
    state = resetMemoryRound();
    expect(isRoundFinished(state, 2)).toBe(false);
    expect(state.cardIndex).toBe(0);
    expect(state.missedWords).toEqual([]);
    expect(state.correctCount).toBe(0);
  });
});
