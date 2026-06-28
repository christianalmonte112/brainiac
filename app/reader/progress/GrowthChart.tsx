import type { GrowthPoint } from "@/lib/progress/stats";

interface GrowthChartProps {
  points: GrowthPoint[];
  baselineWPM: number;
}

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = 24;

/** Hand-rolled SVG line chart — no charting library in the project yet, and this is simple enough not to need one. */
export function GrowthChart({ points, baselineWPM }: GrowthChartProps) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Complete a few more sessions to see your reading speed trend over time.
      </p>
    );
  }

  const wpmValues = points.map((point) => point.wpm).concat(baselineWPM);
  const maxWPM = Math.max(...wpmValues) * 1.1;
  const minWPM = Math.min(0, Math.min(...wpmValues));

  const plotWidth = WIDTH - PADDING * 2;
  const plotHeight = HEIGHT - PADDING * 2;

  function xFor(index: number): number {
    return PADDING + (index / (points.length - 1)) * plotWidth;
  }

  function yFor(wpm: number): number {
    const ratio = (wpm - minWPM) / (maxWPM - minWPM || 1);
    return PADDING + plotHeight - ratio * plotHeight;
  }

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.wpm)}`).join(" ");
  const baselineY = yFor(baselineWPM);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Reading speed over time">
      <line
        x1={PADDING}
        y1={baselineY}
        x2={WIDTH - PADDING}
        y2={baselineY}
        stroke="currentColor"
        className="text-slate-300"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={WIDTH - PADDING} y={baselineY - 6} textAnchor="end" className="fill-slate-400 text-[10px]">
        Baseline: {baselineWPM} WPM
      </text>

      <path d={linePath} fill="none" stroke="currentColor" className="text-slate-900" strokeWidth={2} />

      {points.map((point, index) => (
        <circle key={point.date} cx={xFor(index)} cy={yFor(point.wpm)} r={3} className="fill-slate-900" />
      ))}
    </svg>
  );
}
