"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateListItem,
  deleteListItem,
} from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";

interface SharedListItemRowProps {
  item: SharedListItem;
}

export function SharedListItemRow({ item }: SharedListItemRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleComplete = () => {
    startTransition(async () => {
      await updateListItem(item.id, { completed: !item.completed });
      router.refresh();
    });
  };

  const handleQuantityChange = (delta: number) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    startTransition(async () => {
      await updateListItem(item.id, { quantity: next });
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${item.label}"?`)) return;
    startTransition(async () => {
      await deleteListItem(item.id);
      router.refresh();
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <button
        type="button"
        onClick={handleToggleComplete}
        className="text-left flex-1 min-w-0 font-medium hover:underline"
      >
        <span
          className={item.completed ? "line-through text-muted-foreground" : ""}
        >
          {item.label}
        </span>
      </button>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => handleQuantityChange(-1)}
          disabled={isPending || item.quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[1.5rem] text-center text-sm tabular-nums">
          {item.quantity}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => handleQuantityChange(1)}
          disabled={isPending}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        Delete
      </Button>
    </li>
  );
}
