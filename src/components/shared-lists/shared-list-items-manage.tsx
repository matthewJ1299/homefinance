"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createListItem,
  deleteCompletedListItems,
} from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SharedListSortableItemList } from "@/components/shared-lists/shared-list-sortable-item-list";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";

interface SharedListItemsManageProps {
  lists: SharedList[];
  itemsByListId: Record<number, SharedListItem[]>;
}

export function SharedListItemsManage({
  lists,
  itemsByListId,
}: SharedListItemsManageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => a.name.localeCompare(b.name)),
    [lists]
  );

  const resolvedListId =
    selectedListId != null && lists.some((l) => l.id === selectedListId)
      ? selectedListId
      : (sortedLists[0]?.id ?? null);

  const itemsFromProps =
    resolvedListId != null ? (itemsByListId[resolvedListId] ?? []) : [];
  const [itemsState, setItemsState] = usePropSyncedState(itemsFromProps);
  const activeList = resolvedListId != null ? lists.find((l) => l.id === resolvedListId) : undefined;
  const completedCount = itemsState.filter((i) => i.completed).length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvedListId == null) return;
    const label = newLabel.trim();
    if (!label) return;
    const qty = Math.max(1, parseInt(newQuantity, 10) || 1);
    setErrorText("");
    startTransition(async () => {
      const result = await createListItem(resolvedListId, { label, quantity: qty });
      if (result.success) {
        setNewLabel("");
        setNewQuantity("1");
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  const handleDeleteCompleted = () => {
    if (resolvedListId == null) return;
    setErrorText("");
    startTransition(async () => {
      const result = await deleteCompletedListItems(resolvedListId);
      if (result.success) {
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  if (lists.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a list above to manage items here.
      </p>
    );
  }

  return (
    <div className="space-y-6 pt-2 border-t border-border/60">
      <div>
        <h3 className="font-medium text-sm text-muted-foreground mb-2">
          List items
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Choose a list, then add rows or remove them (same as on the list page).
        </p>
        <Label htmlFor="settings-list-items-select" className="text-xs">
          List
        </Label>
        <select
          id="settings-list-items-select"
          className="mt-1 flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={resolvedListId ?? ""}
          onChange={(e) => setSelectedListId(Number(e.target.value))}
        >
          {sortedLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
              {list.visibility === "personal" ? " (personal)" : " (shared)"}
            </option>
          ))}
        </select>
      </div>

      <section>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">
          Add item
        </h4>
        <form
          onSubmit={handleAddItem}
          className="flex flex-wrap gap-3 items-end"
        >
          <div className="min-w-[180px]">
            <Label htmlFor="settings-item-label" className="text-xs">
              Label
            </Label>
            <Input
              id="settings-item-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Milk"
              className="mt-1"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="settings-item-quantity" className="text-xs">
              Quantity
            </Label>
            <Input
              id="settings-item-quantity"
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={isPending || resolvedListId == null}>
            {isPending ? "Adding..." : "Add item"}
          </Button>
        </form>
      </section>

      <section>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">
          Items on &quot;{activeList?.name ?? "…"}&quot;
        </h4>
        {resolvedListId == null || itemsState.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Drag the grip to prioritise (same as on the list page). Touch: hold briefly on the grip, then drag.
            </p>
            <SharedListSortableItemList
              listId={resolvedListId}
              items={itemsState}
              setItems={setItemsState}
              listDetailLinkId={resolvedListId}
            />
          </>
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
