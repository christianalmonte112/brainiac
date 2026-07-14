"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The Brainiac landing splash — the brand mark as a living gate into the
 * app. The solid brain glyph sits in its frame with the stem fused into
 * the bottom-left corner; a circuit of neurons etched into the glyph
 * fires at random, faster as the cursor approaches, and the whole mark
 * brightens with proximity. Clicking anywhere on the mark fires an
 * expanding pulse ring, then routes to `enterHref`.
 *
 * Interaction notes:
 * - Rendered as a real <a href>, so keyboard users and no-JS visitors
 *   still get plain navigation; the pulse is an enhancement.
 * - prefers-reduced-motion: no neuron firing, no pulse delay — the mark
 *   sits at a readable mid-brightness and the click navigates instantly.
 * - Touch devices (no mousemove) keep a baseline brightness so the mark
 *   never looks dead.
 */

// Circuit geometry in the mark's 300×300 coordinate space. Nodes sit on
// the solid area of the glyph; edges connect near neighbours.
const NODES: [number, number][] = [
  [100, 150], [112, 116], [136, 92], [170, 84], [201, 90], [227, 110],
  [237, 140], [227, 170], [199, 188], [168, 194], [138, 190], [114, 176],
  [140, 140], [174, 132], [204, 148],
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [9, 10], [10, 11], [11, 0], [0, 12], [12, 13], [13, 14], [14, 6],
  [2, 12], [3, 13], [4, 13], [12, 10], [13, 9], [14, 7],
];

const INK = "#ececef"; // the mark's white
const ETCH = "#060608"; // circuit ink, matches the page black

interface SplashProps {
  enterHref: string;
}

export function Splash({ enterHref }: SplashProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const markRef = useRef<SVGGElement>(null);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const brightRef = useRef(0);
  const reduceRef = useRef(false);
  const [entering, setEntering] = useState(false);
  // Lazy initializer so the very first render already reflects the OS
  // preference (guarded for SSR, where `window` isn't available).
  const [reducedMotion] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );

  function applyBrightness() {
    const mark = markRef.current;
    if (!mark) return;
    const b = brightRef.current;
    mark.style.opacity = String(0.5 + 0.5 * b);
    mark.style.filter = `drop-shadow(0 0 ${(4 + 30 * b).toFixed(0)}px rgba(255,255,255,${(0.14 + 0.5 * b).toFixed(2)}))`;
  }

  function fire() {
    const i = Math.floor(Math.random() * NODES.length);
    const node = nodeRefs.current[i];
    if (!node) return;
    const linked = EDGES.map((pair, k) => (pair[0] === i || pair[1] === i ? k : -1)).filter((k) => k >= 0);
    const edgeIndex = linked[Math.floor(Math.random() * linked.length)];
    const edge = edgeIndex !== undefined ? edgeRefs.current[edgeIndex] : null;

    node.setAttribute("r", "5");
    node.setAttribute("opacity", "0.85");
    if (edge) {
      edge.setAttribute("opacity", "0.7");
      edge.setAttribute("stroke-width", "2");
    }
    setTimeout(() => {
      node.setAttribute("r", "3.4");
      node.setAttribute("opacity", "0.28");
      if (edge) {
        edge.setAttribute("opacity", "0.22");
        edge.setAttribute("stroke-width", "1.1");
      }
    }, 340);
  }

  useEffect(() => {
    reduceRef.current = reducedMotion;

    // Coarse pointers never hover — hold a baseline glow instead.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    brightRef.current = coarse || reducedMotion ? 0.55 : 0;
    applyBrightness();

    function onMove(e: MouseEvent) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      // Brain's visual centre sits at ~(155, 140) in the 300-space.
      const cx = rect.left + rect.width * (155 / 300);
      const cy = rect.top + rect.height * (140 / 300);
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy) / (rect.width * 1.1);
      brightRef.current = Math.max(0, Math.min(1, 1.15 - dist * 1.5));
      applyBrightness();
    }

    window.addEventListener("mousemove", onMove);

    let interval: ReturnType<typeof setInterval> | undefined;
    if (!reducedMotion) {
      interval = setInterval(() => {
        fire();
        if (brightRef.current > 0.55) fire();
        if (brightRef.current > 0.85) fire();
      }, 420);
    }

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEnter(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (entering) return;
    setEntering(true);
    const delay = reduceRef.current ? 0 : 520;
    setTimeout(() => router.push(enterHref), delay);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[#060608] px-6 py-16">
      <a
        href={enterHref}
        onClick={handleEnter}
        aria-label="Enter Brainiac"
        className="rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-neutral-400"
      >
        <svg
          ref={svgRef}
          viewBox="0 0 300 300"
          className="h-[min(62vmin,440px)] w-[min(62vmin,440px)]"
          aria-hidden="true"
        >
          <g ref={markRef} style={{ opacity: 0.5 }}>
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
            <g>
              {EDGES.map((pair, k) => (
                <line
                  key={`e${k}`}
                  ref={(el) => {
                    edgeRefs.current[k] = el;
                  }}
                  x1={NODES[pair[0]]![0]}
                  y1={NODES[pair[0]]![1]}
                  x2={NODES[pair[1]]![0]}
                  y2={NODES[pair[1]]![1]}
                  stroke={ETCH}
                  strokeWidth="1.1"
                  opacity="0.22"
                />
              ))}
              {NODES.map((node, i) => (
                <circle
                  key={`n${i}`}
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                  cx={node[0]}
                  cy={node[1]}
                  r="3.4"
                  fill={ETCH}
                  opacity="0.28"
                />
              ))}
            </g>
          </g>
          {entering && !reducedMotion && (
            <circle
              cx="155"
              cy="140"
              r="30"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              style={{ animation: "brainiac-pulse 0.6s ease-out forwards" }}
            />
          )}
        </svg>
      </a>

      <div className="select-none text-center">
        <p className="pl-[0.6em] font-mono text-2xl tracking-[0.6em] text-neutral-100">BRAINIAC</p>
        <p className="mt-3 pl-[0.25em] font-mono text-[11px] tracking-[0.25em] text-neutral-500" aria-live="polite">
          {entering ? "ENTERING" : "CLICK THE BRAIN TO ENTER"}
        </p>
      </div>

      <style>{`
        @keyframes brainiac-pulse {
          from { r: 30; opacity: 1; stroke-width: 2; }
          to { r: 200; opacity: 0; stroke-width: 0.3; }
        }
      `}</style>
    </main>
  );
}
