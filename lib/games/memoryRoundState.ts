/** Pure helpers for F-014 memory-game round transitions (testable without React). */

export interface MemoryRoundState {
  cardIndex: number;
  revealed: boolean;
  correctCount: number;
  missedWords: string[];
}

export function createMemoryRoundState(): MemoryRoundState {
  return { cardIndex: 0, revealed: false, correctCount: 0, missedWords: [] };
}

export function isRoundFinished(state: MemoryRoundState, totalCards: number): boolean {
  return state.cardIndex >= totalCards;
}

/** Advance after a successful self-grade. */
export function applyAnswer(
  state: MemoryRoundState,
  word: string,
  correct: boolean,
): MemoryRoundState {
  return {
    cardIndex: state.cardIndex + 1,
    revealed: false,
    correctCount: correct ? state.correctCount + 1 : state.correctCount,
    missedWords: correct ? state.missedWords : [...state.missedWords, word],
  };
}

/**
 * "Review missed words" must reset local round state even when the due-card
 * id list is unchanged (parent key won't remount the client component).
 */
export function resetMemoryRound(): MemoryRoundState {
  return createMemoryRoundState();
}
