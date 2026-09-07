import pg from "pg";
import type { IDbClient } from "./types";
import { getRequestContext, setRequestContext, type RequestContext } from "./request-context";

const { Pool } = pg;

let pool: pg.Pool | null = null;
/** Fallback when no request context (e.g. seed script). */
let lastInsertedIdFallback: number | null = null;

/**
 * Convert SQL with ? placeholders to $1, $2, ... and return the param array for pg.
 */
function toPgParams(sql: string, params: (string | number | boolean | null)[]): [string, (string | number | boolean | null)[]] {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return [pgSql, params];
}

function isInsert(sql: string): boolean {
  return /^\s*INSERT\s+INTO\s+/i.test(sql.replace(/\s+/g, " ").trim());
}

/** Upserts and tables without serial/identity must not call lastval(). */
function shouldCaptureInsertId(sql: string): boolean {
  return isInsert(sql) && !/\bON\s+CONFLICT\b/i.test(sql);
}

async function captureLastInsertId(
  query: (sql: string) => Promise<pg.QueryResult>
): Promise<number | null> {
  try {
    const res = await query("SELECT lastval() AS id");
    return res.rows[0]?.id != null ? Number(res.rows[0].id) : null;
  } catch {
    return null;
  }
}

async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Postgres");
  pool = new Pool({ connectionString: url });
  return pool;
}

async function queryPg<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: (string | number | boolean | null)[]
): Promise<pg.QueryResult<T>> {
  const [pgSql, pgParams] = toPgParams(sql, params);
  const txClient = getRequestContext()?.pgClient;
  if (txClient) {
    return txClient.query<T>(pgSql, pgParams);
  }
  const p = await getPool();
  return p.query<T>(pgSql, pgParams);
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  const prev = getRequestContext();
  const baseCtx: RequestContext = prev ? { ...prev } : {};
  try {
    await client.query("BEGIN");
    setRequestContext({ ...baseCtx, pgClient: client });
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    // Always clear pgClient, even when there was no prior context — otherwise the
    // released client stays referenced and later queries run on a pooled client
    // that now belongs to someone else. Passing {} keeps shared identity intact.
    setRequestContext(prev ?? {});
    client.release();
  }
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

  async run(sql: string, params: (string | number | boolean | null)[] = []): Promise<void> {
    const txClient = getRequestContext()?.pgClient;
    if (txClient) {
      const [pgSql, pgParams] = toPgParams(sql, params);
      await txClient.query(pgSql, pgParams);
      if (shouldCaptureInsertId(sql)) {
        const id = await captureLastInsertId((q) => txClient.query(q));
        if (id != null) {
          const ctx = getRequestContext();
          if (ctx) setRequestContext({ ...ctx, lastInsertId: id });
        }
      }
      return;
    }
    const p = await getPool();
    const client = await p.connect();
    try {
      const [pgSql, pgParams] = toPgParams(sql, params);
      await client.query(pgSql, pgParams);
      if (shouldCaptureInsertId(sql)) {
        const id = await captureLastInsertId((q) => client.query(q));
        if (id != null) {
          lastInsertedIdFallback = id;
          const ctx = getRequestContext();
          if (ctx) setRequestContext({ ...ctx, lastInsertId: id });
        }
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
    params: (string | number | boolean | null)[] = []
  ): Promise<T | null> {
    const res = await queryPg(sql, params);
    const row = res.rows[0];
    return (row as T) ?? null;
  },

  async all<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<T[]> {
    const res = await queryPg(sql, params);
    return res.rows as T[];
  },
};

export { postgresClient };
