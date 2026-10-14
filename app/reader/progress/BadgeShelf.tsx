"use client";

import { useEffect, useRef, useState } from "react";
import { BADGE_DEFINITIONS, type BadgeDefinition } from "@/lib/badges/definitions";
import { BadgeCoin, type BadgePose } from "./BadgeCoin";

interface BadgeShelfProps {
  earnedKeys: Set<string>;
}

/** The last badge in each set plays once and keeps the finished frame. */
const HOLD_KEYS = new Set(["sessions_25", "speed_50", "comprehension_90", "vocabulary_50"]);

/**
 * Shows the full badge catalog, not just earned ones — an all-locked view
 * gives a new user zero sense of what's achievable, so every badge always
 * renders; earned ones are highlighted, locked ones are dimmed but still
 * legible (description shown as real text, not hidden behind a hover-only
 * tooltip, since that doesn't work on mobile touch).
 */
export function BadgeShelf({ earnedKeys }: BadgeShelfProps) {
  const reduced = useReducedMotion();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGE_DEFINITIONS.map((badge) => (
        <ShelfCard key={badge.key} badge={badge} earned={earnedKeys.has(badge.key)} reduced={reduced} />
      ))}
    </div>
  );
}

function ShelfCard({
  badge,
  earned,
  reduced,
}: {
  badge: BadgeDefinition;
  earned: boolean;
  reduced: boolean;
}) {
  const interactive = earned && badge.category !== "streak" && !reduced;
  const [pose, setPose] = useState<BadgePose>(interactive ? "start" : "end");
  const [live, setLive] = useState(false);
  const returnTimer = useRef<number | null>(null);
  const playId = useRef(0);

  useEffect(() => {
    if (!interactive) setPose("end");
  }, [interactive]);

  useEffect(() => {
    return () => {
      if (returnTimer.current !== null) window.clearTimeout(returnTimer.current);
    };
  }, []);

  function play() {
    if (!interactive) return;
    if (returnTimer.current !== null) window.clearTimeout(returnTimer.current);
    const id = playId.current + 1;
    playId.current = id;
    setLive(false);
    setPose("start");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (playId.current !== id) return;
        setLive(true);
        setPose("end");
      });
    });
  }

  function release() {
    if (!interactive) return;
    playId.current += 1;
    if (HOLD_KEYS.has(badge.key)) {
      setLive(true);
      setPose("end");
      return;
    }
    setLive(true);
    setPose("start");
  }

  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border p-3 ${
        earned ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-400"
      } ${interactive ? "cursor-pointer" : ""}`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") play();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") release();
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        play();
        if (!HOLD_KEYS.has(badge.key)) {
          returnTimer.current = window.setTimeout(release, 900);
        }
      }}
    >
      <BadgeCoin
        badgeKey={badge.key}
        earned={earned}
        animate={earned && badge.category === "streak" && !reduced}
        pose={interactive ? pose : "end"}
        motion={interactive && live}
        className="h-12 w-12"
      />
      <p className={`text-sm font-semibold ${earned ? "text-white" : "text-slate-500"}`}>{badge.label}</p>
      <p className={`text-xs ${earned ? "text-slate-300" : "text-slate-400"}`}>{badge.description}</p>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}
