"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Category, ExpenseWithDetails, SplitGroup } from "@/lib/types";
import { CategoryPicker, type CategoryBudgetHint } from "@/components/expenses/category-picker";
import { addExpense, addSplitExpense } from "@/lib/actions/expense.actions";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { toMinorUnits, formatRand } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";

type SplitType = "equal" | "full" | "exact";

export function HomeInlineQuickAddExpense({
  userId,
  userName,
  month,
  categories,
  splitGroups,
  otherUserName,
  budgetByCategory,
  primaryAccountId = null,
  expenseDate,
  onOptimisticUpsertExpense,
  onOptimisticReplaceExpenseId,
}: {
  userId: number;
  userName: string;
  month: string;
  categories: Category[];
  splitGroups: SplitGroup[];
  otherUserName?: string;
  budgetByCategory?: Map<number, CategoryBudgetHint>;
  /** Server primary account; must match dashboard "Recent expenses" filter when set. */
  primaryAccountId?: number | null;
  /** Transaction date aligned to the dashboard budget month (server). */
  expenseDate: string;
  onOptimisticUpsertExpense?: (next: ExpenseWithDetails) => () => void;
  onOptimisticReplaceExpenseId?: (tempId: number, realId: number) => void;
}) {
  const router = useRouter();
  const { isOnline, addToQueue, syncQueue } = useOfflineQueue();
  const [isPending, startTransition] = useTransition();

  const defaultSplitGroupId = useMemo(
    () => splitGroups.find((g) => g.isDefault)?.id ?? splitGroups[0]?.id ?? null,
    [splitGroups]
  );

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(categories[0]?.id ?? null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [myShareRand, setMyShareRand] = useState("");
  const [otherShareRand, setOtherShareRand] = useState("");
  const [splitGroupId, setSplitGroupId] = useState<number | null>(
    () => splitGroups.find((g) => g.isDefault)?.id ?? splitGroups[0]?.id ?? null
  );
  const [accountId, setAccountId] = useState<number | null>(
    primaryAccountId != null ? primaryAccountId : null
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline) return;
    syncQueue().then(() => router.refresh());
  }, [isOnline, syncQueue, router]);

  useEffect(() => {
    if (primaryAccountId != null) {
      setAccountId(primaryAccountId);
      return;
    }
    fetch("/api/accounts")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        const { accounts: list, primaryAccountId: primary } = parseAccountsApiPayload(data);
        const chosenId = primary ?? list[0]?.id ?? null;
        setAccountId(chosenId);
      })
      .catch(() => setAccountId(null));
  }, [primaryAccountId]);

  const parseAmountCents = () => {
    const parsed = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return toMinorUnits(parsed);
  };
  const parseShareCents = (value: string): number =>
    toMinorUnits(parseFloat(value.replace(/\s/g, "").replace(",", ".")) || 0);

  const effectiveAccountId = accountId ?? primaryAccountId ?? undefined;

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId]
  );
  const totalCentsForExact = parseAmountCents();
  const myCentsExact = parseShareCents(myShareRand);
  const otherCentsExact = parseShareCents(otherShareRand);
  const exactRemainingCents = (totalCentsForExact ?? 0) - myCentsExact - otherCentsExact;

  const add = () => {
    const cents = parseAmountCents();
    if (!cents || !categoryId) return;

    const trimmedNote = note.trim();
    setMessage(null);

    if (!isOnline) {
      // Offline split expenses are intentionally not supported yet (queue only stores simple expenses).
      if (splitEnabled) {
        setMessage("Offline split not supported yet.");
        return;
      }
      startTransition(async () => {
        addToQueue({
          tempId: crypto.randomUUID(),
          categoryId,
          amount: cents,
          note: trimmedNote || undefined,
          date: expenseDate,
        });
        setAmount("");
        setNote("");
        setSplitEnabled(false);
        setMessage("Saved offline. Will sync when online.");
        router.refresh();
      });
      return;
    }

    const tempId = -Date.now();
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
    const optimisticExpense: ExpenseWithDetails = {
      id: tempId,
      userId,
      userName,
      categoryId,
      categoryName,
      amount: cents,
      note: trimmedNote || null,
      date: expenseDate,
      month,
      createdAt: new Date().toISOString(),
      splitGroupId: splitEnabled ? `temp-${tempId}` : null,
      accountId: effectiveAccountId ?? null,
    };
    const rollback = onOptimisticUpsertExpense?.(optimisticExpense);

    startTransition(async () => {
      if (splitEnabled) {
        if (splitType === "exact") {
          const myCents = parseShareCents(myShareRand);
          const otherCents = parseShareCents(otherShareRand);
          if (myCents + otherCents !== cents) {
            setMessage("My share + other share must equal total amount.");
            rollback?.();
            return;
          }
        }
        const groupId = splitGroupId ?? defaultSplitGroupId ?? undefined;
        const result = await addSplitExpense({
          categoryId,
          totalAmountCents: cents,
          note: trimmedNote || undefined,
          date: expenseDate,
          splitType,
          groupId,
          accountId: effectiveAccountId,
          ...(splitType === "exact" && {
            myShareCents: parseShareCents(myShareRand),
            otherShareCents: parseShareCents(otherShareRand),
          }),
        });
        if (result.success) {
          setAmount("");
          setNote("");
          setSplitEnabled(false);
          setSplitType("equal");
          setMyShareRand("");
          setOtherShareRand("");
          setSplitGroupId(splitGroups.find((g) => g.isDefault)?.id ?? splitGroups[0]?.id ?? null);
          setMessage("Saved.");
          if (result.id != null) onOptimisticReplaceExpenseId?.(tempId, result.id);
          toast.success("Expense added.");
          void router.refresh();
        } else {
          rollback?.();
          setMessage(result.error);
          toast.error(result.error);
        }
        return;
      }

      const result = await addExpense({
        categoryId,
        amount: cents,
        note: trimmedNote || undefined,
        date: expenseDate,
        accountId: effectiveAccountId,
      });

      if (result.success) {
        setAmount("");
        setNote("");
        setSplitEnabled(false);
        if (result.warning && result.budgetRemaining != null && result.categoryName) {
          setMessage(`${result.categoryName}: ${formatRand(result.budgetRemaining)} remaining`);
        } else {
          setMessage("Saved.");
        }
        if (result.id != null) onOptimisticReplaceExpenseId?.(tempId, result.id);
        toast.success("Expense added.");
        void router.refresh();
      } else {
        rollback?.();
        setMessage(result.error);
        toast.error(result.error);
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <Label htmlFor="home-quick-amount" className="text-xs text-muted-foreground block mb-1">
              Amount (R)
            </Label>
            <Input
              id="home-quick-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="text-lg"
            />
          </div>
          <div className="w-full max-w-[170px]">
            <Label htmlFor="home-quick-note" className="text-xs text-muted-foreground block mb-1">
              Note (optional)
            </Label>
            <Input
              id="home-quick-note"
              type="text"
              placeholder="e.g. Biltong"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <div className="mt-3">
          <span className="text-xs text-muted-foreground block mb-1">Category</span>
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            budgetByCategory={budgetByCategory}
            showBudgetOnPills={false}
          />
          {selectedCategory && budgetByCategory && budgetByCategory.get(selectedCategory.id)?.isOverspent ? (
            <p className="mt-2 text-xs text-destructive">
              {selectedCategory.name} is over budget this month.
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={splitEnabled}
              onChange={(e) => {
                const on = e.target.checked;
                setSplitEnabled(on);
                if (on) {
                  setSplitType("equal");
                  setMyShareRand("");
                  setOtherShareRand("");
                  setSplitGroupId(splitGroups.find((g) => g.isDefault)?.id ?? splitGroups[0]?.id ?? null);
                }
              }}
              className="rounded border-input"
              disabled={!otherUserName}
            />
            <span className="text-sm">
              Split with {otherUserName ?? "partner"}
            </span>
          </label>
          {splitEnabled && !isOnline ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Offline: splitting is not supported.
            </p>
          ) : null}
          {splitEnabled && isOnline ? (
            <div className="mt-2 pl-4 space-y-2 border-l-2 border-muted">
              {splitGroups.length > 0 ? (
                <div>
                  <Label className="text-xs text-muted-foreground block mb-1">Split group</Label>
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
              ) : null}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium">How to split</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="home-inline-split-type"
                    checked={splitType === "equal"}
                    onChange={() => setSplitType("equal")}
                  />
                  <span className="text-sm">I paid, split equally</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="home-inline-split-type"
                    checked={splitType === "full"}
                    onChange={() => setSplitType("full")}
                  />
                  <span className="text-sm">I am owed the full amount</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="home-inline-split-type"
                    checked={splitType === "exact"}
                    onChange={() => setSplitType("exact")}
                  />
                  <span className="text-sm">Split by exact amount</span>
                </label>
              </div>
              {splitType === "exact" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">My share (R)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={myShareRand}
                        onChange={(e) => setMyShareRand(e.target.value)}
                        className="text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {otherUserName ? `${otherUserName}'s share (R)` : "Other share (R)"}
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={otherShareRand}
                        onChange={(e) => setOtherShareRand(e.target.value)}
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                  <p
                    className={`text-xs ${
                      totalCentsForExact == null
                        ? "text-muted-foreground"
                        : exactRemainingCents < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {totalCentsForExact == null
                      ? "Enter total amount above to calculate what is left."
                      : exactRemainingCents > 0
                        ? `Left to give a job: ${formatRand(exactRemainingCents)}`
                        : exactRemainingCents < 0
                          ? `You've promised ${formatRand(Math.abs(exactRemainingCents))} more than you have`
                          : "Every rand has a job."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {message ? (
            <p
              className={[
                "text-sm",
                message.includes("offline") || message.includes("not supported")
                  ? "text-muted-foreground"
                  : message.includes("must equal")
                    ? "text-destructive"
                    : "text-primary",
              ].join(" ")}
            >
              {message}
            </p>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isOnline ? "Ready to add" : "Offline mode"}
            </div>
          )}
          <Button
            type="button"
            onClick={add}
            disabled={
              isPending ||
              !parseAmountCents() ||
              !categoryId ||
              (splitEnabled &&
                isOnline &&
                splitType === "exact" &&
                (!myShareRand.trim() || !otherShareRand.trim()))
            }
          >
            {isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </section>
  );
}

