import { afterEach, describe, expect, it, vi } from "vitest";
import { isReviewDue, REVIEW_INTERVALS_DAYS, scheduleNextReview } from "./spacedRepetition";

describe("scheduleNextReview", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules the first correct answer one day out", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const next = scheduleNextReview({ intervalDays: 0, correctStreak: 0 }, true, now);

    expect(next.correctStreak).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.nextReviewAt).toEqual(new Date("2026-07-15T12:00:00.000Z"));
    expect(next.lastReviewedAt).toEqual(now);
  });

  it("climbs the interval ladder on consecutive correct answers", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const next = scheduleNextReview({ intervalDays: 2, correctStreak: 2 }, true, now);

    expect(next.correctStreak).toBe(3);
    expect(next.intervalDays).toBe(4);
    expect(next.nextReviewAt).toEqual(new Date("2026-07-18T12:00:00.000Z"));
  });

  it("caps the interval at the top of the ladder", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const maxInterval = REVIEW_INTERVALS_DAYS[REVIEW_INTERVALS_DAYS.length - 1];
    const next = scheduleNextReview({ intervalDays: maxInterval, correctStreak: 40 }, true, now);

    expect(next.correctStreak).toBe(41);
    expect(next.intervalDays).toBe(maxInterval);
  });

  it("resets streak and makes the word due immediately on a miss", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const next = scheduleNextReview({ intervalDays: 14, correctStreak: 5 }, false, now);

    expect(next.correctStreak).toBe(0);
    expect(next.intervalDays).toBe(0);
    expect(next.nextReviewAt).toEqual(now);
  });

  it("defaults to the current time when now is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T08:00:00.000Z"));

    const next = scheduleNextReview({ intervalDays: 0, correctStreak: 0 }, true);

    expect(next.nextReviewAt).toEqual(new Date("2026-07-15T08:00:00.000Z"));
  });
});

describe("isReviewDue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats words without a review row as due", () => {
    expect(isReviewDue(null)).toBe(true);
  });

  it("compares nextReviewAt against the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));

    expect(isReviewDue(new Date("2026-07-14T11:59:59.000Z"))).toBe(true);
    expect(isReviewDue(new Date("2026-07-14T12:00:01.000Z"))).toBe(false);
  });
});
