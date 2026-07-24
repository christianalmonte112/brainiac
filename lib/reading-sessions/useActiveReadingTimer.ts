"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createActiveReadingClock,
  elapsedSeconds,
  resetClock,
  setClockRunning,
  setClockVisible,
  tickClock,
  type ActiveReadingClockState,
} from "./activeReadingTime";

const TICK_MS = 1000;

/** Tracks reading time only while the chunk is actively being read and the tab is visible. */
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

    const interval = window.setInterval(() => {
      const now = Date.now();
      clockRef.current = tickClock(clockRef.current, now);
      syncDisplay(now);
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [isRunning, syncDisplay]);

  return { activeSeconds, getActiveSeconds, reset };
}
