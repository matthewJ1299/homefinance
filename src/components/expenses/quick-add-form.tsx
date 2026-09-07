"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Category, SplitGroup } from "@/lib/types";
import type { AccountType } from "@/lib/types";
import type { CategoryBudgetHint } from "./category-picker";
import { addExpense, addSplitExpense } from "@/lib/actions/expense.actions";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { CategoryPicker } from "./category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toMinorUnits, formatRand } from "@/lib/utils/currency";
import { toast } from "sonner";
import type { ExpenseWithDetails } from "@/lib/types";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";

type SplitType = "equal" | "full" | "exact";

/** Leading decimal amount, optional remainder as note (e.g. `120 milk`). */
function parseQuickExpenseSeed(line: string): { amountStr: string; note: string } {
  const t = line.trim();
  if (!t) return { amountStr: "", note: "" };
  const m = /^(\d+(?:[.,]\d*)?)\s*(.*)$/.exec(t);
  if (!m) return { amountStr: "", note: t };
  const raw = m[1].replace(",", ".");
  if (Number.isNaN(parseFloat(raw))) return { amountStr: "", note: t };
  return { amountStr: raw, note: m[2].trim() };
}

interface QuickAddFormProps {
  categories: Category[];
  userId: number;
  currentUserName?: string;
  month?: string;
  otherUserName?: string;
  splitGroups?: SplitGroup[];
  /** Optional per-category budget remaining for the current month. When provided, category picker shows remaining/over amounts. */
  budgetByCategory?: Map<number, CategoryBudgetHint>;
  /** Called after an expense is successfully saved (e.g. to close a parent modal). */
  onAfterSave?: () => void;
  /**
   * When opening from a combined quick line (e.g. Add hub), pre-fills amount and optional note for the category step.
   * Leading number is the amount; the rest becomes the initial note when you tap Add.
   */
  quickSeed?: string | null;
  onOptimisticUpsertExpense?: (next: ExpenseWithDetails) => () => void;
  onOptimisticReplaceExpenseId?: (tempId: number, realId: number) => void;
}

