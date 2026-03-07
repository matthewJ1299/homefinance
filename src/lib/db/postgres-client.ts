import pg from "pg";
import type { IDbClient } from "./types";
import { getRequestContext, setRequestContext } from "./request-context";

const { Pool } = pg;

let pool: pg.Pool | null = null;
/** Fallback when no request context (e.g. seed script). */
let lastInsertedIdFallback: number | null = null;

/**
 * Convert SQL with ? placeholders to $1, $2, ... and return the param array for pg.
 */
function toPgParams(sql: string, params: (string | number | null)[]): [string, (string | number | null)[]] {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return [pgSql, params];
}

function isInsert(sql: string): boolean {
  return /^\s*INSERT\s+INTO\s+/i.test(sql.replace(/\s+/g, " ").trim());
}

async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Postgres");
  pool = new Pool({ connectionString: url });
  return pool;
}

const postgresClient: IDbClient = {
  async initDb(): Promise<void> {
    const p = await getPool();
    await p.query("SELECT 1");
  },

  saveDb(): void {
    // No-op for Postgres
  },

  startPersistLoop(_intervalMs: number): void {
    // No-op for Postgres
  },

  async run(sql: string, params: (string | number | null)[] = []): Promise<void> {
    const p = await getPool();
    const client = await p.connect();
    try {
      const [pgSql, pgParams] = toPgParams(sql, params);
      await client.query(pgSql, pgParams);
      if (isInsert(sql)) {
        const res = await client.query("SELECT lastval() AS id");
        const id = res.rows[0]?.id != null ? Number(res.rows[0].id) : null;
        lastInsertedIdFallback = id;
        const ctx = getRequestContext();
        if (ctx) setRequestContext({ ...ctx, lastInsertId: id ?? undefined });
      }
    } finally {
      client.release();
    }
  },

  async lastInsertId(): Promise<number> {
    const ctx = getRequestContext();
    const id = ctx?.lastInsertId ?? lastInsertedIdFallback;
    lastInsertedIdFallback = null;
    if (id == null) throw new Error("No previous INSERT in this context");
    return id;
  },

  async get<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | null)[] = []
  ): Promise<T | null> {
    const p = await getPool();
    const [pgSql, pgParams] = toPgParams(sql, params);
    const res = await p.query(pgSql, pgParams);
    const row = res.rows[0];
    return (row as T) ?? null;
  },

  async all<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | null)[] = []
  ): Promise<T[]> {
    const p = await getPool();
    const [pgSql, pgParams] = toPgParams(sql, params);
    const res = await p.query(pgSql, pgParams);
    return res.rows as T[];
  },
};

export { postgresClient };
