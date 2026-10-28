import { NotificationScheduler } from "@/lib/services/notification-scheduler.service";

/**
 * Starts the in-process notification scheduler.
 * Keep this module Node-only: it is loaded from instrumentation-node.ts, which
 * instrumentation.ts imports only when NEXT_RUNTIME === "nodejs".
 */
export async function startNotificationScheduler(): Promise<void> {
  const scheduler = new NotificationScheduler();
  scheduler.start();
}
