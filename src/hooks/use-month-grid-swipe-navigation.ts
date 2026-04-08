"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { CSSProperties, TouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 48;

const MAX_WIDTH_QUERY = "(max-width: 767px)";

function subscribeNarrowViewport(onChange: () => void) {
  const mq = window.matchMedia(MAX_WIDTH_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getNarrowViewportSnapshot() {
  return window.matchMedia(MAX_WIDTH_QUERY).matches;
}

function getNarrowViewportServerSnapshot() {
  return false;
}

/**
 * Horizontal swipe on the month grid: swipe left → next month, swipe right → previous.
 * Enabled only when the viewport matches `max-width: 767px` (Tailwind below `md`).
 */
export function useMonthGridSwipeNavigation({
  onPrevMonth,
  onNextMonth,
}: {
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const enabled = useSyncExternalStore(
    subscribeNarrowViewport,
    getNarrowViewportSnapshot,
    getNarrowViewportServerSnapshot
  );

  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (!t) return;
      startRef.current = { x: t.clientX, y: t.clientY };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || startRef.current === null) return;
      const t = e.changedTouches[0];
      if (!t) {
        startRef.current = null;
        return;
      }
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) onNextMonth();
      else onPrevMonth();
    },
    [enabled, onNextMonth, onPrevMonth]
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  const style: CSSProperties | undefined = enabled ? { touchAction: "pan-y" } : undefined;

  return {
    monthGridSwipeProps: {
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      style,
    },
  };
}
