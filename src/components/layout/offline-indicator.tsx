"use client";

import { useOfflineQueue } from "@/hooks/use-offline-queue";

/**
 * What a queued write looks like before it sends.
 *
 * "Offline" alone leaves you wondering whether the thing you just typed
 * survived. Naming the count says it did, and that it is going nowhere until
 * the connection comes back.
 */
export function OfflineIndicator() {
  const { isOnline, queue } = useOfflineQueue();
  const waiting = queue.length;

  if (isOnline && waiting === 0) return null;

  if (isOnline) {
    return (
      <span
        className="rounded bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning"
        title="Sending what you saved while you were offline."
      >
        Sending {waiting}…
      </span>
    );
  }

  return (
    <span
      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
      title={
        waiting > 0
          ? `Offline. ${waiting} saved here and waiting to send.`
          : "You are offline. Changes will sync when back online."
      }
    >
      {waiting > 0 ? `Offline · ${waiting} waiting` : "Offline"}
    </span>
  );
}
