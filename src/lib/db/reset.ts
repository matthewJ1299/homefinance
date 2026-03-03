/**
 * Recreates the database from scratch: deletes the DB file (if present)
 * and runs all migrations to create empty tables.
 * Do not run while the app or another process has the DB open.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
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

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

sqlite.close();
console.log("Database recreated; tables created.");
