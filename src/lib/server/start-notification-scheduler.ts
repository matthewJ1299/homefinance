/**
 * Starts the in-process notification scheduler without pulling web-push into the
 * Next.js instrumentation webpack graph (`webpackIgnore` on the dynamic import in
 * instrumentation.ts).
 */
export function startNotificationScheduler(): void {
  const { NotificationScheduler } = require("../services/notification-scheduler.service") as typeof import("../services/notification-scheduler.service");
  const scheduler = new NotificationScheduler();
  scheduler.start();
}
