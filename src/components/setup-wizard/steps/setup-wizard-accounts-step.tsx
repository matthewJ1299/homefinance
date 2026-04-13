"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AccountCreateFields } from "@/components/accounts/account-create-fields";
import { normalizeNumericId } from "@/lib/utils/accounts-api";
import type { AccountType, AccountWithBalance } from "@/lib/types";
import { validateAccountCreateDraft } from "@/lib/utils/account-create";

export function SetupWizardAccountsStep(props: {
  onReadyChange: (ready: boolean) => void;
}) {
  const { onReadyChange } = props;

  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [creditLimitInput, setCreditLimitInput] = useState("");

  const fetchAccounts = async () => {
    const res = await fetch("/api/accounts");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setPrimaryAccountId(normalizeNumericId(data.primaryAccountId));
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const ready = useMemo(() => {
    if (loading) return false;
    if (accounts.length === 0) return false;
    if (accounts.length === 1) return true;
    return primaryAccountId != null;
  }, [accounts.length, loading, primaryAccountId]);

  useEffect(() => {
    onReadyChange(ready);
  }, [onReadyChange, ready]);

  const handleCreate = () => {
    const validated = validateAccountCreateDraft({ name, type, creditLimitInput });
    if (!validated.ok) {
      toast.error(validated.error);
      return;
    }

    startTransition(async () => {
      const tempId = -Date.now();
      const snapshot = accounts;
      setAccounts((prev) => [
        ...prev,
        {
          id: tempId,
          name: validated.value.name,
          type: validated.value.type,
          ownerUserId: 0,
          creditLimit: validated.value.creditLimitMinorUnits,
          createdAt: new Date().toISOString(),
          balance: 0,
        },
      ]);

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: validated.value.name,
          type: validated.value.type,
          creditLimit: validated.value.type === "credit" ? validated.value.creditLimitMinorUnits : null,
        }),
      });

      if (!res.ok) {
        setAccounts(snapshot);
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create account.");
        return;
      }

      setName("");
      setType("bank");
      setCreditLimitInput("");
      await fetchAccounts();
      toast.success("Account created.");
    });
  };

  const handleSetPrimary = (accountId: number) => {
    startTransition(async () => {
      const snapshot = primaryAccountId;
      setPrimaryAccountId(accountId);
      const res = await fetch("/api/accounts/primary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        setPrimaryAccountId(snapshot);
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to set primary account.");
        return;
      }
      await fetchAccounts();
      toast.success("Primary account updated.");
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading accounts…</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium">Accounts</p>
        <p className="text-muted-foreground">
          Create at least one account. If you have more than one, pick a primary account (used as the default for
          adding income and expenses).
        </p>
      </div>

      {accounts.length > 0 ? (
        <ul className="space-y-2">
          {accounts.map((acc) => {
            const isPrimary = primaryAccountId === acc.id;
            const showPrimaryControl = accounts.length > 1;
            return (
              <li
                key={acc.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{acc.name}</span>
                  <span className="ml-2 text-muted-foreground capitalize">({acc.type})</span>
                  {isPrimary && (
                    <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {showPrimaryControl && !isPrimary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(acc.id)}
                      disabled={isPending}
                    >
                      Set as primary
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      )}

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <AccountCreateFields
          name={name}
          onNameChange={setName}
          type={type}
          onTypeChange={setType}
          creditLimitInput={creditLimitInput}
          onCreditLimitInputChange={setCreditLimitInput}
        />
        <div className="flex justify-end">
          <Button type="button" onClick={handleCreate} disabled={isPending || !name.trim()}>
            {isPending ? "Adding…" : "Add account"}
          </Button>
        </div>
      </section>
    </div>
  );
}

