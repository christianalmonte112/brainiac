import { describe, expect, it } from "vitest";
import {
  createActiveReadingClock,
  elapsedSeconds,
  resetClock,
  setClockIdle,
  setClockRunning,
  setClockVisible,
  tickClock,
} from "./activeReadingTime";

describe("activeReadingTime", () => {
  it("starts at zero elapsed seconds", () => {
    const clock = createActiveReadingClock();
    expect(elapsedSeconds(clock, 0)).toBe(0);
  });

  it("accumulates time while running and visible", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = tickClock(clock, 1000);
    clock = tickClock(clock, 2000);

    expect(elapsedSeconds(clock, 2000)).toBe(2);
  });

  it("does not accumulate time while stopped", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = tickClock(clock, 5000);
    clock = setClockRunning(clock, false, 5000);

    expect(elapsedSeconds(clock, 9000)).toBe(5);
  });

  it("pauses while the tab is hidden", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = tickClock(clock, 3000);
    clock = setClockVisible(clock, false, 3000);
    clock = tickClock(clock, 8000);
    clock = setClockVisible(clock, true, 8000);
    clock = tickClock(clock, 9000);

    expect(elapsedSeconds(clock, 9000)).toBe(4);
  });

  it("does not count hidden time before becoming visible again", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = setClockVisible(clock, false, 0);
    clock = setClockVisible(clock, true, 5000);
    clock = tickClock(clock, 6000);

    expect(elapsedSeconds(clock, 6000)).toBe(1);
  });

  it("flushes partial time when stopping mid-chunk", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = setClockRunning(clock, false, 2500);

    expect(elapsedSeconds(clock, 2500)).toBe(3);
  });

  it("resets accumulated time for a new chunk", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = tickClock(clock, 4000);
    clock = resetClock();

    expect(elapsedSeconds(clock, 9000)).toBe(0);
  });

  it("keeps accumulated time across stop/start within the same chunk", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = tickClock(clock, 2000);
    clock = setClockRunning(clock, false, 2000);
    clock = setClockRunning(clock, true, 5000);
    clock = tickClock(clock, 7000);

    expect(elapsedSeconds(clock, 7000)).toBe(4);
  });

  it("ignores ticks while hidden even if still marked running", () => {
    let clock = createActiveReadingClock();
    clock = setClockRunning(clock, true, 0);
    clock = tickClock(clock, 1000);
    clock = setClockVisible(clock, false, 1000);
    clock = tickClock(clock, 6000);

    expect(elapsedSeconds(clock, 6000)).toBe(1);
  });

  describe("idle detection (in-page distraction, tab stays visible)", () => {
    it("pauses on idle even though the tab never lost visibility", () => {
      let clock = createActiveReadingClock();
      clock = setClockRunning(clock, true, 0);
      clock = tickClock(clock, 3000);
      clock = setClockIdle(clock, true, 3000); // idle timeout fires — tab is still visible/running
      clock = tickClock(clock, 60_000); // ticks that should NOT count

      expect(elapsedSeconds(clock, 60_000)).toBe(3);
    });

    it("resumes counting once activity marks the clock not-idle again", () => {
      let clock = createActiveReadingClock();
      clock = setClockRunning(clock, true, 0);
      clock = tickClock(clock, 3000);
      clock = setClockIdle(clock, true, 3000);
      clock = setClockIdle(clock, false, 60_000); // user interacts again
      clock = tickClock(clock, 65_000);

      expect(elapsedSeconds(clock, 65_000)).toBe(8); // 3s + 5s of real activity after resuming
    });

    it("reproduces the exact scenario that produced a real 37 WPM reading: clicking a word and reading its definition for minutes, without ever leaving the tab", () => {
      let clock = createActiveReadingClock();
      clock = setClockRunning(clock, true, 0);
      // Reads actively for 10 seconds.
      clock = tickClock(clock, 10_000);
      // Clicks a vocabulary word — tab stays visible the whole time, so
      // setClockVisible alone would never fire here. Sits on the
      // definition for 3 minutes before the idle timeout catches it.
      clock = setClockIdle(clock, true, 10_045); // 45s of no interaction after the last tick
      clock = setClockIdle(clock, false, 190_000); // returns 3 minutes after going idle
      // Reads for 15 more seconds before submitting.
      const submittedAt = 205_000;
      clock = tickClock(clock, submittedAt);

      const activeSeconds = elapsedSeconds(clock, submittedAt);
      const wallClockSeconds = Math.round(submittedAt / 1000);

      expect(activeSeconds).toBe(25); // ~10s + ~15s of genuine reading
      expect(activeSeconds).toBeLessThan(wallClockSeconds); // confirms the fix materially matters here
    });

    it("is idempotent — marking idle twice in a row doesn't double-flush", () => {
      let clock = createActiveReadingClock();
      clock = setClockRunning(clock, true, 0);
      clock = tickClock(clock, 5000);
      clock = setClockIdle(clock, true, 5000);
      const idleAgain = setClockIdle(clock, true, 9000); // e.g. a second timeout firing right after the first
      expect(idleAgain).toEqual(clock);
    });
  });
});
