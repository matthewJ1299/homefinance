"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRand } from "@/lib/utils/currency";
import type { AccountType } from "@/lib/types";
import { TransferMoneyModal } from "@/components/accounts/transfer-money-modal";

interface AccountWithBalance {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  availableCredit?: number;
}

export function AccountsSummaryTile() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.ok ? res.json() : { accounts: [] })
      .then((data) => {
        setAccounts(data.accounts ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const byType = {
    bank: accounts.filter((a) => a.type === "bank").reduce((s, a) => s + a.balance, 0),
    savings: accounts.filter((a) => a.type === "savings").reduce((s, a) => s + a.balance, 0),
    credit: accounts.filter((a) => a.type === "credit").reduce((s, a) => s + a.balance, 0),
  };
  const net = byType.bank + byType.savings + byType.credit;

  const refresh = () => {
    setLoading(true);
    fetch("/api/accounts")
      .then((res) => res.ok ? res.json() : { accounts: [] })
      .then((data) => setAccounts(data.accounts ?? []))
      .finally(() => setLoading(false));
    router.refresh();
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        Loading accounts...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Link
        href="/settings"
        className="block rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm hover:bg-accent/50"
      >
        <span className="text-muted-foreground">Accounts: </span>
        No accounts yet. Create one in Settings.
      </Link>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link href="/settings" className="font-medium underline hover:no-underline">
            Accounts
          </Link>
          <button
            type="button"
            onClick={() => setTransferModalOpen(true)}
            disabled={accounts.length < 2}
            className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
          >
            Transfer Money
          </button>
        </div>
        <div className="space-y-1 text-muted-foreground">
          {byType.bank !== 0 && (
            <div>Bank: {formatRand(byType.bank)}</div>
          )}
          {byType.savings !== 0 && (
            <div>Savings: {formatRand(byType.savings)}</div>
          )}
          {byType.credit !== 0 && (
            <div>Credit: {formatRand(byType.credit)}</div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t font-medium">
          Net: {formatRand(net)}
        </div>
      </div>

      <TransferMoneyModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        accounts={accounts}
        onSuccess={refresh}
      />
    </>
  );
}
