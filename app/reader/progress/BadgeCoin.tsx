/**
 * One metal coin for every badge. The face changes; the coin does not.
 *
 * On the shelf, an earned coin rests on the first frame and plays to the
 * finished frame on hover. The top badge in a set stays on that frame.
 * The share card always draws the finished frame, still.
 */

const FLAME_CSS = `
@keyframes badge-flame {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.16); }
}
.badge-flame {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: badge-flame 1.35s ease-in-out infinite;
}
.badge-flame-slow { animation-duration: 1.9s; }
.badge-flame-fast { animation-duration: 1s; }
@media (prefers-reduced-motion: reduce) {
  .badge-flame { animation: none; }
}
`;

export type BadgePose = "start" | "end";

interface MarkProps {
  badgeKey: string;
  earned: boolean;
  animate: boolean;
  pose: BadgePose;
  /** When false, the finished frame is plain SVG so a saved card cannot move. */
  motion: boolean;
}

export function BadgeCoin({
  badgeKey,
  earned,
  animate = false,
  pose,
  motion,
  className,
}: MarkProps & { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {animate ? <style>{FLAME_CSS}</style> : null}
      <BadgeCoinMark badgeKey={badgeKey} earned={earned} animate={animate} pose={pose} motion={motion} />
    </svg>
  );
}

