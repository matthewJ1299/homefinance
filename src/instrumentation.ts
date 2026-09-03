/**
 * Runs when the Next.js server starts (next dev / next start).
 * Initializes the database and starts the notification scheduler (daily 9am summary, per-event reminders).
 * If DATABASE_URL is missing, skips these steps so the dev server can boot; API and pages that touch the DB will still fail until Postgres is configured.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!process.env.DATABASE_URL) {
    console.warn(
      "[instrumentation] DATABASE_URL is not set; skipping DB init, persist loop, and notification scheduler. Set DATABASE_URL for Postgres (see README / DEPLOY)."
    );
    return;
  }

  const dbModule =
    process.env.NODE_ENV === "development"
      ? await import("@/lib/db/index")
      : await import(/* webpackIgnore: true */ "./lib/db/index");
  const { initDb, startPersistLoop } = dbModule;
  await initDb();
  startPersistLoop(60_000);
  const schedulerModule =
    process.env.NODE_ENV === "development"
      ? await import("@/lib/server/start-notification-scheduler")
      : await import(/* webpackIgnore: true */ "./lib/server/start-notification-scheduler");
  try {
    await schedulerModule.startNotificationScheduler();
  } catch (err) {
    console.warn("[instrumentation] Notification scheduler failed to start:", err);
  }
}
