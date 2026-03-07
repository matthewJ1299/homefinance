/**
 * Recreates the database from scratch.
 * - If DATABASE_URL is set: drops and recreates Postgres public schema.
 * - Otherwise: deletes the SQLite DB file.
 * Run `npm run db:push` after this to create tables, or use `npm run db:reset`.
 * Do not run while the app or another process has the DB open.
 */
import path from "path";
import fs from "fs";

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

async function resetSqlite(): Promise<void> {
  const dbPath =
    process.env.DB_PATH ?? path.join(process.cwd(), "data", "sqlite.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("Removed existing database.");
  }
  console.log("Database file cleared. Run db:push to create tables from schema.");
}

try {
  if (process.env.DATABASE_URL) {
    await resetPostgres();
  } else {
    await resetSqlite();
  }
} catch (e) {
  console.error(e);
  process.exit(1);
}
