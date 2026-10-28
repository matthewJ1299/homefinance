import { initDb, startPersistLoop } from "@/lib/db";
import { startNotificationScheduler } from "@/lib/server/start-notification-scheduler";

/**
 * Node-only boot work. Loaded from instrumentation.ts only when
 * NEXT_RUNTIME === "nodejs" so Edge never sees pg / node-cron.
 */
export async function registerNode(): Promise<void> {
  await initDb();
  startPersistLoop(60_000);
  try {
    await startNotificationScheduler();
  } catch (err) {
    console.warn("[instrumentation] Notification scheduler failed to start:", err);
  }
}
