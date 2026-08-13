import Link from "next/link";
import { Folder, Pin } from "lucide-react";
import type { ReadingSession } from "@prisma/client";
import { SessionActionsMenu } from "./SessionActionsMenu";

interface SessionListProps {
  sessions: ReadingSession[];
}

const STATUS_LABEL: Record<ReadingSession["status"], string> = {
  DRAFT: "Draft",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

function sortLibrarySessions(sessions: ReadingSession[]): ReadingSession[] {
  return [...sessions].sort((a, b) => {
    const aPinned = a.pinnedAt ? 1 : 0;
    const bPinned = b.pinnedAt ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

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

  const ordered = sortLibrarySessions(sessions);

  return (
    <ul className="flex flex-col gap-1">
      {ordered.map((session) => (
        <li key={session.id} className="group flex items-center gap-1 rounded-xl px-1 hover:bg-neutral-50">
          <Link href={`/reader/${session.id}`} className="flex-1 truncate px-2 py-2.5 text-sm text-neutral-700">
            <span className="flex items-center gap-1.5 truncate font-medium text-black">
              {session.pinnedAt && (
                <Pin className="h-3 w-3 shrink-0 text-neutral-500" strokeWidth={2} aria-label="Pinned" />
              )}
              <span className="truncate">{session.title}</span>
            </span>
            <span className="block text-xs text-neutral-500">
              {STATUS_LABEL[session.status]} · {session.wordCount ?? 0} words
            </span>
          </Link>
          <SessionActionsMenu
            sessionId={session.id}
            title={session.title}
            pinned={Boolean(session.pinnedAt)}
          />
        </li>
      ))}
    </ul>
  );
}
