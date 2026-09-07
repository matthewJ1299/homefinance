"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/utils/currency";
import type { AccountType, AccountWithBalance } from "@/lib/types";
import { TransferMoneyModal } from "./transfer-money-modal";
import { toast } from "sonner";
import { normalizeNumericId } from "@/lib/utils/accounts-api";
import { AccountCreateFields } from "@/components/accounts/account-create-fields";
import { AccountSharingSwitch } from "@/components/accounts/account-sharing-switch";
import { BalanceCheckSheet } from "@/components/accounts/balance-check-sheet";
import type { HouseholdMember } from "@/lib/types/household-member";
import { validateAccountCreateDraft } from "@/lib/utils/account-create";

export function AccountsManage({
  otherMembers = [],
  currentUserId,
}: {
  otherMembers?: HouseholdMember[];
  /** Who is reading. Ownership decides who may reconcile a shared account. */
  currentUserId?: number;
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("bank");
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [newIsShared, setNewIsShared] = useState(false);
  const [checkAccount, setCheckAccount] = useState<AccountWithBalance | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const fetchAccounts = async () => {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts ?? []);
      setPrimaryAccountId(normalizeNumericId(data.primaryAccountId));
    }
    setLoading(false);
  };

  const handleSetPrimary = (id: number) => {
    startTransition(async () => {
      const snapshot = primaryAccountId;
      setPrimaryAccountId(id);
      const res = await fetch("/api/accounts/primary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      });
      if (res.ok) {
        await fetchAccounts();
        router.refresh();
        toast.success("Primary account updated.");
      } else {
        setPrimaryAccountId(snapshot);
        const err = await res.json();
        toast.error(err.error ?? "Failed to set primary account.");
      }
    });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = () => {
    const validated = validateAccountCreateDraft({
      name: newName,
      type: newType,
      creditLimitInput: newCreditLimit,
    });
    if (!validated.ok) return;

    startTransition(async () => {
      const snapshot = accounts;
      const tempId = -Date.now();
      setAccounts((prev) => [
        ...prev,
        {
          id: tempId,
          name: validated.value.name,
          type: validated.value.type,
          ownerUserId: 0,
          creditLimit: validated.value.creditLimitMinorUnits,
          isShared: newIsShared,
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
          isShared: newIsShared,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewType("bank");
        setNewCreditLimit("");
        setShowAdd(false);
        await fetchAccounts();
        router.refresh();
        toast.success("Account created.");
      } else {
        setAccounts(snapshot);
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create account.");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this account? It must have a zero balance.")) return;
    startTransition(async () => {
      const snapshot = accounts;
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAccounts();
        router.refresh();
        toast.success("Account deleted.");
      } else {
        setAccounts(snapshot);
        const err = await res.json();
        toast.error(err.error ?? "Failed to delete account.");
      }
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading accounts...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTransferModalOpen(true)}
          disabled={accounts.length < 2}
        >
          Transfer Money
        </Button>
      </div>

      {accounts.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">
          No accounts yet. Create one below to track bank balances, savings, and credit.
        </p>
      )}

      {accounts.length > 0 && (
        <p className="text-xs text-muted-foreground">
          The <span className="font-medium text-foreground">primary account</span> is listed first.
          It is the default when adding income or expenses, and it drives the dashboard recent-expenses
          filter. With more than one account, use <span className="font-medium text-foreground">Set as primary</span>{" "}
          to move which account is first and primary.
        </p>
      )}

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
                {acc.isShared ? (
                  <span className="ml-2 rounded-md bg-success-surface px-1.5 py-0.5 text-xs font-medium text-success">
                    Shared
                  </span>
                ) : null}
                <div className="text-xs text-muted-foreground mt-1">
                  Balance: {formatRand(acc.balance)}
                  {acc.type === "credit" && acc.creditLimit != null && (
                    <>
                      {" "}
                      | Limit: {formatRand(acc.creditLimit)} | Available:{" "}
                      {formatRand(acc.availableCredit ?? acc.creditLimit + acc.balance)}
                    </>
                  )}
                </div>
                {accounts.length === 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This is your only account; it is always the primary account.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* A shared account has one real bank balance and two people.
                    Two people accepting two gaps would write two adjustment
                    rows for one truth, so the check stays with the owner. */}
                {currentUserId == null || acc.ownerUserId === currentUserId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCheckAccount(acc)}
                    disabled={isPending}
                  >
                    Check
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Checked by the owner
                  </span>
                )}
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(acc.id)}
                  disabled={isPending || acc.balance !== 0}
                >
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <BalanceCheckSheet
        account={checkAccount}
        onOpenChange={(open) => !open && setCheckAccount(null)}
      />

      {showAdd ? (
        <div className="rounded-lg border p-4 space-y-3">
          <AccountCreateFields
            name={newName}
            onNameChange={setNewName}
            type={newType}
            onTypeChange={setNewType}
            creditLimitInput={newCreditLimit}
            onCreditLimitInputChange={setNewCreditLimit}
          />
          <AccountSharingSwitch
            isShared={newIsShared}
            onChange={setNewIsShared}
            otherMembers={otherMembers}
            disabled={isPending}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isPending || !newName.trim()}>
              {isPending ? "Adding..." : "Add account"}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          Add account
        </Button>
      )}

      <TransferMoneyModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        accounts={accounts}
        onSuccess={() => {
          fetchAccounts();
          router.refresh();
        }}
      />
    </div>
  );
}
