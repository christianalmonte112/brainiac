import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReadingSession } from "@prisma/client";
import { BrainLogo } from "@/components/BrainLogo";
import { MobileMenuButton } from "./MobileMenuButton";

interface NavHeaderProps {
  sessions?: ReadingSession[];
  isAdmin?: boolean;
}

/** Top nav — ChatGPT monochrome: logo mark + wordmark + tabs + avatar. */
export function NavHeader({ sessions = [], isAdmin = false }: NavHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-8">
        <MobileMenuButton sessions={sessions} isAdmin={isAdmin} />
        <Link href="/reader" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-black">
          <BrainLogo size={28} className="h-7 w-7 shrink-0 rounded-[7px]" />
          Brainiac
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex">
          <Link href="/reader/vocabulary" className="transition-colors hover:text-black">
            Vocabulary
          </Link>
          <Link href="/reader/games" className="transition-colors hover:text-black">
            Games
          </Link>
          <Link href="/reader/progress" className="transition-colors hover:text-black">
            Progress
          </Link>
          <Link href="/community" className="transition-colors hover:text-black">
            Community
          </Link>
          <Link href="/admin" className="transition-colors hover:text-black">
            Admin
          </Link>
        </nav>
      </div>
      <UserButton />
    </header>
  );
}
