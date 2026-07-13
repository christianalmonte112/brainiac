"use client";

import { useEffect } from "react";
import { setUserTimezone } from "@/lib/user/timezoneActions";

interface TimezoneSyncProps {
  /** The timezone currently on file for this user, or null if never captured. */
  currentTimezone: string | null;
}

/**
 * Silently detects the browser's IANA timezone on mount and persists it if
 * it's different from what's on file — e.g. first-ever visit (null on
 * file), or the user has traveled since their last session. Renders
 * nothing; this is a background sync, not UI.
 *
 * Mounted once in app/reader/layout.tsx, which only remounts on a full page
 * load (Next.js layouts persist across client-side navigation within the
 * same route tree), so this doesn't re-run on every page view.
 */
export function TimezoneSync({ currentTimezone }: TimezoneSyncProps) {
  useEffect(() => {
    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return; // Extremely old/unusual browser — just skip, streak falls back to UTC.
    }

    if (detected && detected !== currentTimezone) {
      setUserTimezone(detected).catch(() => {
        // Best-effort background sync — a failure here just means the
        // streak calculation falls back to UTC (or the last-known
        // timezone) until the next successful sync. Nothing to surface.
      });
    }
    // Intentionally only on mount — currentTimezone is a server-fetched
    // prop, not something we want to re-trigger this effect on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
