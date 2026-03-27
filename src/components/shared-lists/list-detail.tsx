"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateList,
  deleteList,
  createListItem,
  deleteCompletedListItems,
} from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SharedListItemRow } from "./shared-list-item-row";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";
import { toast } from "sonner";

interface ListDetailProps {
  list: SharedList;
  items: SharedListItem[];
}

export function ListDetail({ list, items }: ListDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");

  const [itemsState, setItemsState] = usePropSyncedState(items);
  const completedCount = itemsState.filter((i) => i.completed).length;

  const optimisticUpsertItem = useCallback(
    (next: SharedListItem) => {
      const snapshot = itemsState;
      setItemsState((prev) => {
        const idx = prev.findIndex((i) => i.id === next.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        }
        return [next, ...prev];
      });
      return () => setItemsState(snapshot);
    },
    [itemsState, setItemsState]
  );

  const optimisticRemoveItem = useCallback(
    (item: SharedListItem) => {
      const snapshot = itemsState;
      setItemsState((prev) => prev.filter((i) => i.id !== item.id));
      return () => setItemsState(snapshot);
    },
    [itemsState, setItemsState]
  );

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    const qty = Math.max(1, parseInt(newQuantity, 10) || 1);
    setErrorText("");
    const tempId = -Date.now();
    const rollback = optimisticUpsertItem({
      id: tempId,
      listId: list.id,
      label,
      quantity: qty,
      completed: false,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    });
    startTransition(async () => {
      const result = await createListItem(list.id, { label, quantity: qty });
      if (result.success) {
        setNewLabel("");
        setNewQuantity("1");
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        if (result.id != null) {
          setItemsState((prev) => prev.map((i) => (i.id === tempId ? { ...i, id: result.id! } : i)));
        }
        toast.success("Item added.");
        void router.refresh();
      } else {
        rollback();
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const handleSaveName = () => {
    const name = editName.trim();
    if (!name || name === list.name) {
      setEditingName(false);
      return;
    }
    setErrorText("");
    startTransition(async () => {
      const result = await updateList(list.id, { name });
      if (result.success) {
        setEditingName(false);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        toast.success("List updated.");
        void router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const handleDeleteList = () => {
    if (
      !confirm(
        `Delete list "${list.name}" and all its items? This cannot be undone.`
      )
    )
      return;
    setErrorText("");
    startTransition(async () => {
      const result = await deleteList(list.id);
      if (result.success) {
        router.push("/lists");
        toast.success("List deleted.");
        void router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const handleDeleteCompleted = () => {
    setErrorText("");
    const snapshot = itemsState;
    setItemsState((prev) => prev.filter((i) => !i.completed));
    startTransition(async () => {
      const result = await deleteCompletedListItems(list.id);
      if (result.success) {
        toast.success("Completed items deleted.");
        void router.refresh();
      } else {
        setItemsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-2">
        {editingName ? (
          <>
            <Input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="max-w-[200px] h-9"
              placeholder="List name"
            />
            <Button size="sm" onClick={handleSaveName} disabled={isPending}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditName(list.name);
                setEditingName(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingName(true)}
            >
              Edit name
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteList}
              disabled={isPending}
            >
              Delete list
            </Button>
          </>
        )}
      </section>

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">
          Add item
        </h2>
        <form
          onSubmit={handleAddItem}
          className="flex flex-wrap gap-3 items-end"
        >
          <div className="min-w-[180px]">
            <Label htmlFor="item-label" className="text-xs">
              Label
            </Label>
            <Input
              id="item-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Milk"
              className="mt-1"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="item-quantity" className="text-xs">
              Quantity
            </Label>
            <Input
              id="item-quantity"
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">
          Items
        </h2>
        {itemsState.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <ul className="space-y-2">
            {itemsState.map((item) => (
              <SharedListItemRow
                key={item.id}
                item={item}
                onOptimisticUpsertItem={optimisticUpsertItem}
                onOptimisticRemoveItem={optimisticRemoveItem}
              />
            ))}
          </ul>
        )}
      </section>

      {completedCount > 0 && (
        <section>
          <Button
            variant="outline"
            onClick={handleDeleteCompleted}
            disabled={isPending}
          >
            Delete all completed ({completedCount})
          </Button>
        </section>
      )}

      {message === "saved" && (
        <p className="text-sm text-primary font-medium">Saved.</p>
      )}
      {message === "error" && errorText && (
        <p className="text-sm text-destructive">{errorText}</p>
      )}
    </div>
  );
}