export function QuickAddForm({
  categories,
  userId,
  currentUserName,
  month,
  otherUserName,
  splitGroups = [],
  budgetByCategory,
  onAfterSave,
  quickSeed = null,
  onOptimisticUpsertExpense,
  onOptimisticReplaceExpenseId,
}: QuickAddFormProps) {
  const router = useRouter();
  const { isOnline, addToQueue, syncQueue } = useOfflineQueue();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [pendingCents, setPendingCents] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState<"saved" | "saved_offline" | "error" | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [warningDetail, setWarningDetail] = useState<string | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [myShareRand, setMyShareRand] = useState("");
  const [otherShareRand, setOtherShareRand] = useState("");
  const defaultSplitGroupId = splitGroups.find((g) => g.isDefault)?.id ?? splitGroups[0]?.id ?? null;
  const [splitGroupId, setSplitGroupId] = useState<number | null>(defaultSplitGroupId);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string; type: AccountType }>>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<number | null>(null);
  const [accountsReady, setAccountsReady] = useState(false);
  const noteSeedForCategoryStepRef = useRef<string | null>(null);
  const parseShareCents = (value: string): number =>
    toMinorUnits(parseFloat(value.replace(/\s/g, "").replace(",", ".")) || 0);

  useEffect(() => {
    if (quickSeed == null || !String(quickSeed).trim()) return;
    const { amountStr, note } = parseQuickExpenseSeed(String(quickSeed));
    if (amountStr) setAmount(amountStr);
    noteSeedForCategoryStepRef.current = note || null;
  }, [quickSeed]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        const { accounts: list, primaryAccountId: primary } = parseAccountsApiPayload(data);
        setAccounts(list);
        setPrimaryAccountId(primary);
      })
      .catch(() => {
        setAccounts([]);
        setPrimaryAccountId(null);
      })
      .finally(() => setAccountsReady(true));
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      setAccountId(null);
      return;
    }
    const fallback = primaryAccountId ?? accounts[0]!.id;
    setAccountId((prev) =>
      prev != null && accounts.some((a) => a.id === prev) ? prev : fallback
    );
  }, [accounts, primaryAccountId]);

  useEffect(() => {
    if (!isOnline) return;
    syncQueue().then(() => router.refresh());
  }, [isOnline, syncQueue, router]);

  const openCategoryDialog = () => {
    if (!accountsReady) return;
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) return;
    setPendingCents(toMinorUnits(parsed));
    setCategoryId(categories[0]?.id ?? null);
    setNote(noteSeedForCategoryStepRef.current ?? "");
    noteSeedForCategoryStepRef.current = null;
    setDate(format(new Date(), "yyyy-MM-dd"));
    setSplitEnabled(false);
    setSplitType("equal");
    setMyShareRand("");
    setOtherShareRand("");
    setSplitGroupId(splitGroups.find((g) => g.isDefault)?.id ?? splitGroups[0]?.id ?? null);
    if (accounts.length > 0) {
      const next =
        accountId != null && accounts.some((a) => a.id === accountId)
          ? accountId
          : (primaryAccountId ?? accounts[0]!.id);
      setAccountId(next);
    } else {
      setAccountId(null);
    }
    setErrorDetail(null);
    setCategoryDialogOpen(true);
  };

  const effectiveAccountId =
    accounts.length === 0
      ? undefined
      : (accountId ?? primaryAccountId ?? accounts[0]?.id ?? undefined);
  const totalCentsForExact = pendingCents ?? 0;
  const myCentsExact = parseShareCents(myShareRand);
  const otherCentsExact = parseShareCents(otherShareRand);
  const exactRemainingCents = totalCentsForExact - myCentsExact - otherCentsExact;

  const handleConfirmCategory = () => {
    if (pendingCents === null || !categoryId) return;

    if (splitEnabled && pendingCents > 0) {
      if (splitType === "exact") {
        const myCents = parseShareCents(myShareRand);
        const otherCents = parseShareCents(otherShareRand);
        if (myCents + otherCents !== pendingCents) {
          setErrorDetail("My share + other share must equal total amount.");
          setTimeout(() => setErrorDetail(null), 5000);
          return;
        }
      }
    }

    if (!isOnline) {
      if (splitEnabled) return;
      addToQueue({
        tempId: crypto.randomUUID(),
        categoryId,
        amount: pendingCents,
        note: note.trim() || undefined,
        date,
      });
      setMessage("saved_offline");
      setTimeout(() => setMessage(null), 3000);
      setAmount("");
      setCategoryDialogOpen(false);
      setPendingCents(null);
      onAfterSave?.();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      return;
    }

    const tempId = -Date.now();
    const optimisticMonth = month ?? date.slice(0, 7);
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
    const optimisticExpense: ExpenseWithDetails = {
      id: tempId,
      userId,
      userName: currentUserName ?? "You",
      categoryId,
      categoryName,
      amount: pendingCents,
      note: note.trim() || null,
      date,
      month: optimisticMonth,
      createdAt: new Date().toISOString(),
      splitGroupId: splitEnabled ? `temp-${tempId}` : null,
      accountId: effectiveAccountId ?? null,
    };
    const rollback = onOptimisticUpsertExpense?.(optimisticExpense);

    startTransition(async () => {
      if (splitEnabled) {
        const result = await addSplitExpense({
          categoryId,
          totalAmountCents: pendingCents,
          note: note.trim() || undefined,
          date,
          splitType,
          groupId: splitGroupId ?? undefined,
          accountId: effectiveAccountId,
          ...(splitType === "exact" && {
            myShareCents: parseShareCents(myShareRand),
            otherShareCents: parseShareCents(otherShareRand),
          }),
        });
        if (result.success) {
          setAmount("");
          setMessage("saved");
          setErrorDetail(null);
          setTimeout(() => setMessage(null), 2000);
          setCategoryDialogOpen(false);
          setPendingCents(null);
          if (result.id != null) {
            onOptimisticReplaceExpenseId?.(tempId, result.id);
          }
          toast.success("Expense added.");
          void router.refresh();
          onAfterSave?.();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(50);
          }
        } else {
          rollback?.();
          setMessage("error");
          setErrorDetail("error" in result ? result.error : null);
          toast.error("error" in result ? result.error : "Failed to add expense.");
          setTimeout(() => {
            setMessage(null);
            setErrorDetail(null);
          }, 5000);
        }
        return;
      }
      const result = await addExpense({
        categoryId,
        amount: pendingCents,
        note: note.trim() || undefined,
        date,
        accountId: effectiveAccountId,
      });
      if (result.success) {
        setAmount("");
        setMessage("saved");
        setErrorDetail(null);
        setWarningDetail(result.warning ?? null);
        setTimeout(() => setMessage(null), 2000);
        setCategoryDialogOpen(false);
        setPendingCents(null);
        if (result.id != null) {
          onOptimisticReplaceExpenseId?.(tempId, result.id);
        }
        toast.success("Expense added.");
        void router.refresh();
        onAfterSave?.();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        if (result.categoryName != null && result.budgetRemaining !== undefined) {
          const label = `${result.categoryName}: ${formatRand(result.budgetRemaining)} remaining this month`;
          if (result.isOverspent) {
            toast.warning(label, {
              action: {
                label: "Go to Budget",
                onClick: () => router.push("/budget"),
              },
            });
          } else {
            toast.success(label);
          }
        }
      } else {
        rollback?.();
        setMessage("error");
        setErrorDetail("error" in result ? result.error : null);
        toast.error("error" in result ? result.error : "Failed to add expense.");
        setTimeout(() => {
          setMessage(null);
          setErrorDetail(null);
        }, 5000);
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="quick-amount" className="text-xs text-muted-foreground block mb-1">
              Amount (R)
            </label>
            <Input
              id="quick-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  openCategoryDialog();
                }
              }}
              className="text-lg"
            />
          </div>
          <Button
            type="button"
            onClick={openCategoryDialog}
            disabled={(() => {
              const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
              if (Number.isNaN(parsed) || parsed <= 0) return true;
              if (!accountsReady) return true;
              return false;
            })()}
          >
            Add
          </Button>
        </div>
        {message === "saved" && !categoryDialogOpen && (
          <p className="text-sm text-primary font-medium">Saved.</p>
        )}
        {message === "saved_offline" && (
          <p className="text-sm text-muted-foreground">Saved offline. Will sync when back online.</p>
        )}
        {message === "error" && !categoryDialogOpen && (
          <p className="text-sm text-destructive">
            {errorDetail ?? "Failed to save. Try again."}
          </p>
        )}
      </div>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setMessage(null);
            setErrorDetail(null);
            setWarningDetail(null);
          }
        }}
      >
        <DialogHeader>Choose category</DialogHeader>
        <div className="space-y-3">
          {pendingCents != null ? (
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground block">Amount</span>
              <span className="text-lg font-semibold tabular-nums tracking-tight">{formatRand(pendingCents)}</span>
            </div>
          ) : null}
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Category</span>
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              budgetByCategory={budgetByCategory}
            />
          </div>
          <div>
            <Input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="expense-date" className="text-xs text-muted-foreground block mb-1">
              Date
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm"
            />
          </div>
          {accounts.length > 0 && (
            <div>
              <Label className="text-xs block mb-1">Account</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={String(accountId ?? primaryAccountId ?? accounts[0]!.id)}
                onChange={(e) => setAccountId(Number(e.target.value))}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>
          )}
          {isOnline && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={splitEnabled}
                  onChange={(e) => setSplitEnabled(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm">Who&apos;s in on this</span>
              </label>
              {splitEnabled && (
                <div className="pl-6 space-y-2 border-l-2 border-muted">
                  {splitGroups.length > 0 && (
                    <div>
                      <Label className="text-xs block mb-1">Group</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={splitGroupId ?? ""}
                        onChange={(e) => setSplitGroupId(e.target.value ? Number(e.target.value) : null)}
                      >
                        {splitGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="splitType"
                        checked={splitType === "equal"}
                        onChange={() => setSplitType("equal")}
                      />
                      <span className="text-sm">I paid, split equally</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="splitType"
                        checked={splitType === "full"}
                        onChange={() => setSplitType("full")}
                      />
                      <span className="text-sm">I am owed the full amount</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="splitType"
                        checked={splitType === "exact"}
                        onChange={() => setSplitType("exact")}
                      />
                      <span className="text-sm">Split by exact amount</span>
                    </label>
                  </div>
                  {splitType === "exact" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">My share (R)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={myShareRand}
                            onChange={(e) => setMyShareRand(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{otherUserName ? `${otherUserName}'s share (R)` : "Other share (R)"}</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={otherShareRand}
                            onChange={(e) => setOtherShareRand(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <p
                        className={`text-xs ${
                          exactRemainingCents < 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {exactRemainingCents > 0
                          ? `Left to give a job: ${formatRand(exactRemainingCents)}`
                          : exactRemainingCents < 0
                            ? `You've promised ${formatRand(Math.abs(exactRemainingCents))} more than you have`
                            : "Every rand has a job."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {warningDetail && (
            <p className="text-sm text-warning">{warningDetail}</p>
          )}
          {errorDetail && (
            <p className="text-sm text-destructive">{errorDetail}</p>
          )}
        </div>
        <DialogFooter className="justify-between">
          <Button variant="outline" type="button" onClick={() => setCategoryDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCategory}
            disabled={
              isPending ||
              !categoryId ||
              (accounts.length > 0 && effectiveAccountId == null) ||
              (splitEnabled && splitType === "exact" && (!myShareRand || !otherShareRand))
            }
          >
            {isPending ? "Adding..." : "Add expense"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
