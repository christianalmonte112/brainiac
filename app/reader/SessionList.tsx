import Link from "next/link";
import { Folder } from "lucide-react";
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

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 pt-1">
        <Folder className="h-6 w-6 text-neutral-300" strokeWidth={1.5} aria-hidden />
        <p className="text-sm font-semibold text-black">No documents yet</p>
        <p className="text-sm text-neutral-500">Add your first document to get started.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {sessions.map((session) => (
        <li key={session.id} className="group flex items-center gap-1 rounded-xl px-1 hover:bg-neutral-50">
          <Link href={`/reader/${session.id}`} className="flex-1 truncate px-2 py-2.5 text-sm text-neutral-700">
            <span className="block truncate font-medium text-black">{session.title}</span>
            <span className="block text-xs text-neutral-500">
              {STATUS_LABEL[session.status]} · {session.wordCount ?? 0} words
            </span>
          </Link>
          <form action={deleteReadingSession}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button
              type="submit"
              aria-label={`Delete ${session.title}`}
              className="invisible rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:visible"
            >
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
