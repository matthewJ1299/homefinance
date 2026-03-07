import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import path from "path";
import fs from "fs";
import { getRequestContext } from "./request-context";

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "sqlite.db");

let sqlJsDb: SqlJsDatabase | null = null;
/** Used to create new DB instances when reloading from file (e.g. after another process wrote). */
let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
/** File mtime when we last loaded so we can reload when another process/worker has written. */
let lastLoadMtimeMs = 0;

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
  sqlJsModule = SQL;

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    sqlJsDb = new SQL.Database(new Uint8Array(buf));
    lastLoadMtimeMs = fs.statSync(dbPath).mtimeMs;
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
 * If the DB file on disk is newer than our last load, reload so we see writes from other processes/workers.
 */
function reloadFromFileIfNewer(): void {
  if (!sqlJsDb || !sqlJsModule || !fs.existsSync(dbPath)) return;
  const stat = fs.statSync(dbPath);
  if (stat.mtimeMs <= lastLoadMtimeMs) return;

  const buf = fs.readFileSync(dbPath);
  const next = new sqlJsModule!.Database(new Uint8Array(buf));
  next.run("PRAGMA foreign_keys = ON;");
  next.run("PRAGMA journal_mode = WAL;");
  sqlJsDb = next;
  lastLoadMtimeMs = stat.mtimeMs;
  applyMigrationIfNeeded();
}

/**
 * Raw database instance. Initializes the DB if needed (for this worker/process).
 * Before returning, reloads from file if another process/worker has written so reads see latest data.
 */
export async function getDb(): Promise<SqlJsDatabase> {
  await initDb();
  reloadFromFileIfNewer();
  return sqlJsDb!;
}

/**
 * Derive a short "what" description from SQL (e.g. "INSERT expenses", "SELECT users").
 */
function describeSql(sql: string): string {
  const normalized = sql.replace(/\s+/g, " ").trim();
  if (/^INSERT\s+INTO\s+/i.test(normalized)) {
    const table = normalized.replace(/^INSERT\s+INTO\s+(\S+).*$/i, "$1");
    return `INSERT ${table}`;
  }
  if (/^UPDATE\s+\S+/i.test(normalized)) {
    const table = normalized.replace(/^UPDATE\s+(\S+).*$/i, "$1");
    return `UPDATE ${table}`;
  }
  if (/^DELETE\s+FROM\s+/i.test(normalized)) {
    const table = normalized.replace(/^DELETE\s+FROM\s+(\S+).*$/i, "$1");
    return `DELETE ${table}`;
  }
  if (/^SELECT\s+/i.test(normalized)) {
    const fromMatch = normalized.match(/\bFROM\s+(\S+)/i);
    const table = fromMatch ? fromMatch[1] : "?";
    return `SELECT ${table}`;
  }
  return normalized.slice(0, 50);
}

/**
 * Try to get a numeric amount from params (common for expenses, income, budget).
 * Looks for a param that looks like cents (positive integer).
 */
function amountFromParams(
  _sql: string,
  params: (string | number | null)[]
): number | undefined {
  const num = params.find(
    (p) => typeof p === "number" && Number.isInteger(p) && p > 0
  );
  return typeof num === "number" ? num : undefined;
}

function logDbCall(
  op: "run" | "get" | "all",
  sql: string,
  params: (string | number | null)[]
): void {
  const when = new Date().toISOString();
  const ctx = getRequestContext();
  const who = ctx?.userId
    ? `user:${ctx.userId}${ctx.userName ? ` (${ctx.userName})` : ""}`
    : "system";
  const what = describeSql(sql);
  const amount = op === "run" ? amountFromParams(sql, params) : undefined;
  const parts = [`[DB] ${when} | ${who} | ${op} ${what}`];
  if (amount != null) parts.push(`| amount: ${amount}`);
  if (params.length > 0 && params.length <= 8)
    parts.push(`| params: [${params.join(", ")}]`);
  else if (params.length > 8)
    parts.push(`| params: [${params.slice(0, 4).join(", ")}... (+${params.length - 4} more)]`);
  console.log(parts.join(" "));
}

/**
 * Run a parameterized statement (INSERT/UPDATE/DELETE). Initializes DB if needed.
 * Persists to file immediately so other processes/workers see the write.
 */
export async function run(
  sql: string,
  params: (string | number | null)[] = []
): Promise<void> {
  logDbCall("run", sql, params);
  const db = await getDb();
  db.run(sql, params);
  saveDb();
  if (fs.existsSync(dbPath)) lastLoadMtimeMs = fs.statSync(dbPath).mtimeMs;
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
