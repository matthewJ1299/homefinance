/**
 * Runs when the Next.js server starts (next dev / next start).
 * Initializes the sql.js database so getDb() works on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb, startPersistLoop } = await import("@/lib/db");
    await initDb();
    startPersistLoop(60_000);
  }
}
