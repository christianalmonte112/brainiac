"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReadingSession } from "@prisma/client";
import { BrainLogo } from "@/components/BrainLogo";
import { Search } from "lucide-react";
import { NewSessionForm } from "./NewSessionForm";
import { SessionList } from "./SessionList";
import { BaselineSparklineCard } from "./BaselineSparklineCard";

interface MobileMenuButtonProps {
  sessions: ReadingSession[];
  baselineWPM?: number | null;
}

const NAV_LINKS = [
  { href: "/reader/vocabulary", label: "Vocabulary" },
  { href: "/reader/games", label: "Games" },
  { href: "/reader/progress", label: "Progress" },
  { href: "/community", label: "Community" },
  { href: "/admin", label: "Admin" },
];

/** Mobile hamburger + drawer with brand, library search, and baseline card. */
export function MobileMenuButton({ sessions, baselineWPM = null }: MobileMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

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
        className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-50 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div
        aria-hidden={!isOpen}
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col border-r border-neutral-200 bg-white shadow-xl transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <BrainLogo size={28} className="h-7 w-7 rounded-[7px]" />
            <span className="text-sm font-semibold text-black">Brainiac</span>
          </div>
          <button onClick={() => setIsOpen(false)} aria-label="Close menu" className="text-sm text-neutral-500 hover:text-black">
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <nav className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-2 py-2 hover:bg-neutral-50 hover:text-black"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <NewSessionForm />

          <div>
            <p className="mb-2 text-sm font-semibold text-black">Library</p>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents..."
                className="h-11 w-full rounded-2xl bg-neutral-100 py-2 pl-10 pr-3 text-sm text-black placeholder:text-neutral-500 outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </label>
          </div>

          <div onClick={() => setIsOpen(false)}>
            <SessionList sessions={filtered} />
          </div>
        </div>

        <div className="space-y-3 border-t border-neutral-100 px-4 py-4">
          <BaselineSparklineCard baselineWPM={baselineWPM} />
        </div>
      </aside>
    </>
  );
}
