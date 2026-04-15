/**
 * Recreates the database from scratch.
 * - If DATABASE_URL is set: drops and recreates Postgres public schema.
 * Run `npm run db:push` after this to create tables, or use `npm run db:reset`
 *   for reset + schema push only.
 * Do not run while the app or another process has the DB open.
 */
export {};

async function resetPostgres(): Promise<void> {
  const pg = await import("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Postgres reset");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    console.log("Postgres public schema dropped and recreated.");
  } finally {
    await client.end();
  }
}

try {
  await resetPostgres();
} catch (e) {
  console.error(e);
  process.exit(1);
}
