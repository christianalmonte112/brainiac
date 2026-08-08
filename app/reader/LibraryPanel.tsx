"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Folder, MoreHorizontal, Search, Settings, SlidersHorizontal } from "lucide-react";
import type { ReadingSession } from "@prisma/client";
import { BrainLogo } from "@/components/BrainLogo";
import { NewSessionForm } from "./NewSessionForm";
import { BaselineSparklineCard } from "./BaselineSparklineCard";
import { deleteReadingSession } from "./actions";

interface LibraryPanelProps {
  sessions: ReadingSession[];
  baselineWPM: number | null;
}

function formatRelative(date: Date): string {
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

/** Full left library column — brand, New Document, search, list, baseline card. */
export function LibraryPanel({ sessions, baselineWPM }: LibraryPanelProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="flex flex-col gap-6 px-6 pt-6">
        <Link href="/reader" className="block">
          <div className="flex items-center gap-2.5">
            <BrainLogo size={32} className="h-8 w-8 shrink-0 rounded-[8px]" />
            <span className="text-lg font-semibold tracking-tight text-black">Brainiac</span>
          </div>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            Read faster. Think deeper.
          </p>
        </Link>

        <NewSessionForm />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black">Library</h2>
            <button
              type="button"
              aria-label="Filter library"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-black"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="h-11 w-full rounded-2xl border-0 bg-neutral-100 py-2 pl-10 pr-3 text-sm text-black placeholder:text-neutral-500 outline-none ring-0 focus:bg-neutral-100 focus:ring-2 focus:ring-neutral-200"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 && sessions.length === 0 ? (
          <div className="flex flex-col items-start gap-2 px-2 pt-2">
            <Folder className="h-6 w-6 text-neutral-300" strokeWidth={1.5} aria-hidden />
            <p className="text-sm font-semibold text-black">No documents yet</p>
            <p className="text-sm text-neutral-500">Add your first document to get started.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-2 pt-2 text-sm text-neutral-500">No documents match “{query.trim()}”.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map((session) => (
              <li key={session.id} className="group flex items-center gap-1 rounded-xl hover:bg-neutral-50">
                <Link
                  href={`/reader/${session.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3 px-2 py-2.5"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-black">{session.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {(session.wordCount ?? 0).toLocaleString()} words · {formatRelative(session.updatedAt)}
                    </span>
                  </span>
                </Link>
                <form action={deleteReadingSession} className="pr-1">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${session.title}`}
                    className="invisible flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:visible"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto space-y-3 border-t border-neutral-100 px-6 py-4">
        <BaselineSparklineCard baselineWPM={baselineWPM} />
        <Link
          href="/reader/progress"
          className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-black"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Settings
        </Link>
      </div>
    </aside>
  );
}