"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createActiveReadingClock,
  elapsedSeconds,
  resetClock,
  setClockIdle,
  setClockRunning,
  setClockVisible,
  tickClock,
  type ActiveReadingClockState,
} from "./activeReadingTime";

const TICK_MS = 1000;
/**
 * How long with zero interaction before the clock treats the reader as
 * "not actively reading" and pauses, even though the tab is still visible.
 * This is the layer that catches distraction inside the page itself — e.g.
 * clicking a vocabulary word and reading its definition for a while,
 * which setClockVisible alone can't detect since the tab never loses
 * visibility. Long enough that thinking about a sentence never
 * false-triggers; short enough to meaningfully exclude a real pause.
 */
const IDLE_TIMEOUT_MS = 45_000;
const ACTIVITY_EVENTS = ["pointerdown", "touchstart", "scroll", "keydown"] as const;

/** Tracks reading time only while the chunk is actively being read, the tab is visible, and the reader has interacted recently (see IDLE_TIMEOUT_MS). */
export function useActiveReadingTimer(isRunning: boolean) {
  const clockRef = useRef<ActiveReadingClockState>(createActiveReadingClock());
  const [activeSeconds, setActiveSeconds] = useState(0);

  const syncDisplay = useCallback((now = Date.now()) => {
    setActiveSeconds(elapsedSeconds(clockRef.current, now));
  }, []);

  const reset = useCallback(() => {
    clockRef.current = resetClock();
    setActiveSeconds(0);
  }, []);

  const getActiveSeconds = useCallback(() => {
    return Math.max(1, elapsedSeconds(clockRef.current, Date.now()));
  }, []);

  useEffect(() => {
    const now = Date.now();
    clockRef.current = setClockRunning(clockRef.current, isRunning, now);
    syncDisplay(now);
  }, [isRunning, syncDisplay]);

  useEffect(() => {
    function handleVisibilityChange() {
      const now = Date.now();
      const visible = document.visibilityState === "visible";
      clockRef.current = setClockVisible(clockRef.current, visible, now);
      syncDisplay(now);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncDisplay]);

  useEffect(() => {
    if (!isRunning) return;

    let idleTimeout: ReturnType<typeof setTimeout> | null = null;

    function scheduleIdleTimeout() {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        const now = Date.now();
        clockRef.current = setClockIdle(clockRef.current, true, now);
        syncDisplay(now);
      }, IDLE_TIMEOUT_MS);
    }

    function handleActivity() {
      const now = Date.now();
      clockRef.current = setClockIdle(clockRef.current, false, now);
      syncDisplay(now);
      scheduleIdleTimeout();
    }

    scheduleIdleTimeout();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (idleTimeout) clearTimeout(idleTimeout);
    };
  }, [isRunning, syncDisplay]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      clockRef.current = tickClock(clockRef.current, now);
      syncDisplay(now);
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [isRunning, syncDisplay]);

  return { activeSeconds, getActiveSeconds, reset };
}
