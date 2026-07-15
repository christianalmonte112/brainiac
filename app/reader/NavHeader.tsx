import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { BrainLogo } from "@/components/BrainLogo";

/** Top nav for the reader shell: wordmark, tabs, and account avatar. Server component — UserButton handles its own client interactivity internally. */
export function NavHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6">
      <div className="flex items-center gap-6">
        <Link href="/reader" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <BrainLogo size={28} className="h-7 w-7 shrink-0" />
          Brainiac
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
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
