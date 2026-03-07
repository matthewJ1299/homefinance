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
 * Apply schema from drizzle/0000_init.sql if the users table does not exist.
 * Used so a fresh Docker volume or new DB_PATH gets tables on first run.
 */
function applyMigrationIfNeeded(): void {
  const check = sqlJsDb!.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );
  if (check.length > 0 && check[0].values.length > 0) return;

  const migrationPath = path.join(process.cwd(), "drizzle", "0000_init.sql");
  if (!fs.existsSync(migrationPath)) return;

  const sqlContent = fs.readFileSync(migrationPath, "utf-8");
  const statements = sqlContent
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    sqlJsDb!.run(stmt);
  }
}

/**
 * Initialize the database: load sql.js, load existing file or create empty DB,
 * enable foreign keys, apply schema if needed. Idempotent; safe to call multiple times.
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

  applyMigrationIfNeeded();
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
 * Raw database instance. Initializes the DB if needed (for this worker/process).
 * Use this or the run/all/get/lastInsertId helpers; they all ensure init.
 */
export async function getDb(): Promise<SqlJsDatabase> {
  await initDb();
  return sqlJsDb!;
}

/**
 * Run a parameterized statement (INSERT/UPDATE/DELETE). Initializes DB if needed.
 */
export async function run(
  sql: string,
  params: (string | number | null)[] = []
): Promise<void> {
  const db = await getDb();
  db.run(sql, params);
}

/**
 * Run SQL and return the last inserted row id (for INSERT). Initializes DB if needed.
 */
export async function lastInsertId(): Promise<number> {
  const db = await getDb();
  const stmt = db.prepare("SELECT last_insert_rowid() AS id");
  stmt.step();
  const row = stmt.getAsObject() as { id: number };
  stmt.free();
  return row.id;
}

/**
 * Run a parameterized SELECT and return the first row as an object, or null. Initializes DB if needed.
 */
export async function get<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const hasRow = stmt.step();
  const row = hasRow ? (stmt.getAsObject() as T) : null;
  stmt.free();
  return row;
}

/**
 * Run a parameterized SELECT and return all rows as objects. Initializes DB if needed.
 */
export async function all<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const db = await getDb();
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
