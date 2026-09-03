/**
 * Starts the in-process notification scheduler without pulling web-push into the
 * Next.js instrumentation webpack graph (`webpackIgnore` on the dynamic import in
 * instrumentation.ts).
 */
export async function startNotificationScheduler(): Promise<void> {
  const mod =
    process.env.NODE_ENV === "development"
      ? await import("@/lib/services/notification-scheduler.service")
      : await import("../services/notification-scheduler.service");
  const scheduler = new mod.NotificationScheduler();
  scheduler.start();
}
