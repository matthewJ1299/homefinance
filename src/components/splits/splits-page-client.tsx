"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SplitBalance, SplitHistoryItem, SplitGroup } from "@/lib/types";
import { deleteExpense } from "@/lib/actions/expense.actions";
import { settleSplit, updateSettlement, deleteSettlement } from "@/lib/actions/split.actions";
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

export interface BalancePerGroupItem {
  groupId: number;
  groupName: string;
  balance: SplitBalance;
}

interface SplitsPageClientProps {
  groups: SplitGroup[];
  balancePerGroup: BalancePerGroupItem[];
  selectedGroupId: number | null;
  balance: SplitBalance;
  history: SplitHistoryItem[];
  currentUserId: number;
}

export function SplitsPageClient({
  groups,
  balancePerGroup,
  selectedGroupId,
  balance,
  history,
  currentUserId,
}: SplitsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleRecipient, setSettleRecipient] = useState<{
    userId: number;
    userName: string;
    iOwe: number;
  } | null>(null);
  const [settleAmountRands, setSettleAmountRands] = useState("");
  const [settleDate, setSettleDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
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
    setSettleAmountRands((u.iOwe / 100).toFixed(2));
    setSettleDate(new Date().toISOString().slice(0, 10));
    setSettleError(null);
    setSettleOpen(true);
  };

  const handleSettleSubmit = () => {
    if (!settleRecipient || selectedGroupId == null) return;
    const amountRands = parseFloat(settleAmountRands);
    if (Number.isNaN(amountRands) || amountRands <= 0) {
      setSettleError("Enter a valid amount.");
      return;
    }
    const amountCents = toMinorUnits(amountRands);
    if (amountCents > settleRecipient.iOwe) {
      setSettleError(`You owe ${formatRand(settleRecipient.iOwe)} at most.`);
      return;
    }
    setSettleError(null);
    startTransition(async () => {
      const result = await settleSplit({
        recipientUserId: settleRecipient.userId,
        amountCents,
        date: settleDate,
        groupId: selectedGroupId,
      });
      if (result.success) {
        setSettleOpen(false);
        setSettleRecipient(null);
        toast.success("Settlement recorded.");
        void router.refresh();
      } else {
        setSettleError(result.error);
        toast.error(result.error);
      }
    });
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
      {balancePerGroup.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-2">Summary by group</h2>
          <div className="flex flex-wrap gap-2">
            {balancePerGroup.map(({ groupId, groupName, balance: b }) => (
              <Link
                key={groupId}
                href={groupId === selectedGroupId ? "/splits" : `/splits?group=${groupId}`}
                className={`rounded-lg border p-3 text-sm min-w-[120px] block ${
                  groupId === selectedGroupId
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-accent/50"
                }`}
              >
                <span className="font-medium">{groupName}</span>
                <div className="text-muted-foreground mt-1">
                  {b.net > 0 && `You are owed ${formatRand(b.net)}`}
                  {b.net < 0 && `You owe ${formatRand(-b.net)}`}
                  {b.net === 0 && "Settled up"}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {groups.length > 1 && (
        <section>
          <h2 className="text-sm font-medium mb-2">Group</h2>
          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={g.id === selectedGroupId ? "/splits" : `/splits?group=${g.id}`}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  g.id === selectedGroupId
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card hover:bg-accent/50"
                }`}
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium mb-2">How much each person owes</h2>
        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
          {balance.perUser.length === 0 ? (
            <p className="text-muted-foreground">No split balances.</p>
          ) : (
            <>
              {balance.perUser.map((u) => {
                const netWithPerson = u.owedToMe - u.iOwe;
                return (
                  <div
                    key={u.userId}
                    className="flex justify-between items-center gap-2 flex-wrap"
                  >
                    <span>{u.userName}</span>
                    <div className="flex items-center gap-2">
                      <span>
                        {netWithPerson > 0 &&
                          `${u.userName} owes you ${formatRand(netWithPerson)}`}
                        {netWithPerson < 0 &&
                          `You owe ${u.userName} ${formatRand(-netWithPerson)}`}
                        {netWithPerson === 0 && "Settled up"}
                      </span>
                      {u.iOwe > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSettle(u)}
                          disabled={isPending}
                        >
                          Settle
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t font-medium">
                {balance.net > 0 && `You are owed ${formatRand(balance.net)}`}
                {balance.net < 0 && `You owe ${formatRand(-balance.net)}`}
                {balance.net === 0 && "Settled up"}
              </div>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-2">Split history</h2>
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
                    <div>
                      <span className="font-medium">{item.categoryName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        {formatRand(item.totalAmount)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        paid by {item.paidByUserName}
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
                  <ul className="text-muted-foreground">
                    {item.allocations.map((a) => (
                      <li key={a.userId}>
                        {a.userName} owes {formatRand(a.amount)}
                      </li>
                    ))}
                  </ul>
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

      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogHeader>
          Settle with {settleRecipient?.userName ?? ""}
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="settle-amount">Amount (R)</Label>
            <Input
              id="settle-amount"
              type="number"
              step="0.01"
              min="0"
              value={settleAmountRands}
              onChange={(e) => setSettleAmountRands(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="settle-date">Date</Label>
            <Input
              id="settle-date"
              type="date"
              value={settleDate}
              onChange={(e) => setSettleDate(e.target.value)}
              disabled={isPending}
            />
          </div>
          {settleError && (
            <p className="text-sm text-destructive">{settleError}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSettleOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSettleSubmit} disabled={isPending}>
            {isPending ? "Settling..." : "Settle"}
          </Button>
        </DialogFooter>
      </Dialog>

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
