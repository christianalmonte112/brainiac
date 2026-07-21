"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { GrowthPoint } from "@/lib/progress/stats";
import { computeDelta, filterSeriesByRange, summarizeSeries, type RangeDays } from "@/lib/progress/range";

interface TickerChartProps {
  points: GrowthPoint[];
  baselineWPM: number;
}

// Two coordinate-space presets rather than one fixed viewBox scaled down by
// CSS: SVG text scales with the viewBox, so a 640-unit canvas squished into
// a ~350px phone renders 10-11px labels at roughly HALF that (~5-6px,
// confirmed by direct calculation) — illegible. Giving mobile its own,
// narrower native canvas keeps the render scale close to 1:1 on a real
// phone, so the same font sizes stay legible instead of needing to be
// inflated (which would look oversized on desktop, where the full 640px
// canvas already renders every label at its true intended size).
const DESKTOP_WIDTH = 640;
const MOBILE_WIDTH = 320;
const HEIGHT = 240;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 26; // room for the date labels under the plot

const RANGES: { label: string; days: RangeDays }[] = [
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "ALL", days: null },
];

function useNarrowViewport(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * F-020 — the reader's WPM rendered as their personal stock ticker.
 *
 * Signature interaction: scrub-to-read. Hovering (or touch-dragging) the
 * chart drives the big numeral in the header live, with a crosshair pinned
 * to the nearest session — release and it snaps back to the latest value.
 * Direction is encoded monochrome (▲ filled badge / ▼ outlined badge)
 * rather than green/red: consistent with the black-and-white design
 * direction and legible without color vision.
 *
 * X positions are index-spaced, not time-scaled — the same convention
 * stock charts use (weekends are compressed away). Irregular reading days
 * would otherwise leave large dead gaps.
 */
export function TickerChart({ points, baselineWPM }: TickerChartProps) {
  const [range, setRange] = useState<RangeDays>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Defaults to the desktop canvas on the server; client snapshot uses
  // matchMedia so mobile gets the narrower native canvas without squished SVG text.
  const isNarrow = useNarrowViewport();
  const WIDTH = isNarrow ? MOBILE_WIDTH : DESKTOP_WIDTH;

  const visible = useMemo(() => filterSeriesByRange(points, range), [points, range]);
  const summary = summarizeSeries(visible);

  // The scrubbed point wins; otherwise the latest in range.
  const active = hoverIndex !== null ? visible[hoverIndex] : null;
  const displayedWPM = active?.wpm ?? summary?.latest ?? null;
  const displayedDate = active ? formatDate(active.date) : null;
  const delta = displayedWPM !== null ? computeDelta(displayedWPM, baselineWPM) : null;

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Tight Y domain (stock convention): span the visible data + baseline
  // with 10% headroom either side, so movement is visible rather than
  // flattened against a zero axis.
  const domain = useMemo(() => {
    if (visible.length === 0) return { min: 0, max: 1 };
    const values = visible.map((p) => p.wpm).concat(baselineWPM);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max((rawMax - rawMin) * 0.1, 5);
    return { min: Math.max(0, rawMin - pad), max: rawMax + pad };
  }, [visible, baselineWPM]);

  function xFor(index: number): number {
    if (visible.length === 1) return PAD_X + plotWidth / 2;
    return PAD_X + (index / (visible.length - 1)) * plotWidth;
  }

  function yFor(wpm: number): number {
    const ratio = (wpm - domain.min) / (domain.max - domain.min || 1);
    return PAD_TOP + plotHeight - ratio * plotHeight;
  }

  function indexFromPointer(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || visible.length === 0) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    if (visible.length === 1) return 0;
    const ratio = (x - PAD_X) / plotWidth;
    return Math.max(0, Math.min(visible.length - 1, Math.round(ratio * (visible.length - 1))));
  }

  const linePath = visible
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(1)} ${yFor(point.wpm).toFixed(1)}`)
    .join(" ");
  const areaPath =
    visible.length >= 2
      ? `${linePath} L ${xFor(visible.length - 1).toFixed(1)} ${PAD_TOP + plotHeight} L ${xFor(0).toFixed(1)} ${
          PAD_TOP + plotHeight
        } Z`
      : "";
  const baselineY = yFor(baselineWPM);
  const baselineInView = baselineWPM >= domain.min && baselineWPM <= domain.max;

  const up = (delta?.abs ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Ticker header — the number the whole page is about. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
            WPM {displayedDate ? `· ${displayedDate}` : "· latest"}
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
              {displayedWPM !== null ? displayedWPM : "—"}
            </span>
            {delta && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs tabular-nums ${
                  up ? "bg-slate-900 text-white" : "border border-slate-900 text-slate-900"
                }`}
              >
                {up ? "▲" : "▼"} {delta.abs >= 0 ? "+" : ""}
                {delta.abs} · {delta.pct >= 0 ? "+" : ""}
                {delta.pct.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">vs. your baseline of {baselineWPM} WPM</p>
        </div>

        {/* Range tabs */}
        <div className="flex gap-1" role="tablist" aria-label="Chart time range">
          {RANGES.map((r) => {
            const selected = r.days === range;
            return (
              <button
                key={r.label}
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setRange(r.days);
                  setHoverIndex(null);
                }}
                className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 ${
                  selected ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {visible.length >= 2 ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full cursor-crosshair touch-none select-none"
          role="img"
          aria-label={`Reading speed over time, currently ${summary?.latest ?? 0} words per minute against a baseline of ${baselineWPM}`}
          onPointerMove={(e) => setHoverIndex(indexFromPointer(e.clientX))}
          onPointerDown={(e) => setHoverIndex(indexFromPointer(e.clientX))}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="ticker-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Baseline reference */}
          {baselineInView && (
            <>
              <line
                x1={PAD_X}
                y1={baselineY}
                x2={WIDTH - PAD_X}
                y2={baselineY}
                stroke="currentColor"
                className="text-slate-300"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={WIDTH - PAD_X}
                y={baselineY - 5}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[10px]"
              >
                baseline {baselineWPM}
              </text>
            </>
          )}

          {/* Area + line */}
          <path d={areaPath} fill="url(#ticker-fill)" className="text-slate-900" />
          <path d={linePath} fill="none" stroke="currentColor" className="text-slate-900" strokeWidth={2} />

          {/* Crosshair */}
          {hoverIndex !== null && visible[hoverIndex] && (
            <>
              <line
                x1={xFor(hoverIndex)}
                y1={PAD_TOP}
                x2={xFor(hoverIndex)}
                y2={PAD_TOP + plotHeight}
                stroke="currentColor"
                className="text-slate-400"
                strokeWidth={1}
              />
              <circle
                cx={xFor(hoverIndex)}
                cy={yFor(visible[hoverIndex].wpm)}
                r={5}
                className="fill-white stroke-slate-900"
                strokeWidth={2}
              />
            </>
          )}

          {/* Endpoint dot (only when not scrubbing) */}
          {hoverIndex === null && (
            <circle
              cx={xFor(visible.length - 1)}
              cy={yFor(visible[visible.length - 1]!.wpm)}
              r={4}
              className="fill-slate-900"
            />
          )}

          {/* X-axis endpoints */}
          <text x={PAD_X} y={HEIGHT - 8} className="fill-slate-400 font-mono text-[10px]">
            {formatDate(visible[0]!.date)}
          </text>
          <text x={WIDTH - PAD_X} y={HEIGHT - 8} textAnchor="end" className="fill-slate-400 font-mono text-[10px]">
            {formatDate(visible[visible.length - 1]!.date)}
          </text>
        </svg>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg bg-slate-50">
          <p className="max-w-xs text-center text-sm text-slate-500">
            {points.length < 2
              ? "Complete a few more sessions to open your chart."
              : "No sessions in this range yet — try a wider one."}
          </p>
        </div>
      )}

      {/* Market-stats strip */}
      {summary && (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
          {[
            { label: "High", value: `${summary.high}` },
            { label: "Low", value: `${summary.low}` },
            { label: "Sessions", value: `${visible.length}` },
            { label: "Baseline", value: `${baselineWPM}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">{stat.label}</dt>
              <dd className="font-mono text-sm font-semibold tabular-nums text-slate-900">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
