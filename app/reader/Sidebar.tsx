import type { ReadingSession } from "@prisma/client";
import { NewSessionForm } from "./NewSessionForm";
import { SessionList } from "./SessionList";

interface SidebarProps {
  sessions: ReadingSession[];
}

/** Document library sidebar. Server component — its interactive parts are isolated in their own client components. */
export function Sidebar({ sessions }: SidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-r border-slate-200 p-4">
      <NewSessionForm />
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <SessionList sessions={sessions} />
      </nav>
    </aside>
  );
}
