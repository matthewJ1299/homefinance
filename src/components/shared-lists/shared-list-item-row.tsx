"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateListItem, deleteListItem } from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SharedListItemRowProps {
  item: SharedListItem;
  /** When set, shows a compact date chip (e.g. from createdAt). */
  dateLabel?: string;
  /** When set, chevron links to the list detail page. */
  listId?: number;
  onOptimisticUpsertItem?: (next: SharedListItem) => () => void;
  onOptimisticRemoveItem?: (item: SharedListItem) => () => void;
}

export function SharedListItemRow({
  item,
  dateLabel,
  listId,
  onOptimisticUpsertItem,
  onOptimisticRemoveItem,
}: SharedListItemRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isTemp = item.id < 0;

  const handleToggleComplete = () => {
    startTransition(async () => {
      if (isTemp) return;
      const rollback = onOptimisticUpsertItem?.({ ...item, completed: !item.completed });
      const result = await updateListItem(item.id, { completed: !item.completed });
      if (result.success) {
        toast.success("Item updated.");
        void router.refresh();
      } else {
        rollback?.();
        toast.error(result.error);
      }
    });
  };

  const handleQuantityChange = (delta: number) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    startTransition(async () => {
      if (isTemp) return;
      const rollback = onOptimisticUpsertItem?.({ ...item, quantity: next });
      const result = await updateListItem(item.id, { quantity: next });
      if (result.success) {
        toast.success("Item updated.");
        void router.refresh();
      } else {
        rollback?.();
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${item.label}"?`)) return;
    startTransition(async () => {
      if (isTemp) return;
      const rollback = onOptimisticRemoveItem?.(item);
      const result = await deleteListItem(item.id);
      if (result.success) {
        toast.success("Item deleted.");
        void router.refresh();
      } else {
        rollback?.();
        toast.error(result.error);
      }
    });
  };

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors",
        item.completed && "opacity-75"
      )}
    >
      <button
        type="button"
        onClick={handleToggleComplete}
        disabled={isPending || isTemp}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer",
          item.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 hover:border-primary/50"
        )}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
      >
        {item.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-medium text-sm",
              item.completed && "line-through text-muted-foreground"
            )}
          >
            {item.label}
          </span>
          {dateLabel ? (
            <span className="text-[10px] font-medium uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {dateLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 cursor-pointer"
          onClick={() => handleQuantityChange(-1)}
          disabled={isPending || isTemp || item.quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[1.25rem] text-center text-xs tabular-nums font-medium">
          {item.quantity}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 cursor-pointer"
          onClick={() => handleQuantityChange(1)}
          disabled={isPending || isTemp}
          aria-label="Increase quantity"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
        onClick={handleDelete}
        disabled={isPending || isTemp}
        aria-label="Delete item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {listId != null ? (
        <Link
          href={`/lists/${listId}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent cursor-pointer"
          aria-label="Open list"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </li>
  );
}
