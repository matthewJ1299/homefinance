import type { AccountType } from "@/lib/types";

export type AccountOption = { id: number; name: string; type: AccountType };

export function normalizeNumericId(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizes GET /api/accounts JSON (Postgres BIGINT ids often arrive as strings).
 */
export function parseAccountsApiPayload(data: unknown): {
  accounts: AccountOption[];
  primaryAccountId: number | null;
} {
  const d = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rawList = d.accounts;
  const accounts: AccountOption[] = Array.isArray(rawList)
    ? rawList
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const o = item as Record<string, unknown>;
          const id = normalizeNumericId(o.id);
          const name = typeof o.name === "string" ? o.name : "";
          const type = o.type as AccountType;
          if (id == null || !name || typeof type !== "string") return null;
          return { id, name, type };
        })
        .filter((x): x is AccountOption => x != null)
    : [];
  const primaryAccountId = normalizeNumericId(d.primaryAccountId);
  return { accounts, primaryAccountId };
}
