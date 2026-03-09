"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseWithDetails } from "@/lib/types";
import type { Category } from "@/lib/types";
import { formatRand } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { Trash2, Pencil } from "lucide-react";
import { deleteExpense, getExpenseForEdit } from "@/lib/actions/expense.actions";
import { Button } from "@/components/ui/button";
import { EditExpenseDialog } from "./edit-expense-dialog";

interface ExpenseItemProps {
  expense: ExpenseWithDetails;
  showOwner?: boolean;
  showDelete?: boolean;
  categories?: Category[];
  otherUserName?: string;
  className?: string;
}

export function ExpenseItem({
  expense,
  showOwner = false,
  showDelete = true,
  categories = [],
  otherUserName,
  className,
}: ExpenseItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editAllocations, setEditAllocations] = useState<
    Array<{ userId: number; userName: string; amount: number }> | undefined
  >(undefined);
  const name = expense.userName ?? "";
  const initial = name.slice(0, 1).toUpperCase() || "?";
  const isSplit = Boolean(expense.splitGroupId);

  const handleEdit = () => {
    if (isSplit) {
      startTransition(async () => {
        const result = await getExpenseForEdit(expense.id);
        if (result.success) {
          setEditAllocations(result.allocations);
          setEditOpen(true);
        } else {
          alert(result.error);
        }
      });
    } else {
      setEditAllocations(undefined);
      setEditOpen(true);
    }
  };

  const handleDelete = () => {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium"
            title={name}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            {showOwner && (
              <span className="text-xs text-muted-foreground block truncate">{name}</span>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm block truncate">{expense.categoryName}</span>
              {isSplit && (
                <span
                  className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  title="Split expense"
                >
                  Split
                </span>
              )}
            </div>
            {expense.note && (
              <span className="text-xs text-muted-foreground truncate block">{expense.note}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-medium">{formatRand(expense.amount)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleEdit}
            disabled={isPending}
            title="Edit expense"
            aria-label="Edit expense"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {showDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
              title="Delete expense"
              aria-label="Delete expense"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <EditExpenseDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        expense={expense}
        allocations={editAllocations}
        categories={categories}
        otherUserName={otherUserName}
      />
    </>
  );
}