export function BadgeCoinMark({ badgeKey, earned, animate, pose, motion }: MarkProps) {
  const ink = earned ? "#f5f5f5" : "#737373";
  const face = earned ? "#101012" : "#f4f4f5";
  const rim = earned ? "#f5f5f5" : "#c4c4c4";
  const groove = earned ? "#3a3a40" : "#e4e4e4";

  return (
    <g>
      <circle cx="32" cy="32" r="30" fill={face} />
      <circle cx="32" cy="32" r="29.2" fill="none" stroke={rim} strokeWidth="2.2" />
      <circle cx="32" cy="32" r="25" fill="none" stroke={groove} strokeWidth="1" />
      {earned ? (
        <path
          d="M16 22 A 18 18 0 0 1 40 14"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.4"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : null}
      <Face
        badgeKey={badgeKey}
        ink={ink}
        cutout={face}
        animate={animate && earned}
        pose={pose}
        motion={motion}
      />
    </g>
  );
}

function Face({
  badgeKey,
  ink,
  cutout,
  animate,
  pose,
  motion,
}: {
  badgeKey: string;
  ink: string;
  cutout: string;
  animate: boolean;
  pose: BadgePose;
  motion: boolean;
}) {
  switch (badgeKey) {
    case "streak_3":
      return <MatchFlame ink={ink} animate={animate} />;
    case "streak_7":
      return <RimFlame ink={ink} cutout={cutout} animate={animate} />;
    case "streak_30":
      return <HouseFire ink={ink} cutout={cutout} animate={animate} />;
    case "sessions_1":
      return <OpenBook ink={ink} pose={pose} motion={motion} />;
    case "sessions_10":
      return <BookStack ink={ink} pose={pose} motion={motion} />;
    case "sessions_25":
      return <BookPile ink={ink} pose={pose} motion={motion} />;
    case "speed_10":
      return <Gauge ink={ink} level="low" pose={pose} motion={motion} />;
    case "speed_25":
      return <Gauge ink={ink} level="mid" pose={pose} motion={motion} />;
    case "speed_50":
      return <Gauge ink={ink} level="high" pose={pose} motion={motion} />;
    case "comprehension_80":
      return <AlertMind ink={ink} pose={pose} motion={motion} />;
    case "comprehension_90":
      return <TargetMind ink={ink} pose={pose} motion={motion} />;
    case "vocabulary_10":
      return <WordTile ink={ink} cutout={cutout} fan={false} pose={pose} motion={motion} />;
    case "vocabulary_50":
      return <WordTile ink={ink} cutout={cutout} fan pose={pose} motion={motion} />;
    default:
      return null;
  }
}

function flameClass(animate: boolean, pace: "fast" | "normal" | "slow" = "normal") {
  if (!animate) return undefined;
  if (pace === "fast") return "badge-flame badge-flame-fast";
  if (pace === "slow") return "badge-flame badge-flame-slow";
  return "badge-flame";
}

function MatchFlame({ ink, animate }: { ink: string; animate: boolean }) {
  return (
    <g>
      <line x1="32" y1="44" x2="32" y2="36" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
      <path
        className={flameClass(animate, "fast")}
        d="M32 36 C32 36 27 31 28.2 26.5 C29.2 22.8 32 20 32 20 C32 20 34.8 22.8 35.8 26.5 C37 31 32 36 32 36 Z"
        fill={ink}
      />
    </g>
  );
}

function RimFlame({ ink, cutout, animate }: { ink: string; cutout: string; animate: boolean }) {
  return (
    <g>
      <path
        className={flameClass(animate)}
        d="M18 40 C18 40 16 32 20 28 C22 26 22 30 24 32 C22 24 26 16 32 12 C38 16 42 24 40 32 C42 30 42 26 44 28 C48 32 46 40 46 40 C42 36 38 38 32 34 C26 38 22 36 18 40 Z"
        fill={ink}
      />
      <path
        className={flameClass(animate, "fast")}
        d="M32 32 C32 32 29 27 30 23 C31 20 32 18 32 18 C32 18 33 20 34 23 C35 27 32 32 32 32 Z"
        fill={cutout}
        fillOpacity="0.7"
      />
    </g>
  );
}

function HouseFire({ ink, cutout, animate }: { ink: string; cutout: string; animate: boolean }) {
  return (
    <g>
      <path d="M20 34 L32 20 L44 34" fill="none" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M23 33 H41 V46 H23 Z" fill="none" stroke={ink} strokeWidth="1.8" />
      <rect x="27" y="37" width="3.2" height="4" fill={ink} />
      <rect x="33.8" y="37" width="3.2" height="4" fill={ink} />
      <path
        className={flameClass(animate, "slow")}
        d="M24 30 C24 30 21 25 23.5 22 C25 20 26 23 27 24.5 C26 19 29 14 32 12 C35 14 38 19 37 24.5 C38 23 39 20 40.5 22 C43 25 40 30 40 30 C37 27 35 28 32 25 C29 28 27 27 24 30 Z"
        fill={ink}
      />
      <path
        className={flameClass(animate)}
        d="M28.6 37 C28.6 37 27.2 35.2 28 34 C28.6 33.2 29.2 34.4 29.2 34.4 C29.2 33 30.2 31.6 30.2 31.6 C30.2 31.6 31.2 33 31.2 34.4 C31.2 34.4 31.8 33.2 32.4 34 C33.2 35.2 31.8 37 31.8 37 Z"
        fill={cutout}
      />
    </g>
  );
}

function OpenBook({ ink, pose, motion }: { ink: string; pose: BadgePose; motion: boolean }) {
  const open = pose === "end";
  return (
    <g fill="none" stroke={ink} strokeWidth="1.7" strokeLinejoin="round">
      <g transform={`rotate(${open ? 0 : 58} 32 28)`}>
        {motion ? (
          <animateTransform
            key={pose}
            attributeName="transform"
            type="rotate"
            from={open ? "58 32 28" : "0 32 28"}
            to={open ? "0 32 28" : "58 32 28"}
            dur="0.45s"
            fill="freeze"
          />
        ) : null}
        <path d="M18 40 L32 34 L32 22 L18 28 Z" />
      </g>
      <g transform={`rotate(${open ? 0 : -58} 32 28)`}>
        {motion ? (
          <animateTransform
            key={pose}
            attributeName="transform"
            type="rotate"
            from={open ? "-58 32 28" : "0 32 28"}
            to={open ? "0 32 28" : "-58 32 28"}
            dur="0.45s"
            fill="freeze"
          />
        ) : null}
        <path d="M46 40 L32 34 L32 22 L46 28 Z" />
      </g>
      <path d="M32 22 V34" />
    </g>
  );
}

function BookStack({ ink, pose, motion }: { ink: string; pose: BadgePose; motion: boolean }) {
  const layers = [
    { x: 20, y: 40, w: 24, rise: 0, delay: "0s" },
    { x: 21, y: 33, w: 22, rise: 7, delay: "0.1s" },
    { x: 20, y: 26, w: 24, rise: 14, delay: "0.2s" },
  ];
  const stacked = pose === "end";

  return (
    <g fill="none" stroke={ink} strokeWidth="1.7" strokeLinejoin="round">
      {layers.map((layer) => (
        <rect key={layer.y} x={layer.x} y={stacked ? layer.y : layer.y + layer.rise} width={layer.w} height="5">
          {motion ? (
            <animate
              key={pose}
              attributeName="y"
              from={stacked ? layer.y + layer.rise : layer.y}
              to={stacked ? layer.y : layer.y + layer.rise}
              dur="0.4s"
              begin={stacked ? layer.delay : "0s"}
              fill="freeze"
            />
          ) : null}
        </rect>
      ))}
    </g>
  );
}

function BookPile({ ink, pose, motion }: { ink: string; pose: BadgePose; motion: boolean }) {
  const layers = [
    { x: 18, y: 42, w: 28, rise: 0, delay: "0s" },
    { x: 22, y: 36, w: 22, rise: 6, delay: "0.08s" },
    { x: 17, y: 30, w: 27, rise: 12, delay: "0.16s" },
    { x: 23, y: 24, w: 20, rise: 18, delay: "0.24s" },
    { x: 19, y: 18, w: 24, rise: 24, delay: "0.32s" },
  ];
  const piled = pose === "end";

  return (
    <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinejoin="round">
      {layers.map((layer) => (
        <rect key={layer.y} x={layer.x} y={piled ? layer.y : layer.y + layer.rise} width={layer.w} height="5">
          {motion ? (
            <animate
              key={pose}
              attributeName="y"
              from={piled ? layer.y + layer.rise : layer.y}
              to={piled ? layer.y : layer.y + layer.rise}
              dur="0.4s"
              begin={piled ? layer.delay : "0s"}
              fill="freeze"
            />
          ) : null}
        </rect>
      ))}
    </g>
  );
}

const GAUGE_ARC = 44;

function Gauge({
  ink,
  level,
  pose,
  motion,
}: {
  ink: string;
  level: "low" | "mid" | "high";
  pose: BadgePose;
  motion: boolean;
}) {
  const filled = pose === "end";
  const turn = !filled ? 0 : level === "low" ? -50 : level === "mid" ? -90 : -180;
  const revealed = !filled ? GAUGE_ARC : level === "low" ? GAUGE_ARC * 0.72 : level === "mid" ? GAUGE_ARC * 0.5 : 0;

  return (
    <g fill="none" stroke={ink} strokeLinecap="round">
      <path d="M 18 40 A 14 14 0 0 0 46 40" strokeOpacity="0.35" strokeWidth="2" />
      <path
        d="M 18 40 A 14 14 0 0 0 46 40"
        strokeWidth="2.5"
        strokeDasharray={GAUGE_ARC}
        strokeDashoffset={revealed}
      >
        {motion ? (
          <animate
            key={pose}
            attributeName="stroke-dashoffset"
            from={filled ? GAUGE_ARC : level === "low" ? GAUGE_ARC * 0.72 : level === "mid" ? GAUGE_ARC * 0.5 : 0}
            to={revealed}
            dur="0.55s"
            fill="freeze"
          />
        ) : null}
      </path>
      <g transform={`rotate(${turn} 32 40)`}>
        {motion ? (
          <animateTransform
            key={pose}
            attributeName="transform"
            type="rotate"
            from={filled ? "0 32 40" : `${level === "low" ? -50 : level === "mid" ? -90 : -180} 32 40`}
            to={`${turn} 32 40`}
            dur="0.55s"
            fill="freeze"
          />
        ) : null}
        <line x1="32" y1="40" x2="19" y2="40" strokeWidth="1.6" />
      </g>
      <circle cx="32" cy="40" r="1.7" fill={ink} stroke="none" />
      {level === "high" ? (
        <g strokeWidth="1.4" opacity={filled ? 1 : 0}>
          {motion ? (
            <animate
              key={pose}
              attributeName="opacity"
              from={filled ? 0 : 1}
              to={filled ? 1 : 0}
              dur="0.35s"
              begin="0.35s"
              fill="freeze"
            />
          ) : null}
          <path d="M14 34 H18" />
          <path d="M13 38 H17" />
        </g>
      ) : null}
    </g>
  );
}

function BrainOutline({ ink }: { ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 38 C23 31 26.5 27 32 27 C37.5 27 41 31 41 38 C41 45 37 48 32 48 C27 48 23 45 23 38 Z" />
      <path d="M32 28 C31 34 33 40 32 47" />
      <path d="M26 35 C28.5 33 29.5 36 32 34" />
      <path d="M38 35 C35.5 33 34.5 36 32 36" />
    </g>
  );
}

function AlertMind({ ink, pose, motion }: { ink: string; pose: BadgePose; motion: boolean }) {
  const awake = pose === "end";
  return (
    <g>
      <BrainOutline ink={ink} />
      <g
        fill="none"
        stroke={ink}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={awake ? 1 : 0}
        transform={awake ? "translate(0 0)" : "translate(0 6)"}
      >
        {motion ? (
          <animate
            key={pose}
            attributeName="opacity"
            from={awake ? 0 : 1}
            to={awake ? 1 : 0}
            dur="0.35s"
            fill="freeze"
          />
        ) : null}
        <path d="M27 25 L23 18" />
        <path d="M32 24 L32 16" />
        <path d="M37 25 L41 18" />
      </g>
    </g>
  );
}

function TargetMind({ ink, pose, motion }: { ink: string; pose: BadgePose; motion: boolean }) {
  const locked = pose === "end";
  return (
    <g>
      <BrainOutline ink={ink} />
      <g fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" opacity={locked ? 1 : 0}>
        {motion ? (
          <animate
            key={pose}
            attributeName="opacity"
            from={locked ? 0 : 1}
            to={locked ? 1 : 0}
            dur="0.45s"
            fill="freeze"
          />
        ) : null}
        <circle cx="32" cy="38" r={locked ? 13 : 18}>
          {motion ? (
            <animate
              key={`${pose}-outer`}
              attributeName="r"
              from={locked ? 18 : 13}
              to={locked ? 13 : 18}
              dur="0.45s"
              fill="freeze"
            />
          ) : null}
        </circle>
        <circle cx="32" cy="38" r={locked ? 7 : 11}>
          {motion ? (
            <animate
              key={`${pose}-inner`}
              attributeName="r"
              from={locked ? 11 : 7}
              to={locked ? 7 : 11}
              dur="0.45s"
              fill="freeze"
            />
          ) : null}
        </circle>
        <path d="M32 23 V27" />
        <path d="M32 49 V53" />
        <path d="M17 38 H21" />
        <path d="M43 38 H47" />
      </g>
    </g>
  );
}

function WordTile({
  ink,
  cutout,
  fan,
  pose,
  motion,
}: {
  ink: string;
  cutout: string;
  fan: boolean;
  pose: BadgePose;
  motion: boolean;
}) {
  if (!fan) {
    const written = pose === "end";
    return (
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round">
        <rect x="22" y="24" width="20" height="16" rx="2" />
        <path d="M26 32 H38" strokeDasharray="12" strokeDashoffset={written ? 0 : 12}>
          {motion ? (
            <animate
              key={pose}
              attributeName="stroke-dashoffset"
              from={written ? 12 : 0}
              to={written ? 0 : 12}
              dur="0.45s"
              fill="freeze"
            />
          ) : null}
        </path>
      </g>
    );
  }

  const spread = pose === "end";
  const wing = (degrees: number, delay: string) => (
    <>
      {motion ? (
        <animateTransform
          key={pose}
          attributeName="transform"
          type="rotate"
          from={spread ? `0 32 42` : `${degrees} 32 42`}
          to={spread ? `${degrees} 32 42` : "0 32 42"}
          dur="0.45s"
          begin={spread ? delay : "0s"}
          fill="freeze"
        />
      ) : null}
      <rect x="25" y="24" width="14" height="18" rx="1.5" />
    </>
  );

  return (
    <g fill="none" stroke={ink} strokeWidth="1.5">
      <g transform={spread ? "rotate(-16 32 42)" : "rotate(0 32 42)"}>{wing(-16, "0.05s")}</g>
      <g transform={spread ? "rotate(16 32 42)" : "rotate(0 32 42)"}>{wing(16, "0.14s")}</g>
      <rect x="25" y="24" width="14" height="18" rx="1.5" fill={cutout} />
      <path d="M28 33 H36" strokeLinecap="round" />
    </g>
  );
}
