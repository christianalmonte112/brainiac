import { afterEach, describe, expect, it, vi } from "vitest";
import { computeReadingStreak } from "./streak";

describe("computeReadingStreak", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts consecutive days ending today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T18:00:00.000Z"));

    const dates = [
      new Date("2026-07-11T12:00:00.000Z"),
      new Date("2026-07-12T12:00:00.000Z"),
      new Date("2026-07-13T12:00:00.000Z"),
    ];

    expect(computeReadingStreak(dates, "UTC")).toBe(3);
  });

  it("returns zero when latest activity is older than yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T18:00:00.000Z"));

    const dates = [
      new Date("2026-07-09T12:00:00.000Z"),
      new Date("2026-07-10T12:00:00.000Z"),
    ];

    expect(computeReadingStreak(dates, "UTC")).toBe(0);
  });

  it("deduplicates same-day activity before counting streak", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T18:00:00.000Z"));

    const dates = [
      new Date("2026-07-12T01:00:00.000Z"),
      new Date("2026-07-12T20:00:00.000Z"),
      new Date("2026-07-13T08:00:00.000Z"),
    ];

    expect(computeReadingStreak(dates, "UTC")).toBe(2);
  });
});
