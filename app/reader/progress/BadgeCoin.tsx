/**
 * One metal coin for every badge. The face changes; the coin does not.
 * Streak faces can flicker. The share card uses the same drawing with the
 * flame held still, so a saved image matches the shelf.
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

interface MarkProps {
  badgeKey: string;
  earned: boolean;
  animate: boolean;
}

export function BadgeCoin({
  badgeKey,
  earned,
  animate = false,
  className,
}: MarkProps & { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {animate ? <style>{FLAME_CSS}</style> : null}
      <BadgeCoinMark badgeKey={badgeKey} earned={earned} animate={animate} />
    </svg>
  );
}

export function BadgeCoinMark({ badgeKey, earned, animate }: MarkProps) {
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
      <Face badgeKey={badgeKey} ink={ink} cutout={face} animate={animate && earned} />
    </g>
  );
}

function Face({
  badgeKey,
  ink,
  cutout,
  animate,
}: {
  badgeKey: string;
  ink: string;
  cutout: string;
  animate: boolean;
}) {
  switch (badgeKey) {
    case "streak_3":
      return <MatchFlame ink={ink} animate={animate} />;
    case "streak_7":
      return <RimFlame ink={ink} cutout={cutout} animate={animate} />;
    case "streak_30":
      return <HouseFire ink={ink} cutout={cutout} animate={animate} />;
    case "sessions_1":
      return <OpenBook ink={ink} />;
    case "sessions_10":
      return <BookStack ink={ink} />;
    case "sessions_25":
      return <BookShelf ink={ink} />;
    case "speed_10":
      return <Gauge ink={ink} level="low" />;
    case "speed_25":
      return <Gauge ink={ink} level="mid" />;
    case "speed_50":
      return <Gauge ink={ink} level="high" />;
    case "comprehension_80":
      return <Lens ink={ink} doubled={false} />;
    case "comprehension_90":
      return <Lens ink={ink} doubled />;
    case "vocabulary_10":
      return <WordTile ink={ink} cutout={cutout} fan={false} />;
    case "vocabulary_50":
      return <WordTile ink={ink} cutout={cutout} fan />;
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

function OpenBook({ ink }: { ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="1.7" strokeLinejoin="round">
      <path d="M18 40 L32 34 L32 22 L18 28 Z" />
      <path d="M46 40 L32 34 L32 22 L46 28 Z" />
      <path d="M32 22 V34" />
    </g>
  );
}

function BookStack({ ink }: { ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="1.7" strokeLinejoin="round">
      <path d="M20 24 H44 V29 H20 Z" />
      <path d="M22 32 H42 V37 H22 Z" />
      <path d="M20 40 H44 V45 H20 Z" />
    </g>
  );
}

function BookShelf({ ink }: { ink: string }) {
  return (
    <g fill={ink}>
      <rect x="18" y="44" width="28" height="1.8" />
      <rect x="20" y="30" width="4" height="14" />
      <rect x="26" y="26" width="4" height="18" />
      <rect x="32" y="32" width="4" height="12" />
      <rect x="38" y="24" width="4" height="20" />
    </g>
  );
}

function Gauge({ ink, level }: { ink: string; level: "low" | "mid" | "high" }) {
  const tip = level === "low" ? { x: 22, y: 30 } : level === "mid" ? { x: 32, y: 22 } : { x: 43, y: 29 };
  return (
    <g fill="none" stroke={ink} strokeLinecap="round">
      <path d="M 18 40 A 14 14 0 0 1 46 40" strokeOpacity="0.35" strokeWidth="2" />
      <path d={`M 18 40 A 14 14 0 0 1 ${tip.x} ${tip.y}`} strokeWidth="2.5" />
      <line x1="32" y1="40" x2={tip.x} y2={tip.y} strokeWidth="1.6" />
      <circle cx="32" cy="40" r="1.7" fill={ink} stroke="none" />
      {level === "high" ? (
        <g strokeWidth="1.4">
          <path d="M14 34 H18" />
          <path d="M13 38 H17" />
        </g>
      ) : null}
    </g>
  );
}

function Lens({ ink, doubled }: { ink: string; doubled: boolean }) {
  return (
    <g fill="none" stroke={ink} strokeLinecap="round">
      <circle cx="32" cy="32" r={doubled ? 13 : 11} strokeWidth="1.8" />
      {doubled ? <circle cx="32" cy="32" r="7.5" strokeWidth="1.6" /> : null}
      <path d="M26 26 L29.5 29.5" strokeWidth="1.5" />
    </g>
  );
}

function WordTile({ ink, cutout, fan }: { ink: string; cutout: string; fan: boolean }) {
  if (!fan) {
    return (
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round">
        <rect x="22" y="24" width="20" height="16" rx="2" />
        <path d="M26 32 H38" />
      </g>
    );
  }

  return (
    <g fill="none" stroke={ink} strokeWidth="1.5">
      <g transform="rotate(-16 32 34)">
        <rect x="24" y="26" width="14" height="18" rx="1.5" />
      </g>
      <g transform="rotate(16 32 34)">
        <rect x="26" y="26" width="14" height="18" rx="1.5" />
      </g>
      <rect x="25" y="24" width="14" height="18" rx="1.5" fill={cutout} />
      <path d="M28 33 H36" strokeLinecap="round" />
    </g>
  );
}
