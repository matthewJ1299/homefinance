import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import path from "path";
import fs from "fs";
import type { IDbClient } from "./types";

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "sqlite.db");

let sqlJsDb: SqlJsDatabase | null = null;
let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let lastLoadMtimeMs = 0;

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function applyMigrationIfNeeded(): void {
  if (!sqlJsDb) return;
  const check = sqlJsDb.exec(
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
    sqlJsDb.run(stmt);
  }
}

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

async function getDb(): Promise<SqlJsDatabase> {
  await sqliteClient.initDb();
  reloadFromFileIfNewer();
  return sqlJsDb!;
}

const sqliteClient: IDbClient = {
  async initDb(): Promise<void> {
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
  },

  saveDb(): void {
    if (!sqlJsDb) return;
    const data = sqlJsDb.export();
    const buf = Buffer.from(data);
    fs.writeFileSync(dbPath, buf);
    if (fs.existsSync(dbPath)) lastLoadMtimeMs = fs.statSync(dbPath).mtimeMs;
  },

  async run(
    sql: string,
    params: (string | number | null)[] = []
  ): Promise<void> {
    const db = await getDb();
    db.run(sql, params);
    sqliteClient.saveDb();
  },

  async lastInsertId(): Promise<number> {
    const db = await getDb();
    const stmt = db.prepare("SELECT last_insert_rowid() AS id");
    stmt.step();
    const row = stmt.getAsObject() as { id: number };
    stmt.free();
    return row.id;
  },

  async get<T = Record<string, unknown>>(
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
  },

  async all<T = Record<string, unknown>>(
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
  },

  startPersistLoop(intervalMs = 60_000): void {
    setInterval(() => {
      try {
        sqliteClient.saveDb();
      } catch (e) {
        console.error("Failed to persist DB:", e);
      }
    }, intervalMs);
  },
};

export { sqliteClient };
