"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReadingSession } from "@prisma/client";
import { NewSessionForm } from "./NewSessionForm";
import { SessionList } from "./SessionList";

interface MobileMenuButtonProps {
  sessions: ReadingSession[];
}

const NAV_LINKS = [
  { href: "/reader/vocabulary", label: "Vocabulary" },
  { href: "/reader/games", label: "Games" },
  { href: "/reader/progress", label: "Progress" },
  { href: "/community", label: "Community" },
];

/**
 * Mobile-only hamburger trigger + slide-over drawer (mobile responsiveness
 * pass). Below the `md` breakpoint, the persistent Sidebar is hidden
 * entirely (see Sidebar.tsx) and the nav links in NavHeader are hidden too
 * — both live in here instead, alongside the same NewSessionForm/SessionList
 * building blocks the desktop Sidebar uses, so there's no duplicated
 * session-library logic.
 *
 * Slide-over mechanics mirror VocabularyPanel.tsx's proven pattern (always
 * mounted, transform-toggled, so the animation plays both ways) rather than
 * inventing a new one — this one adds a backdrop for tap-outside-to-close
 * and an Escape-key handler, since a full navigation drawer benefits from
 * both more than a single-word definition panel does.
 */
export function MobileMenuButton({ sessions }: MobileMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop — present but transparent/non-interactive while closed, so
          it can fade in/out rather than popping, and never intercepts
          clicks when hidden. */}
      <div
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col gap-4 border-r border-slate-200 bg-white p-4 shadow-xl transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Menu</span>
          <button onClick={() => setIsOpen(false)} aria-label="Close menu" className="text-sm text-slate-500 hover:text-slate-800">
            Close
          </button>
        </div>

        <nav className="flex flex-col gap-1 border-b border-slate-100 pb-4 text-sm font-medium text-slate-700">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-md px-2 py-2 hover:bg-slate-50 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <NewSessionForm />
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <SessionList sessions={sessions} />
        </div>
      </aside>
    </>
  );
}
