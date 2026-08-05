import type { ReadingSession } from "@prisma/client";
import { NewSessionForm } from "./NewSessionForm";
import { SessionList } from "./SessionList";

interface SidebarProps {
  sessions: ReadingSession[];
}

/** Document library sidebar — ChatGPT monochrome. */
export function Sidebar({ sessions }: SidebarProps) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-neutral-200 bg-white px-6 py-6 md:flex">
      <NewSessionForm />
      <div className="mt-8 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Your library</h2>
        <nav className="flex flex-1 flex-col gap-1">
          <SessionList sessions={sessions} />
        </nav>
      </div>
    </aside>
  );
}
