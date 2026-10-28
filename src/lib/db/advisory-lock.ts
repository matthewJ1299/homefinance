import pg from "pg";
import { getPoolForLocks } from "./postgres-client";

/**
 * Postgres advisory locks, used to make process-level work single-flight across
 * replicas without adding another dependency.
 *
 * Advisory locks are SESSION scoped, so acquire and release must happen on the
 * same connection. Every helper here therefore checks out a dedicated client and
 * returns it in a `finally` -- running the lock through the pool's convenience
 * `query()` would take the lock on one pooled client and try to release it on
 * another, leaving the lock held until that connection is recycled.
 */

/** Stable 64-bit key from a name, so callers name the lock rather than a number. */
function lockKey(name: string): string {
  // hashtext() is Postgres' own, and keeps the key stable across processes and
  // Node versions in a way a JS hash would not.
  return name;
}

/**
 * Runs `fn` while holding an exclusive advisory lock, waiting for it if another
 * process holds it. For work that must happen exactly once and must not be
 * skipped -- schema migrations.
 */
export async function withAdvisoryLock<T>(
  client: pg.ClientBase,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockKey(name)]);
  try {
    return await fn();
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey(name)]);
  }
}

/**
 * Runs `fn` only if the lock is free right now; returns `false` without running
 * when another replica holds it. For recurring work where a skipped tick is
 * correct -- the scheduler, where two replicas sending the same push is the bug.
 *
 * Per-tick rather than held for the process lifetime, so leadership recovers on
 * its own when the holder dies.
 */
export async function withTryAdvisoryLock(
  name: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const pool = await getPoolForLocks();
  const client = await pool.connect();
  try {
    const res = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
      [lockKey(name)]
    );
    if (res.rows[0]?.locked !== true) return false;
    try {
      await fn();
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey(name)]);
    }
    return true;
  } finally {
    client.release();
  }
}
