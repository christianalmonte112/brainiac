"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Sparkles, Clock, Star, Gamepad2, Users, LogOut } from "lucide-react";

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
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-180 ${
        active ? "bg-neutral-100 text-black" : "text-neutral-400 hover:bg-neutral-50 hover:text-black"
      }`}
    >
      {children}
    </Link>
  );
}

/** Light monochrome icon rail (ChatGPT mock). Desktop only. */
export function IconRail() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-14 shrink-0 flex-col items-center justify-between border-r border-neutral-200 bg-white py-5 md:flex">
      <div className="flex flex-col items-center gap-3">
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
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </RailIcon>
        <RailIcon href="/reader/progress" label="Progress" active={pathname.startsWith("/reader/progress")}>
          <Clock className="h-4 w-4" strokeWidth={1.75} />
        </RailIcon>
        <RailIcon href="/reader/vocabulary" label="Vocabulary" active={pathname.startsWith("/reader/vocabulary")}>
          <Star className="h-4 w-4" strokeWidth={1.75} />
        </RailIcon>
      </div>

      <div className="flex flex-col items-center gap-3">
        <RailIcon href="/reader/games" label="Games" active={pathname.startsWith("/reader/games")}>
          <Gamepad2 className="h-4 w-4" strokeWidth={1.75} />
        </RailIcon>
        <RailIcon href="/community" label="Community" active={pathname.startsWith("/community")}>
          <Users className="h-4 w-4" strokeWidth={1.75} />
        </RailIcon>
        <SignOutButton>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-black"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
