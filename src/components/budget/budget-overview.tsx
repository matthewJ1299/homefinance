"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRand } from "@/lib/utils/currency";
import { soleOtherMemberName, type HouseholdMember } from "@/lib/types/household-member";
import { UnassignedHeadline } from "./unassigned-headline";
import { BudgetCategoryRow } from "./budget-category-row";
import { BudgetCategorySheet } from "./budget-category-sheet";
import { TransferDialog } from "./transfer-dialog";
import { autoAllocateBudget } from "@/lib/actions/budget.actions";
import { Card } from "@/components/ui/card";
import { RecentExpensesCard } from "@/components/dashboard/recent-expenses-card";
import type { BudgetOverviewResult } from "@/lib/services/budget.service";
import type { Category, ExpenseWithDetails } from "@/lib/types";

interface BudgetOverviewProps {
  data: BudgetOverviewResult;
  recentExpenses?: ExpenseWithDetails[];
  expenseCategories?: Category[];
  /** Everyone else in the household. Replaces the old single `otherUserName`. */
  members?: HouseholdMember[];
  /** Last month's assigned amount per category, for the sheet's Match chip. */
  lastMonthAssigned?: Record<number, number>;
  /** Categories to open on load, from `?cover=` on a Home overspend row. */
  openCategoryId?: number;
  /** Targets per category, so the sheet can edit a goal in place. */
  targets?: Record<number, { targetMinor: number | null; targetDate: string | null }>;
}

export function BudgetOverview({
  data,
  recentExpenses = [],
  expenseCategories = [],
  members = [],
  lastMonthAssigned = {},
  openCategoryId,
  targets = {},
}: BudgetOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheetCategoryId, setSheetCategoryId] = useState<number | null>(openCategoryId ?? null);
  const [transferTarget, setTransferTarget] = useState<{
    categoryId: number;
    categoryName: string;
    overspentAmount: number;
  } | null>(null);

  // Grouped, so the eye finds the flexible categories without reading every
  // row. The existing drag order is preserved inside each group.
  const categories = data.categories;
  const groups = useMemo(() => {
    const out = new Map<string, typeof categories>();
    for (const c of categories) {
      const list = out.get(c.groupName) ?? [];
      list.push(c);
      out.set(c.groupName, list);
    }
    return [...out.entries()];
  }, [categories]);

  const sheetCategory = data.categories.find((c) => c.categoryId === sheetCategoryId) ?? null;
  const mostOverspent = [...data.categories]
    .filter((c) => c.available < 0)
    .sort((a, b) => a.available - b.available)[0];

  function spreadItForMe() {
    startTransition(async () => {
      const result = await autoAllocateBudget(data.month);
      if (result.success) {
        toast.success("Spread across your categories.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6 pb-8">
      <UnassignedHeadline
        unassigned={data.unassigned}
        carriedOverspend={data.carriedOverspend}
        overspentTotal={data.overspentTotal}
        pending={isPending}
        onSpread={spreadItForMe}
        onCover={() => {
          if (!mostOverspent) return;
          setTransferTarget({
            categoryId: mostOverspent.categoryId,
            categoryName: mostOverspent.categoryName,
            overspentAmount: -mostOverspent.available,
          });
        }}
      />

      <div className="flex justify-between px-1 text-[13px] text-muted-foreground tabular-nums">
        <span>{formatRand(data.totalIncome)} in</span>
        <span>{formatRand(data.totalAssigned)} assigned</span>
        <span>{formatRand(data.totalExpenses)} spent</span>
      </div>

      <div className="space-y-4">
        {groups.map(([groupName, rows]) => (
          <section key={groupName} className="space-y-1">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {groupName}
            </h2>
            <Card className="rounded-2xl px-3.5 py-0">
              {rows.map((c) => (
                <BudgetCategoryRow key={c.categoryId} c={c} onOpen={setSheetCategoryId} />
              ))}
            </Card>
          </section>
        ))}
      </div>

      {recentExpenses.length > 0 && expenseCategories.length > 0 && (
        <RecentExpensesCard
          expenses={recentExpenses}
          categories={expenseCategories}
          otherUserName={soleOtherMemberName(members)}
          title="Recent transactions"
          seeAllHref={`/expenses?month=${encodeURIComponent(data.month)}`}
        />
      )}

      {data.transfers.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Money moved</h2>
          <ul className="space-y-1 text-sm">
            {data.transfers.map((t) => (
              <li key={t.id} className="text-muted-foreground">
                {formatRand(t.amount)} from {t.fromCategoryName} to {t.toCategoryName}
                {t.reason && ` (${t.reason})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <BudgetCategorySheet
        open={sheetCategory != null}
        onOpenChange={(open) => !open && setSheetCategoryId(null)}
        category={sheetCategory}
        month={data.month}
        lastMonthAssigned={sheetCategory ? (lastMonthAssigned[sheetCategory.categoryId] ?? 0) : 0}
        targetMinor={sheetCategory ? (targets[sheetCategory.categoryId]?.targetMinor ?? null) : null}
        targetDate={sheetCategory ? (targets[sheetCategory.categoryId]?.targetDate ?? null) : null}
        transactions={recentExpenses.filter(
          (e) => e.categoryId === sheetCategory?.categoryId
        )}
        onMoveMoney={(categoryId) => {
          const c = data.categories.find((x) => x.categoryId === categoryId);
          if (!c) return;
          setSheetCategoryId(null);
          setTransferTarget({
            categoryId: c.categoryId,
            categoryName: c.categoryName,
            overspentAmount: Math.max(0, -c.available),
          });
        }}
      />

      {transferTarget && (
        <TransferDialog
          open={!!transferTarget}
          onOpenChange={(open) => !open && setTransferTarget(null)}
          fromCategoryId={transferTarget.categoryId}
          fromCategoryName={transferTarget.categoryName}
          overspentAmount={transferTarget.overspentAmount}
          categories={data.categories
            .filter((c) => c.available > 0)
            .map((c) => ({
              categoryId: c.categoryId,
              categoryName: c.categoryName,
              remaining: c.available,
            }))}
          month={data.month}
        />
      )}
    </div>
  );
}
