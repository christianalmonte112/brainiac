import { describe, expect, it } from "vitest";
import { computeDelta, filterSeriesByRange, summarizeSeries } from "./range";
import type { GrowthPoint } from "./stats";

function point(date: string, wpm: number): GrowthPoint {
  return { date, wpm };
}

describe("filterSeriesByRange", () => {
  const series: GrowthPoint[] = [
    point("2026-05-01", 200),
    point("2026-06-20", 210),
    point("2026-07-01", 220),
    point("2026-07-10", 240),
    point("2026-07-12", 235),
  ];

  it("returns everything for ALL (null)", () => {
    expect(filterSeriesByRange(series, null)).toHaveLength(5);
  });

  it("anchors the window to the latest point, not the wall clock", () => {
    // Latest point is 2026-07-12; a 7-day window covers 2026-07-06 onward.
    const filtered = filterSeriesByRange(series, 7);
    expect(filtered.map((p) => p.date)).toEqual(["2026-07-10", "2026-07-12"]);
  });

  it("keeps a boundary date that falls exactly on the cutoff", () => {
    // 30-day window from 2026-07-12 covers 2026-06-13 onward — includes 06-20.
    const filtered = filterSeriesByRange(series, 30);
    expect(filtered.map((p) => p.date)).toEqual(["2026-06-20", "2026-07-01", "2026-07-10", "2026-07-12"]);
  });

  it("handles month/year boundaries in the date arithmetic", () => {
    const janSeries = [point("2025-12-28", 100), point("2026-01-03", 110)];
    // 7-day window from 2026-01-03 covers 2025-12-28 onward.
    expect(filterSeriesByRange(janSeries, 7)).toHaveLength(2);
  });

  it("returns an empty array unchanged", () => {
    expect(filterSeriesByRange([], 7)).toEqual([]);
  });
});

describe("summarizeSeries", () => {
  it("returns latest, high, and low", () => {
    const summary = summarizeSeries([point("2026-07-01", 220), point("2026-07-02", 180), point("2026-07-03", 205)]);
    expect(summary).toEqual({ latest: 205, high: 220, low: 180 });
  });

  it("returns null for an empty series", () => {
    expect(summarizeSeries([])).toBeNull();
  });
});

describe("computeDelta", () => {
  it("computes absolute and percent change vs baseline", () => {
    const delta = computeDelta(240, 200);
    expect(delta?.abs).toBe(40);
    expect(delta?.pct).toBeCloseTo(20);
  });

  it("handles negative change", () => {
    const delta = computeDelta(180, 200);
    expect(delta?.abs).toBe(-20);
    expect(delta?.pct).toBeCloseTo(-10);
  });

  it("returns null for a zero baseline", () => {
    expect(computeDelta(240, 0)).toBeNull();
  });
});
