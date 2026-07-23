"use client";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ChunkTimerProps {
  activeSeconds: number;
}

/** Displays active reading time for the current chunk (not wall-clock). */
export function ChunkTimer({ activeSeconds }: ChunkTimerProps) {
  return <span>{formatElapsed(activeSeconds)}</span>;
}
