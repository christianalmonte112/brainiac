import Link from "next/link";
import type { ReadingSession } from "@prisma/client";
import { deleteReadingSession } from "./actions";

interface SessionListProps {
  sessions: ReadingSession[];
}

const STATUS_LABEL: Record<ReadingSession["status"], string> = {
  DRAFT: "Draft",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

/**
 * Server component. The delete action is a plain form bound to a server
 * action — no client JS required for this list to be fully functional.
 */
export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-0.5 text-xs leading-relaxed text-slate-400">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.379a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 12.121 8H19.5A1.5 1.5 0 0 1 21 9.5v9A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-11Z"
          />
        </svg>
        <p>No documents yet. Add your first one above.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {sessions.map((session) => (
        <li key={session.id} className="group flex items-center gap-1 rounded-lg px-1 hover:bg-slate-100">
          <Link href={`/reader/${session.id}`} className="flex-1 truncate px-2 py-2 text-sm text-slate-700">
            <span className="block truncate font-medium text-slate-900">{session.title}</span>
            <span className="block text-xs text-slate-500">
              {STATUS_LABEL[session.status]} · {session.wordCount ?? 0} words
            </span>
          </Link>
          <form action={deleteReadingSession}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button
              type="submit"
              aria-label={`Delete ${session.title}`}
              className="invisible rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700 group-hover:visible"
            >
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
