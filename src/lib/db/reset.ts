/**
 * Recreates the database from scratch: deletes the DB file (if present).
 * Run `npm run db:push` after this to create tables from the schema, or use
 * `npm run db:reset` which runs reset, push, and seeds default categories and 2 users.
 * Do not run while the app or another process has the DB open.
 */
import path from "path";
import fs from "fs";

const dbPath =
  process.env.DB_PATH ??
  path.join(process.cwd(), "data", "sqlite.db");

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("Removed existing database.");
}

console.log("Database file cleared. Run db:push to create tables from schema.");
