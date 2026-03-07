/**
 * Database client interface. Implementations (SQLite, Postgres) are swapped via env (DATABASE_URL).
 */
export interface IDbClient {
  initDb(): Promise<void>;
  run(sql: string, params: (string | number | null)[]): Promise<void>;
  get<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | null)[]
  ): Promise<T | null>;
  all<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | null)[]
  ): Promise<T[]>;
  lastInsertId(): Promise<number>;
  saveDb(): void;
  startPersistLoop(intervalMs: number): void;
}
