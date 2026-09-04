"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SplitBalance, SplitHistoryItem, SplitGroup } from "@/lib/types";
import { deleteExpense } from "@/lib/actions/expense.actions";
import { updateSettlement, deleteSettlement } from "@/lib/actions/split.actions";
import { PersonBalanceCard, type PersonBalance } from "./person-balance-card";
import { SettleSheet, type SettleTargetCategory } from "./settle-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRand, toMinorUnits } from "@/lib/utils/currency";
import { formatDisplayDate } from "@/lib/utils/date";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SplitsPageClientProps {
  groups: SplitGroup[];
  selectedGroupId: number | null;
  balance: SplitBalance;
  balances: PersonBalance[];
  history: SplitHistoryItem[];
  currentUserId: number;
  /** Where a repayment can land, for the settle sheet. */
  settleCategories: SettleTargetCategory[];
}

export function SplitsPageClient({
  groups,
  selectedGroupId,
  balance,
  balances,
  history,
  currentUserId,
  settleCategories,
}: SplitsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleRecipient, setSettleRecipient] = useState<{
    userId: number;
    userName: string;
    iOwe: number;
  } | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [editSettlement, setEditSettlement] = useState<{
    settlementId: number;
    amountCents: number;
    date: string;
    recipientName: string;
  } | null>(null);
  const [editAmountRands, setEditAmountRands] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deleteExpenseId, setDeleteExpenseId] = useState<number | null>(null);
  const [deleteSettlementId, setDeleteSettlementId] = useState<number | null>(null);

  const openSettle = (u: { userId: number; userName: string; iOwe: number }) => {
    setSettleRecipient(u);
    setSettleError(null);
    setSettleOpen(true);
  };

  const handleDelete = (expenseId: number) => {
    setDeleteExpenseId(expenseId);
  };

  const confirmDeleteExpense = () => {
    if (deleteExpenseId == null) return;
    startTransition(async () => {
      const result = await deleteExpense(deleteExpenseId);
      if (result.success) {
        toast.success("Expense deleted.");
        setDeleteExpenseId(null);
        void router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const openEditSettlement = (item: Extract<SplitHistoryItem, { type: "settlement" }>) => {
    if (item.payerUserId !== currentUserId) return;
    setEditSettlement({
      settlementId: item.settlementId,
      amountCents: item.amount,
      date: item.date,
      recipientName: item.recipientUserName,
    });
    setEditAmountRands((item.amount / 100).toFixed(2));
    setEditDate(item.date);
    setSettleError(null);
  };

  const handleEditSettlementSubmit = () => {
    if (!editSettlement) return;
    const amountRands = parseFloat(editAmountRands);
    if (Number.isNaN(amountRands) || amountRands <= 0) {
      setSettleError("Enter a valid amount.");
      return;
    }
    setSettleError(null);
    startTransition(async () => {
      const result = await updateSettlement({
        settlementId: editSettlement.settlementId,
        amountCents: toMinorUnits(amountRands),
        date: editDate,
      });
      if (result.success) {
        setEditSettlement(null);
        toast.success("Settlement updated.");
        void router.refresh();
      } else {
        setSettleError(result.error);
        toast.error(result.error);
      }
    });
  };

  const handleDeleteSettlement = (settlementId: number) => {
    setDeleteSettlementId(settlementId);
  };

  const confirmDeleteSettlement = () => {
    if (deleteSettlementId == null) return;
    startTransition(async () => {
      const result = await deleteSettlement(deleteSettlementId);
      if (result.success) {
        toast.success("Settlement deleted.");
        setDeleteSettlementId(null);
        void router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <section className="space-y-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold text-muted-foreground">Overall</p>
          <p
            className={cn(
              "mt-1.5 text-3xl font-semibold tracking-tight tabular-nums",
              balance.net > 0
                ? "text-success"
                : balance.net < 0
                  ? "text-destructive"
                  : "text-foreground"
            )}
          >
            {balance.net === 0 ? "Settled up" : formatRand(Math.abs(balance.net))}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {balance.net > 0
              ? "owed to you"
              : balance.net < 0
                ? "you owe"
                : "Nothing outstanding with anyone."}
          </p>
        </div>

        {/* Groups become a filter. Most households only ever use one, so a row
            of summary chips gave the least-used feature the most space. */}
        {groups.length > 1 ? (
          <select
            value={selectedGroupId ?? ""}
            onChange={(e) => router.push(`/splits?group=${e.target.value}`)}
            aria-label="Group"
            className="min-h-11 w-full rounded-full border border-border bg-muted px-3.5 text-sm cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}

        {balances.length === 0 ? (
          <EmptyState
            title="Nobody to share with yet"
            message="Invite someone to the house and shared spends will show up here."
          />
        ) : (
          <div className="space-y-2">
            {balances.map((b) => (
              <PersonBalanceCard
                key={b.userId}
                balance={b}
                onSettle={(x) => openSettle({ userId: x.userId, userName: x.userName, iOwe: x.iOwe })}
                onHistory={() => {
                  document
                    .getElementById("shared-spends")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section id="shared-spends" className="space-y-2">
        <SectionHeader title="Recent shared spends" />
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No split expenses or settlements yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) =>
              item.type === "expense" ? (
                <li
                  key={`exp-${item.expenseId}`}
                  className="rounded-lg border bg-card p-3 text-sm flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <span className="font-medium">{item.categoryName}</span>
                      {/* The share, not the total: what you owe or are owed is
                          the number you came here for. */}
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {item.paidByUserId === currentUserId ? "You paid" : `${item.paidByUserName} paid`}
                        {" · "}
                        {[item.paidByUserName, ...item.allocations.map((a) => a.userName)].join(", ")}
                        {" · "}
                        {formatRand(item.totalAmount)}
                        {" / your "}
                        {formatRand(
                          item.paidByUserId === currentUserId
                            ? item.totalAmount - item.allocations.reduce((sum, a) => sum + a.amount, 0)
                            : (item.allocations.find((a) => a.userId === currentUserId)?.amount ?? 0)
                        )}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.expenseId)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatDisplayDate(item.date)}
                    {item.note && ` – ${item.note}`}
                  </div>

                </li>
              ) : (
                <li
                  key={`set-${item.settlementId}`}
                  className="rounded-lg border bg-card p-3 text-sm flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="text-muted-foreground">
                      {item.payerUserId === currentUserId ? (
                        <>You paid {item.recipientUserName} {formatRand(item.amount)}</>
                      ) : (
                        <>{item.payerUserName} paid you {formatRand(item.amount)}</>
                      )}
                      <span className="text-xs ml-2">{formatDisplayDate(item.date)}</span>
                    </div>
                    {item.payerUserId === currentUserId && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSettlement(item)}
                          disabled={isPending}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSettlement(item.settlementId)}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>

      <SettleSheet
        open={settleOpen}
        onOpenChange={(open) => {
          setSettleOpen(open);
          if (!open) setSettleRecipient(null);
        }}
        recipient={settleRecipient}
        groupId={selectedGroupId}
        categories={settleCategories}
      />

      <Dialog open={editSettlement != null} onOpenChange={(open) => !open && setEditSettlement(null)}>
        <DialogHeader>
          Edit settlement to {editSettlement?.recipientName ?? ""}
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-settle-amount">Amount (R)</Label>
            <Input
              id="edit-settle-amount"
              type="number"
              step="0.01"
              min="0"
              value={editAmountRands}
              onChange={(e) => setEditAmountRands(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="edit-settle-date">Date</Label>
            <Input
              id="edit-settle-date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              disabled={isPending}
            />
          </div>
          {settleError && <p className="text-sm text-destructive">{settleError}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditSettlement(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleEditSettlementSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={deleteExpenseId != null}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        title="Delete split expense"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={confirmDeleteExpense}
      />
      <ConfirmDialog
        open={deleteSettlementId != null}
        onOpenChange={(open) => !open && setDeleteSettlementId(null)}
        title="Delete settlement"
        description="This removes the linked expense and income. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={confirmDeleteSettlement}
      />
    </>
  );
}
