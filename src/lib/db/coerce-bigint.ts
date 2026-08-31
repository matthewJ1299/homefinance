/** Coerce Postgres BIGINT values (may arrive as string from node-pg) to number. */
export function coerceBigInt(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value);
}

export function coerceBigIntOrNull(value: unknown): number | null {
  if (value == null) return null;
  return coerceBigInt(value);
}
