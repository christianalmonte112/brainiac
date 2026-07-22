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
 * Shareable progress card — uses the canonical cropped brainiac-logo.png mark.
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

    const clone = svg.cloneNode(true) as SVGSVGElement;
    const logo = clone.querySelector("#brainiac-logo");
    if (logo instanceof SVGImageElement) {
      const res = await fetch("/brainiac-logo.png");
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      logo.setAttribute("href", `data:image/png;base64,${btoa(binary)}`);
    }

    const serialized = new XMLSerializer().serializeToString(clone);
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

        <image
          id="brainiac-logo"
          href="/brainiac-logo.png"
          x="90"
          y="90"
          width="277"
          height="277"
        />
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
