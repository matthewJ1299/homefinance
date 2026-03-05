import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "sqlite.db");

let sqlJsDb: SqlJsDatabase | null = null;

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Initialize the database: load sql.js, load existing file or create empty DB,
 * enable foreign keys. Call once before using getDb().
 */
export async function initDb(): Promise<void> {
  if (sqlJsDb) return;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    sqlJsDb = new SQL.Database(new Uint8Array(buf));
  } else {
    sqlJsDb = new SQL.Database();
  }

  sqlJsDb.run("PRAGMA foreign_keys = ON;");
  sqlJsDb.run("PRAGMA journal_mode = WAL;");
}

/**
 * Persist the in-memory database to the file.
 */
export function saveDb(): void {
  if (!sqlJsDb) return;
  const data = sqlJsDb.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(dbPath, buf);
}

/**
 * Raw database instance. Call initDb() before first use.
 */
export function getDb(): SqlJsDatabase {
  if (!sqlJsDb) {
    throw new Error(
      "Database not initialized. Call initDb() before using getDb()."
    );
  }
  return sqlJsDb;
}

/**
 * Run a parameterized statement (INSERT/UPDATE/DELETE).
 */
export function run(
  sql: string,
  params: (string | number | null)[] = []
): void {
  getDb().run(sql, params);
}

/**
 * Run SQL and return the last inserted row id (for INSERT).
 */
export function lastInsertId(): number {
  const db = getDb();
  const stmt = db.prepare("SELECT last_insert_rowid() AS id");
  stmt.step();
  const row = stmt.getAsObject() as { id: number };
  stmt.free();
  return row.id;
}

/**
 * Run a parameterized SELECT and return the first row as an object, or null.
 */
export function get<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): T | null {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const hasRow = stmt.step();
  const row = hasRow ? (stmt.getAsObject() as T) : null;
  stmt.free();
  return row;
}

/**
 * Run a parameterized SELECT and return all rows as objects.
 */
export function all<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/** Start periodic persistence. Call once in server after initDb(). */
export function startPersistLoop(intervalMs = 60_000): void {
  setInterval(() => {
    try {
      saveDb();
    } catch (e) {
      console.error("Failed to persist DB:", e);
    }
  }, intervalMs);
}
