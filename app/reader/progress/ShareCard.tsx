"use client";

import { useRef, useState } from "react";
import { computeDelta } from "@/lib/progress/range";
import { BADGE_BY_KEY, BADGE_DEFINITIONS } from "@/lib/badges/definitions";

interface ShareCardProps {
  currentWPM: number | null;
  baselineWPM: number;
  streak: number;
  avgQuizScorePercent: number | null;
  earnedBadgeKeys: string[];
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const EXPORT_SCALE = 2; // renders at 2160x2700 for crisp sharing on high-DPI screens

const INK = "#ececef";
const MUTED = "#8a8a92";

/**
 * The card is built from pure SVG primitives only — no <image> references
 * to the raster /brainiac-logo.png, and the brain mark is redrawn as
 * vector paths (the same glyph from the retired splash screen) instead.
 * This is deliberate: converting an SVG to a downloadable PNG via canvas
 * requires loading the SVG through an intermediate Image() object, and an
 * SVG that itself references an external raster image can race or fail to
 * rasterize that inner image depending on browser/timing — a pure-vector
 * SVG has no such dependency and converts instantly and reliably.
 */
export function ShareCard({
  currentWPM,
  baselineWPM,
  streak,
  avgQuizScorePercent,
  earnedBadgeKeys,
}: ShareCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delta = currentWPM !== null ? computeDelta(currentWPM, baselineWPM) : null;
  const up = (delta?.abs ?? 0) >= 0;
  const displayedBadges = earnedBadgeKeys
    .map((key) => BADGE_BY_KEY.get(key))
    .filter((b): b is NonNullable<typeof b> => b !== undefined)
    .slice(0, 6);

  async function svgToPngBlob(): Promise<Blob> {
    const svg = svgRef.current;
    if (!svg) throw new Error("Card isn't ready yet.");

    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Couldn't render the card image."));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH * EXPORT_SCALE;
      canvas.height = CARD_HEIGHT * EXPORT_SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas isn't supported in this browser.");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Couldn't export the image.");
      return blob;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleShare() {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await svgToPngBlob();
      const file = new File([blob], "brainiac-progress.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Brainiac progress" });
      } else {
        // Fallback: plain download, works everywhere including desktop
        // browsers that don't support the Web Share API at all.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "brainiac-progress.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // A user cancelling the native share sheet also throws — that's not
      // a real error, so don't show one for it.
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Couldn't create the image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        className="w-full max-w-xs rounded-2xl"
        role="img"
        aria-label="Shareable Brainiac progress card"
      >
        <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="#060608" />

        {/* Brand mark — vector brain-in-box glyph, no external assets */}
        <g transform="translate(90 90) scale(1.05)">
          <rect x="18" y="18" width="264" height="264" rx="40" fill="none" stroke={INK} strokeWidth="15" />
          <path
            fill={INK}
            fillRule="evenodd"
            d="M 84 172 C 70 142 82 106 112 94 C 122 74 152 66 176 76 C 194 62 226 70 238 92 C 256 106 260 136 246 158 C 242 182 218 198 192 202 C 168 210 140 208 118 200 C 108 206 92 198 86 186 C 84 182 84 176 84 172 Z M 112 92 C 122 98 128 110 126 124 C 125 136 118 146 108 152 C 117 154 127 145 131 132 C 134 117 128 102 118 90 Z M 158 78 C 168 88 168 100 158 110 C 150 118 148 128 154 138 C 145 132 143 119 150 109 C 158 99 160 89 151 81 Z M 217 93 C 209 105 207 119 213 133 C 217 143 215 155 207 163 C 217 159 223 146 221 132 C 217 120 219 106 225 97 Z M 108 176 C 128 164 150 162 170 170 C 190 178 212 176 228 164 C 224 178 206 188 186 184 C 166 180 144 180 126 188 C 118 191 110 186 108 176 Z"
          />
          <path
            fill={INK}
            d="M 98 188 C 86 208 72 226 56 242 L 40 260 C 48 268 58 268 66 260 C 82 242 100 220 116 200 C 110 197 104 193 98 188 Z"
          />
        </g>
        <text x="410" y="200" fill={INK} fontFamily="ui-monospace, monospace" fontSize="52" fontWeight="700" letterSpacing="6">
          BRAINIAC
        </text>
        <text x="410" y="240" fill={MUTED} fontFamily="ui-monospace, monospace" fontSize="24" letterSpacing="2">
          MY READING PROGRESS
        </text>

        {/* Headline WPM */}
        <text x="90" y="480" fill={MUTED} fontFamily="ui-monospace, monospace" fontSize="30" letterSpacing="4">
          READING SPEED
        </text>
        <text x="90" y="640" fill={INK} fontFamily="ui-monospace, monospace" fontSize="220" fontWeight="700">
          {currentWPM ?? "—"}
        </text>
        <text x="90" y="700" fill={MUTED} fontFamily="ui-monospace, monospace" fontSize="34">
          words per minute
        </text>

        {delta && (
          <g transform="translate(90 740)">
            <rect
              width="420"
              height="80"
              rx="16"
              fill={up ? INK : "none"}
              stroke={up ? "none" : INK}
              strokeWidth="3"
            />
            <text
              x="30"
              y="52"
              fill={up ? "#060608" : INK}
              fontFamily="ui-monospace, monospace"
              fontSize="36"
              fontWeight="700"
            >
              {up ? "▲" : "▼"} {delta.abs >= 0 ? "+" : ""}
              {delta.abs} · {delta.pct >= 0 ? "+" : ""}
              {delta.pct.toFixed(0)}% vs baseline
            </text>
          </g>
        )}

        {/* Stat chips */}
        <g transform="translate(90 880)">
          {[
            { label: "STREAK", value: `${streak}d` },
            { label: "QUIZ AVG", value: avgQuizScorePercent !== null ? `${avgQuizScorePercent}%` : "—" },
            { label: "BADGES", value: `${earnedBadgeKeys.length}/${BADGE_DEFINITIONS.length}` },
          ].map((stat, i) => (
            <g key={stat.label} transform={`translate(${i * 300} 0)`}>
              <text fill={MUTED} fontFamily="ui-monospace, monospace" fontSize="24" letterSpacing="2">
                {stat.label}
              </text>
              <text y="60" fill={INK} fontFamily="ui-monospace, monospace" fontSize="56" fontWeight="700">
                {stat.value}
              </text>
            </g>
          ))}
        </g>

        {/* Earned badge icons */}
        {displayedBadges.length > 0 && (
          <g transform="translate(90 1040)">
            <text fill={MUTED} fontFamily="ui-monospace, monospace" fontSize="24" letterSpacing="2">
              RECENT BADGES
            </text>
            {displayedBadges.map((badge, i) => (
              <text key={badge.key} x={i * 130} y="90" fontSize="80">
                {badge.icon}
              </text>
            ))}
          </g>
        )}

        <text
          x={CARD_WIDTH / 2}
          y={CARD_HEIGHT - 60}
          textAnchor="middle"
          fill={MUTED}
          fontFamily="ui-monospace, monospace"
          fontSize="26"
          letterSpacing="3"
        >
          TRACK YOUR OWN GROWTH — BRAINIAC
        </text>
      </svg>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleShare}
        disabled={isExporting}
        className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isExporting ? "Preparing…" : "Share / Save image"}
      </button>
    </div>
  );
}
