interface BaselineSparklineCardProps {
  baselineWPM: number | null;
}

/** Sidebar bottom card — baseline WPM + decorative upward sparkline. */
export function BaselineSparklineCard({ baselineWPM }: BaselineSparklineCardProps) {
  if (baselineWPM === null) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-400">
            Baseline Reading Speed
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-black">
            {baselineWPM.toLocaleString()} WPM
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">Last measured</p>
        </div>
        <svg
          viewBox="0 0 88 40"
          className="h-10 w-[88px] shrink-0"
          aria-hidden
          fill="none"
        >
          <defs>
            <linearGradient id="baselineSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111111" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#111111" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 32 C12 30, 18 28, 28 22 C38 16, 44 18, 54 12 C64 6, 72 8, 88 4 L88 40 L0 40 Z"
            fill="url(#baselineSparkFill)"
          />
          <path
            d="M0 32 C12 30, 18 28, 28 22 C38 16, 44 18, 54 12 C64 6, 72 8, 88 4"
            stroke="#111111"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
