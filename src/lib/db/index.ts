import { getRequestContext } from "./request-context";
import type { IDbClient } from "./types";
import { postgresClient, withTransaction } from "./postgres-client";

/** Postgres (DATABASE_URL) is required. */
function getClient(): IDbClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  return postgresClient;
}

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

function amountFromParams(
  _sql: string,
  params: (string | number | boolean | null)[]
): number | undefined {
  const num = params.find(
    (p) => typeof p === "number" && Number.isInteger(p) && p > 0
  );
  return typeof num === "number" ? num : undefined;
}

/**
 * Query logging, and specifically whether bound parameters are printed.
 *
 * Parameters here are expense notes, people's names, email addresses, amounts
 * and (on the auth path) password hashes. Printing them writes personal
 * financial data into container logs on every page render, so the verbose shape
 * is development-only. `DB_LOG` overrides in either direction:
 *   DB_LOG=off      never log
 *   DB_LOG=summary  log the statement shape, never parameter values
 *   DB_LOG=verbose  log parameters too (development default)
 */
type DbLogLevel = "off" | "summary" | "verbose";

function resolveDbLogLevel(): DbLogLevel {
  const raw = process.env.DB_LOG?.trim().toLowerCase();
  if (raw === "off" || raw === "summary" || raw === "verbose") return raw;
  return process.env.NODE_ENV === "production" ? "summary" : "verbose";
}

// Read once: this runs on every query and the value cannot change mid-process.
const DB_LOG_LEVEL: DbLogLevel = resolveDbLogLevel();

function logDbCall(
  op: "run" | "get" | "all",
  sql: string,
  params: (string | number | boolean | null)[]
): void {
  if (DB_LOG_LEVEL === "off") return;
  const when = new Date().toISOString();
  const ctx = getRequestContext();
  const who = ctx?.userId
    ? `user:${ctx.userId}${ctx.userName ? ` (${ctx.userName})` : ""}`
    : "system";
  const what = describeSql(sql);
  const parts = [`[DB] ${when} | ${who} | ${op} ${what}`];
  if (DB_LOG_LEVEL === "verbose") {
    const amount = op === "run" ? amountFromParams(sql, params) : undefined;
    if (amount != null) parts.push(`| amount: ${amount}`);
    if (params.length > 0 && params.length <= 8)
      parts.push(`| params: [${params.join(", ")}]`);
    else if (params.length > 8)
      parts.push(`| params: [${params.slice(0, 4).join(", ")}... (+${params.length - 4} more)]`);
  } else if (params.length > 0) {
    parts.push(`| params: ${params.length}`);
  }
  console.log(parts.join(" "));
}

export async function initDb(): Promise<void> {
  await getClient().initDb();
}

export function saveDb(): void {
  getClient().saveDb();
}

export async function run(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<void> {
  logDbCall("run", sql, params);
  await getClient().run(sql, params);
}

export async function lastInsertId(): Promise<number> {
  return getClient().lastInsertId();
}

export async function get<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T | null> {
  logDbCall("get", sql, params);
  return getClient().get<T>(sql, params);
}

export async function all<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T[]> {
  logDbCall("all", sql, params);
  return getClient().all<T>(sql, params);
}

export function startPersistLoop(intervalMs = 60_000): void {
  getClient().startPersistLoop(intervalMs);
}

export { withTransaction };
