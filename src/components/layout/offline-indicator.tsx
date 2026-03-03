"use client";

import { useOfflineQueue } from "@/hooks/use-offline-queue";

export function OfflineIndicator() {
  const { isOnline } = useOfflineQueue();
  if (isOnline) return null;
  return (
    <span
      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
      title="You are offline. Changes will sync when back online."
    >
      Offline
    </span>
  );
}
