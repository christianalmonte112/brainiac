import type { ReadingSession } from "@prisma/client";
import { NewSessionForm } from "./NewSessionForm";
import { SessionList } from "./SessionList";

interface SidebarProps {
  sessions: ReadingSession[];
}

/** Document library sidebar. Server component — its interactive parts are isolated in their own client components. Hidden below `md`; the same content (NewSessionForm + SessionList) lives inside MobileMenuButton's drawer for smaller screens instead of being squeezed into a persistent 288px column that would leave almost no room for actual reading content on a phone. */
export function Sidebar({ sessions }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-900/10 bg-white p-4 md:flex">
      <NewSessionForm />
      <div className="mt-8 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Your library</h2>
        <nav className="flex flex-1 flex-col gap-1">
          <SessionList sessions={sessions} />
        </nav>
      </div>
    </aside>
  );
}
