import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReadingSession } from "@prisma/client";
import { BrainLogo } from "@/components/BrainLogo";
import { MobileMenuButton } from "./MobileMenuButton";

interface NavHeaderProps {
  /** Optional: callers without a session library (e.g. the Community shell, which deliberately has no reading-session concept) can omit this — the mobile drawer falls back to SessionList's existing empty state. */
  sessions?: ReadingSession[];
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
export function NavHeader({ sessions = [] }: NavHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-6">
        <MobileMenuButton sessions={sessions} />
        <Link href="/reader" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <BrainLogo size={28} className="h-7 w-7 shrink-0" />
          Brainiac
        </Link>
        <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex">
          <Link href="/reader/vocabulary" className="hover:text-slate-900">
            Vocabulary
          </Link>
          <Link href="/reader/games" className="hover:text-slate-900">
            Games
          </Link>
          <Link href="/reader/progress" className="hover:text-slate-900">
            Progress
          </Link>
          <Link href="/community" className="hover:text-slate-900">
            Community
          </Link>
        </nav>
      </div>
      <UserButton />
    </header>
  );
}
