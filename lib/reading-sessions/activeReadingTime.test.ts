import { describe, expect, it } from "vitest";
import {
  createActiveReadingClock,
  elapsedSeconds,
  resetClock,
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
});
