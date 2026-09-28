import type { ReadingSession } from "@prisma/client";
import { LibraryPanel } from "./LibraryPanel";

interface SidebarProps {
  sessions: ReadingSession[];
  baselineWPM: number | null;
}

/** Document library sidebar — ChatGPT monochrome shell. */
export function Sidebar({ sessions, baselineWPM }: SidebarProps) {
  return <LibraryPanel sessions={sessions} baselineWPM={baselineWPM} />;
}
