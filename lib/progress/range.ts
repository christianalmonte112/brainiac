import type { GrowthPoint } from "./stats";

/**
 * Pure helpers behind the F-020 ticker chart. Kept out of the component so
 * they can be unit-tested like the rest of lib/progress (see range.test.ts).
 */

export type RangeDays = 7 | 30 | 90 | null; // null = ALL

/**
 * Returns the points whose date falls within the last `days` days,
 * anchored to the LATEST point's date rather than the wall clock — the
 * same convention stock charts use ("last 30 trading days"). Anchoring to
 * the data avoids timezone drift between the server's idea of "today" and
 * the user-local dates the series is built with, and means a user returning
 * after a break still sees their most recent activity in every range
 * instead of an empty chart.
 *
 * Dates are YYYY-MM-DD strings (already user-local, from buildGrowthSeries),
 * which compare correctly as plain strings.
 */
export function filterSeriesByRange(points: GrowthPoint[], days: RangeDays): GrowthPoint[] {
  if (days === null || points.length === 0) return points;

  const latest = points[points.length - 1]!.date;
  const anchor = new Date(`${latest}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - (days - 1));
  const cutoff = anchor.toISOString().slice(0, 10);

  return points.filter((point) => point.date >= cutoff);
}

export interface SeriesSummary {
  latest: number;
  high: number;
  low: number;
}

/** Latest/high/low WPM across a series, or null for an empty series. */
export function summarizeSeries(points: GrowthPoint[]): SeriesSummary | null {
  if (points.length === 0) return null;
  const values = points.map((point) => point.wpm);
  return {
    latest: values[values.length - 1]!,
    high: Math.max(...values),
    low: Math.min(...values),
  };
}

export interface Delta {
  abs: number;
  pct: number;
}

/**
 * Change of `current` vs `baseline`, the number pair shown in the ticker
 * badge ("+42 · +18.3%"). Returns null when baseline is unusable (zero or
 * negative baselines make a percent-change meaningless).
 */
export function computeDelta(current: number, baseline: number): Delta | null {
  if (baseline <= 0) return null;
  const abs = current - baseline;
  return { abs, pct: (abs / baseline) * 100 };
}
