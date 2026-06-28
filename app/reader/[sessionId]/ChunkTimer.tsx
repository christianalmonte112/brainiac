"use client";

import { useEffect, useState } from "react";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Ticking per-chunk reading timer. Render with `key={chunkIndex}` from the
 * parent so a fresh mount — not a setState-in-effect reset — is what
 * restarts the clock when the visible chunk changes.
 */
export function ChunkTimer() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{formatElapsed(elapsedSeconds)}</span>;
}
