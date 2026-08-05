"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

function RailIcon({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-slate-800 hover:text-white ${
        active ? "bg-slate-800 text-white" : "text-slate-400"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Gemini-mock far-left icon rail. Desktop only — mobile keeps the hamburger
 * drawer. Icons map to real app routes (not decorative dead ends).
 */
export function IconRail() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-14 shrink-0 flex-col items-center justify-between border-r border-slate-900/10 bg-slate-900 py-4 md:flex">
      <div className="flex flex-col items-center gap-6">
        <RailIcon
          href="/reader"
          label="Library"
          active={
            pathname === "/reader" ||
            (pathname.startsWith("/reader/") &&
              !pathname.startsWith("/reader/games") &&
              !pathname.startsWith("/reader/progress") &&
              !pathname.startsWith("/reader/vocabulary"))
          }
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75L18 14z" />
          </svg>
        </RailIcon>
        <RailIcon href="/reader/progress" label="Progress" active={pathname.startsWith("/reader/progress")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7v5l3 2" />
          </svg>
        </RailIcon>
        <RailIcon href="/reader/vocabulary" label="Vocabulary" active={pathname.startsWith("/reader/vocabulary")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z" />
          </svg>
        </RailIcon>
      </div>

      <div className="flex flex-col items-center gap-4">
        <RailIcon href="/reader/games" label="Games" active={pathname.startsWith("/reader/games")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
          </svg>
        </RailIcon>
        <RailIcon href="/community" label="Community" active={pathname.startsWith("/community")}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M9.5 9.5h.01M14.5 9.5h.01M8.5 14c1.2 1.2 2.7 1.8 3.5 1.8s2.3-.6 3.5-1.8" />
          </svg>
        </RailIcon>
        <SignOutButton>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
