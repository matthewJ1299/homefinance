/**
 * Runs when the Next.js server starts (next dev / next start).
 * Initializes the database and starts the notification scheduler (daily 9am summary, per-event reminders).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb, startPersistLoop } = await import("@/lib/db");
    await initDb();
    startPersistLoop(60_000);
    const { NotificationScheduler } = await import(
      "@/lib/services/notification-scheduler.service"
    );
    const scheduler = new NotificationScheduler();
    scheduler.start();
  }
}
