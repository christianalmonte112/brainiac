"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import type { ReadingSession } from "@prisma/client";
import { BrainLogo } from "@/components/BrainLogo";
import { MobileMenuButton } from "./MobileMenuButton";

interface NavHeaderProps {
  sessions?: ReadingSession[];
  baselineWPM?: number | null;
  /** When true, show logo+wordmark (community shell). Reader shell keeps brand in the sidebar. */
  showBrand?: boolean;
}

const NAV_LINKS = [
  { href: "/reader/vocabulary", label: "Vocabulary" },
  { href: "/reader/games", label: "Games" },
  { href: "/reader/progress", label: "Progress" },
  { href: "/community", label: "Community" },
  { href: "/admin", label: "Admin" },
] as const;

/** Main content top bar — links + active underline · search · divider · avatar. */
export function NavHeader({ sessions = [], baselineWPM = null, showBrand = false }: NavHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <MobileMenuButton sessions={sessions} baselineWPM={baselineWPM} />
        {showBrand && (
          <Link href="/reader" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-black">
            <BrainLogo size={28} className="h-7 w-7 shrink-0 rounded-[7px]" />
            Brainiac
          </Link>
        )}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/community"
                ? pathname.startsWith("/community")
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-3.5 text-sm font-medium text-black transition-colors ${
                  active ? "" : "opacity-70 hover:opacity-100"
                }`}
              >
                {link.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-black" aria-hidden />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/reader"
          aria-label="Search documents"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-black"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <div className="h-5 w-px bg-neutral-200" aria-hidden />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
