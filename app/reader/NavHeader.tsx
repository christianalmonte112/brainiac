import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReadingSession } from "@prisma/client";
import { MobileMenuButton } from "./MobileMenuButton";

interface NavHeaderProps {
  /** Optional: callers without a session library (e.g. the Community shell, which deliberately has no reading-session concept) can omit this — the mobile drawer falls back to SessionList's existing empty state. */
  sessions?: ReadingSession[];
  /** When true, show an Admin link (owner account only — computed server-side). */
  isAdmin?: boolean;
}

/**
 * Top nav for the reader shell: wordmark, tabs, and account avatar.
 * Server component — UserButton and MobileMenuButton handle their own
 * client interactivity internally.
 *
 * Below `md`, the inline nav links are hidden (they move into
 * MobileMenuButton's drawer, alongside the session library that also lives
 * there since the persistent Sidebar is hidden at the same breakpoint —
 * see Sidebar.tsx and layout.tsx).
 */
export function NavHeader({ sessions = [], isAdmin = false }: NavHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-900/10 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3 sm:gap-8">
        <MobileMenuButton sessions={sessions} isAdmin={isAdmin} />
        <Link href="/reader" className="text-lg font-black tracking-tight text-slate-900">
          Brainiac
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/reader/vocabulary" className="transition-colors hover:text-slate-900">
            Vocabulary
          </Link>
          <Link href="/reader/games" className="transition-colors hover:text-slate-900">
            Games
          </Link>
          <Link href="/reader/progress" className="transition-colors hover:text-slate-900">
            Progress
          </Link>
          <Link href="/community" className="transition-colors hover:text-slate-900">
            Community
          </Link>
          {isAdmin && (
            <Link href="/admin" className="transition-colors hover:text-slate-900">
              Admin
            </Link>
          )}
        </nav>
      </div>
      <UserButton />
    </header>
  );
}
