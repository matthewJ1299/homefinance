/**
 * Database client interface. The app uses Postgres via `DATABASE_URL`.
 */
export interface IDbClient {
  initDb(): Promise<void>;
  run(sql: string, params: (string | number | boolean | null)[]): Promise<void>;
  get<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | boolean | null)[]
  ): Promise<T | null>;
  all<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | boolean | null)[]
  ): Promise<T[]>;
  lastInsertId(): Promise<number>;
  saveDb(): void;
  startPersistLoop(intervalMs: number): void;
}
