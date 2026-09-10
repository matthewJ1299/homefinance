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

/**
 * Tables with no `id` column, so `RETURNING id` would be a syntax error rather
 * than a no-op. `household_features` is keyed on (household_id, feature_key).
 *
 * Every other table in the schema is `id SERIAL PRIMARY KEY`; a new keyless
 * table needs one entry here. Nothing calls `lastInsertId()` after inserting
 * into these, so skipping capture costs nothing.
 */
const KEYLESS_TABLES = new Set(["household_features", "schema_migrations"]);

function insertTargetTable(sql: string): string | null {
  const m = sql.replace(/\s+/g, " ").trim().match(/^INSERT\s+INTO\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Upserts already report nothing useful, keyless tables have no id to return,
 * and a caller that wrote its own RETURNING is handling the result itself.
 */
function shouldCaptureInsertId(sql: string): boolean {
  if (!isInsert(sql)) return false;
  if (/\bON\s+CONFLICT\b/i.test(sql)) return false;
  if (/\bRETURNING\b/i.test(sql)) return false;
  const table = insertTargetTable(sql);
  return table != null && !KEYLESS_TABLES.has(table);
}

/**
 * The generated id comes back on the INSERT itself rather than from a follow-up
 * `SELECT lastval()`. That halves the round trips on every write, and drops the
 * dependency on session-scoped sequence state -- `lastval()` was only correct
 * because the code took a dedicated client for the pair, which is an invariant
 * that is easy to break later and silent when it does.
 */
function withReturningId(sql: string): string {
  return `${sql.replace(/;\s*$/, "")} RETURNING id`;
}

function idFromResult(res: pg.QueryResult): number | null {
  const raw = res.rows[0]?.id;
  return raw != null ? Number(raw) : null;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Postgres");
  pool = new Pool({
    connectionString: url,
    max: intFromEnv("PGPOOL_MAX", 10),
    idleTimeoutMillis: intFromEnv("PGPOOL_IDLE_TIMEOUT_MS", 30_000),
    // A request that cannot get a client fails fast instead of hanging forever.
    connectionTimeoutMillis: intFromEnv("PGPOOL_CONNECTION_TIMEOUT_MS", 5_000),
    // One runaway query must not hold a pooled connection indefinitely.
    statement_timeout: intFromEnv("PG_STATEMENT_TIMEOUT_MS", 15_000),
    ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
  // node-pg emits 'error' on the Pool when an IDLE client errors -- a Postgres
  // restart, a failover, a connection reaper on the far side. An 'error' event
  // with no listener is an unhandled exception, which terminates the process.
  // The pool retires the broken client on its own; this only has to stop the
  // event from being fatal.
  pool.on("error", (err) => {
    console.error("[DB] idle client error (pool will retire it):", err.message);
  });
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
  const prev = getRequestContext();

  // Re-entrant: join the transaction already open on this context rather than
  // opening a second one.
  //
  // Without this, a nested call takes another pooled client and runs its own
  // BEGIN, so the inner writes commit independently -- and survive a rollback of
  // the outer, which is the opposite of what the caller asked for. It also burns
  // two connections per nesting level, which matters now the pool has a `max`.
  //
  // Real case: BudgetAiApplyService wraps a loop that calls BudgetService.transfer,
  // and transfer opens its own.
  if (prev?.pgClient) {
    return fn();
  }

  const p = await getPool();
  const client = await p.connect();
  const baseCtx: RequestContext = prev ? { ...prev } : {};
  // One holder per transaction, mutated in place by `run` -- see
  // RequestContext.txInsertId for why it cannot be a plain value.
  const txInsertId: { value: number | null } = { value: null };
  try {
    await client.query("BEGIN");
    setRequestContext({ ...baseCtx, pgClient: client, txInsertId });
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
    const capture = shouldCaptureInsertId(sql);
    const [pgSql, pgParams] = toPgParams(capture ? withReturningId(sql) : sql, params);

    const ctx = getRequestContext();
    const txClient = ctx?.pgClient;
    if (txClient) {
      const res = await txClient.query(pgSql, pgParams);
      if (capture) {
        const id = idFromResult(res);
        if (id != null) {
          // Mutated, not re-set: the context written here would not be visible
          // to the caller's `lastInsertId()` on the other side of the await.
          if (ctx.txInsertId) ctx.txInsertId.value = id;
          else lastInsertedIdFallback = id;
        }
      }
      return;
    }

    // One statement, one round trip, so the pool's own client is enough -- the
    // dedicated connect/release only existed to keep `lastval()` on the same
    // session as its INSERT.
    const p = await getPool();
    const res = await p.query(pgSql, pgParams);
    if (capture) {
      const id = idFromResult(res);
      if (id != null) {
        lastInsertedIdFallback = id;
        const ctx = getRequestContext();
        if (ctx) setRequestContext({ ...ctx, lastInsertId: id });
      }
    }
  },

  async lastInsertId(): Promise<number> {
    const ctx = getRequestContext();
    // Inside a transaction the per-transaction holder is the only reliable
    // source; outside one, the module-level fallback still is.
    const id = ctx?.txInsertId?.value ?? ctx?.lastInsertId ?? lastInsertedIdFallback;
    lastInsertedIdFallback = null;
    if (ctx?.txInsertId) ctx.txInsertId.value = null;
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

/**
 * The shared pool, for advisory locks only (see ./advisory-lock).
 *
 * Those need a dedicated client so acquire and release land on one session,
 * which the `run`/`get`/`all` surface deliberately does not expose. Nothing else
 * should reach for this -- go through `@/lib/db`.
 */
export async function getPoolForLocks(): Promise<pg.Pool> {
  return getPool();
}
