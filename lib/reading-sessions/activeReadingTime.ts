export interface ActiveReadingClockState {
  accumulatedMs: number;
  lastTickAt: number | null;
  running: boolean;
  visible: boolean;
}

export function createActiveReadingClock(): ActiveReadingClockState {
  return { accumulatedMs: 0, lastTickAt: null, running: false, visible: true };
}

function flushTo(now: number, state: ActiveReadingClockState): ActiveReadingClockState {
  if (state.lastTickAt === null) return state;
  return {
    ...state,
    accumulatedMs: state.accumulatedMs + (now - state.lastTickAt),
    lastTickAt: null,
  };
}

/** Starts or stops the clock. Stopping flushes elapsed time since the last tick. */
export function setClockRunning(
  state: ActiveReadingClockState,
  running: boolean,
  now: number,
): ActiveReadingClockState {
  if (running === state.running) return state;

  if (!running) {
    return { ...flushTo(now, state), running: false };
  }

  return {
    ...state,
    running: true,
    lastTickAt: state.visible ? now : null,
  };
}

/** Pauses/resumes based on document visibility while the clock is running. */
export function setClockVisible(
  state: ActiveReadingClockState,
  visible: boolean,
  now: number,
): ActiveReadingClockState {
  if (visible === state.visible) return state;

  if (!visible) {
    return { ...flushTo(now, state), visible: false };
  }

  return {
    ...state,
    visible: true,
    lastTickAt: state.running ? now : null,
  };
}

/** Advances the clock by one interval while running and visible. */
export function tickClock(state: ActiveReadingClockState, now: number): ActiveReadingClockState {
  if (!state.running || !state.visible) return state;

  if (state.lastTickAt === null) {
    return { ...state, lastTickAt: now };
  }

  return {
    ...state,
    accumulatedMs: state.accumulatedMs + (now - state.lastTickAt),
    lastTickAt: now,
  };
}

/** Resets accumulated time for a new chunk. */
export function resetClock(): ActiveReadingClockState {
  return { accumulatedMs: 0, lastTickAt: null, running: false, visible: true };
}

/** Total active seconds, including time since the last tick when still running. */
export function elapsedSeconds(state: ActiveReadingClockState, now: number): number {
  let totalMs = state.accumulatedMs;
  if (state.running && state.visible && state.lastTickAt !== null) {
    totalMs += now - state.lastTickAt;
  }
  return Math.max(0, Math.round(totalMs / 1000));
}
