"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import { formatRand } from "@/lib/utils/currency";
import { formatDisplayDate } from "@/lib/utils/date";
import { formatDisplayDate } from "@/lib/utils/date";
import { deleteIncome, getIncomeForEdit } from "@/lib/actions/income.actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EditIncomeDialog } from "@/components/income/edit-income-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface IncomeListProps {
  entries: IncomeEntry[];
  settlementLinkedIncomeIds?: number[];
  className?: string;
}

export function IncomeList({
  entries,
  settlementLinkedIncomeIds = [],
  className,
}: IncomeListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncomeEntry | null>(null);
  const settlementSet = new Set(settlementLinkedIncomeIds);

  if (entries.length === 0) {
    return <EmptyState message="No income this month." className={className} />;
  }

  const handleEdit = (entry: IncomeEntry) => {
    if (settlementSet.has(entry.id)) {
      toast.error("Settlement income can only be edited from the Splits page.");
      return;
    }
    startTransition(async () => {
      const result = await getIncomeForEdit(entry.id);
      if (result.success) {
        if (result.isSettlementLinked) {
          toast.error("Settlement income can only be edited from the Splits page.");
          return;
        }
        setEditEntry(result.entry);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (entry: IncomeEntry) => {
    if (settlementSet.has(entry.id)) {
      toast.error("Settlement income can only be deleted from the Splits page.");
      return;
    }
    setDeleteTarget(entry);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteIncome(deleteTarget.id);
      if (result.success) {
        toast.success("Income deleted.");
        setDeleteTarget(null);
        void router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <ul className={`divide-y divide-border ${className ?? ""}`}>
        {entries.map((entry) => {
          const isSettlement = settlementSet.has(entry.id);
          return (
            <li key={entry.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="font-medium capitalize">{entry.type.replace("_", " ")}</span>
                {entry.description && (
                  <span className="text-sm text-muted-foreground block truncate">
                    {entry.description}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {entry.userName} - {formatDisplayDate(entry.date)}
                  {isSettlement && " (settlement)"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium">{formatRand(entry.amount)}</span>
                {!isSettlement && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(entry)}
                      disabled={isPending}
                      title="Edit income"
                      aria-label="Edit income"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(entry)}
                      disabled={isPending}
                      title="Delete income"
                      aria-label="Delete income"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {editEntry && (
        <EditIncomeDialog
          open={editEntry != null}
          onOpenChange={(open) => !open && setEditEntry(null)}
          entry={editEntry}
        />
      )}
      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete income"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
