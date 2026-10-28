import type { AccountType } from "@/lib/types";

export interface AccountCreateDraft {
  name: string;
  type: AccountType;
  creditLimitInput: string;
}

export interface AccountCreateValidated {
  name: string;
  type: AccountType;
  creditLimitMinorUnits: number | null;
}

function parseMinorUnitsFromDecimalInput(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function validateAccountCreateDraft(draft: AccountCreateDraft):
  | { ok: true; value: AccountCreateValidated }
  | { ok: false; error: string } {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: "Account name is required." };

  const type = draft.type;
  switch (type) {
    case "bank":
    case "savings":
      return { ok: true, value: { name, type, creditLimitMinorUnits: null } };
    case "credit": {
      const creditLimitMinorUnits = parseMinorUnitsFromDecimalInput(draft.creditLimitInput);
      if (creditLimitMinorUnits == null || creditLimitMinorUnits <= 0) {
        return { ok: false, error: "Credit limit must be greater than 0." };
      }
      return { ok: true, value: { name, type, creditLimitMinorUnits } };
    }
    default: {
      const _exhaustive: never = type;
      return { ok: false, error: `Unsupported account type: ${String(_exhaustive)}` };
    }
  }
}

