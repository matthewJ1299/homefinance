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

  const { initDb, startPersistLoop } = await import(
    /* webpackIgnore: true */
    "./lib/db/index"
  );
  await initDb();
  startPersistLoop(60_000);
  const { startNotificationScheduler } = await import(
    /* webpackIgnore: true */
    "./lib/server/start-notification-scheduler"
  );
  startNotificationScheduler();
}
